"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { type PayeeType, type WizardState, type WizardStep, initialWizardState } from "./types";

const STORAGE_KEY = "wap_wizard_state";
const SESSION_KEY = "wap_wizard_session";

/** Save serialisable wizard state + step to sessionStorage */
function persistWizard(state: WizardState, step: WizardStep) {
  try {
    // Strip non-serialisable fields (File objects)
    const { invoiceFile, marketplaceScreenshot, ...rest } = state;
    void invoiceFile;
    void marketplaceScreenshot;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ wizard: rest, step }));
  } catch {
    /* quota or SSR – ignore */
  }
}

/** Restore wizard state from sessionStorage (returns null if nothing saved) */
function restoreWizard(): { wizard: Partial<WizardState>; step: WizardStep } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Clear saved wizard state */
export function clearPersistedWizard() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* SSR */
  }
}

/** Get or create a wizard session ID for journey tracking */
function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Report step progress to the server (fire-and-forget) */
function trackStep(step: WizardStep, completed = false, verificationId?: string) {
  try {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) return;
    fetch("/api/track-wizard-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        step: String(step),
        completed,
        verificationId,
      }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export { getSessionId, trackStep };

type WizardAction =
  | { type: "UPDATE"; payload: Partial<WizardState> }
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "RESET" };

type WizardContextValue = {
  state: WizardState;
  step: WizardStep;
  update: (partial: Partial<WizardState>) => void;
  setStep: (step: WizardStep) => void;
  reset: () => void;
  /** Visible progress-bar step number (1..6) */
  stepNumber: number;
  totalSteps: number;
};

const WizardContext = createContext<WizardContextValue | null>(null);

type FullState = { wizard: WizardState; step: WizardStep };

function reducer(state: FullState, action: WizardAction): FullState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, wizard: { ...state.wizard, ...action.payload } };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "RESET":
      return { wizard: initialWizardState, step: 1 };
    default:
      return state;
  }
}

/**
 * Visible step number on the progress bar. Steps 1..6 map directly, but the
 * vehicle registration step (3) is skipped when `purchaseCategory !== "vehicle"`
 * so the user doesn't see a "missing step" jump from 2 → 4.
 */
function getStepNumber(step: WizardStep, state: WizardState): number {
  const isVehicle = state.purchaseCategory === "vehicle";
  if (isVehicle) {
    // All 6 steps visible
    return step as number;
  }
  // Non-vehicle: 5 visible steps (skip 3)
  const map: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5 };
  return map[step as number] ?? 1;
}

export function WizardProvider({
  children,
  initialAuth,
  initialPayee,
}: {
  children: React.ReactNode;
  initialAuth?: { isAuthenticated: boolean; userCredits: number; userEmail: string | null };
  initialPayee?: PayeeType;
}) {
  // Try to restore saved state (e.g. after login redirect)
  const saved = typeof window !== "undefined" ? restoreWizard() : null;

  const [full, dispatch] = useReducer(reducer, {
    wizard: {
      ...initialWizardState,
      ...(saved?.wizard ?? {}),
      // Auth state always comes from server, not storage
      ...(initialAuth ?? {}),
      ...(initialPayee ? { payeeType: initialPayee } : {}),
    },
    step: saved?.step ?? ((initialPayee ? 2 : 1) as WizardStep),
  });

  // Init session tracking on mount
  useEffect(() => {
    const sid = getSessionId();
    fetch("/api/track-wizard-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, step: String(full.step) }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist wizard state on every change and track step progress
  useEffect(() => {
    persistWizard(full.wizard, full.step);
    trackStep(full.step);
  }, [full]);

  const update = useCallback(
    (partial: Partial<WizardState>) => dispatch({ type: "UPDATE", payload: partial }),
    []
  );
  const setStep = useCallback(
    (step: WizardStep) => dispatch({ type: "SET_STEP", step }),
    []
  );
  const reset = useCallback(() => {
    clearPersistedWizard();
    dispatch({ type: "RESET" });
  }, []);

  const totalSteps = full.wizard.purchaseCategory === "vehicle" ? 6 : 5;

  return (
    <WizardContext
      value={{
        state: full.wizard,
        step: full.step,
        update,
        setStep,
        reset,
        stepNumber: getStepNumber(full.step, full.wizard),
        totalSteps,
      }}
    >
      {children}
    </WizardContext>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
