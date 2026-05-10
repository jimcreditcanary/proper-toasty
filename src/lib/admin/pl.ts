// Admin P&L summariser.
//
// Reads existing usage tables (no per-call ledger required) +
// applies the per-unit rates from cost-rates.ts to produce a P&L:
//
//   Revenue    = installer_credit_purchases.price_pence sum
//   - Costs    = sum of derived line items (Claude / Solar / Postcoder
//                / emails / Stripe processing / hosting)
//   = Margin   = revenue - costs
//   margin %   = margin / revenue (or 0 when revenue is 0)
//
// Everything in pence. All sums are clamped to non-negative.
//
// This is V1 — accuracy good enough to spot trends and pricing
// holes. Per-call cost ledger is a known follow-up; it'd swap out
// the count-based estimators below for actual sums but keep this
// module's external shape unchanged.

import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "./metrics";
import {
  COST_LINE_LABELS,
  COST_LINE_ORDER,
  loadCostRates,
  type CostRates,
} from "./cost-rates";

export interface PlLine {
  /** key from CostRates */
  key: keyof CostRates;
  /** Display label (e.g. "Anthropic Claude") */
  label: string;
  /** Quantity that drove this line (e.g. "120 completed checks") */
  qtyLabel: string;
  /** Cost in pence */
  pence: number;
}

export interface PlSummary {
  range: DateRange;
  revenuePence: number;
  costPence: number;
  marginPence: number;
  marginPct: number;
  /** Per-line breakdown of the cost side, ordered by COST_LINE_ORDER. */
  costLines: PlLine[];
  /** Quantities used as inputs — handy for sanity-checking the table. */
  quantities: {
    completedChecks: number;
    startedChecks: number;
    emailsSent: number;
    paidPurchases: number;
    daysInRange: number;
  };
}

function pct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/** Days between range start and end (inclusive of start, exclusive of end). */
function daysInRange(range: DateRange): number {
  if (!range.startIso) {
    // 'all_time' — pro-rate hosting against a single month so the
    // fixed-cost line doesn't dwarf the rest. Anything bigger than
    // a year is a vibes number anyway.
    return 30;
  }
  const start = new Date(range.startIso).getTime();
  const end = new Date(range.endIso).getTime();
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

export async function loadPlSummary(
  range: DateRange,
  rates?: CostRates,
): Promise<PlSummary> {
  const admin = createAdminClient();
  // Default: pull live overrides from admin_settings, falling back
  // to DEFAULT_COST_RATES per-key. Caller can pass `rates` to bypass
  // the DB read (useful for testing + for places that already loaded
  // the rates upstream).
  const effectiveRates: CostRates =
    rates ?? (await loadCostRates(admin));

  // Helper for date-range filters (mirrors metrics.ts inRange).
  const inRange = <T>(q: T, column: string): T => {
    let qq = q as unknown as {
      gte: (c: string, v: string) => unknown;
      lt: (c: string, v: string) => unknown;
    };
    if (range.startIso) qq = qq.gte(column, range.startIso) as typeof qq;
    qq = qq.lt(column, range.endIso) as typeof qq;
    return qq as unknown as T;
  };

  // ─── Quantity queries (parallel) ─────────────────────────────────
  const [
    completedChecksRes,
    startedChecksRes,
    preSurveySendsRes,
    leadAcceptsRes,
    bookingsRes,
    purchasesRes,
  ] = await Promise.all([
    inRange(
      admin
        .from("checks")
        .select("id", { count: "exact", head: true })
        .eq("status", "complete"),
      "created_at",
    ),
    inRange(
      admin.from("checks").select("id", { count: "exact", head: true }),
      "created_at",
    ),
    // Email volume — pre-survey sends + resends. sends_count tracks
    // both first send + retries on the same row.
    inRange(
      admin
        .from("installer_pre_survey_requests")
        .select("sends_count"),
      "created_at",
    ),
    // Each accepted lead fires one installer + one homeowner email.
    inRange(
      admin
        .from("installer_leads")
        .select("id", { count: "exact", head: true })
        .not("installer_acknowledged_at", "is", null),
      "installer_acknowledged_at",
    ),
    // Each booking confirmation fires another pair (installer + homeowner).
    inRange(
      admin
        .from("installer_meetings")
        .select("id", { count: "exact", head: true })
        .eq("status", "booked"),
      "created_at",
    ),
    // Revenue + Stripe per-txn cost both depend on this.
    inRange(
      admin
        .from("installer_credit_purchases")
        .select("price_pence")
        .eq("status", "completed"),
      "created_at",
    ),
  ]);

  const completedChecks = completedChecksRes.count ?? 0;
  const startedChecks = startedChecksRes.count ?? 0;
  const acceptedLeads = leadAcceptsRes.count ?? 0;
  const bookedMeetings = bookingsRes.count ?? 0;
  const preSurveySendsTotal = (preSurveySendsRes.data ?? []).reduce(
    (acc: number, r) =>
      acc + ((r as { sends_count?: number | null }).sends_count ?? 1),
    0,
  );
  const purchases = purchasesRes.data ?? [];
  const paidPurchases = purchases.length;
  const revenuePence = purchases.reduce(
    (acc: number, r) =>
      acc + ((r as { price_pence?: number | null }).price_pence ?? 0),
    0,
  );

  // Email count covers:
  //   - pre-survey sends (and resends) to the homeowner (1 each)
  //   - lead-accept → 2 emails per accepted lead (installer + homeowner)
  //   - booking confirm → 2 emails per booked meeting
  // Approximation; close enough at our volumes for a margin tile.
  const emailsSent =
    preSurveySendsTotal + acceptedLeads * 2 + bookedMeetings * 2;

  const days = daysInRange(range);

  // ─── Cost line items ─────────────────────────────────────────────
  const lineMap: Record<keyof CostRates, PlLine> = {
    claude_per_completed_check: {
      key: "claude_per_completed_check",
      label: COST_LINE_LABELS.claude_per_completed_check,
      qtyLabel: `${completedChecks.toLocaleString("en-GB")} completed checks`,
      pence: completedChecks * effectiveRates.claude_per_completed_check,
    },
    solar_per_completed_check: {
      key: "solar_per_completed_check",
      label: COST_LINE_LABELS.solar_per_completed_check,
      qtyLabel: `${completedChecks.toLocaleString("en-GB")} completed checks`,
      pence: completedChecks * effectiveRates.solar_per_completed_check,
    },
    static_maps_per_completed_check: {
      key: "static_maps_per_completed_check",
      label: COST_LINE_LABELS.static_maps_per_completed_check,
      qtyLabel: `${completedChecks.toLocaleString("en-GB")} completed checks`,
      pence:
        completedChecks * effectiveRates.static_maps_per_completed_check,
    },
    postcoder_per_check_started: {
      key: "postcoder_per_check_started",
      label: COST_LINE_LABELS.postcoder_per_check_started,
      qtyLabel: `${startedChecks.toLocaleString("en-GB")} checks started`,
      pence: startedChecks * effectiveRates.postcoder_per_check_started,
    },
    resend_per_email: {
      key: "resend_per_email",
      label: COST_LINE_LABELS.resend_per_email,
      qtyLabel: `${emailsSent.toLocaleString("en-GB")} emails sent`,
      pence: emailsSent * effectiveRates.resend_per_email,
    },
    stripe_pct_bps: {
      key: "stripe_pct_bps",
      label: COST_LINE_LABELS.stripe_pct_bps,
      qtyLabel: `${paidPurchases.toLocaleString("en-GB")} paid txns`,
      pence:
        Math.round((revenuePence * effectiveRates.stripe_pct_bps) / 10_000) +
        paidPurchases * effectiveRates.stripe_per_txn_pence,
    },
    stripe_per_txn_pence: {
      // Folded into stripe_pct_bps above so we don't render twice.
      key: "stripe_per_txn_pence",
      label: COST_LINE_LABELS.stripe_per_txn_pence,
      qtyLabel: "(folded into Stripe processing)",
      pence: 0,
    },
    fixed_monthly_pence: {
      key: "fixed_monthly_pence",
      label: COST_LINE_LABELS.fixed_monthly_pence,
      qtyLabel: `${days.toLocaleString("en-GB")} day${days === 1 ? "" : "s"} pro-rated`,
      pence: Math.round((effectiveRates.fixed_monthly_pence * days) / 30),
    },
  };

  // Honour the order in COST_LINE_ORDER so the breakdown renders
  // most-variable first, fixed cost last.
  const costLines: PlLine[] = COST_LINE_ORDER.map((k) => lineMap[k]);
  const costPence = costLines.reduce((acc, l) => acc + l.pence, 0);
  const marginPence = revenuePence - costPence;

  return {
    range,
    revenuePence,
    costPence,
    marginPence,
    marginPct: pct(marginPence, revenuePence),
    costLines,
    quantities: {
      completedChecks,
      startedChecks,
      emailsSent,
      paidPurchases,
      daysInRange: days,
    },
  };
}
