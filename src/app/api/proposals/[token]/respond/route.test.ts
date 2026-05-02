// Tests for POST /api/proposals/[token]/respond.
// Three things matter most here:
//   1. Token gating — bad / forged tokens return 404 without
//      hitting the DB
//   2. Idempotency — already-accepted proposals don't double-fire
//      the installer notification email
//   3. CAS — the status update is conditional on the row still
//      being 'sent', so a parallel decline can't unflip an accept

import { describe, expect, it, beforeEach, vi } from "vitest";
import { makeMockAdmin } from "@/test-utils/mock-supabase";
import { buildProposalToken } from "@/lib/email/tokens";
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

process.env.PROPOSAL_TOKEN_SECRET = "x".repeat(32);

import { POST } from "./route";

const PROPOSAL_ID = "8f3c2f3a-1f4b-4c1d-8e5a-1234567890ab";
const VALID_TOKEN = buildProposalToken(PROPOSAL_ID);

function buildRequest(token: string, body: unknown): Request {
  return new Request(
    `http://localhost/api/proposals/${token}/respond`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}
function buildCtx(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  state.sendResult = { ok: true, id: "msg-1" };
});

// ─── Token gating ──────────────────────────────────────────────────

describe("respond — token gating", () => {
  it("returns 404 on a malformed token", async () => {
    state.admin = makeMockAdmin({});
    const res = await POST(
      buildRequest("not-a-token", { decision: "accepted" }),
      buildCtx("not-a-token"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when the token signature was forged", async () => {
    state.admin = makeMockAdmin({});
    const compactId = PROPOSAL_ID.replace(/-/g, "");
    const forged = `${compactId}.${"0".repeat(64)}`;
    const res = await POST(
      buildRequest(forged, { decision: "accepted" }),
      buildCtx(forged),
    );
    expect(res.status).toBe(404);
  });
});

// ─── Validation ────────────────────────────────────────────────────

describe("respond — validation", () => {
  it("returns 400 on a malformed decision", async () => {
    state.admin = makeMockAdmin({});
    const res = await POST(
      buildRequest(VALID_TOKEN, { decision: "maybe" }),
      buildCtx(VALID_TOKEN),
    );
    expect(res.status).toBe(400);
  });
});

// ─── Idempotency ───────────────────────────────────────────────────

describe("respond — idempotency", () => {
  it("returns 200 with the existing status when already accepted", async () => {
    state.admin = makeMockAdmin({
      installer_proposals: [
        {
          data: {
            id: PROPOSAL_ID,
            installer_id: 100,
            installer_lead_id: "lead-1",
            status: "accepted",
            total_pence: 1_000_000,
            vat_rate_bps: 0,
            homeowner_token: VALID_TOKEN,
          },
        },
      ],
    });
    const res = await POST(
      buildRequest(VALID_TOKEN, { decision: "accepted" }),
      buildCtx(VALID_TOKEN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("accepted");
  });

  it("returns 409 when the proposal is still a draft", async () => {
    state.admin = makeMockAdmin({
      installer_proposals: [
        {
          data: {
            id: PROPOSAL_ID,
            installer_id: 100,
            installer_lead_id: "lead-1",
            status: "draft",
            total_pence: 0,
            vat_rate_bps: 0,
            homeowner_token: VALID_TOKEN,
          },
        },
      ],
    });
    const res = await POST(
      buildRequest(VALID_TOKEN, { decision: "accepted" }),
      buildCtx(VALID_TOKEN),
    );
    expect(res.status).toBe(409);
  });
});

// ─── Happy path ────────────────────────────────────────────────────

describe("respond — happy path", () => {
  it("accepts a sent proposal + returns the new status", async () => {
    state.admin = makeMockAdmin(
      {
        installer_proposals: [
          // First read: load the proposal
          {
            data: {
              id: PROPOSAL_ID,
              installer_id: 100,
              installer_lead_id: "lead-1",
              status: "sent",
              total_pence: 1_000_000,
              vat_rate_bps: 0,
              homeowner_token: VALID_TOKEN,
            },
          },
          // Second: CAS update returning the flipped row
          { data: { id: PROPOSAL_ID } },
        ],
        installers: [
          {
            data: {
              id: 100,
              company_name: "Test Installer Ltd",
              email: "ops@test.com",
              user_id: "user-uuid",
            },
          },
        ],
        installer_leads: [
          {
            data: {
              id: "lead-1",
              contact_email: "homeowner@example.com",
              contact_name: "Sam Patel",
              contact_phone: null,
              property_address: "1 Test St",
            },
          },
        ],
      },
    );
    const res = await POST(
      buildRequest(VALID_TOKEN, { decision: "accepted" }),
      buildCtx(VALID_TOKEN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("accepted");
  });

  it("declines with a captured reason", async () => {
    state.admin = makeMockAdmin({
      installer_proposals: [
        {
          data: {
            id: PROPOSAL_ID,
            installer_id: 100,
            installer_lead_id: "lead-1",
            status: "sent",
            total_pence: 1_000_000,
            vat_rate_bps: 0,
            homeowner_token: VALID_TOKEN,
          },
        },
        { data: { id: PROPOSAL_ID } },
      ],
      installers: [
        {
          data: {
            id: 100,
            company_name: "Test Installer Ltd",
            email: "ops@test.com",
            user_id: "user-uuid",
          },
        },
      ],
      installer_leads: [
        {
          data: {
            id: "lead-1",
            contact_email: "homeowner@example.com",
            contact_name: "Sam Patel",
            contact_phone: null,
            property_address: "1 Test St",
          },
        },
      ],
    });
    const res = await POST(
      buildRequest(VALID_TOKEN, {
        decision: "declined",
        reason: "Going with another installer",
      }),
      buildCtx(VALID_TOKEN),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("declined");
  });
});
