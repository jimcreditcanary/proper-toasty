// Aggregation helpers for the installer performance dashboard.
//
// One-stop entrypoint: loadPerformance() pulls every relevant row
// from the last N months in three queries (leads, proposals,
// pre-survey-requests) and buckets them by calendar month in JS.
// 3 small queries beats 15 grouped ones for the data sizes we're
// looking at (a busy installer might have 50 rows/month tops).
//
// All money in pence. All dates in UTC; bucketing uses Europe/London
// month boundaries so "this month" lines up with what the installer
// sees in their inbox.
//
// "Lead received" definition (per product call): an installer_lead
// where installer_acknowledged_at falls in the bucket. Auto-released
// + still-pending leads aren't counted because the installer didn't
// actually engage with them.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface MonthBucket {
  /** First day of the bucket (UTC midnight). */
  monthStart: string; // ISO
  /** Display label e.g. "Apr 2026". */
  label: string;
  leads: {
    directory: number;
    preSurvey: number;
    total: number;
  };
  quotes: {
    sent: number;
    accepted: number;
    declined: number;
    sentValuePence: number;
    acceptedValuePence: number;
  };
  preSurveyRequests: {
    sent: number;
    clicked: number;
    completed: number;
    creditsCharged: number;
  };
}

export interface PerformanceData {
  /** Last N calendar months, oldest first, with current month last. */
  months: MonthBucket[];
  /** Sums across all months in `months`. */
  totals: MonthBucket;
  /** Conversion rates over the period — useful headline numbers. */
  conversion: {
    /** quotes accepted / quotes sent. 0 when no quotes sent. */
    acceptanceRate: number;
    /** pre-survey completed / pre-survey sent. 0 when none sent. */
    preSurveyCompletionRate: number;
    /** leads received that turned into a sent quote. 0 when no leads. */
    quoteRate: number;
  };
}

/**
 * Pull + aggregate everything in a single helper. Caller passes the
 * service-role admin client; this function is read-only.
 */
export async function loadPerformance(
  admin: AdminClient,
  installerId: number,
  months = 3,
): Promise<PerformanceData> {
  const buckets = buildEmptyBuckets(months);
  if (buckets.length === 0) {
    return emptyResult();
  }
  const windowStart = buckets[0].monthStart;

  const [leadsRes, proposalsRes, requestsRes] = await Promise.all([
    admin
      .from("installer_leads")
      .select(
        "id, installer_acknowledged_at, pre_survey_request_id, status, auto_released_at",
      )
      .eq("installer_id", installerId)
      .gte("installer_acknowledged_at", windowStart)
      .not("installer_acknowledged_at", "is", null),
    admin
      .from("installer_proposals")
      .select("id, status, sent_at, accepted_at, declined_at, total_pence")
      .eq("installer_id", installerId)
      .gte("sent_at", windowStart)
      .not("sent_at", "is", null),
    admin
      .from("installer_pre_survey_requests")
      .select(
        "id, created_at, clicked_at, completed_at, total_credits_charged",
      )
      .eq("installer_id", installerId)
      .gte("created_at", windowStart),
  ]);

  // Tally each row into its bucket. Rows whose date falls before the
  // window get silently ignored (defensive — shouldn't happen given
  // the gte filter above).
  for (const lead of leadsRes.data ?? []) {
    if (!lead.installer_acknowledged_at) continue;
    const idx = bucketIndex(buckets, lead.installer_acknowledged_at);
    if (idx < 0) continue;
    const b = buckets[idx];
    b.leads.total += 1;
    if (lead.pre_survey_request_id) {
      b.leads.preSurvey += 1;
    } else {
      b.leads.directory += 1;
    }
  }

  for (const p of proposalsRes.data ?? []) {
    if (p.sent_at) {
      const idx = bucketIndex(buckets, p.sent_at);
      if (idx >= 0) {
        const b = buckets[idx];
        b.quotes.sent += 1;
        b.quotes.sentValuePence += p.total_pence ?? 0;
      }
    }
    if (p.accepted_at) {
      const idx = bucketIndex(buckets, p.accepted_at);
      if (idx >= 0) {
        const b = buckets[idx];
        b.quotes.accepted += 1;
        b.quotes.acceptedValuePence += p.total_pence ?? 0;
      }
    }
    if (p.declined_at) {
      const idx = bucketIndex(buckets, p.declined_at);
      if (idx >= 0) {
        buckets[idx].quotes.declined += 1;
      }
    }
  }

  for (const r of requestsRes.data ?? []) {
    const sentIdx = bucketIndex(buckets, r.created_at);
    if (sentIdx >= 0) {
      const b = buckets[sentIdx];
      b.preSurveyRequests.sent += 1;
      b.preSurveyRequests.creditsCharged += r.total_credits_charged ?? 0;
    }
    if (r.clicked_at) {
      const idx = bucketIndex(buckets, r.clicked_at);
      if (idx >= 0) buckets[idx].preSurveyRequests.clicked += 1;
    }
    if (r.completed_at) {
      const idx = bucketIndex(buckets, r.completed_at);
      if (idx >= 0) buckets[idx].preSurveyRequests.completed += 1;
    }
  }

  const totals = sumBuckets(buckets);
  const conversion = {
    acceptanceRate:
      totals.quotes.sent === 0
        ? 0
        : totals.quotes.accepted / totals.quotes.sent,
    preSurveyCompletionRate:
      totals.preSurveyRequests.sent === 0
        ? 0
        : totals.preSurveyRequests.completed /
          totals.preSurveyRequests.sent,
    quoteRate:
      totals.leads.total === 0
        ? 0
        : totals.quotes.sent / totals.leads.total,
  };

  return { months: buckets, totals, conversion };
}

// ─── Bucket helpers ────────────────────────────────────────────────

/**
 * Build N buckets, oldest first. `monthStart` is the 1st of each
 * month at UTC midnight; the label uses Europe/London display so
 * users see "Apr 2026" matching their wall-clock month.
 */
function buildEmptyBuckets(months: number): MonthBucket[] {
  const out: MonthBucket[] = [];
  const now = new Date();
  // Start from N-1 months back through current month.
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      monthStart: d.toISOString(),
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "Europe/London",
      }).format(d),
      leads: { directory: 0, preSurvey: 0, total: 0 },
      quotes: {
        sent: 0,
        accepted: 0,
        declined: 0,
        sentValuePence: 0,
        acceptedValuePence: 0,
      },
      preSurveyRequests: {
        sent: 0,
        clicked: 0,
        completed: 0,
        creditsCharged: 0,
      },
    });
  }
  return out;
}

/**
 * Find which bucket an ISO timestamp falls into. Returns -1 if none.
 * Buckets are contiguous so this is a linear scan from the back
 * (most recent first) — typical case lands on bucket[N-1].
 */
function bucketIndex(buckets: MonthBucket[], iso: string): number {
  const t = new Date(iso).getTime();
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (new Date(buckets[i].monthStart).getTime() <= t) {
      return i;
    }
  }
  return -1;
}

function sumBuckets(buckets: MonthBucket[]): MonthBucket {
  const out: MonthBucket = {
    monthStart: buckets[0]?.monthStart ?? new Date().toISOString(),
    label: "All",
    leads: { directory: 0, preSurvey: 0, total: 0 },
    quotes: {
      sent: 0,
      accepted: 0,
      declined: 0,
      sentValuePence: 0,
      acceptedValuePence: 0,
    },
    preSurveyRequests: {
      sent: 0,
      clicked: 0,
      completed: 0,
      creditsCharged: 0,
    },
  };
  for (const b of buckets) {
    out.leads.directory += b.leads.directory;
    out.leads.preSurvey += b.leads.preSurvey;
    out.leads.total += b.leads.total;
    out.quotes.sent += b.quotes.sent;
    out.quotes.accepted += b.quotes.accepted;
    out.quotes.declined += b.quotes.declined;
    out.quotes.sentValuePence += b.quotes.sentValuePence;
    out.quotes.acceptedValuePence += b.quotes.acceptedValuePence;
    out.preSurveyRequests.sent += b.preSurveyRequests.sent;
    out.preSurveyRequests.clicked += b.preSurveyRequests.clicked;
    out.preSurveyRequests.completed += b.preSurveyRequests.completed;
    out.preSurveyRequests.creditsCharged +=
      b.preSurveyRequests.creditsCharged;
  }
  return out;
}

function emptyResult(): PerformanceData {
  return {
    months: [],
    totals: sumBuckets([]),
    conversion: {
      acceptanceRate: 0,
      preSurveyCompletionRate: 0,
      quoteRate: 0,
    },
  };
}
