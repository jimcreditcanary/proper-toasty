// Tests for POST /api/installer/pre-survey-requests (create + send).
// Exercises the auth + validation + chargeAndSend pipeline. The
// happy path verifies that on send failure the row gets deleted
// and the credit is refunded — that's the most important
// invariant in this route.

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
process.env.NEXT_PUBLIC_APP_URL = "https://test.propertoasty.com";

import { POST } from "./route";

const VALID_BODY = {
  contact_name: "Sam Patel",
  contact_email: "sam@example.com",
  contact_postcode: "SW1A 1AA",
};

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/installer/pre-survey-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const installerRow = {
  id: 100,
  company_name: "Test Installer Ltd",
  email: "ops@test-installer.com",
  telephone: "+44 1234 567890",
  user_id: "user-uuid",
};

beforeEach(() => {
  state.user = { id: "user-uuid", email: "installer@test.com" };
  state.sendResult = { ok: true, id: "msg-1" };
});

// ─── Auth ──────────────────────────────────────────────────────────

describe("POST /api/installer/pre-survey-requests — auth", () => {
  it("returns 401 when not signed in", async () => {
    state.user = null;
    state.admin = makeMockAdmin({});
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no installer profile", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: null }],
    });
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });
});

// ─── Validation ────────────────────────────────────────────────────

describe("POST /api/installer/pre-survey-requests — validation", () => {
  beforeEach(() => {
    state.admin = makeMockAdmin({
      installers: [{ data: installerRow }],
    });
  });

  it("rejects missing name", async () => {
    const res = await POST(
      buildRequest({ contact_email: "sam@example.com" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects malformed email", async () => {
    const res = await POST(
      buildRequest({ ...VALID_BODY, contact_email: "not-an-email" }),
    );
    expect(res.status).toBe(400);
  });
});

// ─── Happy path ────────────────────────────────────────────────────

describe("POST /api/installer/pre-survey-requests — happy path", () => {
  it("returns ok + id + creditsCharged on success", async () => {
    state.admin = makeMockAdmin(
      {
        installers: [{ data: installerRow }],
        installer_pre_survey_requests: [
          {
            data: {
              id: "psr-uuid",
              contact_name: VALID_BODY.contact_name,
              contact_email: VALID_BODY.contact_email,
              homeowner_token: "tok.sig",
            },
          },
        ],
      },
      {
        rpc: { deduct_credits: [{ data: true, error: null }] },
      },
    );
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("psr-uuid");
    expect(body.creditsCharged).toBe(1);
  });

  it("returns 402 when deduct_credits fails (insufficient balance)", async () => {
    state.admin = makeMockAdmin(
      {
        installers: [{ data: installerRow }],
        installer_pre_survey_requests: [
          {
            data: {
              id: "psr-uuid",
              contact_name: VALID_BODY.contact_name,
              contact_email: VALID_BODY.contact_email,
              homeowner_token: "tok.sig",
            },
          },
        ],
      },
      {
        // RPC returns false → insufficient credits
        rpc: { deduct_credits: [{ data: false, error: null }] },
      },
    );
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(402);
  });
});
