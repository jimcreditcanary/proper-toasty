// Idempotency contract: maybeFireNoSlotsOutreach() must email the
// installer about a given homeowner-lead AT MOST once.
//
// We exercise the contract by stubbing the Supabase client. The
// "first call" path returns a new row from .insert(); the "second
// call" path simulates the UNIQUE-constraint conflict (postgres
// code 23505) so the helper returns status:"already_sent" without
// firing a second email send.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub the email + analytics modules BEFORE importing the helper so
// the helper picks up the mocked versions. We partially-mock
// `@/lib/email/client` so escapeHtml() (used by the templates) still
// works — we only intercept sendEmail().
const sendEmailMock = vi.fn();
vi.mock("@/lib/email/client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/email/client")>();
  return {
    ...actual,
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  };
});

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

import { maybeFireNoSlotsOutreach } from "../no-slots-outreach";

// ─── Stub Supabase client ───────────────────────────────────────────
//
// The helper uses three reads + one insert. Each call chains
// through a small builder, so we mimic the builder shape with vi.fn
// stubs that return `this`. The terminal `.maybeSingle()` returns
// the canned data we set per scenario.

interface StubScenario {
  installer: { id: number; company_name: string; email: string | null; user_id: string | null } | null;
  installerErr: { message: string } | null;
  homeownerLead: {
    id: string;
    name: string | null;
    postcode: string | null;
    analysis_snapshot: unknown;
  } | null;
  homeownerLeadErr: { message: string } | null;
  insert: { id: string } | null;
  insertErr: { code?: string; message: string } | null;
}

function buildAdminStub(scenario: StubScenario) {
  // .from("installers") → .select(...) → .eq("id", ...) → .maybeSingle()
  // .from("homeowner_leads") → .select(...) → .eq("id", ...) → .maybeSingle()
  // .from("installer_lead_outreach") → .insert(...) → .select(...) → .maybeSingle()
  const installerChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: scenario.installer,
      error: scenario.installerErr,
    }),
  };
  const homeownerLeadChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: scenario.homeownerLead,
      error: scenario.homeownerLeadErr,
    }),
  };
  const insertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: scenario.insert,
      error: scenario.insertErr,
    }),
  };
  const admin = {
    from: vi.fn((table: string) => {
      if (table === "installers") return installerChain;
      if (table === "homeowner_leads") return homeownerLeadChain;
      if (table === "installer_lead_outreach") return insertChain;
      throw new Error(`unexpected table ${table}`);
    }),
  };
  return { admin, installerChain, homeownerLeadChain, insertChain };
}

beforeEach(() => {
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue({ ok: true, id: "msg_stub" });
  trackMock.mockReset();
});
afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────

describe("maybeFireNoSlotsOutreach", () => {
  const installer = {
    id: 42,
    company_name: "Acme Solar",
    email: "ops@acmesolar.example",
    user_id: "user-1",
  };
  const lead = {
    id: "11111111-2222-3333-4444-555555555555",
    name: "Sarah Jones",
    postcode: "BS1 4DJ",
    analysis_snapshot: {
      selection: { hasHeatPump: true, hasSolar: false, hasBattery: false },
    },
  };

  it("inserts the outreach row + sends an email on the first call", async () => {
    const { admin, insertChain } = buildAdminStub({
      installer,
      installerErr: null,
      homeownerLead: lead,
      homeownerLeadErr: null,
      insert: { id: "outreach-1" },
      insertErr: null,
    });

    const result = await maybeFireNoSlotsOutreach({
      // The helper only treats `admin` as a "from"-able thing.
      admin: admin as unknown as Parameters<typeof maybeFireNoSlotsOutreach>[0]["admin"],
      installerId: installer.id,
      homeownerLeadId: lead.id,
      origin: "https://propertoasty.example",
    });

    expect(result).toEqual({ ok: true, status: "sent", outreachId: "outreach-1" });
    expect(insertChain.insert).toHaveBeenCalledOnce();
    expect(sendEmailMock).toHaveBeenCalledOnce();
    // Subject signals the registered variant (user_id != null).
    const sendArg = sendEmailMock.mock.calls[0][0] as { subject: string };
    expect(sendArg.subject).toMatch(/claim it/i);
  });

  it("returns already_sent + does NOT email on a UNIQUE-constraint conflict", async () => {
    const { admin } = buildAdminStub({
      installer,
      installerErr: null,
      homeownerLead: lead,
      homeownerLeadErr: null,
      insert: null,
      insertErr: { code: "23505", message: 'duplicate key value violates unique constraint "installer_lead_outreach_installer_lead_unique"' },
    });

    const result = await maybeFireNoSlotsOutreach({
      admin: admin as unknown as Parameters<typeof maybeFireNoSlotsOutreach>[0]["admin"],
      installerId: installer.id,
      homeownerLeadId: lead.id,
      origin: "https://propertoasty.example",
    });

    expect(result).toEqual({ ok: true, status: "already_sent" });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("uses the unregistered template variant when installer.user_id is null", async () => {
    const { admin } = buildAdminStub({
      installer: { ...installer, user_id: null },
      installerErr: null,
      homeownerLead: lead,
      homeownerLeadErr: null,
      insert: { id: "outreach-2" },
      insertErr: null,
    });

    const result = await maybeFireNoSlotsOutreach({
      admin: admin as unknown as Parameters<typeof maybeFireNoSlotsOutreach>[0]["admin"],
      installerId: installer.id,
      homeownerLeadId: lead.id,
      origin: "https://propertoasty.example",
    });

    expect(result.ok).toBe(true);
    const sendArg = sendEmailMock.mock.calls[0][0] as { subject: string };
    expect(sendArg.subject).toMatch(/set up free/i);
  });

  it("skips cleanly when the installer has no email on file", async () => {
    const { admin } = buildAdminStub({
      installer: { ...installer, email: null },
      installerErr: null,
      homeownerLead: lead,
      homeownerLeadErr: null,
      insert: null,
      insertErr: null,
    });

    const result = await maybeFireNoSlotsOutreach({
      admin: admin as unknown as Parameters<typeof maybeFireNoSlotsOutreach>[0]["admin"],
      installerId: installer.id,
      homeownerLeadId: lead.id,
      origin: "https://propertoasty.example",
    });

    expect(result).toEqual({
      ok: true,
      status: "skipped",
      reason: "installer has no email on file",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("skips cleanly when the homeowner lead doesn't exist", async () => {
    const { admin } = buildAdminStub({
      installer,
      installerErr: null,
      homeownerLead: null,
      homeownerLeadErr: null,
      insert: null,
      insertErr: null,
    });

    const result = await maybeFireNoSlotsOutreach({
      admin: admin as unknown as Parameters<typeof maybeFireNoSlotsOutreach>[0]["admin"],
      installerId: installer.id,
      homeownerLeadId: "00000000-0000-0000-0000-000000000000",
      origin: "https://propertoasty.example",
    });

    expect(result).toEqual({
      ok: true,
      status: "skipped",
      reason: "homeowner lead not found",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
