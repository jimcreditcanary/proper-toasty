// Pure config for auto top-up — no Stripe / Supabase imports so it
// can be loaded from API routes, server components, client
// components (the UI mirrors the allowed list) and unit tests
// without pulling the SDK env vars.

// Threshold value used when a user hasn't picked their own (column
// is NULL). Keep in sync with the DB-side documentation on
// users.auto_recharge_threshold_credits.
export const AUTO_RECHARGE_DEFAULT_THRESHOLD = 10;

// Threshold values surfaced in the settings dropdown. The DB
// constraint is "> 0", so the picker can be widened later without
// a migration — but the API only accepts values from this list to
// stop ad-hoc clients writing surprising numbers.
export const ALLOWED_THRESHOLDS = [5, 10, 25, 50] as const;
export type AllowedThreshold = (typeof ALLOWED_THRESHOLDS)[number];

export function isAllowedThreshold(n: unknown): n is AllowedThreshold {
  return (
    typeof n === "number" &&
    Number.isInteger(n) &&
    (ALLOWED_THRESHOLDS as readonly number[]).includes(n)
  );
}
