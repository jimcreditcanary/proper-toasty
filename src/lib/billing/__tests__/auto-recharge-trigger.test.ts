// Integration-style tests for maybeRunAutoRecharge.
//
// Mocks both Stripe and Supabase so we can pin down:
//
//   - Trigger fires off-session PaymentIntent when balance < threshold
//   - Payload sent to Stripe matches buildAutoRechargePayload's shape
//   - A declined card (off_session=true → StripeCardError) writes a
//     'failed' audit row, sets auto_recharge_enabled = false, and
//     sends an installer email
//   - No trigger when balance >= threshold
//   - No trigger when enabled = false
//
// We don't test the webhook path (payment_intent.succeeded flips
// the audit row to 'succeeded' + credits the user) — that's owned
// by the webhook handler's own tests.

import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Stripe mock ───────────────────────────────────────────────────
//
// We control stripe.paymentIntents.create to return either a
// successful PI or throw a StripeCardError shape so the decline
// branch fires. Use vi.hoisted so the mock factory can reach these
// — vi.mock is hoisted above all `const` declarations.

const stripeMocks = vi.hoisted(() => ({
  paymentIntentsCreate: vi.fn(),
  customersRetrieve: vi.fn(),
  paymentMethodsList: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: { create: stripeMocks.paymentIntentsCreate },
    customers: { retrieve: stripeMocks.customersRetrieve },
    paymentMethods: { list: stripeMocks.paymentMethodsList },
  },
}));

const { paymentIntentsCreate, customersRetrieve, paymentMethodsList } =
  stripeMocks;

// ─── Email mock ────────────────────────────────────────────────────
//
// The decline email template (installer-auto-recharge-failed.ts)
// imports `escapeHtml` from the same module as `sendEmail`. We
// have to re-export it (with a passthrough implementation) so the
// template module loads.
const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: "email-id" })),
}));
vi.mock("@/lib/email/client", () => ({
  sendEmail: emailMocks.sendEmail,
  escapeHtml: (s: string | null | undefined) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;"),
}));
const { sendEmail } = emailMocks;

// Now import the SUT after mocks are wired.
import { maybeRunAutoRecharge } from "@/lib/billing/auto-recharge";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ─── Tiny ad-hoc Supabase mock ─────────────────────────────────────
//
// We build a per-table queue specifically for the read paths the
// trigger uses, plus a recorder for inserts/updates so tests can
// assert on what was written.

interface FakeAdminOpts {
  // Sequence of responses for users.select().eq().maybeSingle()
  userProfile?: unknown;
  installerLookup?: { id: number } | null;
  attemptInsertResponse?: {
    data?: { id: string } | null;
    error?: { message: string } | null;
  };
}

interface CaptureLog {
  inserts: Array<{ table: string; row: unknown }>;
  updates: Array<{ table: string; patch: unknown }>;
}

function buildFakeAdmin(
  opts: FakeAdminOpts,
): { admin: SupabaseClient<Database>; log: CaptureLog } {
  const log: CaptureLog = { inserts: [], updates: [] };

  const tableChain = (table: string) => {
    let pendingInsert: unknown = null;
    let pendingUpdate: unknown = null;

    const chain: Record<string, unknown> = {};
    const ret = () => chain;

    chain.select = ret;
    chain.eq = ret;
    chain.order = ret;
    chain.limit = ret;
    chain.is = ret;

    chain.insert = (row: unknown) => {
      pendingInsert = row;
      return chain;
    };
    chain.update = (patch: unknown) => {
      pendingUpdate = patch;
      return chain;
    };
    chain.maybeSingle = () => {
      // Reads
      if (table === "users") {
        return Promise.resolve({
          data: opts.userProfile ?? null,
          error: null,
        });
      }
      if (table === "installers") {
        return Promise.resolve({
          data: opts.installerLookup ?? null,
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    };
    chain.single = () => {
      // Used by the insert chain on installer_auto_recharge_attempts.
      if (pendingInsert && table === "installer_auto_recharge_attempts") {
        log.inserts.push({ table, row: pendingInsert });
        return Promise.resolve(
          opts.attemptInsertResponse ?? {
            data: { id: "fake-attempt-id" },
            error: null,
          },
        );
      }
      return Promise.resolve({ data: null, error: null });
    };

    // For updates without .select().single(), Supabase returns a thenable.
    chain.then = (onFulfilled: (v: { error: null }) => unknown) => {
      if (pendingInsert) {
        log.inserts.push({ table, row: pendingInsert });
      }
      if (pendingUpdate) {
        log.updates.push({ table, patch: pendingUpdate });
      }
      return Promise.resolve({ error: null }).then(onFulfilled);
    };

    return chain;
  };

  const admin = {
    from: (table: string) => tableChain(table),
  } as unknown as SupabaseClient<Database>;

  return { admin, log };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Sensible defaults — overridden per test.
  customersRetrieve.mockResolvedValue({
    id: "cus_test",
    deleted: false,
    invoice_settings: { default_payment_method: "pm_test" },
  });
  paymentMethodsList.mockResolvedValue({ data: [{ id: "pm_test" }] });
});

const PROFILE_BASE = {
  id: "user-123",
  email: "installer@example.com",
  stripe_customer_id: "cus_test",
  stripe_default_payment_method_id: "pm_test",
  auto_recharge_pack_id: "growth" as const,
  auto_recharge_enabled: true,
  auto_recharge_threshold_credits: 10,
  auto_recharge_failed_at: null,
};

describe("maybeRunAutoRecharge", () => {
  it("does NOT trigger when balance is at or above threshold", async () => {
    const { admin, log } = buildFakeAdmin({ userProfile: PROFILE_BASE });

    await maybeRunAutoRecharge({
      admin,
      userId: "user-123",
      balanceAfter: 10, // equal to threshold = no trigger
    });

    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(log.inserts).toEqual([]);
  });

  it("does NOT trigger when disabled, even at zero balance", async () => {
    const { admin, log } = buildFakeAdmin({
      userProfile: { ...PROFILE_BASE, auto_recharge_enabled: false },
    });

    await maybeRunAutoRecharge({
      admin,
      userId: "user-123",
      balanceAfter: 0,
    });

    expect(paymentIntentsCreate).not.toHaveBeenCalled();
    expect(log.inserts).toEqual([]);
  });

  it("fires off-session PaymentIntent with the right payload on a balance drop", async () => {
    const { admin, log } = buildFakeAdmin({
      userProfile: PROFILE_BASE,
      installerLookup: { id: 42 },
      attemptInsertResponse: {
        data: { id: "attempt-xyz" },
        error: null,
      },
    });
    paymentIntentsCreate.mockResolvedValue({
      id: "pi_test_success",
      status: "succeeded",
    });

    await maybeRunAutoRecharge({
      admin,
      userId: "user-123",
      balanceAfter: 5, // strictly below 10
    });

    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
    const payload = paymentIntentsCreate.mock.calls[0][0];
    expect(payload).toMatchObject({
      amount: 19500, // growth
      currency: "gbp",
      customer: "cus_test",
      payment_method: "pm_test",
      off_session: true,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        purpose: "installer_credits_auto",
        user_id: "user-123",
        pack_id: "growth",
        pack_credits: "100",
        installer_id: "42",
        attempt_id: "attempt-xyz",
      },
    });

    // Attempt row recorded as 'failed' optimistically — flipped by
    // the webhook on success.
    const attemptInsert = log.inserts.find(
      (i) => i.table === "installer_auto_recharge_attempts",
    );
    expect(attemptInsert).toBeDefined();
    expect(attemptInsert!.row).toMatchObject({
      user_id: "user-123",
      installer_id: 42,
      pack_id: "growth",
      pack_credits: 100,
      price_pence: 19500,
      status: "failed",
      balance_at_trigger: 5,
    });

    // PaymentIntent id stamped back onto the attempt row.
    const piUpdate = log.updates.find(
      (u) =>
        u.table === "installer_auto_recharge_attempts" &&
        typeof u.patch === "object" &&
        u.patch !== null &&
        "stripe_payment_intent_id" in u.patch,
    );
    expect(piUpdate).toBeDefined();
  });

  it("uses the per-installer threshold over the default", async () => {
    const { admin } = buildFakeAdmin({
      userProfile: {
        ...PROFILE_BASE,
        auto_recharge_threshold_credits: 25,
      },
      installerLookup: { id: 42 },
      attemptInsertResponse: { data: { id: "att-1" }, error: null },
    });
    paymentIntentsCreate.mockResolvedValue({
      id: "pi_test",
      status: "succeeded",
    });

    // 20 < 25 → should trigger even though >10 (default).
    await maybeRunAutoRecharge({
      admin,
      userId: "user-123",
      balanceAfter: 20,
    });

    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
  });

  it("handles a declined card by recording failure + disabling auto + emailing the installer", async () => {
    const { admin, log } = buildFakeAdmin({
      userProfile: PROFILE_BASE,
      installerLookup: { id: 42 },
      attemptInsertResponse: { data: { id: "att-decline" }, error: null },
    });

    // Stripe throws a card_declined error for off-session
    // (replicates test card 4000 0000 0000 9995).
    const declineErr = Object.assign(
      new Error("Your card was declined."),
      {
        code: "card_declined",
        decline_code: "generic_decline",
        payment_intent: {
          id: "pi_declined",
          status: "requires_payment_method",
        },
      },
    );
    paymentIntentsCreate.mockRejectedValue(declineErr);

    await maybeRunAutoRecharge({
      admin,
      userId: "user-123",
      balanceAfter: 5,
    });

    // Attempt row stays 'failed' but gets a failure_code stamped.
    const attemptUpdate = log.updates.find(
      (u) =>
        u.table === "installer_auto_recharge_attempts" &&
        typeof u.patch === "object" &&
        u.patch !== null &&
        "failure_code" in u.patch,
    );
    expect(attemptUpdate).toBeDefined();
    expect(attemptUpdate!.patch).toMatchObject({
      status: "failed",
      failure_code: "generic_decline",
      stripe_payment_intent_id: "pi_declined",
    });

    // User row flips auto_recharge_enabled = false + records reason.
    const userUpdate = log.updates.find(
      (u) =>
        u.table === "users" &&
        typeof u.patch === "object" &&
        u.patch !== null &&
        "auto_recharge_enabled" in u.patch,
    );
    expect(userUpdate).toBeDefined();
    expect(userUpdate!.patch).toMatchObject({
      auto_recharge_enabled: false,
      auto_recharge_failure_reason: expect.stringContaining("declined"),
    });

    // Installer notified by email.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCalls = sendEmail.mock.calls as unknown as Array<[{ to: string }]>;
    const emailArgs = emailCalls[0][0];
    expect(emailArgs.to).toBe("installer@example.com");
  });

  it("treats authentication_required (3DS) as requires_action, not failed", async () => {
    const { admin, log } = buildFakeAdmin({
      userProfile: PROFILE_BASE,
      installerLookup: { id: 42 },
      attemptInsertResponse: { data: { id: "att-3ds" }, error: null },
    });

    const authErr = Object.assign(
      new Error("Your card requires authentication."),
      {
        code: "authentication_required",
        payment_intent: {
          id: "pi_3ds",
          status: "requires_action",
        },
      },
    );
    paymentIntentsCreate.mockRejectedValue(authErr);

    await maybeRunAutoRecharge({
      admin,
      userId: "user-123",
      balanceAfter: 5,
    });

    const attemptUpdate = log.updates.find(
      (u) =>
        u.table === "installer_auto_recharge_attempts" &&
        typeof u.patch === "object" &&
        u.patch !== null &&
        "status" in u.patch &&
        (u.patch as { status: string }).status === "requires_action",
    );
    expect(attemptUpdate).toBeDefined();
  });
});
