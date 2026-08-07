"use client";

// Hero mini-wizard: three-step inline form that gets a UK homeowner
// from "I'm interested in X" to landing INSIDE the wizard at the
// questionnaire step — skipping the wizard's own address entry.
//
// Flow:
//   1. Interest chips (Heat pump / Solar / Battery / All three)
//   2. Postcode input → "Find my address" (calls /api/address/lookup)
//   3. Address dropdown appears → user picks + "Show my savings"
//   4. sessionStorage the resolved address + country, then
//      router.push to /check/{interest}?fromhero=1. The wizard's
//      context.tsx has a one-shot effect that reads the prefill
//      + skips to the "questions" step.
//
// Fires journey_started (source="hero_wizard") once on the final
// submit — that's the point of real commitment.

import { useCallback, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics/react";
import type { AddressLookupResponse } from "@/lib/schemas/address-lookup";
import type { SelectedAddress } from "@/components/check-wizard/types";

type Interest = "heatpump" | "solar" | "battery" | "all";

// sessionStorage key. Namespaced so a future v2 change doesn't
// collide with users mid-session.
const PREFILL_KEY = "hero_prefill_v1";

interface InterestOption {
  value: Interest;
  label: string;
  emoji: string;
}

const INTERESTS: InterestOption[] = [
  { value: "heatpump", label: "Heat pump", emoji: "🔥" },
  { value: "solar", label: "Solar", emoji: "☀️" },
  { value: "battery", label: "Battery", emoji: "🔋" },
  { value: "all", label: "All three", emoji: "✨" },
];

function routeFor(interest: Interest): string {
  switch (interest) {
    case "heatpump":
      return "/check/heatpump";
    case "solar":
      return "/check/solar";
    case "battery":
      return "/check/battery";
    case "all":
      return "/check";
  }
}

function looksLikePostcode(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 5 || trimmed.length > 8) return false;
  return /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(trimmed);
}

// ─── Form phase machine ──────────────────────────────────────────
type Phase =
  | { kind: "idle" }
  | { kind: "searching" }
  | {
      kind: "picking";
      addresses: AddressLookupResponse["addresses"];
      // country can be null when the postcode resolves outside our
      // country-detection heuristic — kept nullable so the type
      // matches the API response verbatim.
      country: AddressLookupResponse["country"];
    }
  | { kind: "resolving" }
  | { kind: "submitting" };

export function HeroMiniWizard() {
  const router = useRouter();
  const [interest, setInterest] = useState<Interest>("all");
  const [postcode, setPostcode] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  const disabled =
    phase.kind === "searching" ||
    phase.kind === "resolving" ||
    phase.kind === "submitting";

  const searchPostcode = useCallback(async () => {
    const trimmed = postcode.trim().toUpperCase();
    if (!looksLikePostcode(trimmed)) {
      setError("Please enter a full UK postcode (e.g. BS3 4AA).");
      return;
    }
    setError(null);
    setSelectedIdx(null);
    setPhase({ kind: "searching" });
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
        setError("No addresses found at that postcode. Double-check it?");
        setPhase({ kind: "idle" });
        return;
      }
      setPhase({
        kind: "picking",
        addresses: data.addresses,
        country: data.country,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't look up that postcode.");
      setPhase({ kind: "idle" });
    }
  }, [postcode]);

  const submitPickedAddress = useCallback(
    async (
      idx: number,
      addresses: AddressLookupResponse["addresses"],
      country: AddressLookupResponse["country"],
    ) => {
      const chosen = addresses[idx];
      if (!chosen) return;
      setPhase({ kind: "resolving" });

      // Geocode + build a SelectedAddress. Same as step-1-address's
      // pick() path — WGS84 from OS Places directly, fallback via
      // the geocode route for the metadata block.
      let latitude: number = chosen.latitude ?? 0;
      let longitude: number = chosen.longitude ?? 0;
      try {
        const g = await fetch("/api/address/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            line1: chosen.addressLine1,
            postcode: chosen.postcode,
          }),
        });
        if (g.ok) {
          const gj = (await g.json()) as {
            latitude?: number;
            longitude?: number;
          };
          if (typeof gj.latitude === "number") latitude = gj.latitude;
          if (typeof gj.longitude === "number") longitude = gj.longitude;
        }
      } catch {
        // Non-fatal — postcode-centroid lat/lng is good enough for
        // the pre-survey; the wizard's step 5 analysis re-resolves.
      }

      const address: SelectedAddress = {
        uprn: chosen.uprn ?? null,
        formattedAddress:
          chosen.summary || `${chosen.addressLine1}, ${chosen.postcode}`,
        line1: chosen.addressLine1,
        line2: chosen.addressLine2 ?? null,
        postcode: chosen.postcode,
        postTown: chosen.postTown ?? "",
        latitude,
        longitude,
        metadata: null,
      };

      // Stash for CheckWizardProvider to pick up + hop the user
      // past the wizard's own address step.
      try {
        sessionStorage.setItem(
          PREFILL_KEY,
          JSON.stringify({ address, country }),
        );
      } catch {
        // Storage disabled (private mode etc) — fall through; the
        // wizard will just start at step 1 with prefillPostcode
        // populated via the URL fallback.
      }

      setPhase({ kind: "submitting" });
      track("journey_started", {
        source: "hero_wizard",
        journey: interest === "heatpump" ? "heatpump" : interest,
      });

      router.push(
        `${routeFor(interest)}?fromhero=1&postcode=${encodeURIComponent(chosen.postcode)}`,
      );
    },
    [interest, router],
  );

  // Two separate submit paths, both fed through the same <form>
  // via the button that fires them:
  //   - Secondary "Find my address"   → searchPostcode()
  //   - Primary   "Calculate my savings" → submitPickedAddress()
  //
  // Enter-key default is now "Find my address" while we don't have
  // a picked address, "Calculate my savings" once we do. That's
  // handled by wiring form onSubmit to whichever action makes sense
  // for the current phase.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    if (phase.kind === "picking" && selectedIdx != null) {
      void submitPickedAddress(selectedIdx, phase.addresses, phase.country);
    } else if (phase.kind !== "picking") {
      void searchPostcode();
    }
  }

  const primaryReady =
    phase.kind === "picking" && selectedIdx != null && !disabled;
  const primaryLoading =
    phase.kind === "resolving" || phase.kind === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white shadow-lg border border-[var(--border)] p-6 sm:p-8"
    >
      {/* Interest chips */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-brand)]">
          I&rsquo;m interested in
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INTERESTS.map((opt) => {
            const selected = interest === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInterest(opt.value)}
                aria-pressed={selected}
                className={`
                  inline-flex items-center justify-center gap-1.5
                  h-11 rounded-full text-sm font-semibold transition-colors border
                  ${
                    selected
                      ? "bg-coral text-cream border-coral shadow-sm"
                      : "bg-cream/60 text-navy border-[var(--border)] hover:bg-cream-deep hover:border-coral/40"
                  }
                `}
              >
                <span aria-hidden>{opt.emoji}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Address search — label reads "Search for your address"
          per Jim's brief (users know they want an ADDRESS, the
          fact that the API keys off a postcode is a plumbing
          detail). The secondary "Find my address" button sits
          alongside the input; the big primary CTA at the bottom
          stays as "Calculate my savings" throughout. */}
      <div className="mt-5">
        <label
          htmlFor="hero-postcode"
          className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-brand)] mb-2"
        >
          Search for your address
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MapPin
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-brand)] pointer-events-none"
              aria-hidden
            />
            <input
              id="hero-postcode"
              name="postcode"
              type="text"
              inputMode="text"
              autoComplete="postal-code"
              placeholder="Enter your postcode"
              value={postcode}
              onChange={(e) => {
                setPostcode(e.target.value);
                // Any edit invalidates a previous address pick.
                if (phase.kind === "picking") {
                  setPhase({ kind: "idle" });
                  setSelectedIdx(null);
                }
              }}
              className="w-full h-14 pl-12 pr-4 rounded-full border border-[var(--border)] bg-white text-base text-navy placeholder:text-[var(--muted-brand)] focus:outline-none focus:ring-2 focus:ring-coral/40 focus:border-coral"
              aria-invalid={error != null}
            />
          </div>
          <button
            type="button"
            onClick={() => void searchPostcode()}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 h-14 px-5 rounded-full border border-coral text-coral bg-white hover:bg-coral-pale disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm transition-colors shrink-0"
          >
            {phase.kind === "searching" ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Search className="w-4 h-4" aria-hidden />
            )}
            Find my address
          </button>
        </div>
      </div>

      {/* Address list — appears after successful postcode lookup */}
      {phase.kind === "picking" && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-brand)] mb-2">
            Pick your address
          </p>
          <ul className="max-h-52 overflow-y-auto rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] bg-cream/30">
            {phase.addresses.map((a, idx) => {
              const chosen = selectedIdx === idx;
              return (
                <li key={a.uprn ?? `${a.addressLine1}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIdx(idx);
                      setError(null);
                    }}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${
                        chosen
                          ? "bg-coral text-cream"
                          : "text-navy hover:bg-cream-deep"
                      }
                    `}
                  >
                    {a.summary || `${a.addressLine1}, ${a.postcode}`}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Error line */}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {/* Primary CTA — consistent throughout the form. Disabled
          until the user has picked an address from the dropdown.
          Copy stays "Calculate my savings" (the promise the whole
          page is built around) rather than swapping labels per
          phase — Jim's brief called out the phase-shifting label
          as an intuition problem. */}
      <button
        type="submit"
        disabled={!primaryReady && !primaryLoading}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full bg-coral hover:bg-coral-dark disabled:opacity-60 disabled:cursor-not-allowed text-cream font-semibold text-base shadow-sm transition-colors"
      >
        {primaryLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            Loading your check…
          </>
        ) : (
          <>
            <ArrowRight className="w-5 h-5" aria-hidden />
            Calculate my savings
          </>
        )}
      </button>

      {phase.kind !== "picking" && (
        <p className="mt-3 text-center text-xs text-[var(--muted-brand)]">
          Find your address first, then hit Calculate my savings.
        </p>
      )}
    </form>
  );
}
