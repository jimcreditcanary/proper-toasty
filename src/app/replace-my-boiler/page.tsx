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
import { RelatedCard } from "@/components/marketing/related-card";
import { FaqPageSchema } from "@/components/seo/schema";
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

// AEO FAQ block — 40-60 word direct-answer paragraphs mirrored to
// FAQPage JSON-LD.
const BOILER_FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Is a heat pump really cheaper than a new gas boiler over 10 years?",
    a: "On total cost of ownership over 10 years, a heat pump on a dedicated tariff (Octopus Cosy, British Gas HomeEnergy) typically lands £2,000-£4,000 cheaper than a like-for-like new gas boiler for a UK 3-bed. On a standard tariff the two run roughly level. Our cost engine gives you specific figures from your EPC + tariff data.",
  },
  {
    q: "Can I get finance for a heat pump like a boiler?",
    a: "Yes — most MCS installers offer 0% finance over 5-10 years on the net-of-grant heat-pump price (typically £4,500-£8,500 after the £7,500 BUS deduction). Monthly figures often come in lower than typical boiler finance because the loan principal is smaller thanks to the grant. Boiler finance is normally 9-10% APR over 3-5 years for comparison.",
  },
  {
    q: "How much do I save on running costs vs a gas boiler?",
    a: "On a heat-pump-specific tariff (~15p/kWh peak blended), a 3-bed UK home typically spends £600-£800/year running the heat pump vs £700-£1,000 running a modern gas boiler at 2026 gas-cap prices. Net running-cost saving is £100-£300/year. Bigger savings on tariffs like Octopus Cosy that shift load to overnight cheap windows.",
  },
  {
    q: "Am I eligible for the £7,500 BUS grant?",
    a: "The £7,500 Boiler Upgrade Scheme grant is available to English and Welsh homeowners replacing a fossil-fuel boiler (gas, oil, or LPG) with an MCS-certified air-source or ground-source heat pump. Your EPC must have no outstanding recommendation for loft or cavity-wall insulation. Our check tells you within five minutes whether your specific property qualifies.",
  },
  {
    q: "Do I need to change my radiators for a heat pump?",
    a: "Sometimes — but rarely all of them. Heat pumps run at lower flow temperatures (~45°C vs a boiler's ~70°C), so radiators in your worst-heated rooms may need upsizing to deliver the same heat output at the lower flow. Typical UK 3-bed retrofit swaps 2-4 radiators. Your installer sizes each one at the site visit; our pre-survey flags likely candidates from your floorplan.",
  },
];

// Reuse the ASHP hero — this page is about the heat-pump alternative
// to a boiler, so the outdoor unit is the right visual.
const HERO_IMAGE = "/hero-heatpump.jpg";

export const metadata = {
  title: "New boiler or heat pump?",
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

      {/* ─── FAQ ────────────────────────────────────────────────────
          Five direct-answer questions, 40-60 word answers each,
          mirrored to FAQPage JSON-LD. */}
      <FaqPageSchema
        faqs={BOILER_FAQS.map((it) => ({ question: it.q, answer: it.a }))}
      />
      <section className="border-y border-[var(--border)] bg-cream-deep">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-10">
            <p className="eyebrow">Common questions</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              Boiler vs heat pump — the five things homeowners ask us most.
            </h2>
          </div>
          <div className="space-y-3">
            {BOILER_FAQS.map((it) => (
              <details
                key={it.q}
                className="group rounded-xl border border-[var(--border)] bg-white p-5"
              >
                <summary className="cursor-pointer text-base font-semibold text-navy flex items-center justify-between gap-3">
                  <span>{it.q}</span>
                  <span className="text-coral text-xs shrink-0 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="mt-4 text-slate-700 leading-relaxed">
                  {it.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Related reading ────────────────────────────────────────
          Contextual internal links to the head-to-head comparisons +
          finance guide + installer directory. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-xl mb-10">
          <p className="eyebrow">Keep reading</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            Boiler-vs-heat-pump questions people ask next.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RelatedCard
            href="/compare/heat-pump-vs-gas-boiler"
            eyebrow="Comparison"
            title="Heat pump vs gas boiler"
            body="Head-to-head on install cost, running cost, lifespan, and carbon for a UK mains-gas home."
          />
          <RelatedCard
            href="/compare/heat-pump-vs-oil-boiler"
            eyebrow="Comparison"
            title="Heat pump vs oil boiler"
            body="Off-grid economics — where the £7,500 BUS grant + oil-tank-avoided-cost tip payback into 3-6 years."
          />
          <RelatedCard
            href="/compare/heat-pump-vs-lpg-boiler"
            eyebrow="Comparison"
            title="Heat pump vs LPG boiler"
            body="Similar picture to oil — heat-pump running costs run half of LPG, payback typically inside 5 years."
          />
          <RelatedCard
            href="/compare/heat-pump-finance-options"
            eyebrow="Comparison"
            title="Heat pump finance options"
            body="0% APR / green loan / cash — what's actually available, monthly figures, and how it compares to boiler finance."
          />
          <RelatedCard
            href="/guides/heat-pump-payback-period-uk"
            eyebrow="Guide"
            title="Heat pump payback in the UK"
            body="Payback ranges + the five levers that move them. Grant, tariff, weather compensation, solar, insulation."
          />
          <RelatedCard
            href="/heat-pump-installers"
            eyebrow="Directory"
            title="MCS-certified heat pump installers"
            body="5,500+ installers, distance-ranked with Google verified reviews. Every entry BUS-registered."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 pt-4">
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
