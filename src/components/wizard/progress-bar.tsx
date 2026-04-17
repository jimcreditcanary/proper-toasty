"use client";

import { useWizard } from "./context";

export function WizardProgressBar() {
  const { stepNumber, totalSteps, step, state } = useWizard();
  const pct = Math.round((stepNumber / totalSteps) * 100);

  // Step 3 is shared between vehicle-reg and property-address lookups —
  // label it based on what the user is buying.
  const step3Label =
    state.purchaseCategory === "property" ? "Property" : "Vehicle";

  const labels: Record<number, string> = {
    1: "Who",
    2: "Buying",
    3: step3Label,
    4: "Marketplace",
    5: "Details",
    6: "Checks",
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">
          Step {stepNumber} of {totalSteps}
          <span className="hidden sm:inline text-slate-400">
            {" \u2014 "}
            {labels[step as number] ?? ""}
          </span>
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
