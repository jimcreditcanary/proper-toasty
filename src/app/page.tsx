import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { ArrowRight, Flame, Leaf, Sun, CheckCircle2, Home as HomeIcon } from "lucide-react";

// Stock imagery: Unsplash photos chosen for a warm, lived-in feel.
// Swap these for your own photography when you have it — the paths below
// are hotlinked via next/image (images.unsplash.com is allow-listed in
// next.config.ts).
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&w=1600&q=80";
const HOME_SMALL =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&w=900&q=80";

function LandingHeader() {
  return (
    <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
        <nav className="hidden sm:flex items-center gap-7 text-sm">
          <Link href="/enterprise" className="text-[var(--muted-brand)] hover:text-navy transition-colors">
            For installers
          </Link>
          <Link href="/blog" className="text-[var(--muted-brand)] hover:text-navy transition-colors">
            Journal
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/check"
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm transition-colors"
          >
            Check my home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-cream-deep">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <Logo size="sm" variant="light" showTagline />
          <p className="mt-4 text-xs text-[var(--muted-brand)] leading-relaxed max-w-xs">
            A pre-survey indication of your home&rsquo;s heat pump and solar potential. Built for UK
            homeowners who want to make the greener call without a site visit.
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy mb-3">Explore</p>
          <ul className="space-y-2 text-[var(--muted-brand)]">
            <li><Link href="/check" className="hover:text-navy">Run a check</Link></li>
            <li><Link href="/blog" className="hover:text-navy">Journal</Link></li>
            <li><Link href="/enterprise" className="hover:text-navy">For installers</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy mb-3">Legal</p>
          <ul className="space-y-2 text-[var(--muted-brand)]">
            <li><Link href="/privacy" className="hover:text-navy">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-navy">Terms</Link></li>
            <li><Link href="/ai-statement" className="hover:text-navy">AI use</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] bg-cream">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted-brand)]">
          <span>© {year} Propertoasty · a trading name of Ebanking Integration Limited</span>
          <span>Pre-survey indications only — not an engineering assessment.</span>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="bg-cream">
      <LandingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-20 sm:pt-20 sm:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-brand)] shadow-sm">
              <Leaf className="w-3.5 h-3.5 text-coral" />
              A warmer home, made simple
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl text-navy leading-[1.05]">
              Greener heating
              <br />
              starts at home.
            </h1>

            <p className="mt-6 text-lg text-[var(--muted-brand)] leading-relaxed max-w-lg">
              See if your UK home is ready for a heat pump or solar — grant eligible, installer-ready,
              and sized for how you actually live. No site visit, no jargon.
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

          {/* Hero image */}
          <div className="relative">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-xl ring-1 ring-[var(--border)]">
              <Image
                src={HERO_IMAGE}
                alt="A warm, lived-in British home"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>
            {/* Floating pill with average savings */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-lg border border-[var(--border)] p-4 pr-6 max-w-[240px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-coral-pale text-coral flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-brand)]">Typical BUS grant</p>
                  <p className="text-lg font-semibold text-navy">£7,500 off</p>
                </div>
              </div>
            </div>
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

      {/* What you get */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative rounded-3xl overflow-hidden aspect-[4/3] ring-1 ring-[var(--border)] shadow-xl order-2 lg:order-1">
          <Image
            src={HOME_SMALL}
            alt="A modern, well-insulated home at dusk"
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            className="object-cover"
          />
        </div>
        <div className="order-1 lg:order-2">
          <p className="eyebrow">What you get</p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy">
            A proper report, not a postcode-level guess.
          </h2>
          <ul className="mt-8 space-y-5">
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
              icon={<CheckCircle2 className="w-5 h-5" />}
              title="Installer-ready"
              body="Structured so an MCS fitter can quote remotely — with questions flagged for the site visit they do need to make."
            />
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="rounded-3xl bg-coral text-cream p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden>
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-terracotta blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--sage)] blur-3xl" />
          </div>
          <div className="relative">
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
        </div>
      </section>

      <LandingFooter />
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
