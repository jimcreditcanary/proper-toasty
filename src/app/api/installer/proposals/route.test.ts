// Tests for POST /api/installer/proposals (create draft).
//
// Mock strategy: vi.hoisted state object captured by the supabase
// module mocks. Per-test we mutate state.user / state.admin to
// stage the auth + DB responses. Routes are dynamic-imported so
// the mocks are in place before the route reads its supabase
// helpers.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { makeMockAdmin } from "@/test-utils/mock-supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  admin: null as SupabaseClient<Database> | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => state.admin,
}));

// Need a token secret set for buildProposalToken to not throw —
// the route mints a homeowner_token on every successful insert.
process.env.PROPOSAL_TOKEN_SECRET = "x".repeat(32);

import { POST } from "./route";

const VALID_BODY = {
  installer_lead_id: "8f3c2f3a-1f4b-4c1d-8e5a-1234567890ab",
  line_items: [
    {
      id: "row-1",
      description: "Air-source heat pump",
      quantity: 1,
      unit_price_pence: 800_000,
      category: "heat_pump",
      is_bus_grant: false,
    },
  ],
  cover_message: null,
  vat_rate_bps: 0,
};

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/installer/proposals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.user = { id: "user-uuid", email: "installer@test.com" };
});

// ─── Auth ──────────────────────────────────────────────────────────

describe("POST /api/installer/proposals — auth", () => {
  it("returns 401 when not signed in", async () => {
    state.user = null;
    state.admin = makeMockAdmin({});
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/sign in/i);
  });

  it("returns 403 when user has no installer profile", async () => {
    state.admin = makeMockAdmin({
      // installers lookup returns nothing
      installers: [{ data: null }],
    });
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not linked/i);
  });
});

// ─── Validation ────────────────────────────────────────────────────

describe("POST /api/installer/proposals — validation", () => {
  beforeEach(() => {
    state.admin = makeMockAdmin({
      installers: [{ data: { id: 100 } }],
    });
  });

  it("returns 400 on malformed body", async () => {
    const res = await POST(buildRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 on unsupported VAT rate", async () => {
    const res = await POST(buildRequest({ ...VALID_BODY, vat_rate_bps: 1500 }));
    expect(res.status).toBe(400);
  });
});

// ─── Lead-ownership gate ──────────────────────────────────────────

describe("POST /api/installer/proposals — lead ownership", () => {
  it("returns 404 when the lead doesn't belong to this installer", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: { id: 100 } }],
      installer_leads: [{ data: null }],
    });
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the lead hasn't been acknowledged yet", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: { id: 100 } }],
      installer_leads: [
        {
          data: {
            id: VALID_BODY.installer_lead_id,
            installer_id: 100,
            installer_acknowledged_at: null,
            homeowner_lead_id: null,
          },
        },
      ],
    });
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/accept this lead/i);
  });
});

// ─── Happy path ────────────────────────────────────────────────────

describe("POST /api/installer/proposals — happy path", () => {
  it("returns id + token + status:draft on success", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: { id: 100 } }],
      installer_leads: [
        {
          data: {
            id: VALID_BODY.installer_lead_id,
            installer_id: 100,
            installer_acknowledged_at: "2026-04-01T10:00:00Z",
            homeowner_lead_id: "home-1",
          },
        },
      ],
      installer_proposals: [
        {
          data: {
            id: "new-proposal-uuid",
            homeowner_token: "tok.sig",
            status: "draft",
          },
        },
      ],
    });
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("new-proposal-uuid");
    expect(body.status).toBe("draft");
    expect(body.homeownerToken).toBe("tok.sig");
  });

  it("surfaces the DB error when insert fails", async () => {
    state.admin = makeMockAdmin({
      installers: [{ data: { id: 100 } }],
      installer_leads: [
        {
          data: {
            id: VALID_BODY.installer_lead_id,
            installer_id: 100,
            installer_acknowledged_at: "2026-04-01T10:00:00Z",
            homeowner_lead_id: "home-1",
          },
        },
      ],
      installer_proposals: [
        {
          data: null,
          error: { message: "constraint violation", code: "23505" },
        },
      ],
    });
    const res = await POST(buildRequest(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
