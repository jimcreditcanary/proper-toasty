// /replace-my-boiler — "new boiler or heat pump?" marketing landing.
//
// Third focused-check landing, alongside /heatpump and /solar. Aimed
// at the homeowner whose boiler is on its last legs and who's weighing
// a like-for-like gas swap against a heat pump with the £7,500 grant.
// Same brand chrome as the homepage, trimmed to the cost-decision
// story, CTAs pointing at /check/boiler (the focus="boiler" wizard
// variant — skips the floorplan, lands on the cost comparison).
//
// Voice: short, decisive, real numbers, no jargon. Keeps the
// "pre-survey indication" disclaimer so the marketing claim stays
// accurate.

import Link from "next/link";
import Image from "next/image";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import {
  ArrowRight,
  ArrowRightLeft,
  PoundSterling,
  Home as HomeIcon,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Flame,
} from "lucide-react";

// Reuse the ASHP hero — this page is about the heat-pump alternative
// to a boiler, so the outdoor unit is the right visual.
const HERO_IMAGE = "/hero-heatpump.jpg";

export const metadata = {
  title: "New boiler or heat pump? — Propertoasty",
  description:
    "Boiler on its way out? Compare the all-in cost of a new gas boiler vs an air source heat pump with the £7,500 grant — both with monthly finance. Five minutes, no site visit.",
  alternates: { canonical: "https://www.propertoasty.com/replace-my-boiler" },
};

export default function ReplaceBoilerLanding() {
  return (
    <div className="bg-cream">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-brand)] shadow-sm">
              <ArrowRightLeft className="w-3.5 h-3.5 text-coral" />
              Boiler vs heat pump
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl text-navy leading-[1.05]">
              New boiler?
              <br />
              Or a heat pump?
            </h1>

            <p className="mt-6 text-lg text-[var(--muted-brand)] leading-relaxed max-w-lg">
              Before you sign off on another gas boiler, see the real
              numbers side by side — the all-in cost of each, after the
              £7,500 grant, with a monthly finance figure for both.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/check/boiler"
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
                "Boiler cost for your home",
                "Heat pump cost after grant",
                "Monthly finance, both ways",
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
                alt="An air-source heat pump outdoor unit installed beside a UK brick wall"
                fill
                priority
                quality={80}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <HeroStatCard
                icon={<Flame className="w-5 h-5" />}
                label="New gas boiler"
                value="from £2,400"
                sub="installed, typical home"
              />
              <HeroStatCard
                icon={<PoundSterling className="w-5 h-5" />}
                label="Heat pump grant"
                value="£7,500"
                sub="off the install"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What we compare */}
      <section className="bg-cream-deep border-y border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="max-w-xl">
            <p className="eyebrow">What we compare</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              The honest cost of each, side by side.
            </h2>
            <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
              We pull your EPC to size both options for your actual
              property — then put the upfront cost and the monthly
              finance next to each other so the choice is clear.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Feature
              icon={<Flame className="w-5 h-5" />}
              title="Boiler cost for your home"
              body="Installed, all-in — matched to your property type and size, not a national average. The number you'd actually be quoted for a like-for-like swap."
            />
            <Feature
              icon={<PoundSterling className="w-5 h-5" />}
              title="Heat pump cost after the grant"
              body="MCS-average install price, minus the £7,500 Boiler Upgrade Scheme grant where you qualify — so you see the real net figure, not the sticker price."
            />
            <Feature
              icon={<ShieldCheck className="w-5 h-5" />}
              title="Are you eligible for the grant?"
              body="Latest Ofgem rules. We flag blockers — outstanding insulation, tenure, double-funding — so you know whether the £7,500 is actually on the table."
            />
            <Feature
              icon={<Calculator className="w-5 h-5" />}
              title="Monthly finance, both ways"
              body="Spread either onto an install loan — 0% over a short term or a low-APR spread up to 10 years — and compare the real £/month side by side."
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
            body="No floorplan needed for this one. We pull your EPC to read your property type, size and current heating."
          />
          <Step
            n="02"
            icon={<Calculator className="w-5 h-5" />}
            title="We price both options"
            body="A new boiler sized for your home, and a heat pump net of the grant you qualify for — each with a monthly finance figure."
          />
          <Step
            n="03"
            icon={<ArrowRightLeft className="w-5 h-5" />}
            title="The difference, in black and white"
            body="Upfront cost and monthly cost side by side, plus what an MCS installer would refine on a visit. Take it or leave it — no pressure."
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
              Boiler or heat pump? See the numbers first.
            </h2>
            <p className="mt-4 text-cream/80 max-w-xl mx-auto">
              Free first check. Five minutes. A clear cost comparison you
              can take to a Gas Safe or MCS installer.
            </p>
            <Link
              href="/check/boiler"
              className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
            >
              Compare the cost
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-5 text-xs text-cream/60">
              Pre-survey indication only — not a quote. £7,500 Boiler
              Upgrade Scheme grant, England &amp; Wales, subject to
              eligibility.
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
