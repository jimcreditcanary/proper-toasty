// /octopus — Octopus Energy co-branded landing page.
//
// Consumer-friendly variant: the visitor doesn't know or care about
// SCOP / MCS / BUS. They want a clear monthly price, a believable
// saving, and proof other people did this and didn't regret it.
//
// Page shape:
//   1. Hero        — one-line value prop + £49.99/mo headline + CTA
//   2. Pricing     — big number card, side-by-side vs gas boiler
//   3. What's included — the 10 illustrative offer bullets
//   4. Reviews     — three real-feeling homeowner stories
//   5. Install map — illustrative scattered markers (Manchester area)
//   6. Final CTA
//
// Voice: short, decisive, money-first. No jargon, no efficiency
// ratios, no finance APR talk. The disclaimer ("illustrative
// examples for research purposes only") still ships in the footer
// so the marketing claims are framed honestly.

import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import {
  ArrowRight,
  Banknote,
  Check,
  CloudOff,
  Cpu,
  Droplets,
  Hammer,
  Home as HomeIcon,
  PoundSterling,
  Quote,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
  Wrench,
} from "lucide-react";

export const metadata = {
  title: "Heat your home for £49.99 a month — Octopus + Propertoasty",
  description:
    "Swap the gas boiler for an Octopus heat pump. £49.99/month including servicing. Average bill £180/year cheaper. Fitted in four days, ten-year warranty.",
};

// Illustrative offer headline numbers — surfaced in copy and on the
// pricing card. Treated as plain figures the reader can grasp at a
// glance, not as a quote.
const MONTHLY_GBP = 49.99;
const GAS_BOILER_MONTHLY_GBP = 110; // illustrative new-boiler equivalent
const ANNUAL_SAVING_GBP = 180;

export default function OctopusLanding() {
  return (
    // theme-octopus scopes the dark Octopus brand-colour takeover to
    // this page (see globals.css). Illustrative co-brand only.
    <div className="theme-octopus bg-cream">
      <MarketingHeader />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-brand)] shadow-sm">
            <span role="img" aria-label="Octopus" className="text-sm leading-none">
              🐙
            </span>
            In partnership with Octopus Energy
          </div>

          <h1 className="mt-6 text-5xl sm:text-7xl text-navy leading-[1.02] tracking-tight">
            Heat your home
            <br />
            for{" "}
            <span className="text-coral">£{MONTHLY_GBP}</span>
            <span className="text-navy"> a month.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-[var(--muted-brand)] leading-relaxed max-w-2xl mx-auto">
            An Octopus heat pump replaces your gas boiler. The bill comes
            in around <strong className="text-navy">£{ANNUAL_SAVING_GBP} a year cheaper</strong>,
            and servicing&rsquo;s included.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/check/octopus"
              className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-coral hover:bg-coral-dark text-cream font-semibold text-base transition-colors shadow-lg"
            >
              See your savings
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <p className="mt-4 text-xs text-[var(--muted-brand)]">
            Takes a few seconds. No forms, no calls.
          </p>
        </div>
      </section>

      {/* ── Pricing showcase ────────────────────────────────────── */}
      <section className="bg-cream-deep border-y border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PriceCard
              tone="primary"
              label="Octopus heat pump"
              monthly={`£${MONTHLY_GBP}`}
              sub="per month — servicing & callouts included"
              note="No gas bills. £500 cashback when you sign up."
            />
            <PriceCard
              tone="boring"
              label="New gas boiler"
              monthly={`£${GAS_BOILER_MONTHLY_GBP}`}
              sub="per month — fuel + the standing charge"
              note="Plus servicing. Plus repair calls. Plus rising gas prices."
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-brand)]">
              You save
            </p>
            <p className="mt-1 text-4xl sm:text-5xl text-navy font-bold">
              ~£{GAS_BOILER_MONTHLY_GBP - Math.round(MONTHLY_GBP)} a month
            </p>
            <p className="mt-1 text-sm text-[var(--muted-brand)]">
              That&rsquo;s about £{(GAS_BOILER_MONTHLY_GBP - Math.round(MONTHLY_GBP)) * 12} a year
              you keep.
            </p>
          </div>
        </div>
      </section>

      {/* ── What's included ─────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            Everything&rsquo;s in the price.
          </h2>
          <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
            No hidden costs, no upgrade upsells, no &ldquo;your radiators
            won&rsquo;t work&rdquo; surprises after the install.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          <Bullet
            icon={<CloudOff className="w-5 h-5" />}
            title="No more gas bills"
            body="Drop the standing charge — that alone saves around £120 a year."
          />
          <Bullet
            icon={<PoundSterling className="w-5 h-5" />}
            title="£180/year cheaper than a gas boiler"
            body="On average, across the year — including the cold months."
          />
          <Bullet
            icon={<Wrench className="w-5 h-5" />}
            title="Free radiator upgrades"
            body="If yours are past their best, Octopus replaces them at no extra cost."
          />
          <Bullet
            icon={<Droplets className="w-5 h-5" />}
            title="New, super-efficient hot water tank"
            body="Plenty for a family of four — long showers, dishwashers, the lot."
          />
          <Bullet
            icon={<Radio className="w-5 h-5" />}
            title="Remote monitoring, 24/7"
            body="Octopus engineers see issues before you do — most fixes are remote."
          />
          <Bullet
            icon={<Cpu className="w-5 h-5" />}
            title="Free software updates, for life"
            body="It gets smarter and cheaper to run, automatically, every year."
          />
          <Bullet
            icon={<Hammer className="w-5 h-5" />}
            title="Fitted in four days"
            body="In and out before the weekend. Heating&rsquo;s back on the same week."
          />
          <Bullet
            icon={<ShieldCheck className="w-5 h-5" />}
            title="10-year Octopus warranty"
            body="If anything goes wrong, they fix it. No small print."
          />
          <Bullet
            icon={<Banknote className="w-5 h-5" />}
            title="£500 cashback"
            body="To cover your first winter — or flights to Tenerife to skip it."
          />
          <Bullet
            icon={<Wallet className="w-5 h-5" />}
            title={`£${MONTHLY_GBP} a month`}
            body="Servicing and callouts included — nothing extra to budget for."
          />
        </ul>
      </section>

      {/* ── Customer reviews ────────────────────────────────────── */}
      <section className="bg-cream-deep border-y border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-10">
            <div>
              <p className="eyebrow">Real homeowners, real bills</p>
              <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
                What people in 3-bed semis are saying.
              </h2>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex gap-0.5 text-coral" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </span>
              <p className="text-sm font-semibold text-navy">
                4.8 / 5 across 12,000+ owners
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ReviewCard
              initials="SP"
              name="Sarah P."
              meta="3-bed semi, Stockport"
              accent="from-[#ff5cb6] to-[#ff2d9e]"
              quote="Honestly thought it’d be a faff. They were in and out in four days, the house is warmer, and the first bill made me laugh out loud."
            />
            <ReviewCard
              initials="MJ"
              name="Mark & Joanne"
              meta="3-bed semi, Sale"
              accent="from-[#5ce0c6] to-[#3ab59d]"
              quote="We did the maths twice because we didn’t believe it. £49 a month, no gas standing charge, and the engineers fixed something remotely we didn’t even know was off."
            />
            <ReviewCard
              initials="DT"
              name="David T."
              meta="3-bed semi, Worsley"
              accent="from-[#ff7ab8] to-[#ff5cb6]"
              quote="The cashback covered a week in Tenerife in January. The boiler it replaced was 14 years old and on its last legs. Wish I’d done it years ago."
            />
          </div>

          <p className="mt-8 text-xs text-[var(--muted-brand)] text-center">
            Illustrative customer stories for research purposes only.
          </p>
        </div>
      </section>

      {/* ── Installs near you ───────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="eyebrow">Already installed near you</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            Homes in Manchester are already running on heat pumps.
          </h2>
          <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
            Every dot is a heat pump Octopus has fitted in the area. You
            wouldn&rsquo;t be the first on your street.
          </p>
        </div>

        <div className="mt-10">
          <InstallMap />
        </div>
        <p className="mt-4 text-xs text-[var(--muted-brand)] text-center">
          Illustrative map for research purposes only.
        </p>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-24">
        <div className="rounded-3xl bg-coral text-cream p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden>
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-terracotta blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--sage)] blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl tracking-tight">
              See your monthly saving in 10 seconds.
            </h2>
            <p className="mt-4 text-cream/80 max-w-xl mx-auto">
              No forms, no calls, no &ldquo;our team will be in touch&rdquo;.
              Just the number, side by side with a new gas boiler.
            </p>
            <Link
              href="/check/octopus"
              className="mt-8 inline-flex items-center gap-2 h-14 px-8 rounded-full bg-[#ffffff] text-[#e0007f] hover:bg-[#f3eefc] font-semibold text-base transition-colors"
            >
              See your savings
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

// ── Pricing cards ──────────────────────────────────────────────────

function PriceCard({
  tone,
  label,
  monthly,
  sub,
  note,
}: {
  tone: "primary" | "boring";
  label: string;
  monthly: string;
  sub: string;
  note: string;
}) {
  const isPrimary = tone === "primary";
  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 border ${
        isPrimary
          ? "bg-coral text-cream border-coral shadow-xl"
          : "bg-white border-[var(--border)]"
      }`}
    >
      <div className="flex items-center gap-2">
        {isPrimary ? (
          <span role="img" aria-label="Octopus" className="text-lg leading-none">
            🐙
          </span>
        ) : (
          <Sparkles className="w-5 h-5 text-[var(--muted-brand)]" />
        )}
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            isPrimary ? "text-cream/80" : "text-[var(--muted-brand)]"
          }`}
        >
          {label}
        </p>
      </div>
      <p
        className={`mt-4 text-5xl sm:text-6xl font-bold tracking-tight ${
          isPrimary ? "text-cream" : "text-navy"
        }`}
      >
        {monthly}
      </p>
      <p
        className={`mt-1 text-sm ${
          isPrimary ? "text-cream/80" : "text-[var(--muted-brand)]"
        }`}
      >
        {sub}
      </p>
      <p
        className={`mt-6 text-sm leading-relaxed ${
          isPrimary ? "text-cream/90" : "text-navy"
        }`}
      >
        {note}
      </p>
    </div>
  );
}

// ── Bullets ────────────────────────────────────────────────────────

function Bullet({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  body: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-coral-pale text-coral">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-navy flex items-center gap-2">
          <Check className="w-4 h-4 text-[var(--sage)] shrink-0" />
          {title}
        </p>
        <p className="mt-1 text-sm text-[var(--muted-brand)] leading-relaxed">
          {body}
        </p>
      </div>
    </li>
  );
}

// ── Review card ────────────────────────────────────────────────────
//
// Illustrative homeowner card. The "photo" area is a styled placeholder
// — a coloured gradient with a stylised house silhouette and an initial
// avatar — rather than a stock photo, so it's visibly intentional and
// the marketing layout works before real Octopus content is in.

function ReviewCard({
  initials,
  name,
  meta,
  accent,
  quote,
}: {
  initials: string;
  name: string;
  meta: string;
  /** Tailwind gradient classes for the photo area, e.g. "from-X to-Y" */
  accent: string;
  quote: string;
}) {
  return (
    <article className="rounded-3xl bg-white border border-[var(--border)] overflow-hidden flex flex-col">
      {/* Placeholder "photo" — homeowner outside a 3-bed semi. */}
      <div
        className={`relative aspect-[4/3] bg-gradient-to-br ${accent} flex items-end p-5`}
      >
        <svg
          viewBox="0 0 200 120"
          className="absolute inset-0 w-full h-full opacity-20"
          aria-hidden
        >
          {/* sky implied by the gradient; draw a simple house silhouette */}
          <path
            d="M40 110 L40 60 L100 20 L160 60 L160 110 Z"
            fill="white"
          />
          <rect x="85" y="80" width="30" height="30" fill="rgba(0,0,0,0.25)" />
          <rect x="55" y="70" width="20" height="20" fill="rgba(0,0,0,0.15)" />
          <rect x="125" y="70" width="20" height="20" fill="rgba(0,0,0,0.15)" />
        </svg>
        <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-white text-navy font-bold text-sm shadow-md">
          {initials}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <Quote className="w-5 h-5 text-coral" aria-hidden />
        <p className="mt-3 text-sm text-navy leading-relaxed flex-1">
          {quote}
        </p>
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-sm font-semibold text-navy">{name}</p>
          <p className="text-xs text-[var(--muted-brand)]">{meta}</p>
        </div>
      </div>
    </article>
  );
}

// ── Install map ────────────────────────────────────────────────────
//
// Illustrative scattered markers across a stylised Manchester-area
// rectangle. Not a real basemap — clearly a marketing illustration.
// One marker (the larger, ringed one) sits where the demo property
// at 2 Curtels Close, Worsley sits relative to the rest of the city.

function InstallMap() {
  // 30 scattered install markers — deterministic, drawn from a
  // mulberry-style hash so the layout stays the same between renders
  // without using Math.random() at module scope (which breaks SSR
  // hydration). Hand-tuned cluster near the demo home.
  const markers: { x: number; y: number; r: number }[] = [
    { x: 12, y: 22, r: 3 },
    { x: 18, y: 50, r: 3 },
    { x: 24, y: 35, r: 4 },
    { x: 28, y: 70, r: 3 },
    { x: 32, y: 18, r: 3 },
    { x: 36, y: 55, r: 4 },
    { x: 40, y: 38, r: 3 },
    { x: 44, y: 78, r: 3 },
    { x: 48, y: 25, r: 4 },
    { x: 52, y: 58, r: 3 },
    { x: 55, y: 40, r: 4 },
    { x: 58, y: 75, r: 3 },
    { x: 62, y: 30, r: 3 },
    { x: 65, y: 52, r: 4 },
    { x: 68, y: 68, r: 3 },
    { x: 72, y: 22, r: 3 },
    { x: 76, y: 48, r: 4 },
    { x: 80, y: 35, r: 3 },
    { x: 82, y: 65, r: 3 },
    { x: 86, y: 28, r: 4 },
    { x: 88, y: 56, r: 3 },
    { x: 92, y: 42, r: 3 },
    { x: 15, y: 80, r: 3 },
    { x: 26, y: 12, r: 4 },
    { x: 38, y: 88, r: 3 },
    { x: 50, y: 14, r: 3 },
    { x: 70, y: 85, r: 4 },
    { x: 84, y: 18, r: 3 },
    { x: 22, y: 60, r: 3 },
    { x: 60, y: 18, r: 3 },
  ];
  // Demo home — 2 Curtels Close, Worsley sits roughly here on the
  // illustrative grid. Bigger ringed marker.
  const home = { x: 35, y: 45 };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-[var(--border)] bg-white aspect-[16/9]">
      {/* Subtle road grid so it reads as a map, not a starfield. */}
      <svg
        viewBox="0 0 100 60"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path
              d="M 6 0 L 0 0 0 6"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect width="100" height="60" fill="url(#grid)" />
        {/* Stylised arterial roads */}
        <path
          d="M 0 22 Q 30 18 55 28 T 100 32"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.6"
          fill="none"
        />
        <path
          d="M 0 42 Q 25 48 50 40 T 100 46"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.6"
          fill="none"
        />
        <path
          d="M 30 0 Q 32 30 38 60"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.6"
          fill="none"
        />
        {/* Install markers */}
        {markers.map((m, i) => (
          <g key={i}>
            <circle cx={m.x} cy={m.y * 0.6} r={m.r * 0.4} fill="#ff2d9e" opacity="0.85" />
            <circle cx={m.x} cy={m.y * 0.6} r={m.r * 0.9} fill="#ff2d9e" opacity="0.18" />
          </g>
        ))}
        {/* Demo home — bigger, ringed */}
        <g>
          <circle cx={home.x} cy={home.y * 0.6} r={2.5} fill="#5ce0c6" />
          <circle
            cx={home.x}
            cy={home.y * 0.6}
            r={5}
            fill="none"
            stroke="#5ce0c6"
            strokeWidth="0.6"
          />
          <circle
            cx={home.x}
            cy={home.y * 0.6}
            r={8}
            fill="none"
            stroke="#5ce0c6"
            strokeWidth="0.3"
            opacity="0.6"
          />
        </g>
      </svg>

      {/* Manchester label */}
      <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs text-cream">
        <HomeIcon className="w-3.5 h-3.5" />
        Manchester area · M28 &amp; surrounds
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md text-[11px] text-cream">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-coral" />
          Octopus install
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--sage)]" />
          Your demo home
        </span>
      </div>
    </div>
  );
}
