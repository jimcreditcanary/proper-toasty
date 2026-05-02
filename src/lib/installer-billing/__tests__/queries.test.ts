// Tests for the billing aggregator. Two tricky bits:
//   1. Six parallel queries — three for the window (purchases /
//      leads / pre-survey) plus three for the YTD headline numbers.
//      The mock supports per-table queues so we can stage two
//      distinct responses per table.
//   2. Credit usage is *derived* (no ledger table). We cross-check
//      that the derivation pulls from the right columns:
//        - leads: count × LEAD_ACCEPT_COST_CREDITS (5)
//        - pre-survey: sum(total_credits_charged)
//
// The YTD numbers use a separate calendar-year window — we set
// system time to mid-year so the YTD path is exercised.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBilling } from "../queries";
import { makeMockAdmin } from "@/test-utils/mock-supabase";
import { LEAD_ACCEPT_COST_CREDITS } from "@/lib/booking/credits";

const NOW = new Date("2026-06-15T10:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

const USER_ID = "user-uuid";
const INSTALLER_ID = 100;

// Common args shape — every test passes these.
const ARGS = { userId: USER_ID, installerId: INSTALLER_ID, months: 12 };

// ─── Empty state ────────────────────────────────────────────────────

describe("loadBilling — empty state", () => {
  it("returns 12 buckets all zeroed when nothing matches", async () => {
    const admin = makeMockAdmin({
      installer_credit_purchases: [
        { data: [] }, // window
        { data: [], count: 0 }, // YTD count
      ],
      installer_leads: [
        { data: [] }, // window
        { data: null, count: 0 }, // YTD head:true count
      ],
      installer_pre_survey_requests: [
        { data: [] }, // window
        { data: [] }, // YTD
      ],
    });
    const out = await loadBilling(admin, ARGS);
    expect(out.months.length).toBe(12);
    expect(out.totals.spend.pencePaid).toBe(0);
    expect(out.totals.usage.totalCreditsUsed).toBe(0);
    expect(out.purchases).toEqual([]);
    expect(out.ytd.pencePaid).toBe(0);
    expect(out.ytd.creditsUsed).toBe(0);
  });
});

// ─── Stripe purchases ────────────────────────────────────────────

describe("loadBilling — Stripe purchases", () => {
  it("aggregates completed purchases into the right month bucket", async () => {
    const admin = makeMockAdmin({
      installer_credit_purchases: [
        {
          data: [
            {
              id: "p1",
              created_at: "2026-05-10T10:00:00Z",
              pack_credits: 30,
              price_pence: 4_999,
              currency: "gbp",
              status: "completed",
              stripe_session_id: "cs_xxx",
              stripe_receipt_url: "https://stripe.com/r/xxx",
            },
          ],
        },
        { data: [], count: 0 },
      ],
      installer_leads: [{ data: [] }, { data: null, count: 0 }],
      installer_pre_survey_requests: [{ data: [] }, { data: [] }],
    });
    const out = await loadBilling(admin, ARGS);
    expect(out.totals.spend.pencePaid).toBe(4_999);
    expect(out.totals.spend.creditsPurchased).toBe(30);
    expect(out.totals.spend.purchaseCount).toBe(1);
    expect(out.purchases.length).toBe(1);
    expect(out.purchases[0].is_auto_recharge).toBe(false);
  });

  it("identifies auto top-ups by null stripe_session_id", async () => {
    const admin = makeMockAdmin({
      installer_credit_purchases: [
        {
          data: [
            {
              id: "p1",
              created_at: "2026-05-10T10:00:00Z",
              pack_credits: 30,
              price_pence: 4_999,
              currency: "gbp",
              status: "completed",
              stripe_session_id: null, // auto top-up
              stripe_receipt_url: null,
            },
          ],
        },
        { data: [], count: 0 },
      ],
      installer_leads: [{ data: [] }, { data: null, count: 0 }],
      installer_pre_survey_requests: [{ data: [] }, { data: [] }],
    });
    const out = await loadBilling(admin, ARGS);
    expect(out.purchases[0].is_auto_recharge).toBe(true);
  });

  it("tracks refunded purchases separately (doesn't add to spend)", async () => {
    const admin = makeMockAdmin({
      installer_credit_purchases: [
        {
          data: [
            {
              id: "p1",
              created_at: "2026-05-10T10:00:00Z",
              pack_credits: 30,
              price_pence: 4_999,
              currency: "gbp",
              status: "refunded",
              stripe_session_id: "cs_xxx",
              stripe_receipt_url: "https://stripe.com/r/xxx",
            },
          ],
        },
        { data: [], count: 0 },
      ],
      installer_leads: [{ data: [] }, { data: null, count: 0 }],
      installer_pre_survey_requests: [{ data: [] }, { data: [] }],
    });
    const out = await loadBilling(admin, ARGS);
    expect(out.totals.spend.pencePaid).toBe(0); // not added
    expect(out.totals.spend.purchaseRefundedPence).toBe(4_999);
    expect(out.totals.spend.purchaseCount).toBe(0);
  });
});

// ─── Credit usage derivation ─────────────────────────────────────

describe("loadBilling — credit usage", () => {
  it("derives lead credit usage as count × LEAD_ACCEPT_COST_CREDITS", async () => {
    const admin = makeMockAdmin({
      installer_credit_purchases: [{ data: [] }, { data: [], count: 0 }],
      installer_leads: [
        {
          data: [
            { id: "1", installer_acknowledged_at: "2026-05-01T10:00:00Z" },
            { id: "2", installer_acknowledged_at: "2026-05-02T10:00:00Z" },
            { id: "3", installer_acknowledged_at: "2026-04-15T10:00:00Z" },
          ],
        },
        { data: null, count: 0 },
      ],
      installer_pre_survey_requests: [{ data: [] }, { data: [] }],
    });
    const out = await loadBilling(admin, ARGS);
    expect(out.totals.usage.leadAcceptances).toBe(3);
    expect(out.totals.usage.leadCreditsUsed).toBe(3 * LEAD_ACCEPT_COST_CREDITS);
  });

  it("sums pre-survey total_credits_charged across rows", async () => {
    const admin = makeMockAdmin({
      installer_credit_purchases: [{ data: [] }, { data: [], count: 0 }],
      installer_leads: [{ data: [] }, { data: null, count: 0 }],
      installer_pre_survey_requests: [
        {
          data: [
            {
              id: "r1",
              created_at: "2026-05-01T10:00:00Z",
              total_credits_charged: 1,
              sends_count: 1,
              last_sent_at: "2026-05-01T10:00:00Z",
            },
            {
              id: "r2",
              created_at: "2026-05-05T10:00:00Z",
              // 1 initial + 2 resends = 3 credits
              total_credits_charged: 3,
              sends_count: 3,
              last_sent_at: "2026-05-12T10:00:00Z",
            },
          ],
        },
        { data: [] },
      ],
    });
    const out = await loadBilling(admin, ARGS);
    expect(out.totals.usage.preSurveyRequests).toBe(2);
    expect(out.totals.usage.preSurveyCreditsUsed).toBe(4);
  });

  it("totalCreditsUsed = leadCreditsUsed + preSurveyCreditsUsed", async () => {
    const admin = makeMockAdmin({
      installer_credit_purchases: [{ data: [] }, { data: [], count: 0 }],
      installer_leads: [
        {
          data: [
            { id: "1", installer_acknowledged_at: "2026-05-01T10:00:00Z" },
          ],
        },
        { data: null, count: 0 },
      ],
      installer_pre_survey_requests: [
        {
          data: [
            {
              id: "r1",
              created_at: "2026-05-01T10:00:00Z",
              total_credits_charged: 2,
              sends_count: 2,
              last_sent_at: "2026-05-04T10:00:00Z",
            },
          ],
        },
        { data: [] },
      ],
    });
    const out = await loadBilling(admin, ARGS);
    // 1 lead × 5 = 5 credits, plus 2 pre-survey = 7 total
    expect(out.totals.usage.totalCreditsUsed).toBe(
      LEAD_ACCEPT_COST_CREDITS + 2,
    );
  });
});

// ─── YTD numbers ─────────────────────────────────────────────────

describe("loadBilling — YTD headline numbers", () => {
  it("uses the YTD-specific query results for the headline cards", async () => {
    // Window data is intentionally different from YTD data so we
    // can prove the page reads from the right query.
    const admin = makeMockAdmin({
      installer_credit_purchases: [
        // Window
        { data: [] },
        // YTD count query — separate fixture
        {
          data: [
            { id: "y1", price_pence: 9_999, pack_credits: 100, status: "completed" },
            { id: "y2", price_pence: 4_999, pack_credits: 30, status: "completed" },
          ],
          count: 2,
        },
      ],
      installer_leads: [
        { data: [] },
        // YTD head:true → just count, no rows
        { data: null, count: 4 },
      ],
      installer_pre_survey_requests: [
        { data: [] },
        // YTD pre-survey credits
        { data: [{ total_credits_charged: 3 }, { total_credits_charged: 1 }] },
      ],
    });
    const out = await loadBilling(admin, ARGS);
    expect(out.ytd.pencePaid).toBe(9_999 + 4_999);
    expect(out.ytd.creditsPurchased).toBe(130);
    expect(out.ytd.purchaseCount).toBe(2);
    // 4 leads × 5 credits + 4 pre-survey credits = 24
    expect(out.ytd.creditsUsed).toBe(4 * LEAD_ACCEPT_COST_CREDITS + 4);
  });
});
