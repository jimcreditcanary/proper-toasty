"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, MapPin, Search } from "lucide-react";
import type { UkCountry } from "@/lib/postcode/region";
import { isV1SupportedCountry } from "@/lib/postcode/region";
import type { AddressLookupResponse } from "@/lib/schemas/postcoder";
import { useCheckWizard } from "./context";

type Phase = "idle" | "searching" | "picking" | "resolving";

export function Step1Address() {
  const { state, update, next, goTo } = useCheckWizard();
  const [postcode, setPostcode] = useState(state.prefillPostcode ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<AddressLookupResponse["addresses"]>([]);
  const [country, setCountry] = useState<UkCountry | null>(null);

  const search = useCallback(async () => {
    const trimmed = postcode.trim();
    if (trimmed.length < 5) {
      setError("Please enter a full UK postcode.");
      return;
    }
    setPhase("searching");
    setError(null);
    setAddresses([]);
    try {
      const res = await fetch("/api/address/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode: trimmed }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Lookup failed (${res.status})`);
      }
      const data = (await res.json()) as AddressLookupResponse;
      if (data.addresses.length === 0) {
        setError("We couldn't find any addresses at that postcode. Double-check it?");
        setPhase("idle");
        return;
      }
      setAddresses(data.addresses);
      setCountry(data.country);
      setPhase("picking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't look up that postcode.");
      setPhase("idle");
    }
  }, [postcode]);

  const pick = useCallback(
    async (a: AddressLookupResponse["addresses"][number]) => {
      setPhase("resolving");
      setError(null);

      // Every address at a given postcode from Postcoder can share the same
      // centroid lat/lng (when the plan doesn't carry per-property
      // addtags). Geocode the specific address Google-side so the satellite
      // tile + Solar API call centre on the actual property.
      let lat = a.latitude;
      let lng = a.longitude;
      try {
        const res = await fetch("/api/address/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ line1: a.addressLine1, postcode: a.postcode }),
        });
        if (res.ok) {
          const g = (await res.json()) as { latitude: number; longitude: number };
          lat = g.latitude;
          lng = g.longitude;
        }
        // Non-fatal: if geocoding fails we fall back to the postcode centroid.
      } catch {
        // fall through with existing lat/lng
      }

      update({
        address: {
          uprn: a.uprn,
          formattedAddress: a.summary,
          line1: a.addressLine1,
          line2: a.addressLine2,
          postcode: a.postcode,
          postTown: a.postTown,
          latitude: lat,
          longitude: lng,
        },
        country,
      });

      if (country && !isV1SupportedCountry(country)) {
        goTo("preview"); // wizard shell short-circuits to country gate
        return;
      }
      next();
    },
    [update, next, goTo, country]
  );

  // Auto-fire the postcode lookup once on mount when an installer
  // pre-survey link supplied the postcode — saves the customer the
  // re-typing step and drops them straight at the address picker.
  const autoSearched = useRef(false);
  useEffect(() => {
    if (autoSearched.current) return;
    if (!state.prefillPostcode) return;
    if (state.prefillPostcode.trim().length < 5) return;
    if (phase !== "idle") return;
    autoSearched.current = true;
    void search();
  }, [state.prefillPostcode, phase, search]);

  // First name from the prefilled lead — drives the personalised
  // greeting on the address step. Leaving the heading copy
  // untouched for organic visitors so we don't change their flow.
  const firstName = state.leadName?.split(" ")[0] || null;
  const isPrefilled = !!state.preSurveyRequestId;

  return (
    <div className="max-w-xl mx-auto w-full">
      <div className="text-center mb-8">
        {isPrefilled && firstName && (
          <p className="text-xs font-bold uppercase tracking-wider text-coral mb-2">
            Hi {firstName} 👋{state.preSurveyInstallerName ? ` — quick check from ${state.preSurveyInstallerName}` : ""}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl text-navy">
          {isPrefilled && firstName
            ? `${firstName}, what's your postcode?`
            : "What’s your postcode?"}
        </h1>
        <p className="mt-3 text-slate-600">
          We&rsquo;ll pull the exact property — UPRN, EPC, roof — from public UK data.
        </p>
      </div>

      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          inputMode="text"
          autoComplete="postal-code"
          spellCheck={false}
          placeholder="e.g. SW1A 2AA"
          className="w-full h-14 pl-12 pr-32 rounded-xl border border-[var(--border)] bg-white text-base text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent shadow-sm uppercase"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          disabled={phase === "searching" || phase === "resolving"}
        />
        <button
          type="submit"
          disabled={phase === "searching" || phase === "resolving" || postcode.trim().length < 5}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-cream font-semibold text-sm transition-colors"
        >
          {phase === "searching" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching
            </>
          ) : (
            <>
              Find address
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {phase === "picking" && addresses.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-brand)] mb-3">
            Pick your property · {addresses.length} found
          </p>
          <ul className="rounded-xl border border-[var(--border)] bg-white shadow-sm divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
            {addresses.map((a) => (
              <li key={a.uprn}>
                <button
                  type="button"
                  onClick={() => pick(a)}
                  disabled={phase !== "picking"}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-coral-pale transition-colors"
                >
                  <MapPin className="w-4 h-4 mt-1 shrink-0 text-coral" />
                  <span className="flex-1 text-sm text-navy">{a.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        England &amp; Wales only for now. Scotland and Northern Ireland have separate schemes —
        we&rsquo;ll let you know when we add them.
      </p>
    </div>
  );
}
