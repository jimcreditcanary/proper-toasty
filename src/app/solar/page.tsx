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
import { RelatedCard } from "@/components/marketing/related-card";
import { FaqPageSchema } from "@/components/seo/schema";
import { JourneyCTA } from "@/components/analytics/journey-cta";
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

// AEO FAQ block — 40-60 word direct-answer paragraphs mirrored to
// FAQPage JSON-LD.
const SOLAR_FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How much do solar panels cost for a typical UK roof?",
    a: "A solar system for a typical UK home in 2026 costs £4,000 to £8,000 fully fitted — that's everything (panels, control box, scaffolding, paperwork). Adding a home battery brings the total to £6,500 to £10,500. Prices vary with roof complexity and access. There's no VAT on domestic solar in the UK until 2027, so the sticker price is what you pay.",
  },
  {
    q: "How long does solar take to pay back in the UK?",
    a: "A typical UK solar system with no battery pays back in 8 to 12 years at 2026 electricity prices — you save 27p for every unit you use directly from the panels, and get paid 3 to 15p for extra electricity sold back to the grid. Adding a battery lets you use more of what you generate and typically cuts payback to 6 to 9 years for households with electricity bills over £800 a year.",
  },
  {
    q: "Do I need planning permission for rooftop solar?",
    a: "For most UK homes, no — rooftop solar counts as a normal home improvement you don't need permission for, as long as the panels don't stick more than 200mm above the roof line and don't cover the highest part of the roof. Listed buildings and Conservation Areas DO need planning permission; check with your local council before you commit.",
  },
  {
    q: "Is a home battery worth it?",
    a: "A typical home battery adds around £3,500 to the install. It stores daytime solar for you to use in the evening, letting you use about 75% of what your panels generate instead of 35% without one. Worth it if your electricity bill is over £800 a year or you're planning an electric car — payback usually 8 to 12 years. Not worth it for low-usage homes.",
  },
  {
    q: "Do I need a site visit to get a solar quote?",
    a: "Not for a first quote. Propertoasty combines your address with satellite imagery of your specific roof to work out how many panels it fits, which direction each roof face points, and how much sun it actually gets over a year. A qualified installer can quote from that remotely. A visit is still needed before the install itself, to confirm fixings and cable routing.",
  },
];

// Hero image: solar PV on a tiled roof (sourced from Unsplash,
// licence-free). Served from /public so it goes out on the same
// origin — no third-party DNS+TLS hop, just one HTTP cache hit.
const HERO_IMAGE = "/hero-solar.jpg";

export const metadata = {
  title: "Solar + battery check",
  description:
    "Is your UK roof right for solar? Get a satellite-read estimate of how many panels you fit, how much you'd generate a year, and whether a battery pays for itself — all in five minutes.",
  alternates: { canonical: "https://www.propertoasty.com/solar" },
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
              <JourneyCTA
                href="/check/solar"
                journey="solar"
                source="solar_landing_hero"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium transition-colors shadow-sm"
              >
                Start my solar check
                <ArrowRight className="w-4 h-4" />
              </JourneyCTA>
              <Link
                href="/check"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-navy hover:bg-coral-pale transition-colors font-medium"
              >
                Or check everything
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[var(--muted-brand)]">
              {[
                "Just your address",
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
                alt="A south-facing roof with solar PV panels — the kind we can size from satellite imagery"
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
                label="Typical UK semi"
                value="~10 panels"
                sub="on a south-facing roof"
              />
              <HeroStatCard
                icon={<PoundSterling className="w-5 h-5" />}
                label="Bill saving"
                value="~£500/yr"
                sub="from what you use directly"
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
              We use the same satellite imagery and sunlight data
              Google uses for commercial solar projects — applied to
              your specific roof, angle, and shading.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Feature
              icon={<Compass className="w-5 h-5" />}
              title="Roof angle, shading + direction"
              body="South-facing vs east-west, chimney shadows, nearby trees — read from your actual roof, not a postcode average."
            />
            <Feature
              icon={<Sun className="w-5 h-5" />}
              title="How much electricity you'd actually get"
              body="A real yearly number based on your specific roof direction and angle — the kind of figure we'd stand behind in front of a qualified installer."
            />
            <Feature
              icon={<BatteryCharging className="w-5 h-5" />}
              title="Battery payback that actually pays back"
              body="We match your evening electricity use against what your panels would generate — so you only buy the battery size that earns its money."
            />
            <Feature
              icon={<ShieldCheck className="w-5 h-5" />}
              title="What you'd actually save"
              body="Against your real electricity price (or UK average if you don't have your bill handy). What you use directly vs what you sell back — kept separate so the maths is honest."
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
            body="Satellite imagery of your roof, official UK sunlight data, and your electricity price — all cross-checked against typical UK install standards."
          />
          <Step
            n="03"
            icon={<Sparkles className="w-5 h-5" />}
            title="A clear, quote-ready report"
            body="Number of panels, how much electricity you'd generate each year, battery size, and payback. Ready to share with any qualified installer for a real quote."
          />
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────
          Five direct-answer questions, 40-60 word answers each,
          mirrored to FAQPage JSON-LD. */}
      <FaqPageSchema
        faqs={SOLAR_FAQS.map((it) => ({ question: it.q, answer: it.a }))}
      />
      <section className="border-y border-[var(--border)] bg-cream-deep">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-xl mx-auto mb-10">
            <p className="eyebrow">Common questions</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              Solar in the UK — the five things homeowners ask us most.
            </h2>
          </div>
          <div className="space-y-3">
            {SOLAR_FAQS.map((it) => (
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
          Contextual internal links to the deep solar comparisons +
          installer directory. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-xl mb-10">
          <p className="eyebrow">Keep reading</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            The solar questions everyone lands on next.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RelatedCard
            href="/compare/solar-vs-no-solar"
            eyebrow="Comparison"
            title="Solar vs no solar — is it worth it?"
            body="Real numbers on install cost, self-consumption, SEG earnings, and how long payback actually takes on a UK roof."
          />
          <RelatedCard
            href="/compare/solar-with-battery-vs-solar-alone"
            eyebrow="Comparison"
            title="Solar with battery vs solar alone"
            body="When a battery earns its keep, when it doesn't — and how smart-tariff arbitrage changes the maths."
          />
          <RelatedCard
            href="/compare/solar-pv-vs-solar-thermal"
            eyebrow="Comparison"
            title="Solar PV vs solar thermal"
            body="Electricity or hot water? Which suits your roof + your household load — and why PV wins for most homes."
          />
          <RelatedCard
            href="/research/uk-affordability-index"
            eyebrow="Research"
            title="UK Home Energy Affordability Index 2026"
            body="Trended snapshot of UK home energy affordability across 5 lodgement years and 13 regions."
          />
          <RelatedCard
            href="/blog"
            eyebrow="Journal"
            title="Guides + retrofit stories"
            body="Practical notes on rooftop solar, batteries, and the tariff choices that make the numbers work."
          />
          <RelatedCard
            href="/solar-panel-installers"
            eyebrow="Directory"
            title="Qualified solar installers near you"
            body="Properly qualified installers covering every UK postcode. Verified Google reviews, request a quote in 5 minutes."
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
              See if your roof is solar-ready.
            </h2>
            <p className="mt-4 text-cream/80 max-w-xl mx-auto">
              Free first check. Five minutes — just your address and
              we&rsquo;ll do the rest.
            </p>
            <JourneyCTA
              href="/check/solar"
              journey="solar"
              source="solar_landing_footer"
              className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
            >
              Start my solar check
              <ArrowRight className="w-4 h-4" />
            </JourneyCTA>
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
