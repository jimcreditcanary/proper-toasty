"use client";

import { useWizard } from "./context";

const STEP_LABELS = ["Who", "Details", "Buying", "Marketplace", "Check", "Review"];

export function WizardProgressBar() {
  const { stepNumber, totalSteps } = useWizard();
  const pct = Math.round((stepNumber / totalSteps) * 100);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">
          Step {stepNumber} of {totalSteps}
          <span className="hidden sm:inline text-slate-400"> — {STEP_LABELS[stepNumber - 1]}</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-coral transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
