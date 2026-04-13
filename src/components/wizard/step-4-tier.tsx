"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useWizard } from "./context";
import { Button } from "@/components/ui/button";
import type { CheckTier } from "./types";

const PURCHASE_OPTIONS = [
  { credits: 1 as const, price: "£2.50", note: null },
  { credits: 3 as const, price: "£5.00", note: "save £2.50" },
  { credits: 7 as const, price: "£10.00", note: "save £7.50" },
];

export function Step4Tier() {
  const { state, update, setStep } = useWizard();
  const [selectedCredits, setSelectedCredits] = useState<1 | 3 | 7 | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const tier = state.checkTier;
  const showMarketplaceFeature = state.isMarketplace === true;

  function selectTier(t: CheckTier) {
    update({ checkTier: t });

    // Auto-advance if enhanced + authenticated + has credits
    if (t === "enhanced" && state.isAuthenticated && state.userCredits > 0) {
      setStep(5);
    }
  }

  function handleBack() {
    // Go back to step 3 if marketplace was shown, else step 2
    if (state.isMarketplace !== null) {
      setStep(3);
    } else {
      setStep(2);
    }
  }

  function handleContinue() {
    if (tier === "basic" && !state.isAuthenticated && !state.email.trim()) {
      return; // email required
    }
    setStep(5);
  }

  async function handlePurchase(credits: 1 | 3 | 7) {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/wizard-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits,
          wizardState: JSON.stringify(state),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Something went wrong");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
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
      <h2 className="text-2xl font-semibold text-slate-900">
        We can check those details for you — would you like to run a full check?
      </h2>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic — Free */}
        <button
          type="button"
          onClick={() => selectTier("basic")}
          className={`rounded-xl border-2 p-6 text-left transition-colors cursor-pointer hover:border-coral/40 ${
            tier === "basic"
              ? "border-coral bg-coral/5"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-6 w-6 text-coral" />
            <h3 className="text-lg font-semibold text-slate-900">Basic</h3>
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            Confirmation of Payee (CoP) only
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Checks that the bank account matches the name given
          </p>
          <p className="text-lg font-semibold text-slate-900">Free</p>
        </button>

        {/* Enhanced — Paid */}
        <button
          type="button"
          onClick={() => selectTier("enhanced")}
          className={`relative rounded-xl border-2 p-6 text-left transition-colors cursor-pointer ring-1 ring-coral/30 shadow-lg hover:border-coral/40 ${
            tier === "enhanced"
              ? "border-coral bg-coral/5"
              : "border-coral"
          }`}
        >
          <span className="absolute -top-2.5 right-4 inline-flex items-center rounded-full bg-coral px-2.5 py-0.5 text-xs font-medium text-white">
            Recommended
          </span>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-6 w-6 text-coral" />
            <h3 className="text-lg font-semibold text-slate-900">Enhanced</h3>
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            Everything in Basic, plus:
          </p>
          <ul className="text-sm text-slate-500 space-y-1 mb-4">
            <li>Companies House verification</li>
            <li>VAT API verification</li>
            <li>Trading history &amp; accounts filed</li>
            {showMarketplaceFeature && (
              <li>+ Marketplace price vs valuation</li>
            )}
          </ul>
          <p className="text-lg font-semibold text-slate-900">Paid</p>
        </button>
      </div>

      {/* Enhanced selected + authenticated + has credits */}
      {tier === "enhanced" && state.isAuthenticated && state.userCredits > 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <p className="text-sm font-medium text-emerald-700">
            You have {state.userCredits} check{state.userCredits !== 1 ? "s" : ""} remaining
          </p>
        </div>
      )}

      {/* Enhanced selected + (not authenticated OR no credits) */}
      {tier === "enhanced" && (!state.isAuthenticated || state.userCredits === 0) && (
        <div className="space-y-6">
          {/* Purchase options */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              How many checks do you need?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PURCHASE_OPTIONS.map(({ credits, price, note }) => (
                <button
                  key={credits}
                  type="button"
                  onClick={() => setSelectedCredits(credits)}
                  className={`rounded-xl border-2 p-4 text-center transition-colors cursor-pointer hover:border-coral/40 ${
                    selectedCredits === credits
                      ? "border-coral bg-coral/5"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-lg font-semibold text-slate-900">
                    {credits} check{credits !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm font-medium text-coral">{price}</p>
                  {note && (
                    <p className="text-xs text-emerald-600 mt-1">{note}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedCredits && (
            <Button
              onClick={() => handlePurchase(selectedCredits)}
              disabled={checkoutLoading}
              className="w-full h-10 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg"
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

          {/* Sign in / create account */}
          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">
              Already have an account? Sign in to use your existing checks.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                render={<a href="/auth/login" />}
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                render={<a href="/auth/login?tab=signup" />}
              >
                Create Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Basic selected + not authenticated: email input */}
      {tier === "basic" && !state.isAuthenticated && (
        <div>
          <label
            htmlFor="lead-email"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
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

      {/* Navigation */}
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
