"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { type PayeeType, type WizardState, type WizardStep, initialWizardState } from "./types";

const STORAGE_KEY = "wap_wizard_state";
const SESSION_KEY = "wap_wizard_session";

/** How long saved wizard state survives. Long enough to handle a sign-up +
 *  email confirmation round-trip even if the user takes a coffee break,
 *  short enough that the wizard isn't pre-filled with last week's answers. */
const STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Persist wizard state + step. We use localStorage so the journey survives
 *  signup → email confirmation → return-to-wizard, even if those happen in
 *  different tabs of the same browser. */
function persistWizard(state: WizardState, step: WizardStep) {
  try {
    // Strip non-serialisable fields (File objects)
    const { invoiceFile, marketplaceScreenshot, ...rest } = state;
    void invoiceFile;
    void marketplaceScreenshot;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ wizard: rest, step, savedAt: Date.now() })
    );
  } catch {
    /* quota or SSR – ignore */
  }
}

/** Restore wizard state if it's recent enough. Returns null otherwise. */
function restoreWizard(): { wizard: Partial<WizardState>; step: WizardStep } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      wizard: Partial<WizardState>;
      step: WizardStep;
      savedAt?: number;
    };
    if (parsed.savedAt && Date.now() - parsed.savedAt > STATE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { wizard: parsed.wizard, step: parsed.step };
  } catch {
    return null;
  }
}

/** Clear saved wizard state */
export function clearPersistedWizard() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* SSR */
  }
}

/** Get or create a wizard session ID for journey tracking. Stays in
 *  sessionStorage on purpose — it's an analytics ID, not journey data. */
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
 * Visible-step bookkeeping. The wizard has up to 6 underlying steps, but the
 * vehicle registration step (3) and marketplace step (4) are conditionally
 * shown based on what the user is paying for. We compute the visible
 * sequence so the progress bar reads naturally (e.g. "Step 3 of 4" instead
 * of jumping from 2 to 5).
 */
function visibleSteps(state: WizardState): WizardStep[] {
  const cat = state.purchaseCategory;
  const showVehicle = cat === "vehicle";
  const showMarketplace = cat === "vehicle" || cat === "something_else";

  const out: WizardStep[] = [1, 2];
  if (showVehicle) out.push(3);
  if (showMarketplace) out.push(4);
  out.push(5, 6);
  return out;
}

function getStepNumber(step: WizardStep, state: WizardState): number {
  const seq = visibleSteps(state);
  const idx = seq.indexOf(step);
  return idx === -1 ? 1 : idx + 1;
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
  // If the URL provided a payee param, the user is explicitly starting a new
  // flow — skip session-restore so they jump straight to step 2 instead of
  // landing back wherever they were last time.
  const saved =
    typeof window !== "undefined" && !initialPayee ? restoreWizard() : null;

  const [full, dispatch] = useReducer(reducer, {
    wizard: {
      ...initialWizardState,
      ...(saved?.wizard ?? {}),
      // Auth state always comes from server, not storage
      ...(initialAuth ?? {}),
      ...(initialPayee ? { payeeType: initialPayee } : {}),
    },
    step: initialPayee ? (2 as WizardStep) : (saved?.step ?? (1 as WizardStep)),
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

  const totalSteps = visibleSteps(full.wizard).length;

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
