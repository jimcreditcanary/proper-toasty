// OctopusInstantReport — the simplified /check/octopus screen.
//
// Replaces the multi-step wizard for the Octopus journey. The visitor
// arrived from the /octopus landing; they want the monthly price and
// a way to order. No address entry, no questions, no floorplan, no
// lead-capture email. The example property is hard-coded (2 Curtels
// Close, Worsley, M28 2JR) — the page is illustrative.
//
// Shape:
//   1. Address chip   — confirms which home the numbers describe
//   2. Headline       — £49.99/mo + "£X/mo less than a gas boiler"
//   3. Side-by-side   — boiler vs Octopus monthly tiles
//   4. What's included quick list
//   5. Order Now CTA  → /check/octopus/order (PR 3)
//
// Disclaimer copy stays in the footer ("Illustrative examples for
// research purposes only — we are not a lender or a broker").

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
import { Logo } from "@/components/logo";
import { LandingFooter } from "@/components/landing-footer";
import type { OctopusDemoReport } from "@/lib/octopus/demo-report";

const DEMO_ADDRESS = {
  line1: "2 Curtels Close",
  line2: "Worsley, Manchester",
  postcode: "M28 2JR",
};

const INCLUDED: string[] = [
  "£500 cashback on signup",
  "10-year Octopus warranty",
  "Free radiator upgrades if needed",
  "New high-efficiency hot water tank",
  "Servicing & callouts included",
  "Remote monitoring, 24/7",
  "Fully fitted in 4 days",
  "Free software updates, for life",
];

export function OctopusInstantReport({ report }: { report: OctopusDemoReport }) {
  // Format the monthly numbers — keep the decimal on the Octopus side
  // (it's a contractual £49.99 offer price) and round the boiler side
  // to a clean integer (engine output of energy + service plan).
  const hpMonthlyLabel = `£${report.hpMonthlyGBP.toFixed(2)}`;
  const boilerMonthlyLabel = `£${report.boilerMonthlyGBP}`;
  return (
    // theme-octopus + bg-cream scope the dark Octopus takeover to
    // this page. Minimum-height flex column so the footer pins to
    // the bottom even on short content.
    <div className="theme-octopus bg-cream min-h-[100dvh] flex flex-col">
      <MinimalHeader />

      <main className="flex-1">
        {/* Address chip — confirms which property's numbers we're showing. */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3.5 py-2 text-xs text-[var(--muted-brand)] shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-coral shrink-0" />
            <span className="text-navy font-medium">
              {DEMO_ADDRESS.line1}
            </span>
            <span>·</span>
            <span>
              {DEMO_ADDRESS.line2} {DEMO_ADDRESS.postcode}
            </span>
          </div>
        </section>

        {/* Headline savings number. */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-10 text-center">
          <p className="eyebrow">Your monthly heating cost</p>
          <p className="mt-4 text-7xl sm:text-9xl font-bold text-navy leading-none tracking-tight">
            {hpMonthlyLabel}
          </p>
          <p className="mt-3 text-base text-[var(--muted-brand)]">per month</p>

          <p className="mt-10 text-2xl sm:text-3xl text-navy leading-tight max-w-xl mx-auto">
            That&rsquo;s{" "}
            <span className="text-coral font-bold">
              £{report.monthlySavingGBP}/mo less
            </span>{" "}
            than a new gas boiler — about{" "}
            <span className="text-navy font-bold">
              £{report.annualSavingGBP.toLocaleString()} a year
            </span>{" "}
            back in your pocket.
          </p>

          {/* Transparency line — boiler number is engine-derived from
              this home's EPC, not a marketing constant. */}
          <p className="mt-6 text-xs text-[var(--muted-brand)] max-w-md mx-auto">
            Based on this home&rsquo;s{" "}
            {report.epcFound ? (
              <>
                EPC: <span className="font-semibold text-navy">{report.floorAreaM2} m²</span>
              </>
            ) : (
              <>
                size estimate: <span className="font-semibold text-navy">~{report.floorAreaM2} m²</span> (EPC unavailable)
              </>
            )}
            , Octopus Cosy heat-pump tariff vs typical gas + service plan.
          </p>
        </section>

        {/* Side-by-side monthly tiles. */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-12">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <MonthlyTile
              tone="boring"
              label="New gas boiler"
              monthly={boilerMonthlyLabel}
              sub={`£${Math.round(
                report.boilerAnnualEnergyGBP / 12,
              )}/mo gas + £${Math.round(
                report.boilerServicePlanAnnualGBP / 12,
              )}/mo service plan`}
            />
            <MonthlyTile
              tone="primary"
              label="Octopus heat pump"
              monthly={hpMonthlyLabel}
              sub="servicing & callouts included"
            />
          </div>
        </section>

        {/* What's included quick list. */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-12">
          <div className="rounded-3xl bg-cream-deep border border-[var(--border)] p-6 sm:p-8">
            <p className="font-semibold text-navy">All in:</p>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              {INCLUDED.map((line) => (
                <li key={line} className="flex items-start gap-2 text-navy">
                  <Check className="w-4 h-4 text-[var(--sage)] mt-0.5 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Order Now CTA. PR 3 ships the booking flow that lives at
            /check/octopus/order; this link points there already. */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-24 text-center">
          <Link
            href="/check/octopus/order"
            className="inline-flex items-center justify-center gap-2.5 h-16 px-12 rounded-full bg-coral hover:bg-coral-dark text-cream font-bold text-lg transition-colors shadow-2xl"
          >
            Order now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-5 text-xs text-[var(--muted-brand)] max-w-md mx-auto">
            You&rsquo;ll pick a date for a short pre-install check-in. Nothing
            to pay yet — cancel anytime before the survey.
          </p>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

// ── Minimal header ────────────────────────────────────────────────
//
// The full MarketingHeader is too much chrome for a focused
// Tesla-style flow. Single row: brand mark + a discreet "back to
// landing" link.

function MinimalHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-cream/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/octopus"
          className="inline-flex items-center gap-2 shrink-0 text-[var(--muted-brand)] hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <Logo size="sm" variant="light" />
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-brand)] shrink-0">
          Illustrative
        </span>
      </div>
    </header>
  );
}

// ── Monthly tile ──────────────────────────────────────────────────

function MonthlyTile({
  tone,
  label,
  monthly,
  sub,
}: {
  tone: "primary" | "boring";
  label: string;
  monthly: string;
  sub: string;
}) {
  const isPrimary = tone === "primary";
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 border ${
        isPrimary
          ? "bg-coral text-cream border-coral shadow-xl"
          : "bg-white border-[var(--border)]"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 ${
          isPrimary ? "text-cream/80" : "text-[var(--muted-brand)]"
        }`}
      >
        {isPrimary && (
          <span role="img" aria-label="Octopus" className="text-sm leading-none">
            🐙
          </span>
        )}
        {label}
      </p>
      <p
        className={`mt-3 text-4xl sm:text-5xl font-bold tracking-tight ${
          isPrimary ? "text-cream" : "text-navy"
        }`}
      >
        {monthly}
        <span
          className={`text-base font-normal ${
            isPrimary ? "text-cream/80" : "text-[var(--muted-brand)]"
          }`}
        >
          {" "}
          /mo
        </span>
      </p>
      <p
        className={`mt-2 text-xs leading-relaxed ${
          isPrimary ? "text-cream/80" : "text-[var(--muted-brand)]"
        }`}
      >
        {sub}
      </p>
    </div>
  );
}
