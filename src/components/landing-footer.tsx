// Shared marketing-page footer. Used on /, /heatpump, /solar — any
// public landing page that doesn't have its own bespoke legal /
// admin chrome (/privacy, /terms, /ai-statement still ship their
// own footers because they need full company-name + Companies House
// references in the body anyway).
//
// Two strips:
//   1. Three-column nav + brand blurb on cream-deep
//   2. Thin legal/disclaimer strip on cream — "© year Propertoasty"
//      on the left, the "illustrative examples only" disclaimer on
//      the right
//
// The disclaimer line is the legal point — Propertoasty isn't an
// FCA-regulated lender or broker, and the numbers we show are
// research-only (typical UK averages + grant amounts + indicative
// sizing). Keep this wording aligned with the homepage hero copy
// ("pre-survey indication") so we don't confuse visitors.

import Link from "next/link";
import { Logo } from "@/components/logo";

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-cream-deep">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <Logo size="sm" variant="light" showTagline />
          <p className="mt-4 text-xs text-[var(--muted-brand)] leading-relaxed max-w-xs">
            A pre-survey indication of your home&rsquo;s heat pump
            and solar potential. Built for UK homeowners who want to
            make the greener call without a site visit.
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy mb-3">
            Explore
          </p>
          <ul className="space-y-2 text-[var(--muted-brand)]">
            <li>
              <Link href="/check" className="hover:text-navy">
                Run a check
              </Link>
            </li>
            <li>
              <Link href="/heatpump" className="hover:text-navy">
                Heat pump check
              </Link>
            </li>
            <li>
              <Link href="/solar" className="hover:text-navy">
                Solar check
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-navy">
                Journal
              </Link>
            </li>
            <li>
              <Link href="/enterprise" className="hover:text-navy">
                For installers
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-navy">
                Pricing
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy mb-3">
            Legal
          </p>
          <ul className="space-y-2 text-[var(--muted-brand)]">
            <li>
              <Link href="/privacy" className="hover:text-navy">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-navy">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/ai-statement" className="hover:text-navy">
                AI use
              </Link>
            </li>
          </ul>
        </div>
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
