"use client";

import { useWizard } from "./context";
import { WizardProgressBar } from "./progress-bar";
import { Step1PayeeType } from "./step-1-payee-type";
import { Step2Category } from "./step-2-category";
import { Step3Vehicle } from "./step-3-vehicle";
import { Step4Marketplace } from "./step-4-marketplace";
import { Step5Details } from "./step-5-details";
import { Step6Checks } from "./step-6-checks";

export function WizardShell() {
  const { step } = useWizard();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg shadow-slate-200/50">
        <WizardProgressBar />

        {step === 1 && <Step1PayeeType />}
        {step === 2 && <Step2Category />}
        {step === 3 && <Step3Vehicle />}
        {step === 4 && <Step4Marketplace />}
        {step === 5 && <Step5Details />}
        {step === 6 && <Step6Checks />}
      </div>
    </div>
  );
}
