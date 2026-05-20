// Onboarding checklist for the /installer landing page.
//
// Pure function — takes the signals we can compute server-side and
// returns a structured "do these things next" list. The portal
// renders the panel above the feature tiles when the checklist
// isn't complete; once everything's ticked it hides itself.
//
// Tasks are listed in a sensible reading order — set up the basics,
// then try the end-to-end flows — but they are NOT gated. Every
// task's CTA is always clickable; the installer can pick any order
// they like. We still highlight ONE task as "current" (the first
// not-done one) so the UI has a recommended next step to ring, but
// that highlight is visual emphasis only — it no longer hides
// downstream CTAs the way the original wizard did. See PR for
// "Installer welcome card: remove forced ordering + add dismiss-
// whole-card" for the rationale.
//
// Each task carries a `taskAddedAt` ISO timestamp — a constant tied
// to when the task definition first shipped. Dashboards compare
// this against installers.welcome_card_dismissed_at: if any task is
// newer than the dismissal stamp, the card re-shows so the installer
// sees the new task they haven't had a chance to dismiss yet. If you
// add a NEW task to the list below, give it today's date so existing
// dismissals don't hide it.
//
// Note: "Top up your credit balance" used to live here but was
// removed — every installer gets +30 free starter credits at
// signup (outreach via tier grant, self-claim via m066), and the
// outreach onboarding flow already prompts them to save a card
// for future auto-top-ups. Surfacing "top up" as an onboarding
// task on top of that was redundant noise.

export interface ChecklistInputs {
  /** True when the installer has at least one availability block. */
  hasAvailability: boolean;
  /** True when installers.logo_url is non-null. Directory listings
   *  use this for the avatar slot; without one, the card falls back
   *  to grey initials and looks under-baked. */
  hasLogo: boolean;
  /** Total pre-survey requests they've ever sent (any status). */
  preSurveyRequestCount: number;
  /** Quotes sent (any status). */
  proposalSentCount: number;
}

export interface ChecklistItem {
  id:
    | "availability"
    | "logo"
    | "first_pre_survey"
    | "first_quote";
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  done: boolean;
  /** True when this is the next not-done step. UI uses this to
   *  ring ONE task as the recommended next move. Does NOT gate
   *  CTA visibility — every task's CTA is always clickable. */
  current: boolean;
  /** Inline hint shown beneath the CTA when there's a real data
   *  dependency the installer should know about (e.g. quote needs
   *  a completed pre-survey). Surfaces the dependency rather than
   *  hiding the button — clicking still works and lands the user
   *  on a page that explains what's missing. */
  dependencyHint?: string;
  /** Constant per task definition — the date this task first
   *  shipped. Compared against welcome_card_dismissed_at to decide
   *  whether to re-show the card after new tasks land. ISO date
   *  string (UTC, no time-of-day needed). */
  taskAddedAt: string;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  /** Number of done items. */
  doneCount: number;
  totalCount: number;
  /** True when every required step is done — UI hides the panel. */
  isComplete: boolean;
  /** The latest taskAddedAt across all items. Dashboard compares
   *  this against welcome_card_dismissed_at: if the latest task is
   *  newer than the dismissal, the card re-shows. Cheaper than
   *  scanning every item individually at render time. */
  latestTaskAddedAt: string;
}

// Anchor date for the original four tasks — they all shipped before
// taskAddedAt tracking existed, so they get a single historical
// timestamp. Anything added LATER must get a fresh date so existing
// dismissals stop hiding it.
const ORIGINAL_TASKS_ADDED_AT = "2024-01-01";

export function buildChecklist(input: ChecklistInputs): ChecklistResult {
  // Reading order — basics first, then end-to-end flows. Order is
  // NOT enforced: every task's CTA renders regardless of position
  // or whether earlier tasks are done.
  const items: Omit<ChecklistItem, "current">[] = [
    {
      id: "availability",
      title: "Set your weekly availability",
      body:
        "Pick the times you can take site visits. Without this, the directory won't route any leads to you.",
      ctaLabel: "Set availability",
      ctaHref: "/installer/availability",
      done: input.hasAvailability,
      taskAddedAt: ORIGINAL_TASKS_ADDED_AT,
    },
    {
      id: "logo",
      title: "Upload your company logo",
      body:
        "Shown on every directory listing in your area. Square image (1:1), PNG/JPEG/WEBP/SVG up to 2 MB. Without one, we render generic grey initials and your card looks half-finished next to competitors.",
      ctaLabel: "Upload logo",
      ctaHref: "/installer/profile",
      done: input.hasLogo,
      taskAddedAt: ORIGINAL_TASKS_ADDED_AT,
    },
    {
      id: "first_pre_survey",
      title: "Send your first pre-survey link",
      body:
        "Try the flow with a real customer or a test address. The completed report lands in your inbox auto-accepted — no booking dance.",
      ctaLabel: "Send first link",
      ctaHref: "/installer/pre-survey-requests",
      done: input.preSurveyRequestCount > 0,
      taskAddedAt: ORIGINAL_TASKS_ADDED_AT,
    },
    {
      id: "first_quote",
      title: "Build your first quote",
      body:
        "Once a customer completes the check, build a line-item quote with VAT, BUS grant + cover note. Accept/decline tracked.",
      ctaLabel: "Build first quote",
      ctaHref: "/installer/proposals",
      done: input.proposalSentCount > 0,
      // Quotes are built against an accepted lead — which in turn
      // comes from a completed pre-survey. We surface this as a
      // hint instead of hiding the button so the installer can
      // click through and see the empty state explain what to do.
      dependencyHint:
        input.preSurveyRequestCount === 0
          ? "Needs a completed pre-survey lead first — send a link above, then build a quote when it lands."
          : undefined,
      taskAddedAt: ORIGINAL_TASKS_ADDED_AT,
    },
  ];

  // First not-done item is the "current" focus — used purely to
  // ring ONE row in the UI as the recommended next step. CTAs on
  // every other row remain visible and clickable.
  const firstUndoneIdx = items.findIndex((it) => !it.done);
  const enriched: ChecklistItem[] = items.map((it, i) => ({
    ...it,
    current: i === firstUndoneIdx,
  }));

  const doneCount = items.filter((it) => it.done).length;
  const latestTaskAddedAt = items
    .map((it) => it.taskAddedAt)
    .sort()
    .at(-1)!; // items is non-empty (4 hardcoded tasks)

  return {
    items: enriched,
    doneCount,
    totalCount: items.length,
    isComplete: firstUndoneIdx === -1,
    latestTaskAddedAt,
  };
}

/**
 * Decide whether the welcome card should render given a (possibly
 * null) dismissal timestamp from installers.welcome_card_dismissed_at.
 *
 * Logic:
 *   - Never render once every task is done (isComplete short-circuits).
 *   - Render if never dismissed.
 *   - Render if a task was added AFTER the dismissal — the installer
 *     hasn't seen / dismissed THIS version of the card yet.
 *   - Otherwise hide.
 */
export function shouldShowWelcomeCard(
  checklist: ChecklistResult,
  dismissedAt: string | null,
): boolean {
  if (checklist.isComplete) return false;
  if (!dismissedAt) return true;
  // Lexicographic ISO comparison is correct here — both sides are
  // UTC ISO strings (the task constant is date-only; comparison is
  // still well-defined because "2025-06-01" < "2025-06-01T12:00:00Z"
  // lexicographically AND chronologically).
  return checklist.latestTaskAddedAt > dismissedAt;
}
