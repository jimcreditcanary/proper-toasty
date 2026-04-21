"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  INITIAL_STATE,
  STEP_ORDER,
  type CheckStep,
  type CheckWizardAction,
  type CheckWizardState,
} from "./types";

const STORAGE_KEY = "propertoasty_check_state";
const STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function reducer(state: CheckWizardState, action: CheckWizardAction): CheckWizardState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.patch };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

interface CheckWizardContextValue {
  state: CheckWizardState;
  step: CheckStep;
  update: (patch: Partial<CheckWizardState>) => void;
  reset: () => void;
  goTo: (step: CheckStep) => void;
  next: () => void;
  back: () => void;
}

const CheckWizardContext = createContext<CheckWizardContextValue | null>(null);

export function CheckWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [step, setStep] = useState<CheckStep>("address");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.savedAt < STATE_TTL_MS) {
          dispatch({ type: "UPDATE", patch: parsed.state });
          if (STEP_ORDER.includes(parsed.step)) setStep(parsed.step);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore — treat as no saved state
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state, step, savedAt: Date.now() })
      );
    } catch {
      // ignore — probably quota
    }
  }, [state, step, hydrated]);

  const update = useCallback((patch: Partial<CheckWizardState>) => {
    dispatch({ type: "UPDATE", patch });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    setStep("address");
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  const goTo = useCallback((s: CheckStep) => setStep(s), []);

  const next = useCallback(() => {
    const i = STEP_ORDER.indexOf(step);
    if (i >= 0 && i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]);
  }, [step]);

  const back = useCallback(() => {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStep(STEP_ORDER[i - 1]);
  }, [step]);

  const value = useMemo(
    () => ({ state, step, update, reset, goTo, next, back }),
    [state, step, update, reset, goTo, next, back]
  );

  return <CheckWizardContext.Provider value={value}>{children}</CheckWizardContext.Provider>;
}

export function useCheckWizard(): CheckWizardContextValue {
  const ctx = useContext(CheckWizardContext);
  if (!ctx) throw new Error("useCheckWizard must be used inside CheckWizardProvider");
  return ctx;
}
