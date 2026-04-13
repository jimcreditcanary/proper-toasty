"use client";

import { useState } from "react";
import {
  ShoppingCart,
  X,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWizard } from "./context";

export function Step3Marketplace() {
  const { state, update, setStep } = useWizard();
  const [error, setError] = useState<string | null>(null);

  function handleMarketplaceChoice(isMarketplace: boolean) {
    update({ isMarketplace: isMarketplace });
  }

  async function handleCheckListing() {
    if (!state.marketplaceUrl.trim()) return;

    setError(null);
    update({ marketplaceLoading: true, marketplaceError: null, marketplaceResult: null });

    try {
      const res = await fetch("/api/marketplace-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.marketplaceUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      const result = await res.json();
      update({ marketplaceResult: result, marketplaceLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      update({ marketplaceLoading: false, marketplaceError: message });
    }
  }

  const canContinue =
    state.isMarketplace === false ||
    (state.isMarketplace === true && state.marketplaceResult !== null);

  const confidenceColors: Record<string, string> = {
    high: "bg-green-100 text-green-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        Are you buying from Facebook Marketplace?
      </h2>

      {/* Yes / No cards */}
      <div className="grid grid-cols-2 gap-4">
        {([
          { value: true, label: "Yes", icon: ShoppingCart },
          { value: false, label: "No", icon: X },
        ] as const).map(({ value, label, icon: Icon }) => {
          const selected = state.isMarketplace === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleMarketplaceChoice(value)}
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

      {/* Marketplace: Yes flow */}
      {state.isMarketplace === true && (
        <div className="space-y-5">
          {/* Safety guidance card */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <h3 className="text-lg font-semibold text-slate-900">Stay Safe</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                <strong>Check their profile</strong> — How long have they been on
                Facebook? Do they have real friends and real posts? Do they have
                reviews or star ratings from other buyers on Marketplace? A new
                account with no friends and no reviews is a warning sign.
              </p>
              <p>
                <strong>Ask for proof they have the item</strong> — Ask the seller
                to send you a photo of the item with a piece of paper showing
                today&apos;s date, written by hand. This proves they actually have it
                right now.
              </p>
              <p>
                <strong>Get contact details you can check</strong> — Ask for a
                landline number or an email address. Then look it up yourself to
                make sure it&apos;s real.
              </p>
              <p>
                <strong>If they say no</strong> — If the seller won&apos;t do any of
                these things, be very careful. Most honest sellers are happy to
                help. If someone refuses, that is a warning sign.
              </p>
            </div>
          </div>

          {/* Safety acknowledgement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.marketplaceSafetyAcknowledged}
              onChange={(e) =>
                update({ marketplaceSafetyAcknowledged: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-coral focus:ring-coral/50"
            />
            <span className="text-sm text-slate-700">
              I&apos;ve read this advice and I understand the risks
            </span>
          </label>

          {/* URL input and check button */}
          {state.marketplaceSafetyAcknowledged && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Paste the Facebook Marketplace listing URL
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://www.facebook.com/marketplace/item/..."
                  value={state.marketplaceUrl}
                  onChange={(e) =>
                    update({ marketplaceUrl: e.target.value })
                  }
                  className="flex-1"
                />
                <Button
                  onClick={handleCheckListing}
                  disabled={
                    !state.marketplaceUrl.trim() || state.marketplaceLoading
                  }
                >
                  {state.marketplaceLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check listing"
                  )}
                </Button>
              </div>

              {/* Error state */}
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              {/* Result preview card */}
              {state.marketplaceResult && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-900">
                        {state.marketplaceResult.itemTitle}
                      </h4>
                      {state.marketplaceResult.listedPrice !== null && (
                        <p className="text-sm text-slate-600">
                          Listed price:{" "}
                          <span className="font-medium">
                            {"\u00A3"}
                            {state.marketplaceResult.listedPrice.toLocaleString()}
                          </span>
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        confidenceColors[
                          state.marketplaceResult.confidence
                        ] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {state.marketplaceResult.confidence} confidence
                    </span>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-600">
                      Estimated market value:{" "}
                      <span className="font-medium text-slate-900">
                        {"\u00A3"}
                        {state.marketplaceResult.valuationMin.toLocaleString()}
                        {" \u2013 \u00A3"}
                        {state.marketplaceResult.valuationMax.toLocaleString()}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {state.marketplaceResult.valuationSummary}
                    </p>
                  </div>

                  <a
                    href={state.marketplaceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-coral hover:underline"
                  >
                    View listing
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Show Continue when No is selected, or when marketplace check is done */}
        {(state.isMarketplace === false ||
          (state.isMarketplace === true && state.marketplaceResult !== null)) && (
          <Button onClick={() => setStep(4)} disabled={!canContinue}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
