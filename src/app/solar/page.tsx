// /solar — solar+battery-focused marketing landing page.
//
// Twin of /heatpump. Same brand chrome as the homepage, trimmed to
// one product narrative, CTAs pointing at /check/solar (the
// focus="solar" wizard variant — which skips the floorplan step
// because the Google Solar API + satellite imagery are the real
// inputs).
//
// Copy is v1 — edit freely. Voice matches the homepage.

import Link from "next/link";
import Image from "next/image";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import {
  ArrowRight,
  Sun,
  BatteryCharging,
  PoundSterling,
  Home as HomeIcon,
  Sparkles,
  ShieldCheck,
  Compass,
  CheckCircle2,
  Leaf,
} from "lucide-react";

const HERO_IMAGE = "/hero-uk-home.jpg";

export const metadata = {
  title: "Solar + battery check — Propertoasty",
  description:
    "Is your UK roof right for solar? Get a satellite-read kWp estimate, annual generation and battery payback in five minutes — no floorplan upload needed.",
};

export default function SolarLanding() {
  return (
    <div className="bg-cream">
      <MarketingHeader />

      {/* Hero — solar-focused. Right column drops the 2×2 stat grid
          in favour of two focused solar tiles (kWp, annual kWh)
          that match what the report headline shows. */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-brand)] shadow-sm">
              <Sun className="w-3.5 h-3.5 text-coral" />
              Solar + battery check
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl text-navy leading-[1.05]">
              Your roof,
              <br />
              earning its keep.
            </h1>

            <p className="mt-6 text-lg text-[var(--muted-brand)] leading-relaxed max-w-lg">
              See how many panels your roof actually fits, how much
              you&rsquo;d generate over a year, and whether a battery
              pays for itself — all read straight from satellite.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/check/solar"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium transition-colors shadow-sm"
              >
                Start my solar check
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
                "No floorplan upload",
                "Satellite-read sizing",
                "Battery payback",
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
                alt="A typical British semi-detached home — the kind of roof we read from satellite"
                fill
                priority
                quality={80}
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <HeroStatCard
                icon={<Sun className="w-5 h-5" />}
                label="Typical roof"
                value="~4 kWp"
                sub="UK semi-detached"
              />
              <HeroStatCard
                icon={<PoundSterling className="w-5 h-5" />}
                label="Bill saving"
                value="~£500/yr"
                sub="self-consumption"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why us — what the solar-only check actually covers. */}
      <section className="bg-cream-deep border-y border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="max-w-xl">
            <p className="eyebrow">What we check</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              Real roof numbers, not a postcode guess.
            </h2>
            <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
              We use the same imagery + irradiance models Google uses
              to size commercial solar projects — applied to your
              specific roof, your pitch, your shading.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Feature
              icon={<Compass className="w-5 h-5" />}
              title="Roof pitch, shading + orientation"
              body="South-facing vs east-west, chimney shading, tree losses — read from your actual roof, not the postcode average."
            />
            <Feature
              icon={<Sun className="w-5 h-5" />}
              title="Real annual kWh"
              body="PVGIS modelling against your roof's azimuth and pitch — a number we'd defend to an MCS installer, not a marketing one."
            />
            <Feature
              icon={<BatteryCharging className="w-5 h-5" />}
              title="Battery payback that pays back"
              body="We model your evening usage against generation — so you only buy the kWh of battery that actually earns its money."
            />
            <Feature
              icon={<ShieldCheck className="w-5 h-5" />}
              title="What you'd actually save"
              body="Against your real tariff (or our UK-average if you don't have one). Self-consumption + export — separated, so the maths is honest."
            />
          </ul>
        </div>
      </section>

      {/* How it works — abbreviated, solar-flavoured. No
          floorplan step because the focus="solar" wizard skips it. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            Five minutes, your address is enough.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Step
            n="01"
            icon={<HomeIcon className="w-5 h-5" />}
            title="Your address"
            body="That's it. We pull your roof from satellite, your tariff from your latest bill (optional), and your usage pattern from a couple of quick questions."
          />
          <Step
            n="02"
            icon={<Leaf className="w-5 h-5" />}
            title="We do the modelling"
            body="Google Solar buildingInsights + PVGIS yield + your tariff. All cross-checked against UK install norms."
          />
          <Step
            n="03"
            icon={<Sparkles className="w-5 h-5" />}
            title="A clear, quote-ready report"
            body="kWp, annual kWh, battery size, payback. Shareable straight with any MCS installer for a real quote."
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
              See if your roof is solar-ready.
            </h2>
            <p className="mt-4 text-cream/80 max-w-xl mx-auto">
              Free first check. Five minutes. No floorplan upload —
              just your address and we&rsquo;ll do the rest.
            </p>
            <Link
              href="/check/solar"
              className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
            >
              Start my solar check
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-5 text-xs text-cream/60">
              Pre-survey indication only — not a final engineering
              assessment.
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
