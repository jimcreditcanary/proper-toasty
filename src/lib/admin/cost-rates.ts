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

  // ─── Vercel + Supabase (monthly fixed cost) ────────────────────
  // Hosting baseline that doesn't scale with usage at our volume.
  // Pro-rated by the number of days in the selected range so the
  // P&L for "last 7 days" doesn't double-count a full month's
  // hosting.
  fixed_monthly_pence: number;
}

/**
 * Defaults — kept as a constant so they're trivially diff-able in
 * code review when prices change. In future we can move these to
 * admin_settings rows so finance can tweak without a deploy.
 */
export const DEFAULT_COST_RATES: CostRates = {
  claude_per_completed_check: 4, // 4p
  solar_per_completed_check: 4, // 4p
  static_maps_per_completed_check: 0,
  postcoder_per_check_started: 1, // 1p
  resend_per_email: 0, // sub-pence; surfaces later with volume
  stripe_pct_bps: 150, // 1.5%
  stripe_per_txn_pence: 20, // 20p
  fixed_monthly_pence: 4000, // £40 baseline (Vercel Pro + Supabase Pro mix)
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
  "fixed_monthly_pence",
];

export const COST_LINE_LABELS: Record<keyof CostRates, string> = {
  claude_per_completed_check: "Anthropic Claude",
  solar_per_completed_check: "Google Solar API",
  static_maps_per_completed_check: "Google Static Maps",
  postcoder_per_check_started: "Postcoder",
  resend_per_email: "Resend",
  stripe_pct_bps: "Stripe processing (1.5% + 20p)",
  stripe_per_txn_pence: "Stripe per-txn",
  fixed_monthly_pence: "Hosting (Vercel + Supabase)",
};
