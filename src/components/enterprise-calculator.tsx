"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Loader2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tier = {
  credits: number;
  pricePerCredit: number;
  total: number;
  envKey: string;
};

export function EnterprisePricingCalculator({ tiers }: { tiers: Tier[] }) {
  const [selected, setSelected] = useState(1); // index into tiers
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const tier = tiers[selected];
  const payAsYouGo = 2.5;
  const saving = ((payAsYouGo - tier.pricePerCredit) / payAsYouGo) * 100;

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/enterprise-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: tier.credits }),
      });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Tier selector cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
        {tiers.map((t, i) => {
          const isSelected = i === selected;
          const isBest = i === 2; // 100 credits
          return (
            <button
              key={t.credits}
              onClick={() => setSelected(i)}
              className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                isSelected
                  ? "border-coral bg-coral/5 shadow-lg shadow-coral/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              {isBest && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-coral px-2.5 py-0.5 text-[10px] font-semibold text-white">
                    <Crown className="size-2.5" />
                    Popular
                  </span>
                </div>
              )}
              <div className="text-2xl font-bold text-slate-900">{t.credits}</div>
              <div className="text-xs text-slate-500 mt-1">checks/mo</div>
              <div className="text-lg font-bold text-slate-900 mt-2">
                &pound;{t.total}
              </div>
              <div className="text-xs text-slate-500">
                &pound;{t.pricePerCredit.toFixed(2)}/check
              </div>
              {isSelected && (
                <div className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-coral">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected plan summary */}
      <div className="rounded-2xl border-2 border-coral bg-white shadow-lg shadow-coral/5 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {tier.credits} checks per month
            </h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">
                &pound;{tier.total.toFixed(2)}
              </span>
              <span className="text-slate-500">/month</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              &pound;{tier.pricePerCredit.toFixed(2)} per check
            </p>
            <div className="mt-3 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
              <span className="text-sm font-semibold text-emerald-700">
                Save {saving.toFixed(0)}% vs pay-as-you-go
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="h-12 px-8 text-[15px] font-semibold rounded-lg bg-coral hover:bg-coral-dark text-white shadow-sm hover:shadow-lg transition-all w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  Subscribe now
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Cancel any time. No lock-in.
            </p>
          </div>
        </div>

        {/* What's included */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-900 mb-3">Includes:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              `${tier.credits} enhanced checks per month`,
              "Unused credits roll over",
              "Full API access",
              "Monthly invoices & receipts",
              "Priority support",
              "Team accounts (coming soon)",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="flex size-4 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="size-2.5 text-emerald-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Volume slider visual */}
      <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">
          Volume pricing breakdown
        </h3>
        <div className="space-y-3">
          {tiers.map((t, i) => {
            const barWidth = ((payAsYouGo - t.pricePerCredit) / payAsYouGo) * 100;
            const isActive = i === selected;
            return (
              <div key={t.credits} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-slate-700 text-right shrink-0">
                  {t.credits}/mo
                </div>
                <div className="flex-1 h-8 bg-slate-200 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 ${
                      isActive ? "bg-coral" : "bg-coral/40"
                    }`}
                    style={{ width: `${Math.max(barWidth, 8)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className={`text-xs font-bold ${
                      isActive ? "text-slate-900" : "text-slate-500"
                    }`}>
                      &pound;{t.pricePerCredit.toFixed(2)}/check
                    </span>
                  </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-emerald-600 shrink-0">
                  -{((payAsYouGo - t.pricePerCredit) / payAsYouGo * 100).toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
