// Tests for POST /api/installer/pre-survey-requests/[id]/resend.
// Most important behaviour: the 72h cooling-off block + the
// ?force=true override that bypasses it. Both paths debit a
// credit; we verify auth + ownership in addition to the cool-off
// arithmetic.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { makeMockAdmin } from "@/test-utils/mock-supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  admin: null as SupabaseClient<Database> | null,
  sendResult: { ok: true, id: "msg-1" } as
    | { ok: true; id: string }
    | { ok: false; skipped: true; reason: string }
    | { ok: false; skipped: false; error: string },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => state.admin,
}));
vi.mock("@/lib/email/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/client")>();
  return {
    ...actual,
    sendEmail: vi.fn(async () => state.sendResult),
  };
});

process.env.PRE_SURVEY_TOKEN_SECRET = "x".repeat(32);

import { POST } from "./route";

const installerRow = {
  id: 100,
  company_name: "Test Installer Ltd",
  email: "ops@test-installer.com",
  telephone: "+44 1234 567890",
  user_id: "user-uuid",
};

const REQ_ID = "8f3c2f3a-1f4b-4c1d-8e5a-1234567890ab";

function buildRequest(opts: { force?: boolean } = {}): Request {
  const url =
    `http://localhost/api/installer/pre-survey-requests/${REQ_ID}/resend` +
    (opts.force ? "?force=true" : "");
  return new Request(url, { method: "POST" });
}
function buildCtx(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: REQ_ID }) };
}

beforeEach(() => {
  state.user = { id: "user-uuid", email: "installer@test.com" };
  state.sendResult = { ok: true, id: "msg-1" };
});

// ─── Cool-off ───────────────────────────────────────────────────

describe("resend — cool-off enforcement", () => {
  it("blocks with 429 when last_sent_at is under 72h ago", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    state.admin = makeMockAdmin({
      installers: [{ data: installerRow }],
      installer_pre_survey_requests: [
        {
          data: {
            id: REQ_ID,
            installer_id: 100,
            status: "pending",
            contact_name: "Sam",
            contact_email: "sam@example.com",
            homeowner_token: "tok",
            sends_count: 1,
            last_sent_at: oneHourAgo,
            total_credits_charged: 1,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            completed_at: null,
          },
        },
      ],
    });
    const res = await POST(buildRequest(), buildCtx());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/72 hours/i);
    expect(body.coolOffActive).toBe(true);
  });

  it("allows a normal resend after 72h have passed", async () => {
    const fourDaysAgo = new Date(
      Date.now() - 4 * 24 * 60 * 60 * 1000,
    ).toISOString();
    state.admin = makeMockAdmin(
      {
        installers: [{ data: installerRow }],
        installer_pre_survey_requests: [
          {
            data: {
              id: REQ_ID,
              installer_id: 100,
              status: "pending",
              contact_name: "Sam",
              contact_email: "sam@example.com",
              homeowner_token: "tok",
              sends_count: 1,
              last_sent_at: fourDaysAgo,
              total_credits_charged: 1,
              expires_at: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              completed_at: null,
            },
          },
        ],
      },
      {
        rpc: { deduct_credits: [{ data: true, error: null }] },
      },
    );
    const res = await POST(buildRequest(), buildCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sends).toBe(2);
    expect(body.creditsCharged).toBe(1);
  });

  it("?force=true bypasses the cool-off check", async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    state.admin = makeMockAdmin(
      {
        installers: [{ data: installerRow }],
        installer_pre_survey_requests: [
          {
            data: {
              id: REQ_ID,
              installer_id: 100,
              status: "pending",
              contact_name: "Sam",
              contact_email: "sam@example.com",
              homeowner_token: "tok",
              sends_count: 1,
              last_sent_at: oneHourAgo,
              total_credits_charged: 1,
              expires_at: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              completed_at: null,
            },
          },
        ],
      },
      {
        rpc: { deduct_credits: [{ data: true, error: null }] },
      },
    );
    const res = await POST(buildRequest({ force: true }), buildCtx());
    expect(res.status).toBe(200);
  });
});

// ─── Lifecycle gates ───────────────────────────────────────────────

describe("resend — lifecycle gates", () => {
  it("returns 409 when the customer already completed the check", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: installerRow }],
      installer_pre_survey_requests: [
        {
          data: {
            id: REQ_ID,
            installer_id: 100,
            status: "completed",
            contact_name: "Sam",
            contact_email: "sam@example.com",
            homeowner_token: "tok",
            sends_count: 1,
            last_sent_at: new Date().toISOString(),
            total_credits_charged: 1,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            // Already done — no need to resend
            completed_at: new Date().toISOString(),
          },
        },
      ],
    });
    const res = await POST(buildRequest(), buildCtx());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already completed/i);
  });

  it("returns 410 when the request has expired", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: installerRow }],
      installer_pre_survey_requests: [
        {
          data: {
            id: REQ_ID,
            installer_id: 100,
            status: "pending",
            contact_name: "Sam",
            contact_email: "sam@example.com",
            homeowner_token: "tok",
            sends_count: 1,
            last_sent_at: new Date(Date.now() - 86_400_000 * 31).toISOString(),
            total_credits_charged: 1,
            expires_at: new Date(Date.now() - 86_400_000).toISOString(),
            completed_at: null,
          },
        },
      ],
    });
    const res = await POST(buildRequest(), buildCtx());
    expect(res.status).toBe(410);
  });
});

// ─── Auth + ownership ─────────────────────────────────────────────

describe("resend — auth + ownership", () => {
  it("returns 401 when not signed in", async () => {
    state.user = null;
    state.admin = makeMockAdmin({});
    const res = await POST(buildRequest(), buildCtx());
    expect(res.status).toBe(401);
  });

  it("returns 404 when the request belongs to another installer", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: installerRow }],
      // The .eq("installer_id", installer.id) filter would return
      // no row — modelled here as data: null on the lookup.
      installer_pre_survey_requests: [{ data: null }],
    });
    const res = await POST(buildRequest(), buildCtx());
    expect(res.status).toBe(404);
  });
});
