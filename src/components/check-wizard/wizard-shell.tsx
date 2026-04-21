"use client";

import { CheckWizardProvider, useCheckWizard } from "./context";
import { STEP_ORDER, type CheckStep } from "./types";
import { Step1Address } from "./step-1-address";
import { Step2Preview } from "./step-2-preview";
import { Step3Questions } from "./step-3-questions";
import { Step4Floorplan } from "./step-4-floorplan";
import { Step5Analysis } from "./step-5-analysis";
import { StepStub } from "./step-stubs";
import { CountryGate } from "./country-gate";
import { isV1SupportedCountry } from "@/lib/postcode/region";

function Progress() {
  const { step } = useCheckWizard();
  const currentIdx = STEP_ORDER.indexOf(step);
  return (
    <div className="flex items-center justify-center gap-1.5 mb-10">
      {STEP_ORDER.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i <= currentIdx ? "bg-coral" : "bg-slate-200"
          }`}
          style={{ width: i <= currentIdx ? 32 : 20 }}
          aria-hidden
        />
      ))}
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
    case "report":
      return <StepStub step={step as CheckStep} />;
  }
}

export function CheckWizard() {
  return (
    <CheckWizardProvider>
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <Progress />
        <CurrentStep />
      </div>
    </CheckWizardProvider>
  );
}
