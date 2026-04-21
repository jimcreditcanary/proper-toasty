"use client";

import { ArrowLeft } from "lucide-react";
import { useCheckWizard } from "./context";
import type { CheckStep } from "./types";

const LABELS: Record<CheckStep, string> = {
  address: "Address",
  preview: "Property preview",
  questions: "A few questions",
  floorplan: "Floorplan upload",
  analysis: "Running analysis",
  report: "Your report",
};

/**
 * Placeholder UI for steps not yet implemented in this slice. Replaced step-by-step
 * in subsequent turns.
 */
export function StepStub({ step }: { step: CheckStep }) {
  const { state, back } = useCheckWizard();
  return (
    <div className="max-w-xl mx-auto w-full text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
        Coming up next
      </p>
      <h2 className="text-3xl font-bold tracking-tight text-navy">{LABELS[step]}</h2>
      <p className="mt-3 text-slate-600">
        This step isn&rsquo;t built yet — the next slice wires it up.
      </p>

      {state.address && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Address captured
          </p>
          <p className="text-sm font-medium text-navy">{state.address.formattedAddress}</p>
          <p className="mt-1 text-xs text-slate-500">
            {state.address.latitude.toFixed(5)}, {state.address.longitude.toFixed(5)}
            {state.country ? ` · ${state.country}` : ""}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={back}
        className="mt-10 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
    </div>
  );
}
