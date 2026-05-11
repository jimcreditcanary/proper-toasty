// /heatpump — heat-pump-focused marketing landing page.
//
// The Solar/Heatpump pair are aimed at paid-search visitors who
// already know which tech they want. Same brand chrome as / (the
// homepage) but trimmed to one product narrative, with the CTAs
// pointing at /check/heatpump (the focus="heatpump" wizard variant).
//
// Copy is v1 — keep editing freely. Voice: short, decisive, real
// numbers, no jargon. Lifts the "pre-survey indication" disclaimer
// from the homepage footer so the marketing claim stays accurate.

import Link from "next/link";
import Image from "next/image";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import {
  ArrowRight,
  Flame,
  PoundSterling,
  Home as HomeIcon,
  Sparkles,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  Leaf,
} from "lucide-react";

const HERO_IMAGE = "/hero-uk-home.jpg";

export const metadata = {
  title: "Heat pump check — Propertoasty",
  description:
    "Is your UK home ready for a heat pump? Check BUS grant eligibility, system size and outdoor-unit placement in five minutes — no site visit needed.",
};

export default function HeatPumpLanding() {
  return (
    <div className="bg-cream">
      <MarketingHeader />

      {/* Hero — trimmed to a single-product story. The right column
          drops the 2×2 stat grid in favour of one focused HP stat
          card (typical BUS grant) so the page reads tighter on
          mobile and doesn't compete with the headline. */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-brand)] shadow-sm">
              <Flame className="w-3.5 h-3.5 text-coral" />
              Heat pump check
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl text-navy leading-[1.05]">
              A warmer home,
              <br />
              for less every winter.
            </h1>

            <p className="mt-6 text-lg text-[var(--muted-brand)] leading-relaxed max-w-lg">
              See if your home qualifies for the £7,500 Boiler Upgrade
              Scheme grant, what size pump you&rsquo;d need, and where it&rsquo;d
              sit — without anyone setting foot on your drive.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/check/heatpump"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium transition-colors shadow-sm"
              >
                Start my heat pump check
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
                "BUS grant eligibility",
                "System size indication",
                "Outdoor-unit placement",
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
                alt="A typical British semi-detached home — the kind of property a heat pump suits"
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
                label="BUS grant"
                value="£7,500"
                sub="off your install"
              />
              <HeroStatCard
                icon={<Flame className="w-5 h-5" />}
                label="Typical system"
                value="~8 kW"
                sub="for a UK semi"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why us — what the heat-pump-only check actually covers. */}
      <section className="bg-cream-deep border-y border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="max-w-xl">
            <p className="eyebrow">What we check</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              The five things a real installer would ask.
            </h2>
            <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
              We pull your EPC, read your roof and garden from
              satellite, and use your floorplan to size a system that
              suits how the home&rsquo;s actually laid out.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Feature
              icon={<ShieldCheck className="w-5 h-5" />}
              title="BUS grant — yes or no"
              body="Latest Ofgem rules. We flag blockers (cavity-wall insulation gaps, F/G EPC ratings, second-home rules) before you waste the installer's call."
            />
            <Feature
              icon={<Wrench className="w-5 h-5" />}
              title="System size that fits"
              body="Peak heat demand from your floorplan + EPC fabric, not a postcode-average. Gives you the right kW range to brief installers on."
            />
            <Feature
              icon={<HomeIcon className="w-5 h-5" />}
              title="Where the outdoor unit lives"
              body="We read placement candidates straight off your plan — close to a hot-water cylinder, away from the neighbour's bedroom window, with the 1 m of clear space MCS needs."
            />
            <Feature
              icon={<Sparkles className="w-5 h-5" />}
              title="Hot water + radiator sizing"
              body="Cylinder space spotted on the plan. Radiator count flagged so you know if a few will need upsizing before the pump runs efficiently."
            />
          </ul>
        </div>
      </section>

      {/* How it works — abbreviated, HP-flavoured. */}
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
            title="Your address + a floorplan"
            body="Drag-and-drop a photo or PDF — agent listing, sale brochure, or a quick phone shot of the architect's drawing."
          />
          <Step
            n="02"
            icon={<Leaf className="w-5 h-5" />}
            title="We do the survey work"
            body="EPC pulled. Floorplan read by our AI. Roof + garden checked from satellite. All cross-referenced against MCS + Ofgem rules."
          />
          <Step
            n="03"
            icon={<Flame className="w-5 h-5" />}
            title="A report your installer trusts"
            body="Pre-survey indication of grant, size, placement and any blockers — clear enough for a quote without a site visit first."
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
              Find out if a heat pump works for your home.
            </h2>
            <p className="mt-4 text-cream/80 max-w-xl mx-auto">
              Free first check. Five minutes. A report you can take
              straight to an MCS installer for a quote.
            </p>
            <Link
              href="/check/heatpump"
              className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
            >
              Start my heat pump check
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-5 text-xs text-cream/60">
              Pre-survey indication only — not a final engineering
              assessment. England &amp; Wales for BUS.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
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
