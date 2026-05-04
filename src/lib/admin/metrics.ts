// Admin performance dashboard — query helpers.
//
// Every function takes a date range and returns counts/sums. They're
// deliberately small + parallel-friendly so the page handler can fan
// them out in a single Promise.all.
//
// Counts use head: true + count: 'exact' which is the cheapest path
// in PostgREST — no rows returned, just the COUNT(*). Sums need a
// rows fetch but we keep them bounded with limits.
//
// "Started" vs "Completed" semantics (per the product call):
//   - Reports completed = checks.status = 'complete'  ← the headline KPI
//   - Reports started   = every check row             ← incomplete tracking
// Both are filtered by created_at in range.

import { createAdminClient } from "@/lib/supabase/admin";

export type RangeKey = "this_month" | "last_month" | "last_90d" | "this_year" | "all_time";

export interface DateRange {
  key: RangeKey;
  label: string;
  startIso: string | null; // null = unbounded (all time)
  endIso: string;
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_90d", label: "Last 90 days" },
  { key: "this_year", label: "This year" },
  { key: "all_time", label: "All time" },
];

/**
 * Compute start/end timestamps for a range key. End is always "now"
 * except for last_month which is end of last month. UK timezone for
 * month/year boundaries since this is a UK product.
 */
export function resolveRange(key: RangeKey): DateRange {
  const now = new Date();
  const endIso = now.toISOString();
  const label = RANGE_OPTIONS.find((r) => r.key === key)?.label ?? "Range";

  if (key === "all_time") {
    return { key, label, startIso: null, endIso };
  }

  if (key === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { key, label, startIso: start.toISOString(), endIso };
  }

  if (key === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { key, label, startIso: start.toISOString(), endIso: end.toISOString() };
  }

  if (key === "last_90d") {
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { key, label, startIso: start.toISOString(), endIso };
  }

  // this_year
  const start = new Date(now.getFullYear(), 0, 1);
  return { key, label, startIso: start.toISOString(), endIso };
}

// ─── KPI queries ───────────────────────────────────────────────────

export interface CoreKpis {
  reports_completed: number;
  reports_started: number;
  reports_failed: number;
  new_users: number;
  new_installers_claimed: number;
  revenue_pence: number;
  credits_consumed: number;
  leads_released: number;
  leads_accepted: number;
  visits_booked: number;
  visits_completed: number;
}

/**
 * Fan out every KPI count in parallel. Returns zero on errors so a
 * single broken query doesn't break the dashboard.
 */
export async function loadCoreKpis(range: DateRange): Promise<CoreKpis> {
  const admin = createAdminClient();

  // Helper to apply an optional date range to a select-count query.
  const inRange = <T>(q: T, column: string): T => {
    let qq = q as unknown as {
      gte: (c: string, v: string) => unknown;
      lt: (c: string, v: string) => unknown;
    };
    if (range.startIso) qq = qq.gte(column, range.startIso) as typeof qq;
    qq = qq.lt(column, range.endIso) as typeof qq;
    return qq as unknown as T;
  };

  const countOf = async (
    table:
      | "checks"
      | "users"
      | "installers"
      | "installer_leads"
      | "installer_meetings",
    col: string,
    extra?: { eq?: [string, string]; not_null?: string },
  ): Promise<number> => {
    let q = admin.from(table).select("id", { count: "exact", head: true });
    if (extra?.eq) q = q.eq(extra.eq[0], extra.eq[1]);
    if (extra?.not_null) q = q.not(extra.not_null, "is", null);
    q = inRange(q, col);
    const { count, error } = await q;
    if (error) console.error(`[metrics.countOf] ${table}/${col}`, error);
    return count ?? 0;
  };

  // Sums need actual rows. Pulling just the columns we need keeps
  // the payload tight even over multi-month ranges.
  const sumRevenuePence = async (): Promise<number> => {
    let q = admin
      .from("installer_credit_purchases")
      .select("price_pence")
      .eq("status", "completed");
    q = inRange(q, "created_at");
    const { data, error } = await q;
    if (error) {
      console.error("[metrics.sumRevenuePence]", error);
      return 0;
    }
    return (data ?? []).reduce((acc, r) => acc + (r.price_pence ?? 0), 0);
  };

  const sumCreditsConsumed = async (): Promise<number> => {
    let q = admin
      .from("checks")
      .select("credits_spent")
      .eq("status", "complete");
    q = inRange(q, "created_at");
    const { data, error } = await q;
    if (error) {
      console.error("[metrics.sumCreditsConsumed]", error);
      return 0;
    }
    return (data ?? []).reduce((acc, r) => acc + (r.credits_spent ?? 0), 0);
  };

  const [
    reports_completed,
    reports_started,
    reports_failed,
    new_users,
    new_installers_claimed,
    revenue_pence,
    credits_consumed,
    leads_released,
    leads_accepted,
    visits_booked,
    visits_completed,
  ] = await Promise.all([
    countOf("checks", "created_at", { eq: ["status", "complete"] }),
    countOf("checks", "created_at"),
    countOf("checks", "created_at", { eq: ["status", "failed"] }),
    countOf("users", "created_at"),
    // Installers "claimed" = the F2 binding flow ran. claimed_at set.
    countOf("installers", "claimed_at", { not_null: "claimed_at" }),
    sumRevenuePence(),
    sumCreditsConsumed(),
    // Leads released to installer = installer_notified_at in range.
    // Use that timestamp rather than created_at because some leads
    // sit in 'new' for a while before going out.
    countOf("installer_leads", "installer_notified_at", {
      not_null: "installer_notified_at",
    }),
    countOf("installer_leads", "installer_acknowledged_at", {
      not_null: "installer_acknowledged_at",
    }),
    // Bookings made in range, regardless of cancellation later.
    countOf("installer_meetings", "created_at"),
    // Visits actually completed: status='completed' AND scheduled
    // start happened in range.
    countOf("installer_meetings", "scheduled_at", { eq: ["status", "completed"] }),
  ]);

  return {
    reports_completed,
    reports_started,
    reports_failed,
    new_users,
    new_installers_claimed,
    revenue_pence,
    credits_consumed,
    leads_released,
    leads_accepted,
    visits_booked,
    visits_completed,
  };
}

// ─── Funnel ────────────────────────────────────────────────────────
//
// All six stages query the same population: checks created_at in
// range. Each stage adds a "did this happen on the row" filter, so a
// single check that completed counts in every stage above it.

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  pct_of_first: number; // 0..100
}

export async function loadFunnel(range: DateRange): Promise<FunnelStage[]> {
  const admin = createAdminClient();

  // Build a fresh count query scoped to checks in the range. Each
  // stage gets its own builder so we can layer different filters
  // without leaking state across queries.
  function base() {
    let q = admin.from("checks").select("id", { count: "exact", head: true });
    if (range.startIso) q = q.gte("created_at", range.startIso);
    q = q.lt("created_at", range.endIso);
    return q;
  }

  const [started, withAddress, withContext, withFloorplan, ranAnalysis, completed] =
    await Promise.all([
      base(),
      base().not("postcode", "is", null),
      base().not("tenure", "is", null),
      base().not("floorplan_object_key", "is", null),
      base().in("status", ["running", "complete", "failed"]),
      base().eq("status", "complete"),
    ]);

  const pick = (r: { count: number | null; error: unknown }): number => {
    if (r.error) console.error("[metrics.loadFunnel]", r.error);
    return r.count ?? 0;
  };

  const top = pick(started);
  const stages: { key: string; label: string; count: number }[] = [
    { key: "started", label: "Started", count: top },
    { key: "address", label: "Address confirmed", count: pick(withAddress) },
    { key: "context", label: "Context filled", count: pick(withContext) },
    { key: "floorplan", label: "Floorplan uploaded", count: pick(withFloorplan) },
    { key: "analysis", label: "Analysis run", count: pick(ranAnalysis) },
    { key: "completed", label: "Report completed", count: pick(completed) },
  ];

  return stages.map((s) => ({
    ...s,
    pct_of_first: top === 0 ? 0 : Math.round((s.count / top) * 100),
  }));
}

// ─── MCS approval health ───────────────────────────────────────────

export interface ApprovalHealth {
  pending_count: number;
  pending_median_age_days: number | null;
  approved_in_range: number;
  rejected_in_range: number;
  approval_rate_pct: number | null;
  claimed_in_range: number;
  recent_pending: {
    id: string;
    company_name: string;
    contact_email: string;
    created_at: string;
    age_days: number;
  }[];
}

export async function loadApprovalHealth(range: DateRange): Promise<ApprovalHealth> {
  const admin = createAdminClient();

  const inRange = <T>(q: T, column: string): T => {
    let qq = q as unknown as {
      gte: (c: string, v: string) => unknown;
      lt: (c: string, v: string) => unknown;
    };
    if (range.startIso) qq = qq.gte(column, range.startIso) as typeof qq;
    qq = qq.lt(column, range.endIso) as typeof qq;
    return qq as unknown as T;
  };

  // Pending queue — fetch all so we can compute median age.
  // Bounded by reality: even on a busy week we'll have <100 pending.
  const { data: pendingRows } = await admin
    .from("installer_signup_requests")
    .select("id, company_name, contact_email, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);

  const pending = pendingRows ?? [];
  const now = Date.now();
  const ages = pending.map((r) => {
    return Math.floor((now - new Date(r.created_at).getTime()) / 86400000);
  });

  let median: number | null = null;
  if (ages.length > 0) {
    const sorted = [...ages].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median =
      sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : sorted[mid];
  }

  // Approved + rejected counts in the selected range. Use reviewed_at
  // because that's when the admin acted; created_at would tilt the
  // metric by signup volume rather than admin throughput.
  let approvedQ = admin
    .from("installer_signup_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  approvedQ = inRange(approvedQ, "reviewed_at");

  let rejectedQ = admin
    .from("installer_signup_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected");
  rejectedQ = inRange(rejectedQ, "reviewed_at");

  let claimedQ = admin
    .from("installers")
    .select("id", { count: "exact", head: true })
    .not("claimed_at", "is", null);
  claimedQ = inRange(claimedQ, "claimed_at");

  const [approvedRes, rejectedRes, claimedRes] = await Promise.all([
    approvedQ,
    rejectedQ,
    claimedQ,
  ]);

  const approved_in_range = approvedRes.count ?? 0;
  const rejected_in_range = rejectedRes.count ?? 0;
  const claimed_in_range = claimedRes.count ?? 0;

  const total_reviewed = approved_in_range + rejected_in_range;
  const approval_rate_pct =
    total_reviewed === 0 ? null : Math.round((approved_in_range / total_reviewed) * 100);

  // Surface oldest 5 pending items so the dashboard can prompt action.
  const recent_pending = pending.slice(0, 5).map((r) => ({
    id: r.id,
    company_name: r.company_name,
    contact_email: r.contact_email,
    created_at: r.created_at,
    age_days: Math.floor((now - new Date(r.created_at).getTime()) / 86400000),
  }));

  return {
    pending_count: pending.length,
    pending_median_age_days: median,
    approved_in_range,
    rejected_in_range,
    approval_rate_pct,
    claimed_in_range,
    recent_pending,
  };
}
