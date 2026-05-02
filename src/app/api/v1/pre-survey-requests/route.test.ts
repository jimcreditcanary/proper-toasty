// Tests for POST /api/v1/pre-survey-requests (Bearer api-key auth).
//
// The route authenticates via authenticateInstallerApiKey(), which
// itself wraps a couple of admin queries (users → installers →
// auth.users). We mock createAdminClient at the module boundary so
// every admin call inside auth + chargeAndSend uses the same stub.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { makeMockAdmin } from "@/test-utils/mock-supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const state = vi.hoisted(() => ({
  admin: null as SupabaseClient<Database> | null,
  sendResult: { ok: true, id: "msg-1" } as
    | { ok: true; id: string }
    | { ok: false; skipped: true; reason: string }
    | { ok: false; skipped: false; error: string },
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

const VALID_BODY = {
  contact_name: "Sam Patel",
  contact_email: "sam@example.com",
  contact_postcode: "SW1A 1AA",
};

const installerRow = {
  id: 100,
  company_name: "Test Installer Ltd",
  email: "ops@test-installer.com",
  telephone: "+44 1234 567890",
  user_id: "user-uuid",
};

function buildRequest(opts: {
  apiKey?: string;
  body?: unknown;
}): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.apiKey) {
    headers.authorization = `Bearer ${opts.apiKey}`;
  }
  return new Request("http://localhost/api/v1/pre-survey-requests", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? VALID_BODY),
  });
}

beforeEach(() => {
  state.sendResult = { ok: true, id: "msg-1" };
});

// ─── Auth ──────────────────────────────────────────────────────────

describe("POST /api/v1/pre-survey-requests — auth", () => {
  it("returns 401 with no API key", async () => {
    state.admin = makeMockAdmin({});
    const res = await POST(buildRequest({}));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/api key/i);
  });

  it("returns 401 when the API key doesn't match any user", async () => {
    state.admin = makeMockAdmin({
      // users lookup returns no row
      users: [{ data: null }],
    });
    const res = await POST(buildRequest({ apiKey: "wap_unknown" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the key matches a user with no installer profile", async () => {
    state.admin = makeMockAdmin(
      {
        users: [{ data: { id: "user-uuid" } }],
        installers: [{ data: null }],
      },
      {
        authUsers: { "user-uuid": { email: "homeowner@example.com" } },
      },
    );
    const res = await POST(buildRequest({ apiKey: "wap_valid" }));
    expect(res.status).toBe(403);
  });

  it("accepts X-API-Key header as fallback", async () => {
    state.admin = makeMockAdmin(
      {
        users: [{ data: { id: "user-uuid" } }],
        installers: [{ data: installerRow }],
        installer_pre_survey_requests: [
          {
            data: {
              id: "psr-uuid",
              contact_name: VALID_BODY.contact_name,
              contact_email: VALID_BODY.contact_email,
              homeowner_token: "tok.sig",
              status: "pending",
            },
          },
        ],
      },
      {
        authUsers: { "user-uuid": { email: "installer@example.com" } },
        rpc: { deduct_credits: [{ data: true, error: null }] },
      },
    );
    const req = new Request("http://localhost/api/v1/pre-survey-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "wap_valid",
      },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

// ─── Validation ────────────────────────────────────────────────────

describe("POST /api/v1/pre-survey-requests — validation", () => {
  it("returns 400 with details on a malformed body", async () => {
    state.admin = makeMockAdmin(
      {
        users: [{ data: { id: "user-uuid" } }],
        installers: [{ data: installerRow }],
      },
      { authUsers: { "user-uuid": { email: "x@x" } } },
    );
    const res = await POST(
      buildRequest({
        apiKey: "wap_valid",
        body: { contact_email: "not-an-email" }, // no name, bad email
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(Array.isArray(body.details)).toBe(true);
  });
});

// ─── Happy path ────────────────────────────────────────────────────

describe("POST /api/v1/pre-survey-requests — happy path", () => {
  it("returns id + credits_charged on success", async () => {
    state.admin = makeMockAdmin(
      {
        users: [{ data: { id: "user-uuid" } }],
        installers: [{ data: installerRow }],
        installer_pre_survey_requests: [
          {
            data: {
              id: "psr-uuid",
              contact_name: VALID_BODY.contact_name,
              contact_email: VALID_BODY.contact_email,
              homeowner_token: "tok.sig",
              status: "pending",
            },
          },
        ],
      },
      {
        authUsers: { "user-uuid": { email: "installer@example.com" } },
        rpc: { deduct_credits: [{ data: true, error: null }] },
      },
    );
    const res = await POST(buildRequest({ apiKey: "wap_valid" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("psr-uuid");
    expect(body.credits_charged).toBe(1);
  });

  it("returns 402 on insufficient credits", async () => {
    state.admin = makeMockAdmin(
      {
        users: [{ data: { id: "user-uuid" } }],
        installers: [{ data: installerRow }],
        installer_pre_survey_requests: [
          {
            data: {
              id: "psr-uuid",
              contact_name: VALID_BODY.contact_name,
              contact_email: VALID_BODY.contact_email,
              homeowner_token: "tok.sig",
              status: "pending",
            },
          },
        ],
      },
      {
        authUsers: { "user-uuid": { email: "installer@example.com" } },
        rpc: { deduct_credits: [{ data: false, error: null }] },
      },
    );
    const res = await POST(buildRequest({ apiKey: "wap_valid" }));
    expect(res.status).toBe(402);
  });
});
