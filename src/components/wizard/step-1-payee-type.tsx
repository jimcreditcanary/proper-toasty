"use client";

import { Building2, User, HelpCircle } from "lucide-react";
import { useWizard } from "./context";
import type { PayeeType } from "./types";

const options: { type: PayeeType; label: string; icon: React.ElementType }[] = [
  { type: "business", label: "A business", icon: Building2 },
  { type: "person", label: "A person", icon: User },
  { type: "unknown", label: "I don't know", icon: HelpCircle },
];

export function Step1PayeeType() {
  const { state, update, setStep } = useWizard();

  function handleSelect(type: PayeeType) {
    update({ payeeType: type });
    setStep("1b");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        Who are you paying?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map(({ type, label, icon: Icon }) => {
          const selected = state.payeeType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              className={`rounded-xl border-2 p-6 flex flex-col items-center gap-3 transition-colors cursor-pointer hover:border-coral/40 ${
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
    </div>
  );
}
