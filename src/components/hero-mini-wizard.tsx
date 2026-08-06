"use client";

// Hero mini-wizard: two-question start (interest + postcode) that
// routes the user straight into the correct focused /check variant
// with the postcode pre-filled. Replaces the old hero CTA button.
//
// Fires journey_started on submit — source="hero_wizard" — so the
// funnel can distinguish "started from the hero form" from the
// other JourneyCTA surfaces (picker cards, footer, landing pages).
//
// Trust cues sit under the form: takes 5 minutes / free / real UK
// data / grant-aware. Copy is deliberately reassurance-first.

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics/react";

type Interest = "heatpump" | "solar" | "battery" | "all";

interface InterestOption {
  value: Interest;
  label: string;
  emoji: string;
}

// Order deliberately: the two most-in-demand journeys first, battery
// third, then the catch-all. "All" reads as the safe default for
// undecided users, but the ordering signals we expect users to pick.
const INTERESTS: InterestOption[] = [
  { value: "heatpump", label: "Heat pump", emoji: "🔥" },
  { value: "solar", label: "Solar", emoji: "☀️" },
  { value: "battery", label: "Battery", emoji: "🔋" },
  { value: "all", label: "All three", emoji: "✨" },
];

// Route the interest into the right wizard variant.
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

// Loose UK-postcode validator — enough to catch typos, not enough
// to reject a legit obscure format. The address-lookup route does
// the strict check server-side.
function looksLikePostcode(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 5 || trimmed.length > 8) return false;
  return /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(trimmed);
}

export function HeroMiniWizard() {
  const router = useRouter();
  const [interest, setInterest] = useState<Interest>("all");
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmed = postcode.trim().toUpperCase();
    if (!looksLikePostcode(trimmed)) {
      setError("Please enter a full UK postcode (e.g. BS3 4AA).");
      return;
    }
    setError(null);
    setSubmitting(true);

    // journey_started — the hero surface. journey_type = the
    // interest the user picked so the funnel dashboard can see
    // which journey the hero converts best on.
    track("journey_started", {
      source: "hero_wizard",
      journey: interest === "heatpump" ? "heatpump" : interest,
    });

    // Route into the focused wizard variant with the postcode as a
    // prefill query param. Step 1 (Step1Address) already reads
    // state.prefillPostcode when populated — we pass it via the
    // ?postcode= query so the client can hydrate before the wizard
    // context initialises.
    router.push(
      `${routeFor(interest)}?postcode=${encodeURIComponent(trimmed)}`,
    );
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white/95 backdrop-blur border border-[var(--border)] shadow-lg p-5 sm:p-6"
      >
        {/* Line 1: interest chips */}
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
                    h-11 rounded-full text-sm font-semibold
                    transition-colors border
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

        {/* Line 2: postcode + submit */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <label className="sr-only" htmlFor="hero-postcode">
            Your postcode
          </label>
          <input
            id="hero-postcode"
            name="postcode"
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            placeholder="Your postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className="flex-1 h-12 px-4 rounded-full border border-[var(--border)] bg-white text-navy placeholder:text-[var(--muted-brand)] focus:outline-none focus:ring-2 focus:ring-coral/40 focus:border-coral"
            aria-invalid={error != null}
            aria-describedby={error ? "hero-postcode-error" : undefined}
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark disabled:opacity-60 text-cream font-semibold text-sm shadow-sm transition-colors"
          >
            {submitting ? "Loading…" : "Show me my savings"}
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p
            id="hero-postcode-error"
            role="alert"
            className="mt-2 text-xs text-rose-600"
          >
            {error}
          </p>
        )}

        {/* Single reassurance line inside the form card — the main
            objection-removal bullets live in the hero left column
            to avoid duplication. Kept here as a below-CTA cue for
            users whose eye jumps straight to the button. */}
        <p className="mt-3 text-center text-xs text-[var(--muted-brand)]">
          Free · No sign-up · Under 5 seconds to start
        </p>
      </form>
    </div>
  );
}
