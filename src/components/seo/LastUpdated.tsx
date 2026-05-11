// LastUpdated — visible date stamp near the top of evergreen pages.
//
// AI engines weight content freshness heavily for cost / grant /
// regulatory queries ("how much does an X cost in 2026" naturally
// favours pages updated in 2026 over pages from 2021). Even though
// the same date sits in Article.dateModified in the JSON-LD, having
// it VISIBLY rendered helps human readers trust the page is current.
//
// Renders inline; meant to live in a metadata row with the
// AuthorByline.

import * as React from "react";

interface LastUpdatedProps {
  /** ISO date or datetime string. */
  isoDate: string;
  /** Format style. "long" → "11 May 2026"; "short" → "May 2026". */
  format?: "long" | "short";
  /** Prefix shown before the date. */
  prefix?: string;
}

export function LastUpdated({
  isoDate,
  format = "long",
  prefix = "Last updated",
}: LastUpdatedProps): React.ReactElement {
  const d = new Date(isoDate);
  const valid = !isNaN(d.getTime());
  const label = valid
    ? d.toLocaleDateString("en-GB", {
        day: format === "long" ? "numeric" : undefined,
        month: format === "long" ? "long" : "short",
        year: "numeric",
      })
    : isoDate; // best-effort fallback

  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm text-slate-500"
      data-aeo="last-updated"
    >
      <span className="font-medium">{prefix}:</span>
      <time dateTime={valid ? d.toISOString() : isoDate}>{label}</time>
    </span>
  );
}
