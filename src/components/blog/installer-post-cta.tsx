// Booking CTA card rendered at the bottom of every installer-bylined
// post. Conversion lever — readers who finish the post are warm leads
// for that specific installer.
//
// Content:
//   - Headline: "Want a quote from {company_name}?"
//   - Trust signals: Checkatrade score + Google rating (with counts),
//                    surfaced only when fresh data is on file
//   - Primary CTA: routes to /check?installer={id}&capability={hp|solar}
//                  — the same entry point the directory tile uses to
//                  start the booking flow (5-minute property check →
//                  installer booking modal opens on the report page)
//   - Secondary link: installer's own website (rel=nofollow) when on
//                    file — separately advertised SEO reward for
//                    publishing through the outreach pipeline

import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck, Star } from "lucide-react";

export interface InstallerPostCtaProps {
  installerId: number;
  companyName: string;
  /** Primary capability — drives the capability= query param + copy. */
  capability: "heat_pump" | "solar";
  // Trust signals — null when not on file / not fresh.
  googleRating: number | null;
  googleReviewCount: number | null;
  checkatradeScore: number | null;
  checkatradeReviewCount: number | null;
  /** Direct link to the installer's own site. Rendered with rel=nofollow
   *  so domain authority doesn't bleed across the installer boundary. */
  websiteUrl: string | null;
}

function normaliseHttpUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function InstallerPostCta({
  installerId,
  companyName,
  capability,
  googleRating,
  googleReviewCount,
  checkatradeScore,
  checkatradeReviewCount,
  websiteUrl,
}: InstallerPostCtaProps) {
  const ctaHref = `/check?installer=${installerId}&capability=${capability}`;
  const techDisplay = capability === "solar" ? "solar PV" : "heat pump";
  const website = normaliseHttpUrl(websiteUrl);

  const hasGoogle = googleRating != null && googleReviewCount != null;
  const hasCheckatrade =
    checkatradeScore != null && checkatradeReviewCount != null;

  return (
    <section
      aria-label={`Book a site visit with ${companyName}`}
      className="not-prose mt-12 rounded-2xl border border-coral/30 bg-coral-pale/30 p-6 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-coral-dark">
        Book a site visit
      </p>
      <h2 className="mt-1 text-2xl font-bold text-navy leading-tight">
        Want a quote from {companyName}?
      </h2>
      <p className="mt-2 text-sm text-slate-600 max-w-xl leading-relaxed">
        Run our free 5-minute property check — we&rsquo;ll match you with{" "}
        {companyName} and you can pick a site-visit slot directly from their
        diary.
      </p>

      {(hasGoogle || hasCheckatrade) && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {hasGoogle && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-slate-700">
              <Star
                className="w-3.5 h-3.5 fill-current text-amber-500"
                aria-hidden
              />
              <span className="font-semibold text-navy">{googleRating}</span>
              <span className="text-slate-500">
                · {googleReviewCount} Google{" "}
                {googleReviewCount === 1 ? "review" : "reviews"}
              </span>
            </li>
          )}
          {hasCheckatrade && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-slate-700">
              <ShieldCheck
                className="w-3.5 h-3.5 text-emerald-600"
                aria-hidden
              />
              <span className="font-semibold text-navy">
                {checkatradeScore}
              </span>
              <span className="text-slate-500">
                · {checkatradeReviewCount} Checkatrade{" "}
                {checkatradeReviewCount === 1 ? "review" : "reviews"}
              </span>
            </li>
          )}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-6 shadow-sm transition-colors"
        >
          Book a site visit
          <ArrowRight className="w-4 h-4" />
        </Link>
        {website && (
          <a
            href={website}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-coral hover:text-coral-dark"
          >
            Visit {companyName} website
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
        Free 5-minute check first — confirms your home&rsquo;s a fit for a{" "}
        {techDisplay} install before {companyName} quotes. We don&rsquo;t
        share your details until you opt in.
      </p>
    </section>
  );
}
