// TLDR — bulleted summary card near the top of long-form content.
//
// Two reasons to include one:
//
//   1. Human readers scan first, read later. The TL;DR earns
//      the click further into the page when the reader has 30
//      seconds, not 5 minutes.
//   2. AI engines treat short bullet lists as extraction-friendly
//      "answer chunks" — they're more likely to surface a bullet
//      from a clearly-marked TL;DR than equivalent text buried in
//      a paragraph. The structural cue helps.
//
// Bullets should be 5–12 words each, factual, scannable. Don't put
// hedging or qualifiers in TL;DR bullets — keep those for the body.
// 3–6 bullets is the sweet spot; more dilutes the signal.

import * as React from "react";

interface TLDRProps {
  /** 3–6 short factual bullets. Each 5–12 words ideal. */
  bullets: string[];
  /** Optional label override. Defaults to "TL;DR". */
  label?: string;
}

export function TLDR({
  bullets,
  label = "TL;DR",
}: TLDRProps): React.ReactElement | null {
  if (bullets.length === 0) return null;

  if (process.env.NODE_ENV !== "production") {
    if (bullets.length > 6) {
      console.warn(
        `[AEO:TLDR] ${bullets.length} bullets — 3–6 is the sweet spot. Trim or split.`,
      );
    }
  }

  return (
    <section
      className="my-8 rounded-2xl bg-cream-deep border border-[var(--border)] px-5 py-5 sm:px-6 sm:py-6"
      data-aeo="tldr"
      aria-labelledby="tldr-label"
    >
      <p
        id="tldr-label"
        className="text-[11px] font-semibold uppercase tracking-wider text-coral mb-3"
      >
        {label}
      </p>
      <ul className="space-y-2 text-base text-navy/90">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2.5 leading-relaxed">
            <span className="mt-2 inline-block size-1.5 rounded-full bg-coral flex-shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
