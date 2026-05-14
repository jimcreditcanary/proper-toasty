// Global 404. Helpful destinations instead of a dead end.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home, Search, Flame, Sun, BookOpen, FileSearch } from "lucide-react";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";

export const metadata: Metadata = {
  title: "Page not found — Propertoasty",
  description:
    "The page you're looking for doesn't exist. Try the homepage, the free property check, or our installer directory.",
  robots: { index: false, follow: false },
};

interface SuggestionProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Suggestion({ href, icon, title, description }: SuggestionProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 hover:border-coral hover:shadow-sm transition-all"
    >
      <div
        aria-hidden
        className="shrink-0 w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center"
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy group-hover:text-coral transition-colors">
          {title}
        </p>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-400 mt-2 shrink-0" aria-hidden />
    </Link>
  );
}

export default function NotFound() {
  return (
    <div className="bg-cream min-h-screen flex flex-col">
      <MarketingHeader />

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-coral mb-3">
          404
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-navy leading-tight">
          We can&rsquo;t find that page
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          The URL you followed might be old, mistyped, or the page may
          have moved. Here are some common destinations.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Suggestion
            href="/"
            icon={<Home className="w-5 h-5 text-coral" aria-hidden />}
            title="Home"
            description="The Propertoasty homepage"
          />
          <Suggestion
            href="/check"
            icon={<Search className="w-5 h-5 text-coral" aria-hidden />}
            title="Free property check"
            description="5-minute suitability check for heat pump + solar"
          />
          <Suggestion
            href="/heat-pump-installers"
            icon={<Flame className="w-5 h-5 text-coral" aria-hidden />}
            title="Heat pump installers"
            description="Find MCS-certified heat pump installers near you"
          />
          <Suggestion
            href="/solar-panel-installers"
            icon={<Sun className="w-5 h-5 text-coral" aria-hidden />}
            title="Solar panel installers"
            description="Find MCS-certified solar PV installers near you"
          />
          <Suggestion
            href="/guides"
            icon={<BookOpen className="w-5 h-5 text-coral" aria-hidden />}
            title="Guides"
            description="Homeowner walkthroughs: BUS grant, MCS visit, retrofit"
          />
          <Suggestion
            href="/research"
            icon={<FileSearch className="w-5 h-5 text-coral" aria-hidden />}
            title="Research"
            description="UK home energy data + the quarterly EPC Index"
          />
        </div>

        <p className="mt-10 text-sm text-slate-600">
          Still can&rsquo;t find what you&rsquo;re looking for?{" "}
          <Link href="/contact" className="text-coral underline">
            Contact us
          </Link>{" "}
          and we&rsquo;ll point you in the right direction.
        </p>
      </main>

      <LandingFooter />
    </div>
  );
}
