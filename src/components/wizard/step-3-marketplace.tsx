"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  X,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard, getSessionId } from "./context";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function Step3Marketplace() {
  const { state, update, setStep } = useWizard();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);

  function handleMarketplaceChoice(isMarketplace: boolean) {
    update({ isMarketplace: isMarketplace });
  }

  const handleCheckScreenshot = useCallback(
    async (file: File) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      setError(null);
      update({
        marketplaceScreenshot: file,
        marketplaceLoading: true,
        marketplaceError: null,
        marketplaceResult: null,
      });

      try {
        const fd = new FormData();
        fd.append("screenshot", file);
        try {
          fd.append("sessionId", getSessionId());
        } catch {
          /* SSR */
        }

        const res = await fetch("/api/marketplace-check", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Something went wrong. Please try again.");
        }

        const result = await res.json();
        update({ marketplaceResult: result, marketplaceLoading: false });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(message);
        update({ marketplaceLoading: false, marketplaceError: message });
      } finally {
        inFlightRef.current = false;
      }
    },
    [update]
  );

  function handleFileChosen(file: File | null | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a PNG, JPG, or WebP image.");
      return;
    }
    handleCheckScreenshot(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileChosen(e.dataTransfer.files[0]);
  }

  function clearScreenshot() {
    update({
      marketplaceScreenshot: null,
      marketplaceResult: null,
      marketplaceError: null,
    });
    setError(null);
  }

  // Paste-from-clipboard handler while user is on the screenshot step
  useEffect(() => {
    if (
      state.isMarketplace !== true ||
      !state.marketplaceSafetyAcknowledged ||
      state.marketplaceScreenshot ||
      state.marketplaceLoading ||
      state.marketplaceResult
    ) {
      return;
    }

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleCheckScreenshot(file);
          }
          break;
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [
    state.isMarketplace,
    state.marketplaceSafetyAcknowledged,
    state.marketplaceScreenshot,
    state.marketplaceLoading,
    state.marketplaceResult,
    handleCheckScreenshot,
  ]);

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
                selected ? "border-coral bg-coral/5" : "border-slate-200"
              }`}
            >
              <Icon className="h-8 w-8 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{label}</span>
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
                <strong>Check their profile</strong> &mdash; How long have they been on
                Facebook? Do they have real friends and real posts? Do they have reviews
                or star ratings from other buyers on Marketplace? A new account with no
                friends and no reviews is a warning sign.
              </p>
              <p>
                <strong>Ask for proof they have the item</strong> &mdash; Ask the seller
                to send you a photo of the item with a piece of paper showing
                today&apos;s date, written by hand. This proves they actually have it
                right now.
              </p>
              <p>
                <strong>Get contact details you can check</strong> &mdash; Ask for a
                landline number or an email address. Then look it up yourself to make
                sure it&apos;s real.
              </p>
              <p>
                <strong>If they say no</strong> &mdash; If the seller won&apos;t do any
                of these things, be very careful. Most honest sellers are happy to help.
                If someone refuses, that is a warning sign.
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

          {/* Screenshot upload + result */}
          {state.marketplaceSafetyAcknowledged && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload a screenshot of the listing
                </label>
                <p className="text-xs text-slate-500">
                  Take a screenshot showing the item title and price. You can drop,
                  paste, or click to upload.
                </p>
              </div>

              {/* Empty upload zone */}
              {!state.marketplaceScreenshot &&
                !state.marketplaceLoading &&
                !state.marketplaceResult && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-xl border-2 border-dashed p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                      dragOver
                        ? "border-coral bg-coral/5"
                        : "border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <Upload className="h-8 w-8 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">
                        Drop, paste, or click to upload
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PNG, JPG, or WebP</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleFileChosen(e.target.files?.[0])}
                      className="hidden"
                    />
                  </div>
                )}

              {/* File attached preview */}
              {state.marketplaceScreenshot && !state.marketplaceLoading && (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <ImageIcon className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">
                    {state.marketplaceScreenshot.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Loading state */}
              {state.marketplaceLoading && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-8">
                  <Loader2 className="h-8 w-8 text-coral animate-spin" />
                  <p className="text-sm text-slate-600">
                    Reading the listing and researching market value...
                  </p>
                </div>
              )}

              {/* Error state */}
              {error && <p className="text-sm text-red-600">{error}</p>}

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
                        confidenceColors[state.marketplaceResult.confidence] ??
                        "bg-slate-100 text-slate-700"
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
