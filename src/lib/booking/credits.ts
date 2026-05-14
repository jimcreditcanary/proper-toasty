// Single source of truth for booking-flow credit costs.
//
// Used by the create route (display-only — shown in the
// pending-installer email's "Cost: 5 credits" line), the accept page
// (gates the Accept button if the user can't afford it), and the
// acknowledge POST endpoint (atomic debit on accept).
//
// When admin-configurable lead pricing ships (C1 follow-up), this
// becomes a per-installer setting on `public.installers` and the
// constant collapses to a fallback default.

export const LEAD_ACCEPT_COST_CREDITS = 5;
export const SPONSORED_LEAD_ACCEPT_COST_CREDITS = 10;
export const PRESURVEY_REQUEST_COST_CREDITS = 1;

/**
 * Effective per-lead accept cost given the installer's sponsored
 * state. Sponsored installers pay double — that's the deal in
 * exchange for top-of-list placement on directory pages. Pass the
 * `sponsored_until` value straight from the row.
 */
export function effectiveLeadAcceptCost(
  sponsoredUntil: string | null,
): number {
  if (!sponsoredUntil) return LEAD_ACCEPT_COST_CREDITS;
  return new Date(sponsoredUntil).getTime() > Date.now()
    ? SPONSORED_LEAD_ACCEPT_COST_CREDITS
    : LEAD_ACCEPT_COST_CREDITS;
}

// Free starter credits granted on first installer claim (one-shot,
// gated by users.installer_starter_credits_granted_at). Worth ~£95
// at the smallest pack rate — generous enough to genuinely try the
// product, small enough that the unit-economics math still works.
//
// Tune this constant to dial trial generosity up or down. Backfill
// migration is in 049_installer_starter_credits.sql.
export const INSTALLER_FREE_STARTER_CREDITS = 30;
