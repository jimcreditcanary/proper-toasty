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
export const PRESURVEY_REQUEST_COST_CREDITS = 1;
