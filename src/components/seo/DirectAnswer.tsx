// DirectAnswer — the 40–60 word paragraph immediately below the H1
// that AI engines lift verbatim when answering a query.
//
// VISUAL TREATMENT
//
//   We render it inside a tinted card with a coral left border so it
//   reads as the page's primary answer even on first scroll. AI
//   crawlers don't see colours — but the visual prominence also
//   raises the answer's salience for human readers, and a sceptical
//   visitor often reads only the H1 + DirectAnswer before deciding to
//   stay. The card is part of the click-through gate.
//
// VALIDATION
//
//   Dev-mode warn if word count is outside 40–60 or if the text
//   contains line breaks. Production silently renders whatever's
//   passed. Build-time seo-audit (deliverable #10) fails the build
//   on the same rule.

import * as React from "react";
import { validateDirectAnswer, logIssues } from "@/lib/seo/validators";

interface DirectAnswerProps {
  children: string;
  /** Optional eyebrow label rendered above the answer for visual
   *  context. Pure decoration; not part of the schema lift. */
  label?: string;
}

export function DirectAnswer({
  children,
  label = "The short answer",
}: DirectAnswerProps): React.ReactElement {
  // Run validators at render time — dev console gets warnings;
  // production no-op. Keeps the "feedback loop" tight as devs
  // tweak copy.
  logIssues("DirectAnswer", validateDirectAnswer(children));

  return (
    <aside
      // role="note" signals to assistive tech that this is a
      // highlighted aside, not the main body. AI engines still
      // extract the text content normally.
      role="note"
      className="mt-6 rounded-xl border border-coral/20 bg-coral-pale/40 border-l-4 border-l-coral px-5 py-4 sm:px-6 sm:py-5"
      data-aeo="direct-answer"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-coral-dark mb-2">
        {label}
      </p>
      <p className="text-lg sm:text-xl text-navy leading-relaxed font-medium">
        {children}
      </p>
    </aside>
  );
}
