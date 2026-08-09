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
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { ORG_PROFILE } from "@/lib/seo/org-profile";

// Social profile row. URLs match the sameAs list in ORG_PROFILE
// (src/lib/seo/org-profile.ts) — Google gives extra weight to
// sameAs URLs that are ALSO visible, linked on the page. rel="me"
// carries additional identity-verification signal for
// self-hosted / IndieWeb-style identity resolvers.
//
// Icons are inlined as SVG (rather than pulled from lucide-react)
// because lucide deliberately doesn't export brand marks (X,
// LinkedIn, Instagram, Facebook) to avoid trademark redistribution
// issues. Inline paths from each brand's official mark, sized to
// currentColor so hover states just work.
//
// Companies House lives in schema only (weird as a visible footer
// link — users won't click it and the destination isn't a marketing
// surface).
const SOCIAL_ICON_CLASS = "w-4 h-4";
const SOCIALS: Array<{
  href: string;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    href: "https://www.linkedin.com/company/proper-toasty/",
    label: "Propertoasty on LinkedIn",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={SOCIAL_ICON_CLASS}
        aria-hidden
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    href: "https://x.com/propertoasty",
    label: "Propertoasty on X",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-3.5 h-3.5"
        aria-hidden
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/propertoasty/",
    label: "Propertoasty on Instagram",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={SOCIAL_ICON_CLASS}
        aria-hidden
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    href: "https://www.facebook.com/propertoasty",
    label: "Propertoasty on Facebook",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={SOCIAL_ICON_CLASS}
        aria-hidden
      >
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
      </svg>
    ),
  },
];

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
    title: "Calculate my savings",
    links: [
      { href: "/check", label: "All-home savings calculator" },
      { href: "/heatpump", label: "Heat pump savings" },
      { href: "/solar", label: "Solar + battery savings" },
      { href: "/plug-in-solar", label: "Plug-in solar (renters, flats)" },
      { href: "/replace-my-boiler", label: "Boiler vs heat pump" },
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
      { href: "/heat-pumps", label: "About heat pumps" },
      { href: "/solar-panels", label: "About solar panels" },
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-[40fr_repeat(4,15fr)] gap-8">
        <div className="col-span-2 lg:col-span-1">
          <Logo size="sm" variant="light" showTagline />
          <p className="mt-4 text-xs text-[var(--muted-brand)] leading-relaxed max-w-xs">
            The UK savings calculator for heat pumps, solar and
            plug-in solar. Built for UK homeowners who want a real
            payback number without a site visit.
          </p>
          <ul className="mt-5 flex items-center gap-2" aria-label="Propertoasty on social">
            {SOCIALS.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="me noopener"
                  aria-label={s.label}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border)] bg-white text-[var(--muted-brand)] hover:text-coral hover:border-coral transition-colors"
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
          {/* Direct contact — email is visible; phone number is
              deliberately NOT shown in the button label to keep it
              off the sitewide footer where automated scrapers
              harvest phone numbers. The tel: link still uses the
              full E.164 number for click-to-call, and the
              Organization.contactPoint.telephone in the JSON-LD
              (root layout) still carries the signal to Google.
              A visible copy of the number lives on /contact for
              structured-data consistency. */}
          <div className="mt-5 flex flex-col gap-2 text-xs">
            <a
              href={`mailto:${ORG_PROFILE.contactPoint?.email ?? ""}`}
              className="inline-flex items-center gap-1.5 text-[var(--muted-brand)] hover:text-navy transition-colors"
            >
              <Mail className="w-3.5 h-3.5" aria-hidden />
              <span>{ORG_PROFILE.contactPoint?.email}</span>
            </a>
            <a
              href={`tel:${ORG_PROFILE.contactPoint?.telephone ?? ""}`}
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-coral/40 bg-white px-3 py-1.5 text-coral hover:bg-coral hover:text-white transition-colors font-medium"
            >
              <Phone className="w-3.5 h-3.5" aria-hidden />
              <span>Call us</span>
            </a>
          </div>
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
