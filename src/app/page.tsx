import Link from "next/link";
import Image from "next/image";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import {
  ArrowRight,
  Flame,
  Gauge,
  Leaf,
  PoundSterling,
  Sun,
  CheckCircle2,
  Home as HomeIcon,
  BatteryCharging,
  Zap,
} from "lucide-react";

// Hero image: a real UK semi-detached on a Steepside cul-de-sac
// — red brick, bay window, green garage door, post-war estate
// vibe. Lives in public/ so it's served from the same domain
// (no Unsplash hop, no remote-pattern config). Replace the file
// with your own photography to swap.
const HERO_IMAGE = "/hero-uk-home.jpg";

export default function Home() {
  return (
    <div className="bg-cream">
      <MarketingHeader />

      {/* Hero */}
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
              See if your home is ready for a heat pump, rooftop solar, or a home battery — with
              room for EV charging when you are. Grant-eligible, installer-ready, and sized for
              how you actually live.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/check"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium transition-colors shadow-sm"
              >
                Check my home
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-navy hover:bg-coral-pale transition-colors font-medium"
              >
                Read the journal
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[var(--muted-brand)]">
              {["Takes 5 minutes", "Pre-survey accurate", "Grant-ready report", "Free first check"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Hero image — switched from a modern villa to a more
              representative UK terraced / semi-detached photo, plus
              a 2×2 grid of UK-average context cards below. The
              previous single-pill "Typical BUS grant" callout
              missed three signals an average UK homeowner cares
              about (solar potential, EPC headroom, savings). */}
          <div className="relative">
            {/* Aspect ratio: 8/7 (was 4/5) — height reduced ~30% so
                the hero doesn't tower over the headline copy on
                desktop. Mobile auto-scales with the column width. */}
            <div className="relative aspect-[8/7] rounded-3xl overflow-hidden shadow-xl ring-1 ring-[var(--border)]">
              <Image
                src={HERO_IMAGE}
                alt="A typical British semi-detached home with red brick, bay window and a green garage door"
                fill
                priority
                // priority sets fetchpriority=high + preload, which is
                // what we want for the LCP element.
                //
                // quality=70 (was 80): WebP at 70 is visually identical
                // for this kind of architectural photo at this size,
                // saves ~14 KiB on the served variant (per PSI).
                //
                // sizes — tighter than before. The hero column maxes
                // at ~560px on desktop (max-w-6xl/2 minus padding) and
                // takes ~92vw on mobile (px-4 padding). PSI was
                // serving a 750w variant for a 665w displayed image;
                // the new breakdown picks a smaller candidate at
                // every viewport.
                quality={70}
                sizes="(min-width: 1024px) 560px, (min-width: 640px) 92vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <HeroStatCard
                icon={<Flame className="w-5 h-5" />}
                label="Typical BUS grant"
                value="£7,500"
                sub="off a heat pump install"
              />
              <HeroStatCard
                icon={<Sun className="w-5 h-5" />}
                label="Solar potential"
                value="~4 kWp"
                sub="typical UK roof fits"
              />
              <HeroStatCard
                icon={<Gauge className="w-5 h-5" />}
                label="EPC headroom"
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

      {/* Focused-variant CTAs — for visitors who already know they
          only want one tech assessed. Sends them straight to the
          dedicated landing page (which sets up context + drops them
          into the trimmed wizard at /check/heatpump or /check/solar).
          Sits between the hero and "How it works" so it catches
          users who scrolled past the hero CTA. */}
      <section className="border-y border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
          <p className="eyebrow text-center">Already know what you want?</p>
          <h2 className="mt-2 text-2xl sm:text-3xl text-navy text-center">
            Skip straight to the focused check.
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-brand)] text-center max-w-xl mx-auto leading-relaxed">
            Fewer questions, a report scoped to the bit you care about,
            and the same installer-ready output at the end.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <FocusCard
              href="/heatpump"
              icon={<Flame className="w-5 h-5" />}
              eyebrow="Heat pump only"
              title="Just a heat pump?"
              body="BUS grant eligibility, system sizing, and where it'd go on your floorplan — without the solar tangent."
              cta="Check for a heat pump"
            />
            <FocusCard
              href="/solar"
              icon={<Sun className="w-5 h-5" />}
              eyebrow="Solar + battery"
              title="Just solar?"
              body="Roof potential from satellite, annual kWh and battery payback — no floorplan upload needed."
              cta="Check for solar"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream-deep border-y border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="max-w-xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              From address to answer in a few minutes.
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Step
              n="01"
              icon={<HomeIcon className="w-5 h-5" />}
              title="Tell us about your home"
              body="Address, a few quick questions, and a drag-and-drop of your floorplan."
            />
            <Step
              n="02"
              icon={<Sun className="w-5 h-5" />}
              title="We do the legwork"
              body="We pull your EPC, read your roof from satellite, and size a system against UK climate data."
            />
            <Step
              n="03"
              icon={<Leaf className="w-5 h-5" />}
              title="Get a greener plan"
              body="A pre-survey report clear enough to share with an MCS installer for a quote."
            />
          </div>
        </div>
      </section>

      {/* What you get — image-free 2-column grid for the four
          features. Was previously paired with an Unsplash photo on
          the left, which cost a third-party DNS + TLS hop and ~150KB
          on mobile for a below-the-fold image. The four feature
          cards do the visual work on their own. */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-xl">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            A proper report, not a postcode-level guess.
          </h2>
        </div>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Feature
            icon={<Flame className="w-5 h-5" />}
            title="Heat pump eligibility"
            body="Boiler Upgrade Scheme grant check (up to £7,500) against the latest Ofgem rules — blockers, warnings, and a system-size indication."
          />
          <Feature
            icon={<Sun className="w-5 h-5" />}
            title="Solar suitability"
            body="Roof pitch, shading, and annual kWh from PVGIS — plus savings and payback as a range, never a single made-up number."
          />
          <Feature
            icon={<BatteryCharging className="w-5 h-5" />}
            title="Home battery sizing"
            body="How much storage actually pays back for your usage pattern — paired with your solar output and any overnight heat-pump load."
          />
          <Feature
            icon={<Zap className="w-5 h-5" />}
            title="EV-ready electrics"
            body="Headroom for a 7 kW charger when you need it, sized against your likely future draw so your installer isn't back out for a second visit."
          />
        </ul>
      </section>

      {/* Compare options — internal-link surface for /compare.
          Sits between the "What you get" feature grid and the CTA.
          Three highest-value comparisons surfaced directly + a
          "see all" link to the hub. Without this section, every
          /compare/* page was orphaned from a PageRank standpoint —
          discoverable only via sitemap. */}
      <section className="border-y border-[var(--border)] bg-cream-deep">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
          <div className="max-w-xl">
            <p className="eyebrow">Compare your options</p>
            <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
              Not sure which switch makes sense for your home?
            </h2>
            <p className="mt-4 text-slate-600">
              We&rsquo;ve worked through the 2026 UK numbers for the
              most common switching decisions. Read the one that
              matches your current setup.
            </p>
          </div>
          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CompareCard
              audience="Most UK homes"
              title="Heat pump vs gas boiler"
              href="/compare/heat-pump-vs-gas-boiler"
            />
            <CompareCard
              audience="~1.1M oil-heated homes"
              title="Heat pump vs oil boiler"
              href="/compare/heat-pump-vs-oil-boiler"
            />
            <CompareCard
              audience="Considering solar PV"
              title="Solar panels vs no solar"
              href="/compare/solar-vs-no-solar"
            />
          </ul>
          <div className="mt-8">
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:text-coral-dark transition-colors"
            >
              See all comparisons
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA — full-width green band.
          Previously a centered rounded card sat on the page's
          cream background, which left a visible cream strip
          between the "Compare your options" section and the
          card. Going full-width matches the rhythm of the other
          section bands (focused-CTAs / how-it-works / compare)
          and removes the gap. */}
      <section className="bg-coral text-cream relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden>
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-terracotta blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--sage)] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl">Ready for a warmer home?</h2>
          <p className="mt-4 text-cream/80 max-w-xl mx-auto">
            Your first check is free. Five minutes, no jargon, a report you can actually use.
          </p>
          <Link
            href="/check"
            className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
          >
            Check my home
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-5 text-xs text-cream/60">
            England &amp; Wales only for now — Scotland and Northern Ireland coming soon.
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
        <span className="text-xs font-semibold text-[var(--muted-brand)] tabular-nums">{n}</span>
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-coral-pale text-coral">
          {icon}
        </span>
      </div>
      <h3 className="mt-5 text-lg text-navy">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted-brand)] leading-relaxed">{body}</p>
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
        <p className="mt-1 text-sm text-[var(--muted-brand)] leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function CompareCard({
  audience,
  title,
  href,
}: {
  audience: string;
  title: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group block h-full rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-colors hover:border-coral hover:shadow-md"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-coral">
          {audience}
        </p>
        <p className="mt-2 text-base font-semibold text-navy leading-snug">
          {title}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2 transition-all">
          Read it
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    </li>
  );
}

function FocusCard({
  href,
  icon,
  eyebrow,
  title,
  body,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-cream/40 p-6 hover:bg-coral-pale/40 hover:border-coral/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral-pale text-coral">
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-coral">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-4 text-xl text-navy">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted-brand)] leading-relaxed">
        {body}
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-dark group-hover:gap-2.5 transition-all">
        {cta}
        <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  );
}
