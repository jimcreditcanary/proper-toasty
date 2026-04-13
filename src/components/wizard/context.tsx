"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { type WizardState, type WizardStep, initialWizardState } from "./types";

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
  /** Current visual step number (1-5) for progress bar */
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

function getStepNumber(step: WizardStep): number {
  const map: Record<string, number> = { "1": 1, "1b": 2, "2": 3, "3": 4, "4": 5, "5": 6 };
  return map[String(step)] ?? 1;
}

export function WizardProvider({
  children,
  initialAuth,
}: {
  children: React.ReactNode;
  initialAuth?: { isAuthenticated: boolean; userCredits: number; userEmail: string | null };
}) {
  const [full, dispatch] = useReducer(reducer, {
    wizard: {
      ...initialWizardState,
      ...(initialAuth ?? {}),
    },
    step: 1 as WizardStep,
  });

  const update = useCallback(
    (partial: Partial<WizardState>) => dispatch({ type: "UPDATE", payload: partial }),
    []
  );
  const setStep = useCallback(
    (step: WizardStep) => dispatch({ type: "SET_STEP", step }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return (
    <WizardContext value={{
      state: full.wizard,
      step: full.step,
      update,
      setStep,
      reset,
      stepNumber: getStepNumber(full.step),
      totalSteps: 6,
    }}>
      {children}
    </WizardContext>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
