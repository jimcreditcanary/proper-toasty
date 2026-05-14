// Aggregations for /installer/billing.
//
// Two ledgers we surface in one view:
//   1. Money in:    installer_credit_purchases (Stripe charges, VAT
//                   receipts attached). This is what the accountant
//                   needs for VAT returns.
//   2. Credits out: inferred from
//                     installer_leads (5 credits per DIRECTORY lead
//                     acknowledged, LEAD_ACCEPT_COST_CREDITS) +
//                     installer_pre_survey_requests.total_credits_charged
//                   We don't have a unified ledger table — credits
//                   are deducted via the deduct_credits RPC without
//                   an audit row — so we re-derive usage here from
//                   the source-of-truth tables.
//
// Critical detail: pre-survey-sourced leads bypass the 5-credit
// acknowledge charge. They're auto-attached at lead-capture time
// with cost_credits = 0 (the 1-credit pre-survey send is the only
// charge). So when we count lead acceptances for credit-cost
// purposes we MUST filter by `pre_survey_request_id is null` —
// otherwise we double-count: 1 credit in preSurveyCreditsUsed +
// a phantom 5 credits in leadCreditsUsed.
//
// Time window: last 12 calendar months by default. Buckets oldest-
// first with current month at the end. Numbers are pence (money) +
// integer credits.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { LEAD_ACCEPT_COST_CREDITS } from "@/lib/booking/credits";

type AdminClient = SupabaseClient<Database>;

export interface BillingMonth {
  monthStart: string;
  label: string;
  spend: {
    pencePaid: number;          // sum of completed Stripe purchases
    pencePaidGross: number;     // same as above; convention placeholder if VAT split lands later
    creditsPurchased: number;
    purchaseCount: number;
    purchaseRefundedPence: number;
  };
  usage: {
    leadAcceptances: number;        // count of installer_leads acknowledged
    leadCreditsUsed: number;        // = leadAcceptances * LEAD_ACCEPT_COST_CREDITS
    preSurveyRequests: number;      // count of distinct pre-survey requests
    preSurveyCreditsUsed: number;   // sum of total_credits_charged
    totalCreditsUsed: number;
  };
}

export interface BillingPurchaseRow {
  id: string;
  created_at: string;
  pack_credits: number;
  price_pence: number;
  currency: string;
  status: "completed" | "refunded";
  stripe_session_id: string | null;
  stripe_receipt_url: string | null;
  is_auto_recharge: boolean;
}

export interface BillingData {
  months: BillingMonth[];
  totals: BillingMonth;
  purchases: BillingPurchaseRow[];
  /** YTD (current calendar year) headline numbers for the cards. */
  ytd: {
    pencePaid: number;
    creditsPurchased: number;
    creditsUsed: number;
    purchaseCount: number;
  };
}

const DEFAULT_MONTHS = 12;

export async function loadBilling(
  admin: AdminClient,
  args: { userId: string; installerId: number; months?: number },
): Promise<BillingData> {
  const months = args.months ?? DEFAULT_MONTHS;
  const buckets = buildEmptyBuckets(months);
  if (buckets.length === 0) {
    return emptyResult();
  }
  const windowStart = buckets[0].monthStart;

  // Year-to-date window for the headline cards is independent of the
  // monthly buckets — accountants think in calendar years for VAT.
  const yearStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), 0, 1),
  ).toISOString();

  const [purchasesRes, leadsRes, preSurveyRes, ytdPurchasesRes, ytdLeadsRes, ytdPreSurveyRes] =
    await Promise.all([
      admin
        .from("installer_credit_purchases")
        .select(
          "id, created_at, pack_credits, price_pence, currency, status, stripe_session_id, stripe_receipt_url",
        )
        .eq("user_id", args.userId)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false }),
      // Directory leads only — pre-survey leads are filtered out
      // because they don't trigger the lead-acknowledge charge.
      // accept_cost_credits records the actual debit (5 for organic,
      // 10 for sponsored, NULL on legacy rows pre-m064).
      admin
        .from("installer_leads")
        .select("id, installer_acknowledged_at, accept_cost_credits")
        .eq("installer_id", args.installerId)
        .gte("installer_acknowledged_at", windowStart)
        .not("installer_acknowledged_at", "is", null)
        .is("pre_survey_request_id", null),
      admin
        .from("installer_pre_survey_requests")
        .select("id, created_at, total_credits_charged, sends_count, last_sent_at")
        .eq("installer_id", args.installerId)
        .gte("created_at", windowStart),
      // YTD totals — separate queries since the time windows differ.
      admin
        .from("installer_credit_purchases")
        .select("id, price_pence, pack_credits, status", { count: "exact" })
        .eq("user_id", args.userId)
        .eq("status", "completed")
        .gte("created_at", yearStart),
      // YTD lead-credit usage — fetch the cost column rather than a
      // raw count so sponsored installers get their actual debits
      // summed (10/lead vs 5/lead).
      admin
        .from("installer_leads")
        .select("accept_cost_credits")
        .eq("installer_id", args.installerId)
        .gte("installer_acknowledged_at", yearStart)
        .not("installer_acknowledged_at", "is", null)
        .is("pre_survey_request_id", null),
      admin
        .from("installer_pre_survey_requests")
        .select("total_credits_charged")
        .eq("installer_id", args.installerId)
        .gte("created_at", yearStart),
    ]);

  for (const p of purchasesRes.data ?? []) {
    const idx = bucketIndex(buckets, p.created_at);
    if (idx < 0) continue;
    const b = buckets[idx];
    if (p.status === "completed") {
      b.spend.pencePaid += p.price_pence ?? 0;
      b.spend.pencePaidGross += p.price_pence ?? 0;
      b.spend.creditsPurchased += p.pack_credits ?? 0;
      b.spend.purchaseCount += 1;
    } else if (p.status === "refunded") {
      b.spend.purchaseRefundedPence += p.price_pence ?? 0;
    }
  }

  for (const lead of leadsRes.data ?? []) {
    if (!lead.installer_acknowledged_at) continue;
    const idx = bucketIndex(buckets, lead.installer_acknowledged_at);
    if (idx < 0) continue;
    const b = buckets[idx];
    // accept_cost_credits is NULL for rows acknowledged before m064;
    // assume the historical 5-credit cost for those so the YTD totals
    // don't drop on rollout.
    const cost = lead.accept_cost_credits ?? LEAD_ACCEPT_COST_CREDITS;
    b.usage.leadAcceptances += 1;
    b.usage.leadCreditsUsed += cost;
    b.usage.totalCreditsUsed += cost;
  }

  for (const r of preSurveyRes.data ?? []) {
    // Pre-survey credits are charged on each send (initial + resends),
    // each timestamped by last_sent_at. Bucket by created_at for the
    // initial credit + by approximation for resends. With single-
    // installer cardinality we don't bother splitting per send — we
    // attribute the full total_credits_charged to last_sent_at since
    // that's where the most recent activity sits.
    const stamp = r.last_sent_at ?? r.created_at;
    const idx = bucketIndex(buckets, stamp);
    if (idx < 0) continue;
    const b = buckets[idx];
    b.usage.preSurveyRequests += 1;
    b.usage.preSurveyCreditsUsed += r.total_credits_charged ?? 0;
    b.usage.totalCreditsUsed += r.total_credits_charged ?? 0;
  }

  // YTD totals — reduce the (smaller) result sets directly.
  const ytdPence =
    (ytdPurchasesRes.data ?? []).reduce(
      (sum, p) => sum + (p.price_pence ?? 0),
      0,
    );
  const ytdCreditsPurchased =
    (ytdPurchasesRes.data ?? []).reduce(
      (sum, p) => sum + (p.pack_credits ?? 0),
      0,
    );
  const ytdLeadCreditsUsed = (ytdLeadsRes.data ?? []).reduce(
    (sum, r) => sum + (r.accept_cost_credits ?? LEAD_ACCEPT_COST_CREDITS),
    0,
  );
  const ytdPreSurveyCredits = (ytdPreSurveyRes.data ?? []).reduce(
    (sum, r) => sum + (r.total_credits_charged ?? 0),
    0,
  );

  return {
    months: buckets,
    totals: sumBuckets(buckets),
    purchases: (purchasesRes.data ?? []).map((p) => ({
      id: p.id,
      created_at: p.created_at,
      pack_credits: p.pack_credits,
      price_pence: p.price_pence,
      currency: p.currency,
      status: p.status,
      stripe_session_id: p.stripe_session_id,
      stripe_receipt_url: p.stripe_receipt_url,
      is_auto_recharge: p.stripe_session_id === null,
    })),
    ytd: {
      pencePaid: ytdPence,
      creditsPurchased: ytdCreditsPurchased,
      creditsUsed: ytdLeadCreditsUsed + ytdPreSurveyCredits,
      purchaseCount: ytdPurchasesRes.count ?? 0,
    },
  };
}

// ─── Bucket helpers ────────────────────────────────────────────────

function buildEmptyBuckets(months: number): BillingMonth[] {
  const out: BillingMonth[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      monthStart: d.toISOString(),
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "Europe/London",
      }).format(d),
      spend: {
        pencePaid: 0,
        pencePaidGross: 0,
        creditsPurchased: 0,
        purchaseCount: 0,
        purchaseRefundedPence: 0,
      },
      usage: {
        leadAcceptances: 0,
        leadCreditsUsed: 0,
        preSurveyRequests: 0,
        preSurveyCreditsUsed: 0,
        totalCreditsUsed: 0,
      },
    });
  }
  return out;
}

function bucketIndex(buckets: BillingMonth[], iso: string): number {
  const t = new Date(iso).getTime();
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (new Date(buckets[i].monthStart).getTime() <= t) {
      return i;
    }
  }
  return -1;
}

function sumBuckets(buckets: BillingMonth[]): BillingMonth {
  const out: BillingMonth = {
    monthStart: buckets[0]?.monthStart ?? new Date().toISOString(),
    label: "All",
    spend: {
      pencePaid: 0,
      pencePaidGross: 0,
      creditsPurchased: 0,
      purchaseCount: 0,
      purchaseRefundedPence: 0,
    },
    usage: {
      leadAcceptances: 0,
      leadCreditsUsed: 0,
      preSurveyRequests: 0,
      preSurveyCreditsUsed: 0,
      totalCreditsUsed: 0,
    },
  };
  for (const b of buckets) {
    out.spend.pencePaid += b.spend.pencePaid;
    out.spend.pencePaidGross += b.spend.pencePaidGross;
    out.spend.creditsPurchased += b.spend.creditsPurchased;
    out.spend.purchaseCount += b.spend.purchaseCount;
    out.spend.purchaseRefundedPence += b.spend.purchaseRefundedPence;
    out.usage.leadAcceptances += b.usage.leadAcceptances;
    out.usage.leadCreditsUsed += b.usage.leadCreditsUsed;
    out.usage.preSurveyRequests += b.usage.preSurveyRequests;
    out.usage.preSurveyCreditsUsed += b.usage.preSurveyCreditsUsed;
    out.usage.totalCreditsUsed += b.usage.totalCreditsUsed;
  }
  return out;
}

function emptyResult(): BillingData {
  return {
    months: [],
    totals: sumBuckets([]),
    purchases: [],
    ytd: {
      pencePaid: 0,
      creditsPurchased: 0,
      creditsUsed: 0,
      purchaseCount: 0,
    },
  };
}
