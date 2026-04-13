"use client";

import { Car, Home, TrendingUp, Hammer, Briefcase, HelpCircle, ArrowLeft } from "lucide-react";
import { useWizard } from "./context";
import type { PurchaseCategory } from "./types";

const options: { type: PurchaseCategory; label: string; icon: React.ElementType }[] = [
  { type: "vehicle", label: "Vehicle", icon: Car },
  { type: "property", label: "Property", icon: Home },
  { type: "investment", label: "Investment", icon: TrendingUp },
  { type: "building_work", label: "Building work", icon: Hammer },
  { type: "services", label: "Paying for services", icon: Briefcase },
  { type: "other", label: "Something else", icon: HelpCircle },
];

export function Step2Category() {
  const { state, update, setStep } = useWizard();

  function handleSelect(type: PurchaseCategory) {
    update({ purchaseCategory: type });
    setStep(3);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        What are you buying?
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {options.map(({ type, label, icon: Icon }) => {
          const selected = state.purchaseCategory === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              className={`rounded-xl border-2 p-5 flex flex-col items-center gap-2 text-center transition-colors cursor-pointer hover:border-coral/40 ${
                selected
                  ? "border-coral bg-coral/5"
                  : "border-slate-200"
              }`}
            >
              <Icon className="h-8 w-8 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setStep("1b")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}
