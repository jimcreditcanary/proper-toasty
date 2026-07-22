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
import { RelatedCard } from "@/components/marketing/related-card";
import { FaqPageSchema } from "@/components/seo/schema";
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

// AEO FAQ block — 40-60 word direct-answer paragraphs, mirrored to
// FAQPage JSON-LD so Google + AI answer engines can lift the
// answers verbatim. Items live at module scope so the visible
// accordion + the schema stay in sync.
const HP_FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Am I eligible for the £7,500 Boiler Upgrade Scheme grant?",
    a: "The £7,500 BUS grant is available to owners of homes in England or Wales with a valid EPC certificate and no outstanding recommendations for loft or cavity-wall insulation. The property must have an existing fossil-fuel boiler (gas, oil, or LPG) being replaced. Our free check tells you within five minutes if your property qualifies.",
  },
  {
    q: "How big a heat pump does my home need?",
    a: "Most UK homes need between 5 kW and 12 kW of heat-pump capacity, sized on peak heat demand rather than boiler kW. A well-insulated 3-bed semi typically lands around 7-8 kW; a detached 4-bed nearer 10-12 kW. Sizing depends on floor area, fabric performance, and design outside temperature. Our pre-survey uses your EPC + floorplan to indicate a specific kW range.",
  },
  {
    q: "Do I need a site visit to get a quote?",
    a: "Not for a first quote. Propertoasty produces an installer-ready pre-survey from your address, EPC, floorplan, and roof imagery — enough for an MCS-certified installer to give you a written quote remotely. A physical site visit is still needed before the install itself, so the installer can confirm placement, radiator sizing, and cable runs.",
  },
  {
    q: "How much does a heat pump cost after the £7,500 grant?",
    a: "A typical UK air-source heat pump install costs £12,000–£16,000 before the grant, so £4,500–£8,500 after the £7,500 BUS deduction. Complex installs (larger homes, new hot-water cylinder, radiator upgrades) run higher. Our engine gives you a specific range from your property data + local install-cost bands.",
  },
  {
    q: "Does my home need extra insulation before a heat pump can go in?",
    a: "Only when the EPC lists an outstanding loft or cavity-wall insulation recommendation — Ofgem's BUS rules require those to be cleared first. Homes rated EPC C or better usually pass with no fabric work. Roughly 15% of homes that start our check discover they need insulation first; we flag it before you waste an installer's time.",
  },
];

// Hero image: an outdoor ASHP unit beside a UK brick wall (sourced
// from Unsplash, licence-free). Served from /public so it goes out
// on the same origin — no third-party DNS+TLS hop.
const HERO_IMAGE = "/hero-heatpump.jpg";

export const metadata = {
  title: "Heat pump check",
  description:
    "Is your UK home ready for a heat pump? Check BUS grant eligibility, system size and outdoor-unit placement in five minutes — no site visit needed.",
  alternates: { canonical: "https://www.propertoasty.com/heatpump" },
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
              lower bills.
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

      {/* ─── FAQ ────────────────────────────────────────────────────
          Five direct-answer questions, 40-60 word answers each. The
          FaqPageSchema at the top of the tree mirrors the visible
          accordion so Google + AI answer engines can lift the
          answers verbatim without visiting the page. */}
      <FaqPageSchema
        faqs={HP_FAQS.map((it) => ({ question: it.q, answer: it.a }))}
      />
      <section className="border-y border-[var(--border)] bg-cream-deep">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-10">
            <p className="eyebrow">Common questions</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              Heat pumps in the UK — the five things homeowners ask us most.
            </h2>
          </div>
          <div className="space-y-3">
            {HP_FAQS.map((it) => (
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
          Contextual internal links to the deep guides + comparisons
          + installer directory. Distributes PageRank into evergreen
          pages that would otherwise be reachable only from the
          /guides + /compare indexes, and gives homeowners the next
          step for whichever sub-question they arrived with. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-xl mb-10">
          <p className="eyebrow">Keep reading</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            The heat-pump questions everyone lands on next.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RelatedCard
            href="/guides/heat-pump-payback-period-uk"
            eyebrow="Guide"
            title="How long does a heat pump take to pay back?"
            body="Payback ranges + the five levers that move it — grant, tariff, weather compensation, solar, insulation."
          />
          <RelatedCard
            href="/guides/heat-pump-running-costs-vs-gas"
            eyebrow="Guide"
            title="Heat pump vs gas — running costs compared"
            body="What a typical UK 3-bed spends per year on each fuel at 2026 tariffs. Honest numbers, both scenarios."
          />
          <RelatedCard
            href="/guides/bus-application-walkthrough"
            eyebrow="Guide"
            title="How the £7,500 BUS grant application works"
            body="Step-by-step: eligibility, installer nominates, Ofgem approves, install, sign-off. What to expect."
          />
          <RelatedCard
            href="/guides/fabric-first-retrofit-before-heat-pump"
            eyebrow="Guide"
            title="Fabric-first retrofit before a heat pump"
            body="What to do, in what order, so the pump is sized right + BUS eligibility is clear."
          />
          <RelatedCard
            href="/compare/heat-pump-vs-gas-boiler"
            eyebrow="Comparison"
            title="Heat pump vs gas boiler"
            body="Head-to-head on install cost, running cost, lifespan, and carbon."
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
