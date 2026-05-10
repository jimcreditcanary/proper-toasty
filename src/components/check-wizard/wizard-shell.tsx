"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CheckWizardProvider, useCheckWizard } from "./context";
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
const VISIBLE_STEPS: CheckStep[] = [
  "address",
  "preview",
  "questions",
  "floorplan",
  "analysis",
  "report",
];

function HeaderProgress() {
  const { step } = useCheckWizard();
  // Treat `lead_capture` as part of `analysis` for progress purposes.
  const effectiveStep: CheckStep = step === "lead_capture" ? "analysis" : step;
  const currentIdx = VISIBLE_STEPS.indexOf(effectiveStep);
  return (
    <div className="flex items-center gap-1" aria-label={`Step ${currentIdx + 1} of ${VISIBLE_STEPS.length}`}>
      {VISIBLE_STEPS.map((s, i) => (
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
        {currentIdx + 1} / {VISIBLE_STEPS.length}
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
  return (
    <CheckWizardProvider initialState={initialState}>
      <PageTitleSync />
      {/* (Skip-to-main-content link removed — its focus position
          drifted inconsistently across pages, causing more confusion
          than it solved. Users with assistive tech can still navigate
          past the sticky header via landmarks: <header> + <main>.) */}
      <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size="sm" variant="light" />
          </Link>
          <div className="flex-1 flex items-center justify-center min-w-0">
            <HeaderProgress />
          </div>
          <span className="hidden md:inline text-[11px] font-medium uppercase tracking-wider text-[var(--muted-brand)] shrink-0">
            Heat pump &amp; solar check
          </span>
        </div>
      </header>
      <main id="wizard-main" tabIndex={-1} className="flex-1 bg-gradient-to-b from-cream-deep to-cream">
        <StepWrapper />
      </main>
    </CheckWizardProvider>
  );
}

// Re-exported so legacy STEP_ORDER consumers (tests, fixtures) aren't broken
// by the visible/effective split above.
export { STEP_ORDER };
