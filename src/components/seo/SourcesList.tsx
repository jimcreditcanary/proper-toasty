// SourcesList — visible citation list at the foot of a guide.
//
// Why it MUST be visible (not just in schema):
//
//   Google's quality raters use visible citations as a primary
//   E-E-A-T signal for cost / eligibility / regulatory content.
//   Same applies to AI engines — they're more confident citing a
//   page whose claims they can trace back to gov.uk / Ofgem / MCS
//   themselves.
//
//   Hidden citations (`<meta>`, schema.org `citation` only) don't
//   count for human-trust signalling.
//
// VALIDATION
//
//   We warn in dev when:
//     - fewer than 3 sources
//     - no source comes from an approved authoritative domain
//       (gov.uk, ofgem.gov.uk, mcscertified.com, energysavingtrust
//       .org.uk, ons.gov.uk, communities.gov.uk, trustmark.org.uk)
//
// Each entry can optionally carry an `accessedDate` — best practice
// for any source that might change behind a stable URL (e.g.
// gov.uk's BUS page updates when grant amounts change).

import * as React from "react";
import {
  validateSources,
  logIssues,
  type SourceEntry,
} from "@/lib/seo/validators";

interface SourcesListProps {
  sources: SourceEntry[];
  /** Optional label. Defaults to "Sources". */
  label?: string;
}

export function SourcesList({
  sources,
  label = "Sources",
}: SourcesListProps): React.ReactElement | null {
  logIssues("SourcesList", validateSources(sources));

  if (sources.length === 0) return null;

  return (
    <section
      className="mt-12 pt-8 border-t border-[var(--border)]"
      data-aeo="sources"
      aria-labelledby="sources-label"
    >
      <h2
        id="sources-label"
        className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4"
      >
        {label}
      </h2>
      <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
        {sources.map((s, i) => (
          <li key={i} className="leading-relaxed">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral hover:text-coral-dark underline"
            >
              {s.name}
            </a>
            {s.accessedDate && (
              <span className="text-slate-400">
                {" "}
                — accessed {s.accessedDate}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
