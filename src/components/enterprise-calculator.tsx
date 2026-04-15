"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Loader2, Crown, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tier = {
  credits: number;
  pricePerCredit: number;
  total: number;
  envKey: string;
};

export function EnterprisePricingCalculator({ tiers }: { tiers: Tier[] }) {
  const [selected, setSelected] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const tier = tiers[selected];
  const payAsYouGo = 2.5;
  const saving = ((payAsYouGo - tier.pricePerCredit) / payAsYouGo) * 100;
  const monthlySaving = (payAsYouGo * tier.credits - tier.total).toFixed(0);

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
          const isBest = i === 2;
          const tierSaving = ((payAsYouGo - t.pricePerCredit) / payAsYouGo) * 100;
          return (
            <button
              key={t.credits}
              onClick={() => setSelected(i)}
              className={`relative rounded-xl border-2 p-4 text-center transition-all duration-200 ${
                isSelected
                  ? "border-coral bg-coral/5 shadow-lg shadow-coral/10 scale-[1.02]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {isBest && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-coral px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
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
              <div className={`text-xs font-semibold mt-1 ${isSelected ? "text-coral" : "text-slate-400"}`}>
                &pound;{t.pricePerCredit.toFixed(2)}/check
              </div>
              <div className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isSelected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                Save {tierSaving.toFixed(0)}%
              </div>
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-coral shadow-sm">
                  <Check className="size-3.5 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected plan summary */}
      <div className="rounded-2xl border-2 border-coral bg-white shadow-xl shadow-coral/5 overflow-hidden">
        {/* Gradient top accent */}
        <div className="h-1.5 bg-gradient-to-r from-coral via-coral-light to-coral" />

        <div className="p-8">
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
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-sm font-semibold text-emerald-700">
                  <TrendingDown className="size-3.5" />
                  Save {saving.toFixed(0)}% vs pay-as-you-go
                </span>
                <span className="inline-flex items-center rounded-full bg-coral/10 border border-coral/20 px-3 py-1 text-sm font-semibold text-coral">
                  &pound;{monthlySaving}/mo saved
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
                `${tier.credits} checks per month`,
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
      </div>

      {/* Volume pricing — redesigned as interactive chart */}
      <div className="mt-10 rounded-2xl bg-slate-900 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-coral/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown className="size-5 text-coral" />
            <h3 className="font-semibold text-white">
              The more you check, the less you pay
            </h3>
          </div>

          <div className="space-y-3">
            {tiers.map((t, i) => {
              const isActive = i === selected;
              const barPercent = (t.pricePerCredit / payAsYouGo) * 100;
              const savedPercent = 100 - barPercent;
              return (
                <button
                  key={t.credits}
                  onClick={() => setSelected(i)}
                  className={`w-full flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 ring-1 ring-coral/50"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-16 text-sm font-bold text-white text-right shrink-0">
                    {t.credits}<span className="text-white/50 font-normal">/mo</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    {/* Price bar */}
                    <div className="flex-1 h-10 bg-white/5 rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full rounded-lg transition-all duration-500 ${
                          isActive
                            ? "bg-gradient-to-r from-coral to-coral-light"
                            : "bg-white/15"
                        }`}
                        style={{ width: `${barPercent}%` }}
                      />
                      {/* Price label inside bar */}
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className={`text-sm font-bold ${isActive ? "text-white" : "text-white/60"}`}>
                          &pound;{t.pricePerCredit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-20 text-right shrink-0 ${isActive ? "text-emerald-400" : "text-emerald-400/50"}`}>
                    <span className="text-sm font-bold">-{savedPercent.toFixed(0)}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pay-as-you-go reference line */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/40">Pay-as-you-go rate</span>
            <span className="text-xs font-mono text-white/40">&pound;2.50/check</span>
          </div>
        </div>
      </div>
    </div>
  );
}
