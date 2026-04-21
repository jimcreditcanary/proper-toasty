import Link from "next/link";
import { Logo } from "@/components/logo";
import { Flame, Sun, CheckCircle2 } from "lucide-react";

function LandingHeader() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
        <nav className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 bg-slate-100 rounded-full px-3 py-1.5">
            Launching soon
          </span>
        </nav>
      </div>
    </header>
  );
}

function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <span>© {year} Propertoasty. Pre-survey indications only — not an engineering design.</span>
        <nav className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          <Link href="/ai-statement" className="hover:text-slate-900">AI use</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <LandingHeader />
      <main className="flex-1 bg-gradient-to-b from-coral-pale to-white">
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-coral animate-pulse" />
            Heat pump & solar eligibility — launching soon
          </div>

          <h1 className="mt-8 text-4xl sm:text-6xl font-bold tracking-tight text-navy leading-[1.05]">
            Is your home ready for a{" "}
            <span className="text-coral">heat pump</span> or{" "}
            <span className="text-coral">solar</span>?
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Propertoasty checks UK properties for Boiler Upgrade Scheme eligibility and rooftop solar suitability in minutes. Upload your floorplan, get a pre-survey report an MCS installer can quote from — no site visit needed.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <FeatureCard
              icon={<Flame className="w-5 h-5" />}
              title="Heat pump eligibility"
              body="BUS grant check (up to £7,500) against the latest Ofgem rules."
            />
            <FeatureCard
              icon={<Sun className="w-5 h-5" />}
              title="Solar suitability"
              body="Roof pitch, shading, and generation estimate from satellite data."
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              title="Installer-ready"
              body="Report structured so an MCS fitter can quote remotely with confidence."
            />
          </div>

          <p className="mt-16 text-sm text-slate-500">
            England & Wales only. Scotland and Northern Ireland have separate schemes — coming later.
          </p>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-pale text-coral">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-navy">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
