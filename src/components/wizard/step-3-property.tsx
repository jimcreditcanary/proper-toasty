"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Search,
  Home,
  MapPin,
  Check,
} from "lucide-react";
import { useWizard, getSessionId } from "./context";
import { Button } from "@/components/ui/button";
import type { PostcoderAddress } from "./types";

const POSTCODE_REGEX =
  /^(GIR 0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

function formatPostcode(input: string): string {
  const stripped = input.replace(/\s+/g, "").toUpperCase();
  if (stripped.length < 5 || stripped.length > 8) return stripped;
  return `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}`;
}

export function Step3Property() {
  const { state, update, setStep } = useWizard();
  const [localError, setLocalError] = useState<string | null>(null);

  const postcode = state.propertyPostcode;
  const addresses = state.propertyAddresses;
  const selected = state.selectedProperty;

  async function lookup() {
    const formatted = formatPostcode(postcode);
    if (!POSTCODE_REGEX.test(formatted)) {
      setLocalError("Please enter a valid UK postcode.");
      return;
    }

    setLocalError(null);
    update({
      propertyLoading: true,
      propertyError: null,
      propertyAddresses: null,
      selectedProperty: null,
      propertyConfirmed: false,
    });

    try {
      let sessionId: string | null = null;
      try {
        sessionId = getSessionId();
      } catch {
        /* SSR */
      }

      const res = await fetch("/api/property-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode: formatted, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        update({
          propertyLoading: false,
          propertyError: data.error || "Couldn't look up that postcode.",
        });
        return;
      }
      update({
        propertyLoading: false,
        propertyPostcode: data.postcode,
        propertyAddresses: data.addresses as PostcoderAddress[],
        propertyError: null,
      });
    } catch {
      update({
        propertyLoading: false,
        propertyError: "Couldn't reach the address service. Please try again.",
      });
    }
  }

  function selectAddress(a: PostcoderAddress) {
    update({ selectedProperty: a, propertyConfirmed: false });
  }

  function confirm() {
    update({ propertyConfirmed: true });
    setStep(5);
  }

  function tryAgain() {
    update({
      propertyAddresses: null,
      selectedProperty: null,
      propertyConfirmed: false,
      propertyError: null,
    });
    setLocalError(null);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
        Which property are you buying?
      </h2>

      {/* Confirmation view — address chosen, ask to confirm */}
      {selected ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
                <Home className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Is this the property you&apos;re looking to buy?
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm and we&apos;ll carry it through to the report.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-1">
              <p className="text-sm font-medium text-slate-900">
                {selected.summaryline ||
                  [selected.addressline1, selected.addressline2]
                    .filter(Boolean)
                    .join(", ")}
              </p>
              {selected.posttown && (
                <p className="text-xs text-slate-500">
                  {selected.posttown}
                  {selected.county ? ` \u2022 ${selected.county}` : ""}
                </p>
              )}
              <p className="text-xs text-slate-500">{selected.postcode}</p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={tryAgain}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              No, let me try again
            </button>
            <Button
              onClick={confirm}
              className="h-11 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg"
            >
              <Check className="size-4 mr-2" />
              Yes, this is the property
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Postcode input */}
          <div className="space-y-3 max-w-md">
            <label
              htmlFor="property-postcode"
              className="block text-sm font-medium text-slate-700"
            >
              Enter the property postcode
            </label>
            <input
              id="property-postcode"
              type="text"
              value={postcode}
              onChange={(e) => {
                setLocalError(null);
                update({ propertyPostcode: e.target.value.toUpperCase() });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") lookup();
              }}
              placeholder="e.g. SW1A 1AA"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold tracking-wider text-slate-900 uppercase outline-none placeholder:text-slate-300 placeholder:font-normal focus:border-coral focus:ring-4 focus:ring-coral/20 transition"
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="postal-code"
            />
            <Button
              type="button"
              onClick={lookup}
              disabled={state.propertyLoading || !postcode}
              className="w-full h-12 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg text-base shadow-sm"
            >
              {state.propertyLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Looking up&hellip;
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Find addresses
                </>
              )}
            </Button>

            {(localError || state.propertyError) && (
              <p className="text-sm text-red-600">
                {localError || state.propertyError}
              </p>
            )}
          </div>

          {/* Address list */}
          {addresses && addresses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold px-1">
                {addresses.length} address{addresses.length === 1 ? "" : "es"} at{" "}
                {state.propertyPostcode}
              </p>
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                {addresses.map((a, i) => (
                  <button
                    key={`${a.uprn || a.udprn || i}-${i}`}
                    type="button"
                    onClick={() => selectAddress(a)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-coral/5 transition-colors"
                  >
                    <MapPin className="size-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-900 truncate flex-1">
                      {a.summaryline ||
                        [a.addressline1, a.addressline2]
                          .filter(Boolean)
                          .join(", ")}
                    </span>
                    <ArrowRight className="size-4 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Back */}
      <div className="flex items-center pt-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}
