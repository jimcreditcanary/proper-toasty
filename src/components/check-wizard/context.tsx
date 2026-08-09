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
import { track } from "@vercel/analytics/react";
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
  /** True when this load restored a prior, in-progress/completed journey
   *  from localStorage (only happens on the plain /check entry — focus
   *  variants wipe the cache). The wizard shell uses this to offer a
   *  "resume or start fresh" choice so a stale partner/focus journey
   *  doesn't silently hijack a fresh /check. */
  restoredFromCache: boolean;
  /** Dismiss the resume prompt, keeping the restored journey. */
  dismissResume: () => void;
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
  const [restoredFromCache, setRestoredFromCache] = useState(false);

  // Hydration effect — bridges SSR (no localStorage available) and
  // the client's persisted wizard state. We deliberately setState
  // inside this effect to flag hydration-complete + restore the
  // persisted step. The "cascading renders" lint rule fires here
  // but this is the canonical pattern for client-only persisted
  // state in App Router; there's no external store API that fits
  // (useSyncExternalStore is for store changes, not one-shot
  // hydration). Disables are scoped to the specific setState
  // calls + commented with the reason.
  // Hero mini-wizard hand-off. When the URL flags a hero arrival
  // (?fromhero=1) and sessionStorage has the prefill blob, hydrate
  // the address + country + jump straight to the questions step —
  // the wizard's own address search would just re-collect what the
  // hero already resolved. The prefill is consumed on read.
  //
  // Extracted from the hydration effect so both the focus-variant
  // branch and the /check top-level branch can call it consistently.
  const tryHeroPrefill = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("fromhero") !== "1") return;
    try {
      const raw = sessionStorage.getItem("hero_prefill_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        address?: unknown;
        country?: unknown;
      };
      if (!parsed.address) return;
      dispatch({
        type: "UPDATE",
        patch: {
          address: parsed.address as CheckWizardState["address"],
          country: parsed.country as CheckWizardState["country"],
        },
      });
      // Skip step 1 (address search) — the hero already ran the
      // OS Places lookup. Land the user on step 2 (preview) so
      // they still see the aerial "is this your home?" confirm
      // before answering questions. That's the single address
      // confirmation Jim's brief keeps.
      setStep("preview");
      // JourneyStart per Jim's Aug 2026 taxonomy — the user has
      // landed on /check/* WITH a postcode. Since step-1-address is
      // skipped on hero arrivals, its journey_start emitter is
      // skipped too — fire it here so the funnel step still counts.
      // state.focus is stable across the wizard's life (set once at
      // reducer construction from the page-level focus prop and
      // never mutated), so the closure snapshot is correct.
      track("journey_start", {
        source: "hero_wizard",
        journey: state.focus ?? "all",
      });
      // Consume — a page refresh shouldn't re-fire the hop.
      sessionStorage.removeItem("hero_prefill_v1");
    } catch {
      // ignore — corrupted prefill / storage disabled
    }
  }, [state.focus]);

  useEffect(() => {
    if (disablePersistence) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration flag
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
      // Hero mini-wizard hand-off — check for a stashed prefill
      // and skip the wizard's own address step if present. Only
      // fires when the URL flags a hero arrival (?fromhero=1) so
      // an unrelated visit can't accidentally pull a stale prefill.
      tryHeroPrefill();
      setHydrated(true);
      return;
    }

    // Hero hand-off on the /check top-level route (focus="all" —
    // the "All three" option in the hero picker). When the URL
    // declares a hero arrival (?fromhero=1) we treat it as an
    // explicit "start fresh here" signal, exactly like the focus-
    // variant branch above:
    //   1. Wipe localStorage so a stale saved state can't clobber
    //      the hero prefill's step (Aug 2026 bug — Jim's session
    //      with cached step="address" was overwriting tryHeroPrefill's
    //      setStep("preview") because the rehydrate ran AFTER the
    //      prefill's setStep in the same effect tick, so the
    //      rehydrate won and the user landed back on the address
    //      search they'd just completed in the hero).
    //   2. Fire tryHeroPrefill authoritatively.
    //   3. SKIP the rehydrate block — no localStorage read at all.
    const params = new URLSearchParams(window.location.search);
    if (params.get("fromhero") === "1") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      tryHeroPrefill();
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
          // Flag a restored journey worth offering to resume — they got
          // past the first step or already picked an address (and/or the
          // session carries a non-default focus/partner). Mid-"address"
          // sessions with nothing entered aren't worth a prompt.
          const ps = parsed.state as Partial<CheckWizardState> | undefined;
          const meaningful =
            parsed.step !== "address" ||
            !!ps?.address ||
            (ps?.focus && ps.focus !== "all") ||
            !!ps?.partner;
          if (meaningful) {
            setRestoredFromCache(true);
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
    // tryHeroPrefill is stable (useCallback with empty deps) but
    // the exhaustive-deps rule can't prove that — safe to include.
    tryHeroPrefill,
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
    setRestoredFromCache(false);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  const dismissResume = useCallback(() => setRestoredFromCache(false), []);

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
    () => ({
      state,
      step,
      update,
      reset,
      goTo,
      next,
      back,
      restoredFromCache,
      dismissResume,
    }),
    [
      state,
      step,
      update,
      reset,
      goTo,
      next,
      back,
      restoredFromCache,
      dismissResume,
    ]
  );

  return <CheckWizardContext.Provider value={value}>{children}</CheckWizardContext.Provider>;
}

export function useCheckWizard(): CheckWizardContextValue {
  const ctx = useContext(CheckWizardContext);
  if (!ctx) throw new Error("useCheckWizard must be used inside CheckWizardProvider");
  return ctx;
}
