// /octopus — Octopus Energy co-branded landing page.
//
// Brand-partnership variant of /replace-my-boiler. Same shape as the
// other focused-check landings (/heatpump, /solar, /replace-my-boiler)
// but co-branded for Octopus and pointing at /check/octopus, which runs
// the boiler-vs-heat-pump comparison with Octopus's commercials (their
// heat-pump price, the Cosy tariff, 0% finance over 10 years).
//
// Voice: short, decisive, real numbers. Keeps the "pre-survey
// indication" disclaimer so the marketing claim stays accurate.

import Link from "next/link";
import Image from "next/image";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import {
  ArrowRight,
  ArrowRightLeft,
  PoundSterling,
  Home as HomeIcon,
  CheckCircle2,
  Calculator,
  Percent,
  Zap,
  Gauge,
  Leaf,
  Clock,
  Star,
} from "lucide-react";

// Octopus-supplied heat-pump shot (their press image, resized to a
// web JPG + served from /public so it stays on our origin).
const HERO_IMAGE = "/octopus-heat-pump.jpg";

export const metadata = {
  title: "New boiler or an Octopus heat pump? — Propertoasty",
  description:
    "Thinking of a new boiler? Compare it against an Octopus Energy heat pump — Octopus pricing, the Cosy tariff, and 0% finance over 10 years. Five minutes, no site visit.",
};

export default function OctopusLanding() {
  return (
    // theme-octopus scopes the Octopus brand-colour takeover to this
    // page (see globals.css). Illustrative co-brand only.
    <div className="theme-octopus bg-cream">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-brand)] shadow-sm">
              <Zap className="w-3.5 h-3.5 text-coral" />
              In partnership with Octopus Energy
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl text-navy leading-[1.05]">
              New boiler?
              <br />
              Or a heat pump?
            </h1>

            <p className="mt-6 text-lg text-[var(--muted-brand)] leading-relaxed max-w-lg">
              Before you replace that boiler, see the real numbers against
              an Octopus heat pump — their price after the £7,500 grant, on
              the Cosy tariff, with 0% finance over 10 years.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/check/octopus"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium transition-colors shadow-sm"
              >
                Compare the cost
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/check"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-navy hover:bg-coral-pale transition-colors font-medium"
              >
                Or check everything
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[var(--muted-brand)]">
              {[
                "Octopus heat-pump pricing",
                "On the Cosy tariff",
                "0% finance over 10 years",
                "Free first check",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="relative aspect-[8/7] rounded-3xl overflow-hidden shadow-xl ring-1 ring-[var(--border)]">
              <Image
                src={HERO_IMAGE}
                alt="An Octopus Energy air source heat pump installed outside a home"
                fill
                priority
                quality={80}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <HeroStatCard
                icon={<PoundSterling className="w-5 h-5" />}
                label="Octopus heat pump"
                value="from £3,000"
                sub="net of the £7,500 grant"
              />
              <HeroStatCard
                icon={<Percent className="w-5 h-5" />}
                label="Finance"
                value="0% APR"
                sub="over 10 years"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust / ratings band — real Octopus heat-pump proof points
          (figures: Octopus Energy, Nesta 2023, BRE testing, MCS DB). */}
      <section className="bg-cream-deep border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex gap-0.5 text-coral" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </span>
              <p className="text-sm font-semibold text-navy">
                Owners rate their heat pumps highly
              </p>
            </div>
            <p className="text-sm text-[var(--muted-brand)]">
              In a 2023 Nesta survey, heat-pump owners reported being highly
              satisfied — most wouldn&rsquo;t go back to gas.
            </p>
          </div>

          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              icon={<Gauge className="w-5 h-5" />}
              value="3.6 SCOP"
              label="Typical efficiency"
              sub="3–4 units of heat per unit of electricity"
            />
            <StatTile
              icon={<PoundSterling className="w-5 h-5" />}
              value="£219"
              label="Avg saved last year*"
              sub="Cosy heat-pump customers on the Cosy Octopus tariff"
            />
            <StatTile
              icon={<Leaf className="w-5 h-5" />}
              value="~85%"
              label="Less carbon than gas"
              sub="Lower emissions than a gas boiler"
            />
            <StatTile
              icon={<Clock className="w-5 h-5" />}
              value="15–20 yrs"
              label="Typical lifespan"
              sub="UK government research; ~20 years on average"
            />
          </ul>

          <p className="mt-6 text-xs text-[var(--muted-brand)] leading-relaxed">
            Figures from Octopus Energy, Nesta (May 2023), BRE independent
            testing and the MCS database. *Average saving for Octopus Cosy
            heat-pump customers on the Cosy Octopus tariff last year. Your own
            figures depend on your home, tariff and usage.
          </p>
        </div>
      </section>

      {/* What we compare */}
      <section className="bg-cream-deep border-y border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="max-w-xl">
            <p className="eyebrow">What we compare</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              Boiler vs Octopus heat pump — the honest numbers.
            </h2>
            <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
              We pull your EPC to size both for your actual property, then
              put the upfront cost, the monthly cost and the total over time
              side by side — using Octopus&rsquo;s pricing and tariff.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Feature
              icon={<Zap className="w-5 h-5" />}
              title="Octopus heat-pump pricing"
              body="Their installed price after the £7,500 Boiler Upgrade Scheme grant — typically well below the market average."
            />
            <Feature
              icon={<PoundSterling className="w-5 h-5" />}
              title="Running costs on the Cosy tariff"
              body="We model the heat pump on Octopus Cosy, where cheap off-peak windows bring the running cost below a gas boiler."
            />
            <Feature
              icon={<Percent className="w-5 h-5" />}
              title="0% finance over 10 years"
              body="See the real monthly cost spread interest-free, next to a new boiler's, so you can compare like for like."
            />
            <Feature
              icon={<Calculator className="w-5 h-5" />}
              title="Total cost over time"
              body="Fit + running costs added up over 5, 10 or 15 years — with gas projected to rise faster than electricity."
            />
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            Five minutes, no site visit.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Step
            n="01"
            icon={<HomeIcon className="w-5 h-5" />}
            title="Just your address"
            body="No floorplan needed. We pull your EPC to read your property type, size and current heating."
          />
          <Step
            n="02"
            icon={<Calculator className="w-5 h-5" />}
            title="We price both options"
            body="A new boiler sized for your home, and an Octopus heat pump net of the grant — each with a monthly cost on 0% finance."
          />
          <Step
            n="03"
            icon={<ArrowRightLeft className="w-5 h-5" />}
            title="The difference, in black and white"
            body="Upfront, monthly and total over time, side by side. Take it or leave it — no pressure."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="rounded-3xl bg-coral text-cream p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden>
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-terracotta blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--sage)] blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl">
              Boiler or Octopus heat pump? See the numbers.
            </h2>
            <p className="mt-4 text-cream/80 max-w-xl mx-auto">
              Free first check. Five minutes. A clear cost comparison using
              Octopus pricing, the Cosy tariff and 0% finance.
            </p>
            <Link
              href="/check/octopus"
              className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-[#ffffff] text-[#e0007f] hover:bg-[#f3eefc] font-semibold transition-colors"
            >
              Compare the cost
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-5 text-xs text-cream/60">
              Pre-survey indication only — not a quote. £7,500 Boiler Upgrade
              Scheme grant, England &amp; Wales, subject to eligibility.
              Finance subject to status.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <li className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-coral-pale text-coral">
        {icon}
      </span>
      <p className="mt-3 text-2xl font-bold text-navy">{value}</p>
      <p className="text-sm font-semibold text-navy">{label}</p>
      <p className="mt-1 text-xs text-[var(--muted-brand)] leading-snug">
        {sub}
      </p>
    </li>
  );
}

function HeroStatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-3 sm:p-4 flex items-start gap-3">
      <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-coral-pale text-coral">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-brand)]">
          {label}
        </p>
        <p className="text-base sm:text-lg font-semibold text-navy leading-tight">
          {value}
        </p>
        <p className="text-xs text-[var(--muted-brand)] mt-0.5 leading-snug">
          {sub}
        </p>
      </div>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[var(--border)] p-6">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[var(--muted-brand)] tabular-nums">
          {n}
        </span>
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-coral-pale text-coral">
          {icon}
        </span>
      </div>
      <h3 className="mt-5 text-lg text-navy">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted-brand)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-coral-pale text-coral">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-navy">{title}</p>
        <p className="mt-1 text-sm text-[var(--muted-brand)] leading-relaxed">
          {body}
        </p>
      </div>
    </li>
  );
}
