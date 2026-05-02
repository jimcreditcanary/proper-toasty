// A5 — Big integration test: full installer happy-path journey.
//
// Exercises every API route the installer touches in sequence
// against the same in-memory store. Each step's assertions check
// both the route's response and the resulting DB state, so wiring
// bugs (lead not attributed, credit not deducted, status not
// flipped) surface here even when the per-route unit tests pass.
//
// Journey:
//   1. Installer signed in with credits
//   2. Send pre-survey request → row + email + credit debit
//   3. Customer lands on /check (no API call here — UI flow)
//   4. Customer completes the check → /api/leads/capture
//      auto-creates installer_lead, marks request completed
//   5. Installer creates a quote draft
//   6. Installer sends the quote → status flips, email out
//   7. Homeowner accepts the quote → status flips, installer
//      notified
//   8. Final assertions: balances, statuses, attributions all
//      consistent

import { describe, expect, it, vi, beforeAll } from "vitest";
import { InMemoryDb } from "@/test-utils/in-memory-supabase";
import { LEAD_ACCEPT_COST_CREDITS } from "@/lib/booking/credits";
import { buildProposalToken } from "@/lib/email/tokens";

// ─── Shared module mocks (module-load time) ────────────────────────

const sendEmailMock = vi.hoisted(() => vi.fn());

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  db: null as InMemoryDb | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => state.db!.adminClient(),
}));
vi.mock("@/lib/email/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/client")>();
  return {
    ...actual,
    sendEmail: sendEmailMock,
  };
});

// Required env vars for the various token signers.
process.env.PRE_SURVEY_TOKEN_SECRET = "x".repeat(32);
process.env.PROPOSAL_TOKEN_SECRET = "y".repeat(32);
process.env.REPORT_TOKEN_SECRET = "z".repeat(32);
process.env.INSTALLER_LEAD_ACK_SECRET = "w".repeat(32);
process.env.NEXT_PUBLIC_APP_URL = "https://test.propertoasty.com";

// Routes under test — dynamic-imported lazily after the mocks
// register, but pinned via top-level imports so the bundler
// resolves the module graph eagerly.
import { POST as preSurveyCreate } from "@/app/api/installer/pre-survey-requests/route";
import { POST as leadCapture } from "@/app/api/leads/capture/route";
import { POST as proposalCreate } from "@/app/api/installer/proposals/route";
import { POST as proposalSend } from "@/app/api/installer/proposals/[id]/send/route";
import { POST as proposalRespond } from "@/app/api/proposals/[token]/respond/route";

// ─── Fixtures ──────────────────────────────────────────────────────

const USER_ID = "8f3c2f3a-1f4b-4c1d-8e5a-1234567890aa";
const INSTALLER_ID = 100;
const STARTING_CREDITS = 30;

function freshDb(): InMemoryDb {
  const db = new InMemoryDb({
    users: [
      {
        id: USER_ID,
        email: "installer@test.com",
        credits: STARTING_CREDITS,
        api_key: null,
        role: "installer",
        blocked: false,
      },
    ],
    installers: [
      {
        id: INSTALLER_ID,
        certification_number: "MCS-12345",
        certification_body: "MCS",
        company_name: "Test Installer Ltd",
        email: "ops@test-installer.com",
        telephone: "+44 1234 567890",
        website: "https://test-installer.com",
        user_id: USER_ID,
        bus_registered: true,
        cap_air_source_heat_pump: true,
        cap_solar_pv: true,
      },
    ],
    installer_leads: [],
    installer_proposals: [],
    installer_pre_survey_requests: [],
    homeowner_leads: [],
    report_tokens: [],
  });

  // DB defaults — mirror what Postgres applies on insert when the
  // route doesn't pass these columns (status, sends_count, etc.).
  db.setDefaults("installer_pre_survey_requests", {
    status: "pending",
    sends_count: 1,
    last_sent_at: new Date().toISOString(),
    total_credits_charged: 1,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  db.setDefaults("installer_proposals", {
    status: "draft",
    line_items: [],
    cover_message: null,
    vat_rate_bps: 0,
    subtotal_pence: 0,
    vat_pence: 0,
    total_pence: 0,
    homeowner_messages: [],
  });
  db.setDefaults("installer_leads", {
    status: "new",
    notification_status: "pending",
    wants_heat_pump: false,
    wants_solar: false,
    wants_battery: false,
  });
  db.setDefaults("homeowner_leads", {
    user_type: "homeowner",
    source: "check_flow",
    consent_marketing: false,
    consent_installer_matching: false,
  });

  // RPC: deduct_credits — atomic check-then-subtract on users.credits
  db.registerRpc("deduct_credits", ({ p_user_id, p_count }, store) => {
    const user = store.tables.users.find((u) => u.id === p_user_id);
    if (!user) return { data: false, error: null };
    const balance = user.credits as number;
    if (balance < (p_count as number)) return { data: false, error: null };
    user.credits = balance - (p_count as number);
    return { data: true, error: null };
  });

  // Auth user lookup needed by resolveInstallerNotifyEmail's fallback.
  db.registerAuthUser({
    id: USER_ID,
    email: "installer@test.com",
  });

  return db;
}

// ─── The journey ───────────────────────────────────────────────────

describe("Installer happy-path journey (A5)", () => {
  beforeAll(() => {
    sendEmailMock.mockReset();
    sendEmailMock.mockImplementation(async () => ({ ok: true, id: "msg-1" }));
  });

  it("walks the full pre-survey → quote → accept loop", async () => {
    state.db = freshDb();
    state.user = { id: USER_ID, email: "installer@test.com" };

    // ── 1. Send a pre-survey request ────────────────────────────
    const preSurveyRes = await preSurveyCreate(
      new Request("http://localhost/api/installer/pre-survey-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contact_name: "Sam Patel",
          contact_email: "sam@example.com",
          contact_postcode: "SW1A 1AA",
        }),
      }),
    );
    expect(preSurveyRes.status).toBe(200);
    const preSurveyBody = await preSurveyRes.json();
    expect(preSurveyBody.ok).toBe(true);
    const preSurveyId = preSurveyBody.id as string;

    // Credit was debited
    const userAfterSend = state.db.rowsIn("users")[0];
    expect(userAfterSend.credits).toBe(STARTING_CREDITS - 1);

    // Request row was inserted with the right fields
    const psrRow = state.db.rowsIn("installer_pre_survey_requests")[0];
    expect(psrRow.id).toBe(preSurveyId);
    expect(psrRow.installer_id).toBe(INSTALLER_ID);
    expect(psrRow.contact_email).toBe("sam@example.com");
    expect(psrRow.status).toBe("pending");

    // Email out (homeowner gets a personalised /check link)
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sentToHomeowner = sendEmailMock.mock.calls[0][0];
    expect(sentToHomeowner.to).toBe("sam@example.com");

    sendEmailMock.mockClear();

    // ── 2. Customer completes the check ─────────────────────────
    // We simulate this by calling /api/leads/capture with the
    // presurvey id (the wizard would normally forward this from
    // its initialState). Auth is NOT required for this route.
    state.user = null;
    const captureRes = await leadCapture(
      new Request("http://localhost/api/leads/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "sam@example.com",
          name: "Sam Patel",
          phone: null,
          address: "1 Acacia Avenue, London SW1A 1AA",
          postcode: "SW1A 1AA",
          uprn: "100012345",
          latitude: 51.501,
          longitude: -0.142,
          consentMarketing: false,
          consentInstallerMatching: true,
          analysisSnapshot: { analysis: { suitability: "good" } },
          preSurveyRequestId: preSurveyId,
        }),
      }),
    );
    expect(captureRes.status).toBe(200);
    const captureBody = await captureRes.json();
    expect(captureBody.ok).toBe(true);

    // Homeowner lead created
    const homeownerLeads = state.db.rowsIn("homeowner_leads");
    expect(homeownerLeads.length).toBe(1);
    expect(homeownerLeads[0].email).toBe("sam@example.com");

    // Installer lead auto-created + acknowledged + attributed
    const installerLeads = state.db.rowsIn("installer_leads");
    expect(installerLeads.length).toBe(1);
    const lead = installerLeads[0];
    expect(lead.installer_id).toBe(INSTALLER_ID);
    expect(lead.pre_survey_request_id).toBe(preSurveyId);
    expect(lead.status).toBe("installer_acknowledged");
    expect(lead.installer_acknowledged_at).toBeTruthy();

    // PSR flipped to completed + cross-linked
    const psrAfter = state.db.rowsIn("installer_pre_survey_requests")[0];
    expect(psrAfter.status).toBe("completed");
    expect(psrAfter.completed_at).toBeTruthy();
    expect(psrAfter.result_installer_lead_id).toBe(lead.id);

    const installerLeadId = lead.id as string;

    // ── 3. Installer creates a quote draft ───────────────────────
    state.user = { id: USER_ID, email: "installer@test.com" };

    const draftRes = await proposalCreate(
      new Request("http://localhost/api/installer/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          installer_lead_id: installerLeadId,
          line_items: [
            {
              id: "row-1",
              description: "Air-source heat pump (8kW)",
              quantity: 1,
              unit_price_pence: 800_000,
              category: "heat_pump",
              is_bus_grant: false,
            },
            {
              id: "row-2",
              description: "Hot water cylinder",
              quantity: 1,
              unit_price_pence: 150_000,
              category: "heat_pump",
              is_bus_grant: false,
            },
            {
              id: "row-3",
              description: "BUS grant",
              quantity: 1,
              unit_price_pence: -750_000,
              category: "heat_pump",
              is_bus_grant: true,
            },
          ],
          cover_message: "Quote following our visit on Tuesday.",
          vat_rate_bps: 0,
        }),
      }),
    );
    expect(draftRes.status).toBe(200);
    const draftBody = await draftRes.json();
    expect(draftBody.ok).toBe(true);
    const proposalId = draftBody.id as string;
    const homeownerToken = draftBody.homeownerToken as string;

    // Verify totals were computed correctly: items £9,500, BUS
    // grant -£7,500 → total £2,000 (200_000 pence)
    const proposalRow = state.db.rowsIn("installer_proposals")[0];
    expect(proposalRow.subtotal_pence).toBe(200_000);
    expect(proposalRow.total_pence).toBe(200_000);
    expect(proposalRow.status).toBe("draft");

    // ── 4. Installer sends the quote ───────────────────────────
    sendEmailMock.mockClear();
    const sendRes = await proposalSend(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: proposalId }),
    });
    expect(sendRes.status).toBe(200);

    // Status flipped + sent_at stamped
    const proposalAfterSend = state.db.rowsIn("installer_proposals")[0];
    expect(proposalAfterSend.status).toBe("sent");
    expect(proposalAfterSend.sent_at).toBeTruthy();

    // Homeowner email out
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sentToHomeowner2 = sendEmailMock.mock.calls[0][0];
    expect(sentToHomeowner2.to).toBe("sam@example.com");
    expect(sentToHomeowner2.subject).toMatch(/quote/i);

    // ── 5. Homeowner accepts the quote ─────────────────────────
    sendEmailMock.mockClear();
    const respondRes = await proposalRespond(
      new Request(
        `http://localhost/api/proposals/${homeownerToken}/respond`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision: "accepted" }),
        },
      ),
      { params: Promise.resolve({ token: homeownerToken }) },
    );
    expect(respondRes.status).toBe(200);
    const respondBody = await respondRes.json();
    expect(respondBody.ok).toBe(true);
    expect(respondBody.status).toBe("accepted");

    // Status flipped to accepted
    const proposalAfterAccept = state.db.rowsIn("installer_proposals")[0];
    expect(proposalAfterAccept.status).toBe("accepted");
    expect(proposalAfterAccept.accepted_at).toBeTruthy();

    // Installer notified by email
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sentToInstaller = sendEmailMock.mock.calls[0][0];
    expect(sentToInstaller.to).toBe("ops@test-installer.com");
    expect(sentToInstaller.subject).toMatch(/accepted/i);

    // ── 6. Final consistency assertions ────────────────────────
    // Net result of the journey:
    //   - 1 credit spent on the pre-survey send
    //   - 0 extra credits for the auto-acknowledged lead (vs the
    //     5 credits a directory accept would cost)
    //   - 1 quote sent + accepted
    const finalUser = state.db.rowsIn("users")[0];
    expect(finalUser.credits).toBe(STARTING_CREDITS - 1);

    // Pre-survey-attributed leads should NOT debit the
    // LEAD_ACCEPT_COST_CREDITS — that's the whole point of the
    // auto-ack path. Belt + braces:
    expect(finalUser.credits).toBeGreaterThan(
      STARTING_CREDITS - 1 - LEAD_ACCEPT_COST_CREDITS,
    );

    // Idempotent re-accept doesn't fire a second email
    sendEmailMock.mockClear();
    const reAcceptRes = await proposalRespond(
      new Request(
        `http://localhost/api/proposals/${homeownerToken}/respond`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision: "accepted" }),
        },
      ),
      { params: Promise.resolve({ token: homeownerToken }) },
    );
    expect(reAcceptRes.status).toBe(200);
    // Already-accepted short-circuit: returns the same status
    // without firing another notification email.
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  // ─── A second journey: token tampering can't impersonate ──────

  it("rejects a forged proposal-response token", async () => {
    state.db = freshDb();
    state.user = null;

    // Mint a token for a real proposal id, then strip the signature.
    const realToken = buildProposalToken(
      "8f3c2f3a-1f4b-4c1d-8e5a-1234567890ab",
    );
    const [compactId] = realToken.split(".");
    const forged = `${compactId}.${"0".repeat(64)}`;

    const res = await proposalRespond(
      new Request(`http://localhost/api/proposals/${forged}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "accepted" }),
      }),
      { params: Promise.resolve({ token: forged }) },
    );
    expect(res.status).toBe(404);
  });
});
