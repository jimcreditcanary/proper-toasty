"use client";

import { useRouter } from "next/navigation";
import { Building2, User, HelpCircle, ArrowRight } from "lucide-react";

const OPTIONS = [
  { label: "A business", icon: Building2, value: "business" },
  { label: "A person", icon: User, value: "person" },
  { label: "I'm not sure", icon: HelpCircle, value: "unsure" },
] as const;

export function LazyWizard() {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg shadow-slate-200/50">
      <div className="mb-2">
        <span className="text-sm text-slate-500">Step 1 of 6</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 mb-6">
        <div className="h-1.5 rounded-full bg-coral w-[17%]" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Who are you paying?
      </h3>
      <p className="text-sm text-slate-500 mb-6">
        Select who you need to verify before making a payment.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => router.push(`/verify?payee=${opt.value}`)}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 p-5 transition-all hover:border-coral/40 hover:bg-coral/[0.02] hover:shadow-sm group"
          >
            <opt.icon className="size-7 text-slate-400 group-hover:text-coral transition-colors" />
            <span className="text-sm font-medium text-slate-900">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={() => router.push("/verify")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-coral hover:text-coral-dark transition-colors"
        >
          Start a check
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
