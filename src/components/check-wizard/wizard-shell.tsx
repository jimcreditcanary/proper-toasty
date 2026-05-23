"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Play } from "lucide-react";
import { Logo } from "@/components/logo";
import { CheckWizardProvider, useCheckWizard } from "./context";
import { getPartner } from "@/lib/services/boiler-comparison";
import { STEP_ORDER, type CheckStep, type CheckWizardState } from "./types";
import { Step1Address } from "./step-1-address";
import { Step2Preview } from "./step-2-preview";
import { Step3Questions } from "./step-3-questions";
// Step 4 is the upload-only flow as of the v2 migration. The legacy
// canvas builder (step-4-floorplan.tsx) stays in the codebase to be
// removed in a follow-up commit once the new flow is validated on
// the three test fixtures.
import { Step4Upload } from "./step-4-upload";
import { Step5Analysis } from "./step-5-analysis";
import { Step5bLeadCapture } from "./step-5b-lead-capture";
import { Step6Report } from "./step-6-report";
import { CountryGate } from "./country-gate";
import { isV1SupportedCountry } from "@/lib/postcode/region";

// Visible steps in the header progress — `lead_capture` is collapsed into
// the analysis/report continuum so the user sees a clean "X of 6".
const VISIBLE_STEPS_ALL: CheckStep[] = [
  "address",
  "preview",
  "questions",
  "floorplan",
  "analysis",
  "report",
];

// Solar + boiler variants skip the floorplan step (mirrors
// stepOrderForFocus in types.ts) — keep the bar count honest so
// "Step 4 of 5" doesn't stretch into a non-existent floorplan slot.
const VISIBLE_STEPS_NO_FLOORPLAN: CheckStep[] = VISIBLE_STEPS_ALL.filter(
  (s) => s !== "floorplan",
);

// Right-hand context label in the wizard header. Reflects the
// variant the user came in on so the header reads consistently
// with the marketing landing page they clicked from.
function FocusLabel() {
  const { state } = useCheckWizard();
  const label =
    state.focus === "solar"
      ? "Solar check"
      : state.focus === "heatpump"
        ? "Heat pump check"
        : state.focus === "boiler"
          ? "Boiler vs heat pump"
          : "Heat pump & solar check";
  return (
    <span className="hidden md:inline text-[11px] font-medium uppercase tracking-wider text-[var(--muted-brand)] shrink-0">
      {label}
    </span>
  );
}

function HeaderProgress() {
  const { step, state } = useCheckWizard();
  // Treat `lead_capture` as part of `analysis` for progress purposes.
  const effectiveStep: CheckStep = step === "lead_capture" ? "analysis" : step;
  const visibleSteps =
    state.focus === "solar" || state.focus === "boiler"
      ? VISIBLE_STEPS_NO_FLOORPLAN
      : VISIBLE_STEPS_ALL;
  const currentIdx = visibleSteps.indexOf(effectiveStep);
  return (
    <div className="flex items-center gap-1" aria-label={`Step ${currentIdx + 1} of ${visibleSteps.length}`}>
      {visibleSteps.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i <= currentIdx ? "bg-coral" : "bg-slate-200"
          }`}
          style={{ width: i === currentIdx ? 28 : i < currentIdx ? 20 : 14 }}
          aria-hidden
        />
      ))}
      <span className="ml-2 text-[11px] font-medium tabular-nums text-slate-500 hidden sm:inline">
        {currentIdx + 1} / {visibleSteps.length}
      </span>
    </div>
  );
}

function CurrentStep() {
  const { step, state } = useCheckWizard();

  // Country gate short-circuits the preview step for Scotland / NI.
  if (step !== "address" && state.country && !isV1SupportedCountry(state.country)) {
    return <CountryGate country={state.country} />;
  }

  switch (step) {
    case "address":
      return <Step1Address />;
    case "preview":
      return <Step2Preview />;
    case "questions":
      return <Step3Questions />;
    case "floorplan":
      return <Step4Upload />;
    case "analysis":
      return <Step5Analysis />;
    case "lead_capture":
      return <Step5bLeadCapture />;
    case "report":
      return <Step6Report />;
  }
}

// Per-step page titles — better for browser tabs, history entries, and
// screen-reader users (each step gets a clear context when it loads).
const STEP_TITLES: Record<CheckStep, string> = {
  address: "Find your address — Propertoasty",
  preview: "Confirm your home — Propertoasty",
  questions: "A few quick questions — Propertoasty",
  floorplan: "Upload your floorplan — Propertoasty",
  analysis: "Running your check — Propertoasty",
  lead_capture: "Where should we send your report? — Propertoasty",
  report: "Your home report — Propertoasty",
};

function PageTitleSync() {
  const { step } = useCheckWizard();
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = STEP_TITLES[step] ?? "Heat pump & solar check — Propertoasty";
  }, [step]);
  return null;
}

// Single width mode for the whole wizard — max-w-7xl matches the header
// so brand-mark and content edges align on every step. Form-style steps
// (address, questions, lead capture) keep their own inner max-widths
// where they need to (e.g. step-1-address has a narrow input column);
// see each step's own root <div> max-w-* for that.
function StepWrapper() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <CurrentStep />
    </div>
  );
}

interface CheckWizardProps {
  initialState?: Partial<CheckWizardState>;
}

export function CheckWizard({ initialState }: CheckWizardProps = {}) {
  // Brand-partner journeys (e.g. Octopus, /check/octopus) get an
  // illustrative colour takeover scoped via `theme-octopus` (globals.css).
  const partner = getPartner(initialState?.partner);
  return (
    <CheckWizardProvider initialState={initialState}>
      <div className={partner ? "theme-octopus" : undefined}>
        <PageTitleSync />
        {/* (Skip-to-main-content link removed — its focus position
            drifted inconsistently across pages, causing more confusion
            than it solved. Users with assistive tech can still navigate
            past the sticky header via landmarks: <header> + <main>.) */}
        <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Logo size="sm" variant="light" />
              {partner && (
                <span className="hidden sm:inline text-[11px] font-medium text-[var(--muted-brand)] whitespace-nowrap">
                  &times; {partner.name}
                </span>
              )}
            </Link>
            <div className="flex-1 flex items-center justify-center min-w-0">
              <HeaderProgress />
            </div>
            <FocusLabel />
          </div>
        </header>
        <main id="wizard-main" tabIndex={-1} className="flex-1 bg-gradient-to-b from-cream-deep to-cream">
          <StepWrapper />
        </main>
        <ResumeJourneyModal />
      </div>
    </CheckWizardProvider>
  );
}

// Shown when a prior journey was restored from localStorage on the
// plain /check entry — lets the user resume it or wipe the cache and
// start fresh. Fixes the "I clicked a fresh check but landed back in my
// old Octopus journey" confusion: /check rehydrates the last session's
// focus/partner, so without this prompt a stale journey silently
// hijacks the new one.
function ResumeJourneyModal() {
  const { restoredFromCache, dismissResume, reset, state } = useCheckWizard();
  if (!restoredFromCache) return null;

  const partner = getPartner(state.partner);
  const label = partner
    ? `your ${partner.name} check`
    : state.focus === "boiler"
      ? "your boiler vs heat pump check"
      : state.focus === "solar"
        ? "your solar check"
        : state.focus === "heatpump"
          ? "your heat pump check"
          : "a check you started";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-[var(--border)] p-6 sm:p-7">
        <h2
          id="resume-title"
          className="text-xl font-bold text-navy"
        >
          Pick up where you left off?
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          We found {label} saved on this device. You can carry on with it,
          or clear it and start a brand-new check.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={dismissResume}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors"
          >
            <Play className="w-4 h-4" />
            Continue my check
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start a new check
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-exported so legacy STEP_ORDER consumers (tests, fixtures) aren't broken
// by the visible/effective split above.
export { STEP_ORDER };
