// Central cost-rate config for the admin P&L dashboard.
//
// Why a config rather than a per-call ledger (V1):
//
//   Per-call cost tracking would mean middleware on every external
//   call (Anthropic / Google / Postcoder / Resend / Stripe) writing
//   to a costs table — meaningful infra change AND we'd still need
//   rates here to translate "token counts" into £.
//
//   The pragmatic V1: derive costs from existing usage counts
//   (checks / installer_pre_survey_requests / installer_leads /
//   installer_credit_purchases) multiplied by the per-unit rates
//   below. Accuracy is good enough to spot margin trends; precision
//   for any individual check needs the per-call ledger upgrade.
//
//   When you swap to per-call tracking, the rates below stay valid
//   — they become the unit prices for the ledger summariser.
//
// Rates last reviewed: 2026-05-08. Spot-check the supplier pages
// quarterly; price drift on Anthropic + Google is real.

/** All rates in PENCE. Avoids floating-point in the P&L sums. */
export interface CostRates {
  // ─── Anthropic Claude (per check) ──────────────────────────────
  // A completed check fires up to 3 Claude calls:
  //   - bill PDF parsing (Sonnet, ~3k in / 1k out)
  //   - floorplan vision analysis (Opus, ~3k in / 2k out)
  //   - HP / cylinder placement suggestions (Opus, ~2k in / 1k out)
  // Combined estimate: ~$0.05 per check at current Opus 4.7 prices
  // ($15/M in, $75/M out). Conservative — bills pad it.
  // Stored as pence at fx ~0.79 GBP/USD = ~4p per check.
  claude_per_completed_check: number;

  // ─── Google Solar API (per check) ──────────────────────────────
  // buildingInsights call. Cached 30d by lat/lng, so repeat checks
  // on the same property are free, but the average new check
  // triggers one. $0.05/req at the tier we're on = ~4p.
  solar_per_completed_check: number;

  // ─── Google Static Maps imagery ────────────────────────────────
  // Satellite tile per check + per report view. Bundled into the
  // free Maps tier up to 28K req/mo, then $2/1k. Treat as 0p
  // until volume forces a tier upgrade.
  static_maps_per_completed_check: number;

  // ─── Postcoder address lookup (per check started) ──────────────
  // ~£0.01 per address-list call (PAF/AddressBase tier). Triggered
  // once per check during step-1 address pick.
  postcoder_per_check_started: number;

  // ─── Resend email (per email sent) ─────────────────────────────
  // Free up to 3k/mo, then $20/mo for the next 50k = $0.0004/email
  // = 0.03p. Round up to 0.05p to leave headroom.
  resend_per_email: number;

  // ─── Stripe processing (basis points of revenue) ───────────────
  // 1.5% + 20p for UK cards on the standard plan. We model the
  // percentage here; the per-transaction 20p is added separately.
  stripe_pct_bps: number;
  stripe_per_txn_pence: number;

  // ─── Vercel (monthly fixed cost) ───────────────────────────────
  // Hosting baseline that doesn't scale with usage at our volume.
  // Pro-rated by the number of days in the selected range so the
  // P&L for "last 7 days" doesn't double-count a full month's
  // hosting. Split from the old combined `fixed_monthly_pence` so
  // finance can update Vercel + Supabase independently as the
  // billing tiers diverge.
  vercel_monthly_pence: number;

  // ─── Supabase (monthly fixed cost) ─────────────────────────────
  // Same pro-rating logic as Vercel. Twin field — both render as
  // their own line in the admin P&L breakdown.
  supabase_monthly_pence: number;
}

/**
 * Defaults — fall-backs when the matching admin_settings row is
 * absent. Override per-rate at /admin/settings/cost-rates; the
 * P&L summariser reads admin_settings first and only uses these
 * when no row exists for a given key.
 */
export const DEFAULT_COST_RATES: CostRates = {
  claude_per_completed_check: 4, // 4p
  solar_per_completed_check: 4, // 4p
  static_maps_per_completed_check: 0,
  postcoder_per_check_started: 1, // 1p
  resend_per_email: 0, // sub-pence; surfaces later with volume
  stripe_pct_bps: 150, // 1.5%
  stripe_per_txn_pence: 20, // 20p
  // Vercel Pro $20/mo ≈ £16, rounded to £20 to leave headroom for
  // overage. Tweak in /admin/settings/cost-rates when finance has
  // the actual invoice in front of them.
  vercel_monthly_pence: 2000, // £20
  // Supabase Pro $25/mo ≈ £20, rounded to £25 for headroom.
  supabase_monthly_pence: 2500, // £25
};

/**
 * Prefix used for the rate keys in public.admin_settings. Keeps the
 * settings table tidy when other admin features add their own keys.
 *
 * Example: rate `claude_per_completed_check` is stored under
 *   admin_settings.key = 'cost_rate.claude_per_completed_check'.
 */
export const COST_RATE_KEY_PREFIX = "cost_rate.";

/**
 * Hint copy shown next to each rate input so finance knows what
 * the number drives and what the unit is. Kept here (not the form)
 * so labels + hints stay co-located with the rate definitions.
 */
/**
 * Read rates from public.admin_settings, falling back to
 * DEFAULT_COST_RATES per-key when no row exists. Use this in any
 * server-side code that needs the live rates (P&L summariser,
 * settings form initial values).
 *
 * Each key persists as `cost_rate.<field>` so we can spot them
 * easily in the settings table + so other features adding their
 * own admin_settings rows don't accidentally collide.
 */
export async function loadCostRates(
  admin: import("@supabase/supabase-js").SupabaseClient<
    import("@/types/database").Database
  >,
): Promise<CostRates> {
  const { data, error } = await admin
    .from("admin_settings")
    .select("key, value")
    .like("key", `${COST_RATE_KEY_PREFIX}%`);
  if (error) {
    console.warn("[cost-rates] load failed, using defaults", error);
    return { ...DEFAULT_COST_RATES };
  }

  const overrides: Partial<CostRates> = {};
  for (const row of data ?? []) {
    if (!row.key || !row.key.startsWith(COST_RATE_KEY_PREFIX)) continue;
    const field = row.key.slice(COST_RATE_KEY_PREFIX.length) as keyof CostRates;
    if (!(field in DEFAULT_COST_RATES)) continue;
    const v =
      typeof row.value === "number"
        ? row.value
        : Number(row.value);
    if (Number.isFinite(v) && v >= 0) {
      overrides[field] = v;
    }
  }

  return { ...DEFAULT_COST_RATES, ...overrides };
}

export const COST_LINE_HINTS: Record<keyof CostRates, string> = {
  claude_per_completed_check:
    "Pence per completed check. Covers bill parsing + floorplan vision + placements.",
  solar_per_completed_check:
    "Pence per completed check. Google Solar buildingInsights call (cached 30d).",
  static_maps_per_completed_check:
    "Pence per completed check. Free up to 28K req/mo, then $2/1k.",
  postcoder_per_check_started:
    "Pence per check started. Postcoder address-list lookup at step 1.",
  resend_per_email:
    "Pence per email. Free up to 3K/mo, then ~$20 / 50K.",
  stripe_pct_bps:
    "Basis points of revenue. 150 = 1.5%. UK standard plan.",
  stripe_per_txn_pence:
    "Pence per paid transaction. Added on top of the percentage.",
  vercel_monthly_pence:
    "Pence per month, pro-rated to the dashboard's date range. Vercel Pro is $20/mo ≈ £16, set the actual invoice figure here.",
  supabase_monthly_pence:
    "Pence per month, pro-rated to the dashboard's date range. Supabase Pro is $25/mo ≈ £20, set the actual invoice figure here.",
};

/**
 * Friendly labels for the per-line breakdown render. Order matters
 * — this is the row order in the P&L card too.
 */
export const COST_LINE_ORDER: (keyof CostRates)[] = [
  "claude_per_completed_check",
  "solar_per_completed_check",
  "postcoder_per_check_started",
  "static_maps_per_completed_check",
  "resend_per_email",
  "stripe_pct_bps",
  "stripe_per_txn_pence",
  "vercel_monthly_pence",
  "supabase_monthly_pence",
];

export const COST_LINE_LABELS: Record<keyof CostRates, string> = {
  claude_per_completed_check: "Anthropic Claude",
  solar_per_completed_check: "Google Solar API",
  static_maps_per_completed_check: "Google Static Maps",
  postcoder_per_check_started: "Postcoder",
  resend_per_email: "Resend",
  stripe_pct_bps: "Stripe processing (1.5% + 20p)",
  stripe_per_txn_pence: "Stripe per-txn",
  vercel_monthly_pence: "Vercel hosting",
  supabase_monthly_pence: "Supabase hosting",
};
