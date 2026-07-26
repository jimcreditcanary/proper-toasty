import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import { JourneyCTA } from "@/components/analytics/journey-cta";

// Homepage self-canonical. Layout-level canonical was removed in
// Phase 1 (was leaking the homepage URL onto every other page as
// their canonical). The homepage still needs its own — otherwise
// query-string variants (utm_source, ?ref=…, etc.) risk being
// treated as separate URLs by Google. Title/description default
// to the layout-level title.default + description.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propertoasty.com" },
};

import {
  ArrowRight,
  Flame,
  Gauge,
  Leaf,
  PoundSterling,
  Sun,
  CheckCircle2,
  Plug,
  BadgePoundSterling,
  BatteryCharging,
} from "lucide-react";

const HERO_IMAGE = "/hero-uk-home.jpg";

export default function Home() {
  return (
    <div className="bg-cream">
      <MarketingHeader />

      {/* Hero — deliberately unchanged apart from the primary CTA
          copy: "Check my home" → "Calculate my savings". Same layout,
          same photo, same stat cards. */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-brand)] shadow-sm">
              <Leaf className="w-3.5 h-3.5 text-coral" />
              A warmer home, made simple
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl text-navy leading-[1.05]">
              Greener living
              <br />
              starts at home.
            </h1>

            <p className="mt-6 text-lg text-[var(--muted-brand)] leading-relaxed max-w-lg">
              See what a heat pump, rooftop solar, or a plug-in solar kit
              would actually save you — bill-by-bill, grant-inclusive, and
              tailored to how you live.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <JourneyCTA
                href="/check"
                journey="all"
                source="homepage_hero"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium transition-colors shadow-sm"
              >
                Calculate my savings
                <ArrowRight className="w-4 h-4" />
              </JourneyCTA>
              <Link
                href="#pick-your-calculator"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-navy hover:bg-coral-pale transition-colors font-medium"
              >
                Or pick a calculator
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[var(--muted-brand)]">
              {[
                "Takes 5 minutes",
                "Real UK numbers",
                "Grant-inclusive",
                "First check free",
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
                alt="A typical British semi-detached home with red brick, bay window and a green garage door"
                fill
                priority
                quality={70}
                sizes="(min-width: 1024px) 560px, (min-width: 640px) 92vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <HeroStatCard
                icon={<Flame className="w-5 h-5" />}
                label="Heat pump grant"
                value="£7,500"
                sub="off your install"
              />
              <HeroStatCard
                icon={<Sun className="w-5 h-5" />}
                label="Typical UK roof"
                value="~10 panels"
                sub="on a south-facing roof"
              />
              <HeroStatCard
                icon={<Gauge className="w-5 h-5" />}
                label="Energy rating"
                value="D → B"
                sub="average improvement"
              />
              <HeroStatCard
                icon={<PoundSterling className="w-5 h-5" />}
                label="Bill saving"
                value="~£900/yr"
                sub="typical UK home"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pick your calculator ──────────────────────────────────
          Three plainly-named blocks. Each block owns one journey
          + is anchored on "who is this for" so the user picks
          themselves out. Primary CTA = the calculator itself;
          secondary CTA = the deeper read for people who aren't
          ready to enter a postcode yet. Every CTA fires a
          journey_started event tagged with journey + source. */}
      <section
        id="pick-your-calculator"
        className="border-y border-[var(--border)] bg-white scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="eyebrow">Pick your calculator</p>
            <h2 className="mt-2 text-3xl sm:text-4xl text-navy">
              What do you want to save on?
            </h2>
            <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
              Three routes to lower bills. Pick the one that fits your
              home — get a real, personalised number in five minutes.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            <CalculatorCard
              audience="Best if you own your home & have a boiler"
              icon={<Flame className="w-6 h-6" />}
              accent="from-rose-50 to-coral-pale/40 border-coral/30"
              iconAccent="bg-coral text-cream"
              title="Switch to a heat pump"
              body="See what a heat pump would cost after the £7,500 grant — and how much it saves you vs another new boiler. Real 2026 UK numbers."
              stat="£7,500 grant"
              statSub="+ typical £300–£900/yr bill saving"
              journey="boiler"
              primaryHref="/check/boiler"
              secondaryHref="/replace-my-boiler"
            />
            <CalculatorCard
              audience="Best if you own the roof"
              icon={<Sun className="w-6 h-6" />}
              accent="from-amber-50 to-yellow-50/60 border-amber-200"
              iconAccent="bg-amber-500 text-white"
              title="Rooftop solar + battery"
              body="We read your roof from satellite and size a solar + battery system for it. See kWh generated, £ saved and payback in years."
              stat="~£850/yr"
              statSub="typical bill saving on 4kWp"
              journey="solar"
              primaryHref="/check/solar"
              secondaryHref="/solar"
            />
            <CalculatorCard
              audience="Best for renters, flats & small terraces"
              icon={<Plug className="w-6 h-6" />}
              accent="from-emerald-50 to-teal-50/60 border-emerald-200"
              iconAccent="bg-emerald-600 text-white"
              title="Plug-in solar kit"
              body="No roof, no installer, no landlord permission needed. Legal in the UK from April 2026. Kits from £400 — payback in 4–7 years."
              stat="From £400"
              statSub="800W kits, sold on Amazon UK"
              journey="plug_in_solar"
              primaryHref="/plug-in-solar#calculator"
              secondaryHref="/plug-in-solar/best-kits-uk-2026"
            />
          </div>
        </div>
      </section>

      {/* ── Your proper report — 2×2 with visual chart snippets ──
          Was a 4-bullet What-you-get list; now paired with mini
          visualisations that mirror what the real report shows. */}
      <section className="bg-cream-deep border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="max-w-xl">
            <p className="eyebrow">Your proper report</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              Not a postcode-level guess — a report you can act on.
            </h2>
            <p className="mt-4 text-[var(--muted-brand)] leading-relaxed">
              Every check produces the same four blocks. Numbers pulled from
              your energy certificate, your roof, and current UK grant rules
              — never a made-up flat rate.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ReportBlock
              icon={<BadgePoundSterling className="w-5 h-5" />}
              title="Bill saving, per year"
              body="A £/year range for your home based on your current fuel and how the property loses heat — not a national average."
              visual={<VizSavingsTile />}
            />
            <ReportBlock
              icon={<Flame className="w-5 h-5" />}
              title="£7,500 grant status"
              body="Yes / no on the Boiler Upgrade Scheme against today's rules, with any blockers (insulation, EPC rating) flagged first."
              visual={<VizGrantTile />}
            />
            <ReportBlock
              icon={<Sun className="w-5 h-5" />}
              title="Roof solar potential"
              body="Read from Google Solar satellite imagery — panel count, kWh/yr, and how much you'd offset from a typical UK bill."
              visual={<VizRoofTile />}
            />
            <ReportBlock
              icon={<BatteryCharging className="w-5 h-5" />}
              title="Payback timeline"
              body="A clear breakeven year for each option — solar, battery, heat pump — with and without the grant, before you commit."
              visual={<VizPaybackTile />}
            />
          </div>
        </div>
      </section>

      {/* CTA — full-width green band. */}
      <section className="bg-coral text-cream relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          aria-hidden
        >
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-terracotta blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--sage)] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl">
            Ready to see your savings number?
          </h2>
          <p className="mt-4 text-cream/80 max-w-xl mx-auto">
            Your first check is free. Five minutes, no jargon, a real number
            you can take to a quote.
          </p>
          <JourneyCTA
            href="/check"
            journey="all"
            source="homepage_footer_cta"
            className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
          >
            Calculate my savings
            <ArrowRight className="w-4 h-4" />
          </JourneyCTA>
          <p className="mt-5 text-xs text-cream/60">
            England &amp; Wales only for now — Scotland and Northern Ireland
            coming soon.
          </p>
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

// ── Calculator card ────────────────────────────────────────────────
// Bright, tactile picker card. Coloured gradient header for
// scannability + a big stat pill so the "why bother" is visible
// without reading the body copy. Primary CTA = journey; secondary =
// deeper reading. Both fire journey_started with the same journey_type
// so we can tell which entry surface converts best.
function CalculatorCard({
  audience,
  icon,
  accent,
  iconAccent,
  title,
  body,
  stat,
  statSub,
  journey,
  primaryHref,
  secondaryHref,
}: {
  audience: string;
  icon: React.ReactNode;
  accent: string;
  iconAccent: string;
  title: string;
  body: string;
  stat: string;
  statSub: string;
  journey: "heatpump" | "solar" | "boiler" | "plug_in_solar";
  primaryHref: string;
  secondaryHref: string;
}) {
  return (
    <article
      className={`flex flex-col rounded-3xl border bg-gradient-to-br ${accent} p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl ${iconAccent} shadow-sm`}
        >
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-navy/70 text-right leading-tight">
          {audience}
        </span>
      </div>

      <h3 className="mt-5 text-xl sm:text-2xl font-bold text-navy leading-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--muted-brand)] leading-relaxed flex-1">
        {body}
      </p>

      <div className="mt-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/40 p-3.5">
        <p className="text-lg font-bold text-navy tabular-nums leading-none">
          {stat}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-brand)] leading-snug">
          {statSub}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <JourneyCTA
          href={primaryHref}
          journey={journey}
          source="homepage_picker_primary"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-navy hover:bg-navy/90 text-cream font-semibold text-sm shadow-sm transition-colors"
        >
          Calculate my savings
          <ArrowRight className="w-4 h-4" />
        </JourneyCTA>
        <JourneyCTA
          href={secondaryHref}
          journey={journey}
          source="homepage_picker_secondary"
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium text-navy/80 hover:text-navy hover:bg-white/60 transition-colors"
        >
          Find out more
        </JourneyCTA>
      </div>
    </article>
  );
}

// ── Report preview blocks ──────────────────────────────────────────
// Each block pairs an icon + copy on the left with a mini visual on
// the right. The visuals are hand-drawn SVGs, not real chart data —
// they're there to hint at what a "real" report block looks like and
// break up the wall of text.
function ReportBlock({
  icon,
  title,
  body,
  visual,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 sm:p-6 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_11rem] gap-4 sm:gap-5 items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-coral-pale text-coral">
              {icon}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-navy leading-tight">
              {title}
            </h3>
          </div>
          <p className="mt-3 text-sm text-[var(--muted-brand)] leading-relaxed">
            {body}
          </p>
        </div>
        <div className="w-full sm:w-44 shrink-0">{visual}</div>
      </div>
    </div>
  );
}

// ── Mini visualisations ────────────────────────────────────────────
// Pure SVG mocks (no live data) — small illustrative chart snippets
// that mirror the shapes the real report renders.

function VizSavingsTile() {
  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
        Estimated saving
      </p>
      <p className="mt-1 text-2xl font-bold text-emerald-900 tabular-nums leading-none">
        £912/yr
      </p>
      <div className="mt-2 flex items-end justify-center gap-1 h-8">
        {[6, 8, 10, 12, 16, 20, 22].map((h, i) => (
          <span
            key={i}
            className="w-2 rounded-t-sm bg-emerald-500/80"
            style={{ height: `${h * 1.2}px` }}
          />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-emerald-700/80">vs a new gas boiler</p>
    </div>
  );
}

function VizGrantTile() {
  return (
    <div className="rounded-2xl bg-coral-pale/50 border border-coral/20 p-3.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-coral-dark">
        BUS grant
      </p>
      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5">
        <CheckCircle2 className="w-3 h-3" />
        Eligible
      </div>
      <p className="mt-2 text-xl font-bold text-navy tabular-nums leading-none">
        £7,500
      </p>
      <p className="mt-1 text-[10px] text-[var(--muted-brand)]">
        Off the install cost
      </p>
    </div>
  );
}

function VizRoofTile() {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
        Roof read
      </p>
      <div className="mt-1.5 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 60 40" className="w-16 h-11">
          <polygon points="5,32 55,32 30,10" fill="#fde68a" stroke="#d97706" strokeWidth="1.2" />
          <g fill="#f59e0b">
            <rect x="14" y="22" width="6" height="4" />
            <rect x="22" y="22" width="6" height="4" />
            <rect x="30" y="22" width="6" height="4" />
            <rect x="38" y="22" width="6" height="4" />
            <rect x="18" y="17" width="6" height="4" />
            <rect x="26" y="17" width="6" height="4" />
            <rect x="34" y="17" width="6" height="4" />
          </g>
        </svg>
      </div>
      <p className="mt-1 text-sm font-bold text-navy tabular-nums leading-none">
        10 panels · 4.0 kWp
      </p>
      <p className="mt-1 text-[10px] text-amber-700/80">South-facing pitch 35°</p>
    </div>
  );
}

function VizPaybackTile() {
  return (
    <div className="rounded-2xl bg-sky-50 border border-sky-100 p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 text-center">
        Payback
      </p>
      <div className="mt-2 space-y-1.5">
        <PaybackRow label="Solar" widthPct={45} years="6yr" />
        <PaybackRow label="Battery" widthPct={72} years="9yr" />
        <PaybackRow label="Heat pump" widthPct={30} years="4yr" />
      </div>
    </div>
  );
}

function PaybackRow({
  label,
  widthPct,
  years,
}: {
  label: string;
  widthPct: number;
  years: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[10px] font-semibold text-sky-900 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-sky-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-sky-500"
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="w-8 text-[10px] font-bold tabular-nums text-sky-900 text-right shrink-0">
        {years}
      </span>
    </div>
  );
}

