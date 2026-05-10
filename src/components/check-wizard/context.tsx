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
  stepOrderForFocus,
  type WizardFocus,
  type CheckStep,
  type CheckWizardAction,
  type CheckWizardState,
} from "./types";

// Bumped to _v4 when the financingPreference field landed on Step 3.
// Older versions discarded on hydration so the new question always shows.
const STORAGE_KEY = "propertoasty_check_state_v4";
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

export function CheckWizardProvider({
  children,
  // Optional initial state overrides — used by the public report viewer
  // (/r/[token]) which hydrates from a server-loaded snapshot rather
  // than localStorage. When supplied we skip localStorage entirely so
  // the share-link session can't accidentally pollute the user's own
  // wizard state.
  initialState,
  initialStep,
  disablePersistence,
}: {
  children: ReactNode;
  initialState?: Partial<CheckWizardState>;
  initialStep?: CheckStep;
  disablePersistence?: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    initialState ? { ...INITIAL_STATE, ...initialState } : INITIAL_STATE,
  );
  const [step, setStep] = useState<CheckStep>(initialStep ?? "address");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (disablePersistence) {
      setHydrated(true);
      return;
    }
    if (typeof window === "undefined") return;
    // Pre-survey arrivals are explicit "start fresh" signals — the
    // installer fired a personalised link to a specific homeowner,
    // and the wizard prefill carries their email + name + the
    // request id. If we let localStorage rehydrate over the top, a
    // previous tester's leadCapturedAt would auto-skip step 5b
    // straight to a stale report. Wipe + skip rehydrate here so the
    // prefill is the source of truth.
    if (initialState?.preSurveyRequestId) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setHydrated(true);
      return;
    }
    // Focus-variant arrivals (/check/solar, /check/heatpump) are
    // also explicit "start fresh" signals — if we rehydrate from a
    // prior /check (focus='all') session, the persisted focus
    // overwrites the variant's intent and the persisted step (e.g.
    // 'floorplan') may not even exist in the variant's step order.
    // Symptom: user lands on /check/solar but sees the floorplan
    // step because that's where they were on /check yesterday.
    // Wipe + skip rehydrate when the URL declares a non-default
    // focus.
    if (initialState?.focus && initialState.focus !== "all") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.savedAt < STATE_TTL_MS) {
          dispatch({ type: "UPDATE", patch: parsed.state });
          // Validate the persisted step against the focus-aware
          // step order — a stale 'floorplan' from a prior /check
          // session would otherwise survive into /check/solar
          // where 'floorplan' isn't a valid step at all.
          const persistedFocus =
            (parsed.state as { focus?: WizardFocus } | undefined)?.focus ??
            "all";
          const validSteps = stepOrderForFocus(persistedFocus);
          if (validSteps.includes(parsed.step)) {
            setStep(parsed.step);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore — treat as no saved state
    }
    setHydrated(true);
  }, [
    disablePersistence,
    initialState?.preSurveyRequestId,
    initialState?.focus,
  ]);

  // Mint a clientSessionId after hydration if the saved state didn't
  // already have one. This is the dedupe key for /api/checks/upsert
  // — every wizard session needs one so the same draft check stays
  // updateable across reloads. crypto.randomUUID() is the obvious
  // choice; fallback to Math.random for stale browsers (very rare).
  useEffect(() => {
    if (disablePersistence) return;
    if (!hydrated) return;
    if (state.clientSessionId) return;
    const sid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    dispatch({ type: "UPDATE", patch: { clientSessionId: sid } });
  }, [hydrated, disablePersistence, state.clientSessionId]);

  useEffect(() => {
    if (disablePersistence) return;
    if (!hydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state, step, savedAt: Date.now() })
      );
    } catch {
      // ignore — probably quota
    }
  }, [state, step, hydrated, disablePersistence]);

  const update = useCallback((patch: Partial<CheckWizardState>) => {
    dispatch({ type: "UPDATE", patch });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    setStep("address");
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  const goTo = useCallback((s: CheckStep) => setStep(s), []);

  // Focus-aware navigation. Solar variant skips the floorplan step;
  // heat-pump + all keep the full sequence. Falls back to STEP_ORDER
  // when the wizard hasn't been told its focus (defensive for
  // legacy persisted state).
  const order = useMemo(
    () => stepOrderForFocus(state.focus ?? "all"),
    [state.focus],
  );

  const next = useCallback(() => {
    const i = order.indexOf(step);
    if (i >= 0 && i < order.length - 1) setStep(order[i + 1]);
  }, [step, order]);

  const back = useCallback(() => {
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
  }, [step, order]);

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
