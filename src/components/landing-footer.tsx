// Shared marketing-page footer. Used on /, /heatpump, /solar — any
// public landing page that doesn't have its own bespoke legal /
// admin chrome (/privacy, /terms, /ai-statement still ship their
// own footers because they need full company-name + Companies House
// references in the body anyway).
//
// Five columns (brand blurb + four nav cols on desktop, stacked on
// mobile):
//   1. Brand   — logo + one-sentence elevator pitch
//   2. Check your home  — the homeowner tool surfaces
//   3. Find an installer — directory hubs + how-we-rank link
//   4. Learn   — guides, research, journal
//   5. Company — about, contact, pricing, for installers, legal
//
// Replaces the previous 3-col Explore + Legal layout, which buried
// the installer directory hubs + guides + research entirely. Those
// pages had ~zero internal entry points outside of contextual links;
// the new footer surfaces them on every public page.
//
// The disclaimer line is the legal point — Propertoasty isn't an
// FCA-regulated lender or broker, and the numbers we show are
// research-only (typical UK averages + grant amounts + indicative
// sizing). Keep this wording aligned with the homepage hero copy
// ("pre-survey indication") so we don't confuse visitors.

import Link from "next/link";
import { Logo } from "@/components/logo";

interface FooterLink {
  href: string;
  label: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Check your home",
    links: [
      { href: "/check", label: "Run a check" },
      { href: "/heatpump", label: "Heat pump check" },
      { href: "/solar", label: "Solar check" },
      { href: "/heat-pumps", label: "About heat pumps" },
      { href: "/solar-panels", label: "About solar panels" },
    ],
  },
  {
    title: "Find an installer",
    links: [
      { href: "/installers", label: "Installer directory" },
      { href: "/heat-pump-installers", label: "Heat pump installers" },
      { href: "/solar-panel-installers", label: "Solar panel installers" },
      { href: "/installers#how-we-rank", label: "How we rank" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/research", label: "EPC research" },
      { href: "/blog", label: "Journal" },
      { href: "/authors", label: "Authors" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/pricing", label: "Pricing" },
      { href: "/enterprise", label: "For installers" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/ai-statement", label: "AI use" },
    ],
  },
];

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-cream-deep">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="col-span-2 lg:col-span-1">
          <Logo size="sm" variant="light" showTagline />
          <p className="mt-4 text-xs text-[var(--muted-brand)] leading-relaxed max-w-xs">
            A pre-survey indication of your home&rsquo;s heat pump
            and solar potential. Built for UK homeowners who want to
            make the greener call without a site visit.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy mb-3">
              {col.title}
            </p>
            <ul className="space-y-2 text-[var(--muted-brand)]">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-navy">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] bg-cream">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted-brand)]">
          <span>© {year} Propertoasty</span>
          <span>
            Illustrative examples for research purposes only — we are
            not a lender or a broker.
          </span>
        </div>
      </div>
    </footer>
  );
}
