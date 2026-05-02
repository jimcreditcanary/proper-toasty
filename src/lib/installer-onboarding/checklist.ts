// Onboarding checklist for the /installer landing page.
//
// Pure function — takes the four signals we can compute server-
// side and returns a structured "do these things next" list. The
// portal renders the panel above the feature tiles when the
// checklist isn't complete; once everything's ticked it hides
// itself.
//
// Steps are deliberately in dependency order:
//   1. Set availability — without this, you can't take leads
//   2. Buy credit pack — without these, you can't accept leads or
//      send pre-survey requests
//   3. Send your first pre-survey — proves the end-to-end flow
//      and gets the installer their first lead in the inbox
//   4. (optional) Accepted lead → quote sent — milestone marker;
//      hides once a quote has been sent
//
// The checklist surfaces "current step" so the UI can highlight
// just one CTA. After all required steps are done the checklist
// disappears entirely on the next render.

export interface ChecklistInputs {
  /** True when the installer has at least one availability block. */
  hasAvailability: boolean;
  /** Current credit balance — > 0 unlocks lead acceptance + sends. */
  creditBalance: number;
  /** Total pre-survey requests they've ever sent (any status). */
  preSurveyRequestCount: number;
  /** Quotes sent (any status). */
  proposalSentCount: number;
}

export interface ChecklistItem {
  id:
    | "availability"
    | "credits"
    | "first_pre_survey"
    | "first_quote";
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  done: boolean;
  /** True when this is the next not-done step. UI uses this to
   *  highlight one CTA at a time so the installer isn't overwhelmed. */
  current: boolean;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  /** Number of done items. */
  doneCount: number;
  totalCount: number;
  /** True when every required step is done — UI hides the panel. */
  isComplete: boolean;
}

export function buildChecklist(input: ChecklistInputs): ChecklistResult {
  // The order here matters: each step is "current" only when it's
  // the first not-done item. Index check below uses this list.
  const items: Omit<ChecklistItem, "current">[] = [
    {
      id: "availability",
      title: "Set your weekly availability",
      body:
        "Pick the times you can take site visits. Without this, the directory won't route any leads to you.",
      ctaLabel: "Set availability",
      ctaHref: "/installer/availability",
      done: input.hasAvailability,
    },
    {
      id: "credits",
      title: "Buy your first credit pack",
      body:
        "Credits unlock lead acceptance (5 each) and pre-survey sends (1 each). Pick a pack that suits your volume.",
      ctaLabel: "Buy credits",
      ctaHref: "/installer/credits",
      done: input.creditBalance > 0,
    },
    {
      id: "first_pre_survey",
      title: "Send your first pre-survey link",
      body:
        "Try the flow with a real customer or a test address. The completed report lands in your inbox auto-accepted — no booking dance.",
      ctaLabel: "Send a check link",
      ctaHref: "/installer/pre-survey-requests",
      done: input.preSurveyRequestCount > 0,
    },
    {
      id: "first_quote",
      title: "Send your first quote",
      body:
        "Once a customer completes the check, build a line-item quote with VAT, BUS grant + cover note. Accept/decline tracked.",
      ctaLabel: "Open quotes",
      ctaHref: "/installer/proposals",
      done: input.proposalSentCount > 0,
    },
  ];

  // First not-done item is the "current" focus; everything after it
  // stays inert (greyed out) so the user has one clear next step.
  const firstUndoneIdx = items.findIndex((it) => !it.done);
  const enriched: ChecklistItem[] = items.map((it, i) => ({
    ...it,
    current: i === firstUndoneIdx,
  }));

  const doneCount = items.filter((it) => it.done).length;
  return {
    items: enriched,
    doneCount,
    totalCount: items.length,
    isComplete: firstUndoneIdx === -1,
  };
}
