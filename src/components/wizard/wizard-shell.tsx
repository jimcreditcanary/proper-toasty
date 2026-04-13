"use client";

import { useWizard } from "./context";
import { WizardProgressBar } from "./progress-bar";
import { Step1PayeeType } from "./step-1-payee-type";
import { Step1bDetails } from "./step-1b-details";
import { Step2Category } from "./step-2-category";
import { Step3Marketplace } from "./step-3-marketplace";
import { Step4Tier } from "./step-4-tier";
import { Step5Summary } from "./step-5-summary";

export function WizardShell() {
  const { step } = useWizard();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg shadow-slate-200/50">
        <WizardProgressBar />

        {step === 1 && <Step1PayeeType />}
        {step === "1b" && <Step1bDetails />}
        {step === 2 && <Step2Category />}
        {step === 3 && <Step3Marketplace />}
        {step === 4 && <Step4Tier />}
        {step === 5 && <Step5Summary />}
      </div>
    </div>
  );
}
