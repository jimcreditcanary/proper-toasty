"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { CheckWizardProvider, useCheckWizard } from "./context";
import { STEP_ORDER, type CheckStep } from "./types";
import { Step1Address } from "./step-1-address";
import { Step2Preview } from "./step-2-preview";
import { Step3Questions } from "./step-3-questions";
import { Step4Floorplan } from "./step-4-floorplan";
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
      return <Step4Floorplan />;
    case "analysis":
      return <Step5Analysis />;
    case "lead_capture":
      return <Step5bLeadCapture />;
    case "report":
      return <Step6Report />;
  }
}

// The report wants the full viewport width — its left-nav + 5 wide tabs
// need every pixel they can get. Every other step is form-style content
// that reads better in a narrower column.
function StepWrapper() {
  const { step } = useCheckWizard();
  const isReport = step === "report";
  const wrapperClass = isReport
    ? "w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8"
    : "mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-10";
  return (
    <div className={wrapperClass}>
      <CurrentStep />
    </div>
  );
}

export function CheckWizard() {
  return (
    <CheckWizardProvider>
      <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
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
      <main className="flex-1 bg-gradient-to-b from-cream-deep to-cream">
        <StepWrapper />
      </main>
    </CheckWizardProvider>
  );
}

// Re-exported so legacy STEP_ORDER consumers (tests, fixtures) aren't broken
// by the visible/effective split above.
export { STEP_ORDER };
