"use client";

import { useState } from "react";
import {
  Landmark,
  Building2,
  ShieldCheck,
  CalendarDays,
  FileText,
  ShoppingCart,
  Star,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { useWizard } from "./context";
import { Button } from "@/components/ui/button";
import type { CheckTier } from "./types";

const PURCHASE_OPTIONS = [
  { credits: 1 as const, price: "£2.50", note: null },
  { credits: 3 as const, price: "£5.00", note: "save £2.50" },
  { credits: 7 as const, price: "£10.00", note: "save £7.50" },
];

type Feature = {
  icon: React.ElementType;
  label: string;
  description: string;
  basic: boolean;
  enhanced: boolean;
  marketplaceOnly?: boolean;
};

export function Step4Tier() {
  const { state, update, setStep } = useWizard();
  const [selectedCredits, setSelectedCredits] = useState<1 | 3 | 7 | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const tier = state.checkTier;
  const showMarketplace = state.isMarketplace === true;

  const features: Feature[] = [
    {
      icon: Landmark,
      label: "Confirmation of Payee",
      description: "Bank account matches the name given",
      basic: true,
      enhanced: true,
    },
    {
      icon: Building2,
      label: "Companies House check",
      description: "Company is registered and active",
      basic: false,
      enhanced: true,
    },
    {
      icon: ShieldCheck,
      label: "VAT verification",
      description: "VAT number is valid with HMRC",
      basic: false,
      enhanced: true,
    },
    {
      icon: CalendarDays,
      label: "Trading history",
      description: "How long the company has been trading",
      basic: false,
      enhanced: true,
    },
    {
      icon: FileText,
      label: "Accounts filed",
      description: "Accounts are up to date with Companies House",
      basic: false,
      enhanced: true,
    },
    {
      icon: Star,
      label: "Online reviews",
      description: "Reputation across Google, Trustpilot & more",
      basic: false,
      enhanced: true,
    },
    {
      icon: ShoppingCart,
      label: "Marketplace valuation",
      description: "Listed price vs estimated market value",
      basic: false,
      enhanced: true,
      marketplaceOnly: true,
    },
  ];

  const visibleFeatures = features.filter(
    (f) => !f.marketplaceOnly || showMarketplace
  );

  function selectTier(t: CheckTier) {
    update({ checkTier: t });
    if (t === "enhanced" && state.isAuthenticated && state.userCredits > 0) {
      setStep(5);
    }
  }

  function handleBack() {
    if (state.isMarketplace !== null) {
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleContinue() {
    if (tier === "basic" && !state.isAuthenticated && !state.email.trim()) return;
    setStep(5);
  }

  async function handlePurchase(credits: 1 | 3 | 7) {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/wizard-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Something went wrong");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setCheckoutError("Failed to create checkout session");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const canContinue =
    tier === "basic" && (state.isAuthenticated || state.email.trim().length > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
        Choose your check
      </h2>
      <p className="text-sm text-slate-500">
        Select what you&apos;d like us to verify before you pay.
      </p>

      {/* ── Tier selector tabs ── */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => selectTier("basic")}
          className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${
            tier === "basic"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Basic — Free
        </button>
        <button
          type="button"
          onClick={() => selectTier("enhanced")}
          className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tier === "enhanced"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles className="size-3.5" />
          Enhanced — Paid
        </button>
      </div>

      {/* ── Feature checklist ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
        {visibleFeatures.map((feature) => {
          const included = tier === "enhanced" ? feature.enhanced : feature.basic;

          return (
            <div
              key={feature.label}
              className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                included ? "bg-white" : "bg-slate-50/50"
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                  included
                    ? "bg-coral/10 text-coral"
                    : "bg-slate-100 text-slate-300"
                }`}
              >
                <feature.icon className="size-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    included ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {feature.label}
                </p>
                <p
                  className={`text-xs ${
                    included ? "text-slate-500" : "text-slate-300"
                  }`}
                >
                  {feature.description}
                </p>
              </div>
              <div className="shrink-0">
                {included ? (
                  <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full bg-slate-100">
                    <X className="size-3.5 text-slate-300" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Enhanced: credits badge if authenticated ── */}
      {tier === "enhanced" && state.isAuthenticated && state.userCredits > 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="text-sm font-medium text-emerald-700">
            You have {state.userCredits} check{state.userCredits !== 1 ? "s" : ""} remaining
          </p>
        </div>
      )}

      {/* ── Enhanced: purchase options if no credits ── */}
      {tier === "enhanced" && (!state.isAuthenticated || state.userCredits === 0) && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              How many checks do you need?
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PURCHASE_OPTIONS.map(({ credits, price, note }) => (
                <button
                  key={credits}
                  type="button"
                  onClick={() => setSelectedCredits(credits)}
                  className={`rounded-xl border-2 p-3 sm:p-4 text-center transition-all cursor-pointer hover:border-coral/40 ${
                    selectedCredits === credits
                      ? "border-coral bg-coral/5"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-base sm:text-lg font-bold text-slate-900">
                    {credits}
                  </p>
                  <p className="text-xs text-slate-500">
                    check{credits !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm font-semibold text-coral mt-1">{price}</p>
                  {note && (
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{note}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedCredits && (
            <Button
              onClick={() => handlePurchase(selectedCredits)}
              disabled={checkoutLoading}
              className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  Purchase &amp; continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {checkoutError && (
            <p className="text-sm text-red-600">{checkoutError}</p>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-slate-500">or</span>
            </div>
          </div>

          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">
              Already have an account? Sign in to use your existing checks.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" render={<a href="/auth/login" />}>
                Sign In
              </Button>
              <Button variant="outline" render={<a href="/auth/login?tab=signup" />}>
                Create Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Basic: email input ── */}
      {tier === "basic" && !state.isAuthenticated && (
        <div>
          <label htmlFor="lead-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            id="lead-email"
            type="email"
            required
            placeholder="your@email.com"
            value={state.email}
            onChange={(e) => update({ email: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-coral focus:ring-1 focus:ring-coral/30 outline-none transition-colors"
          />
          <p className="mt-1 text-xs text-slate-500">
            We&apos;ll send your results to this email address.
          </p>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {tier === "basic" && (
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
