// Admin performance dashboard — chart data builders.
//
// Hand-rolled time bucketing rather than a chart library because:
//   1. The shapes are simple (bars over time), and
//   2. A real chart lib (recharts/tremor) is ~100KB on an admin-only
//      page that loads once a week.
//
// Bucket granularity is chosen by range size:
//   - <= 60 days  → daily buckets
//   - <= 14 weeks → weekly buckets (Mondays)
//   - longer      → monthly buckets
//
// Empty buckets in the middle of the range stay in the array with
// count 0 so the chart's x-axis is contiguous (no implicit zooming).

import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/admin/metrics";

export type Granularity = "day" | "week" | "month";

export interface Bucket {
  /** ISO start of bucket (UTC). */
  startIso: string;
  /** Display label, formatted for the chosen granularity. */
  label: string;
  count: number;
  /** Optional sum (revenue charts use this). Always 0 if not relevant. */
  sum: number;
}

/**
 * Decide bucket granularity from a date range. "All time" picks
 * monthly because we'd otherwise have hundreds of bars. Bounded by
 * the actual oldest data date is a v3 nicety; for v2 we just default
 * to monthly when the range is unbounded.
 */
export function pickGranularity(range: DateRange): Granularity {
  if (!range.startIso) return "month";
  const ms = new Date(range.endIso).getTime() - new Date(range.startIso).getTime();
  const days = ms / 86400000;
  if (days <= 60) return "day";
  if (days <= 7 * 14) return "week";
  return "month";
}

/**
 * Generate the empty bucket skeleton for a range/granularity. We
 * fill counts in afterwards by walking the rows. UTC throughout — a
 * UK-timezone version is overkill for ops-internal charts.
 */
export function buildBucketSkeleton(
  range: DateRange,
  granularity: Granularity,
): Bucket[] {
  const end = new Date(range.endIso);
  // Default oldest visible bucket: 1 year back if all-time, else
  // range.startIso. The all-time floor stops us rendering 5 years
  // of empty months when the table is small.
  const start = range.startIso
    ? new Date(range.startIso)
    : new Date(end.getFullYear() - 1, end.getMonth(), 1);

  const buckets: Bucket[] = [];
  const cursor = startOfBucket(start, granularity);
  const cap = startOfBucket(end, granularity);

  // Safety bound — don't try to render >400 buckets even if the math
  // says so. That's two years of weekly buckets, plenty for an
  // ops chart.
  let i = 0;
  while (cursor.getTime() <= cap.getTime() && i < 400) {
    buckets.push({
      startIso: cursor.toISOString(),
      label: formatBucketLabel(cursor, granularity),
      count: 0,
      sum: 0,
    });
    advanceBucket(cursor, granularity);
    i++;
  }
  return buckets;
}

function startOfBucket(d: Date, g: Granularity): Date {
  if (g === "day") {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  if (g === "week") {
    // ISO week — Monday start. getUTCDay: 0=Sun, 1=Mon..6=Sat.
    const day = d.getUTCDay();
    const offset = day === 0 ? -6 : 1 - day; // back to Monday
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset),
    );
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function advanceBucket(d: Date, g: Granularity): void {
  if (g === "day") {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (g === "week") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
}

function formatBucketLabel(d: Date, g: Granularity): string {
  if (g === "day") {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(d);
  }
  if (g === "week") {
    // "w/c 14 Apr"
    return `w/c ${new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(d)}`;
  }
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Bucket index a row falls into. Returns -1 if outside the skeleton
 * (which can happen if the row's timestamp predates our floor).
 */
function bucketIndexOf(
  ts: string,
  buckets: Bucket[],
  granularity: Granularity,
): number {
  const start = startOfBucket(new Date(ts), granularity).toISOString();
  // Linear scan — buckets are at most a few hundred. Binary search
  // would help if this ever shows up in a profile.
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].startIso === start) return i;
  }
  return -1;
}

// ─── Chart loaders ─────────────────────────────────────────────────

/**
 * Reports completed per bucket — uses checks.created_at for the row
 * filter and status='complete' for the count. We accept that this
 * counts the report against the day it was *started*, not the day
 * its analysis finished. completed_at would be more precise but
 * isn't a column we keep on the table; created_at is consistent
 * with how the headline KPI counts.
 */
export async function loadReportsCompletedSeries(
  range: DateRange,
): Promise<{ granularity: Granularity; buckets: Bucket[] }> {
  const granularity = pickGranularity(range);
  const buckets = buildBucketSkeleton(range, granularity);
  if (buckets.length === 0) return { granularity, buckets };

  const admin = createAdminClient();
  const fromIso = buckets[0].startIso;
  const toIso = range.endIso;

  const { data, error } = await admin
    .from("checks")
    .select("created_at")
    .eq("status", "complete")
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .limit(20000);

  if (error) {
    console.error("[charts.loadReportsCompletedSeries]", error);
    return { granularity, buckets };
  }

  for (const row of data ?? []) {
    const idx = bucketIndexOf(row.created_at, buckets, granularity);
    if (idx >= 0) buckets[idx].count += 1;
  }
  return { granularity, buckets };
}

/**
 * Revenue per bucket in £. Sums installer_credit_purchases.price_pence
 * where status='completed', divided by 100 for the chart label.
 */
export async function loadRevenueSeries(
  range: DateRange,
): Promise<{ granularity: Granularity; buckets: Bucket[] }> {
  const granularity = pickGranularity(range);
  const buckets = buildBucketSkeleton(range, granularity);
  if (buckets.length === 0) return { granularity, buckets };

  const admin = createAdminClient();
  const fromIso = buckets[0].startIso;
  const toIso = range.endIso;

  const { data, error } = await admin
    .from("installer_credit_purchases")
    .select("created_at, price_pence")
    .eq("status", "completed")
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .limit(20000);

  if (error) {
    console.error("[charts.loadRevenueSeries]", error);
    return { granularity, buckets };
  }

  for (const row of data ?? []) {
    const idx = bucketIndexOf(row.created_at, buckets, granularity);
    if (idx >= 0) {
      buckets[idx].count += 1;
      buckets[idx].sum += row.price_pence ?? 0;
    }
  }
  return { granularity, buckets };
}

/**
 * Approval rate by month over the last 6 months — fixed window,
 * ignores the range filter so the trend is comparable across views.
 * Returns one bucket per month with `count` = approved and `sum` =
 * approved + rejected (so the % is `count / sum * 100`).
 */
export async function loadApprovalRateSeries(): Promise<Bucket[]> {
  const admin = createAdminClient();
  const now = new Date();
  // Start = first day of current month, 5 months back (so we get 6
  // months total including current).
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const buckets = buildBucketSkeleton(
    {
      key: "this_year",
      label: "6 months",
      startIso: start.toISOString(),
      endIso: now.toISOString(),
    },
    "month",
  );

  const { data, error } = await admin
    .from("installer_signup_requests")
    .select("status, reviewed_at")
    .in("status", ["approved", "rejected"])
    .not("reviewed_at", "is", null)
    .gte("reviewed_at", start.toISOString())
    .lt("reviewed_at", now.toISOString())
    .limit(5000);

  if (error) {
    console.error("[charts.loadApprovalRateSeries]", error);
    return buckets;
  }

  for (const row of data ?? []) {
    if (!row.reviewed_at) continue;
    const idx = bucketIndexOf(row.reviewed_at, buckets, "month");
    if (idx < 0) continue;
    if (row.status === "approved") buckets[idx].count += 1;
    buckets[idx].sum += 1; // total reviewed
  }
  return buckets;
}
