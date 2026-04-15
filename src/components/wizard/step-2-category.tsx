"use client";

import { Car, Home, Hammer, Briefcase, HelpCircle, ArrowLeft } from "lucide-react";
import { useWizard } from "./context";
import type { PurchaseCategory } from "./types";

const options: { type: PurchaseCategory; label: string; icon: React.ElementType }[] = [
  { type: "vehicle", label: "A vehicle (car / motorcycle)", icon: Car },
  { type: "tradesperson", label: "A tradesperson", icon: Hammer },
  { type: "property", label: "A property", icon: Home },
  { type: "service", label: "A service", icon: Briefcase },
  { type: "something_else", label: "Something else", icon: HelpCircle },
];

export function Step2Category() {
  const { state, update, setStep } = useWizard();

  function handleSelect(type: PurchaseCategory) {
    update({ purchaseCategory: type });

    if (type === "vehicle") {
      // Vehicle reg → marketplace → details
      setStep(3);
      return;
    }

    // No vehicle reg for non-vehicle categories
    update({
      vehicleReg: "",
      dvlaData: null,
      dvlaError: null,
      vehicleConfirmed: false,
    });

    if (type === "something_else") {
      // Marketplace step still relevant (eBay/Gumtree/etc.)
      setStep(4);
      return;
    }

    // Tradesperson / property / service — skip marketplace too
    update({
      marketplaceSource: null,
      marketplaceOther: "",
      marketplaceScreenshot: null,
      marketplaceScreenshotUrl: null,
      marketplaceError: null,
    });
    setStep(5);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        What are you paying for?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map(({ type, label, icon: Icon }) => {
          const selected = state.purchaseCategory === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              className={`rounded-xl border-2 p-5 flex items-center gap-3 transition-colors cursor-pointer hover:border-coral/40 text-left ${
                selected ? "border-coral bg-coral/5" : "border-slate-200"
              }`}
            >
              <Icon className="h-7 w-7 text-slate-600 shrink-0" />
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}
