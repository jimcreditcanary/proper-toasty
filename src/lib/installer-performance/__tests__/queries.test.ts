// Tests for the performance-dashboard aggregator. Focus areas:
//   - Bucketing: oldest first, current month at the end
//   - Source split: directory (pre_survey_request_id NULL) vs
//     pre-survey (pre_survey_request_id NOT NULL)
//   - Conversion rates: zero-safe when denominators are 0
//   - Empty state: returns sensible zeros when nothing matches
//   - Date attribution: rows count toward the bucket their
//     timestamp falls in (acknowledged_at for leads; sent_at for
//     quote count, accepted_at for accepted count, etc.)

import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPerformance } from "../queries";
import { makeMockAdmin } from "@/test-utils/mock-supabase";

// Pin "now" so the bucket boundaries are deterministic. We're
// testing in May 2026 — three buckets cover Mar / Apr / May.
const NOW = new Date("2026-05-15T10:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

const INSTALLER_ID = 100;

// ─── Empty state ────────────────────────────────────────────────────

describe("loadPerformance — empty state", () => {
  it("returns zeroed structure when there's no data", async () => {
    const admin = makeMockAdmin({
      installer_leads: [{ data: [] }],
      installer_proposals: [{ data: [] }],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.months.length).toBe(3);
    expect(out.totals.leads.total).toBe(0);
    expect(out.totals.quotes.sent).toBe(0);
    expect(out.totals.quotes.accepted).toBe(0);
    expect(out.conversion.acceptanceRate).toBe(0);
    expect(out.conversion.preSurveyCompletionRate).toBe(0);
    expect(out.conversion.quoteRate).toBe(0);
  });

  it("returns 3 month buckets oldest-first by default", async () => {
    const admin = makeMockAdmin({
      installer_leads: [{ data: [] }],
      installer_proposals: [{ data: [] }],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.months[0].label).toBe("Mar 2026");
    expect(out.months[1].label).toBe("Apr 2026");
    expect(out.months[2].label).toBe("May 2026");
  });
});

// ─── Source split ─────────────────────────────────────────────────

describe("loadPerformance — lead source split", () => {
  it("counts pre_survey_request_id NOT NULL as preSurvey leads", async () => {
    const admin = makeMockAdmin({
      installer_leads: [
        {
          data: [
            {
              id: "1",
              installer_acknowledged_at: "2026-05-10T10:00:00Z",
              pre_survey_request_id: "psr-1",
              status: "installer_acknowledged",
              auto_released_at: null,
            },
            {
              id: "2",
              installer_acknowledged_at: "2026-05-10T10:00:00Z",
              pre_survey_request_id: null,
              status: "installer_acknowledged",
              auto_released_at: null,
            },
          ],
        },
      ],
      installer_proposals: [{ data: [] }],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    const may = out.months[2];
    expect(may.leads.total).toBe(2);
    expect(may.leads.preSurvey).toBe(1);
    expect(may.leads.directory).toBe(1);
    // Totals roll up correctly across months
    expect(out.totals.leads.total).toBe(2);
    expect(out.totals.leads.preSurvey).toBe(1);
    expect(out.totals.leads.directory).toBe(1);
  });
});

// ─── Bucketing ────────────────────────────────────────────────────

describe("loadPerformance — bucketing", () => {
  it("attributes a lead to the correct bucket based on acknowledged_at", async () => {
    const admin = makeMockAdmin({
      installer_leads: [
        {
          data: [
            // March 2026
            {
              id: "1",
              installer_acknowledged_at: "2026-03-15T10:00:00Z",
              pre_survey_request_id: null,
              status: "installer_acknowledged",
              auto_released_at: null,
            },
            // April 2026
            {
              id: "2",
              installer_acknowledged_at: "2026-04-20T10:00:00Z",
              pre_survey_request_id: null,
              status: "installer_acknowledged",
              auto_released_at: null,
            },
            // May 2026
            {
              id: "3",
              installer_acknowledged_at: "2026-05-05T10:00:00Z",
              pre_survey_request_id: null,
              status: "installer_acknowledged",
              auto_released_at: null,
            },
          ],
        },
      ],
      installer_proposals: [{ data: [] }],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.months[0].leads.total).toBe(1); // Mar
    expect(out.months[1].leads.total).toBe(1); // Apr
    expect(out.months[2].leads.total).toBe(1); // May
  });

  it("ignores leads with null acknowledged_at", async () => {
    const admin = makeMockAdmin({
      installer_leads: [
        {
          data: [
            {
              id: "1",
              installer_acknowledged_at: null,
              pre_survey_request_id: null,
              status: "new",
              auto_released_at: null,
            },
          ],
        },
      ],
      installer_proposals: [{ data: [] }],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.totals.leads.total).toBe(0);
  });
});

// ─── Quotes ─────────────────────────────────────────────────────

describe("loadPerformance — quotes", () => {
  it("counts a quote in BOTH sent and accepted when both timestamps fall in the window", async () => {
    const admin = makeMockAdmin({
      installer_leads: [{ data: [] }],
      installer_proposals: [
        {
          data: [
            {
              id: "p1",
              status: "accepted",
              sent_at: "2026-04-10T10:00:00Z",
              accepted_at: "2026-05-12T10:00:00Z",
              declined_at: null,
              total_pence: 1_500_000,
            },
          ],
        },
      ],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.totals.quotes.sent).toBe(1);
    expect(out.totals.quotes.accepted).toBe(1);
    expect(out.totals.quotes.sentValuePence).toBe(1_500_000);
    expect(out.totals.quotes.acceptedValuePence).toBe(1_500_000);
    // Sent in April, accepted in May — bucketed accordingly
    expect(out.months[1].quotes.sent).toBe(1);
    expect(out.months[2].quotes.accepted).toBe(1);
  });

  it("computes acceptance rate as accepted / sent", async () => {
    const admin = makeMockAdmin({
      installer_leads: [{ data: [] }],
      installer_proposals: [
        {
          data: [
            {
              id: "p1",
              status: "accepted",
              sent_at: "2026-04-10T10:00:00Z",
              accepted_at: "2026-04-12T10:00:00Z",
              declined_at: null,
              total_pence: 100_000,
            },
            {
              id: "p2",
              status: "sent",
              sent_at: "2026-04-15T10:00:00Z",
              accepted_at: null,
              declined_at: null,
              total_pence: 100_000,
            },
            {
              id: "p3",
              status: "declined",
              sent_at: "2026-04-20T10:00:00Z",
              accepted_at: null,
              declined_at: "2026-04-25T10:00:00Z",
              total_pence: 100_000,
            },
          ],
        },
      ],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.totals.quotes.sent).toBe(3);
    expect(out.totals.quotes.accepted).toBe(1);
    expect(out.totals.quotes.declined).toBe(1);
    // 1 of 3 accepted = 33.33...%
    expect(out.conversion.acceptanceRate).toBeCloseTo(1 / 3, 5);
  });
});

// ─── Pre-survey requests ───────────────────────────────────────────

describe("loadPerformance — pre-survey requests", () => {
  it("buckets sent / clicked / completed by their respective timestamps", async () => {
    const admin = makeMockAdmin({
      installer_leads: [{ data: [] }],
      installer_proposals: [{ data: [] }],
      installer_pre_survey_requests: [
        {
          data: [
            {
              id: "r1",
              created_at: "2026-03-15T10:00:00Z",
              clicked_at: "2026-04-15T10:00:00Z",
              completed_at: "2026-05-15T10:00:00Z",
              total_credits_charged: 1,
            },
          ],
        },
      ],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.months[0].preSurveyRequests.sent).toBe(1); // Mar
    expect(out.months[1].preSurveyRequests.clicked).toBe(1); // Apr
    expect(out.months[2].preSurveyRequests.completed).toBe(1); // May
  });

  it("computes completion rate as completed / sent", async () => {
    const admin = makeMockAdmin({
      installer_leads: [{ data: [] }],
      installer_proposals: [{ data: [] }],
      installer_pre_survey_requests: [
        {
          data: [
            {
              id: "r1",
              created_at: "2026-04-01T10:00:00Z",
              clicked_at: "2026-04-02T10:00:00Z",
              completed_at: "2026-04-03T10:00:00Z",
              total_credits_charged: 1,
            },
            {
              id: "r2",
              created_at: "2026-04-05T10:00:00Z",
              clicked_at: null,
              completed_at: null,
              total_credits_charged: 1,
            },
          ],
        },
      ],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.conversion.preSurveyCompletionRate).toBe(0.5);
  });
});

// ─── Cross-metric: quoteRate ───────────────────────────────────────

describe("loadPerformance — quote rate", () => {
  it("computes quoteRate as quotes-sent / leads-received", async () => {
    const admin = makeMockAdmin({
      installer_leads: [
        {
          data: [
            {
              id: "1",
              installer_acknowledged_at: "2026-05-01T10:00:00Z",
              pre_survey_request_id: null,
              status: "installer_acknowledged",
              auto_released_at: null,
            },
            {
              id: "2",
              installer_acknowledged_at: "2026-05-02T10:00:00Z",
              pre_survey_request_id: null,
              status: "installer_acknowledged",
              auto_released_at: null,
            },
          ],
        },
      ],
      installer_proposals: [
        {
          data: [
            {
              id: "p1",
              status: "sent",
              sent_at: "2026-05-03T10:00:00Z",
              accepted_at: null,
              declined_at: null,
              total_pence: 100_000,
            },
          ],
        },
      ],
      installer_pre_survey_requests: [{ data: [] }],
    });
    const out = await loadPerformance(admin, INSTALLER_ID, 3);
    expect(out.conversion.quoteRate).toBe(0.5); // 1 quote / 2 leads
  });
});
