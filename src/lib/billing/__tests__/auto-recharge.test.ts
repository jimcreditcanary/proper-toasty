// Unit tests for the auto-recharge pure functions.
//
// We don't exercise runAutoRecharge end-to-end here — that requires
// a Stripe + Supabase double — but we pin down the two rules that
// matter most for correctness:
//
//   1. shouldRunAutoRecharge — the trigger predicate
//   2. buildAutoRechargePayload — the exact wire shape sent to Stripe
//
// Anything that changes the trigger behaviour or the PaymentIntent
// metadata will fail loudly here.

import { describe, expect, it, vi } from "vitest";

// Stub @/lib/stripe before importing the SUT — the real module
// instantiates a Stripe client at module-eval time, which throws
// when STRIPE_SECRET_KEY isn't set (always the case in unit tests).
vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: { create: vi.fn() },
    customers: { retrieve: vi.fn() },
    paymentMethods: { list: vi.fn() },
  },
}));

import {
  buildAutoRechargePayload,
  DEFAULT_AUTO_RECHARGE_THRESHOLD,
  shouldRunAutoRecharge,
} from "@/lib/billing/auto-recharge";
import { findPack } from "@/lib/billing/credit-packs";

describe("shouldRunAutoRecharge", () => {
  it("returns false when not enabled", () => {
    expect(
      shouldRunAutoRecharge({
        enabled: false,
        balanceAfter: 0,
        threshold: 10,
      }),
    ).toBe(false);
  });

  it("triggers when balance is strictly below threshold", () => {
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: 9,
        threshold: 10,
      }),
    ).toBe(true);
  });

  it("does NOT trigger when balance equals threshold", () => {
    // "drops BELOW 10" semantics — exactly 10 is fine.
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: 10,
        threshold: 10,
      }),
    ).toBe(false);
  });

  it("does NOT trigger when balance is above threshold", () => {
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: 11,
        threshold: 10,
      }),
    ).toBe(false);
  });

  it("triggers at zero credits", () => {
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: 0,
        threshold: 5,
      }),
    ).toBe(true);
  });

  it("triggers below the default when threshold is null (migration 042 row)", () => {
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: DEFAULT_AUTO_RECHARGE_THRESHOLD - 1,
        threshold: null,
      }),
    ).toBe(true);
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: DEFAULT_AUTO_RECHARGE_THRESHOLD,
        threshold: null,
      }),
    ).toBe(false);
  });

  it("honours a per-installer threshold above the default", () => {
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: 30,
        threshold: 50,
      }),
    ).toBe(true);
  });

  it("honours a per-installer threshold below the default", () => {
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: 6,
        threshold: 5,
      }),
    ).toBe(false);
    expect(
      shouldRunAutoRecharge({
        enabled: true,
        balanceAfter: 4,
        threshold: 5,
      }),
    ).toBe(true);
  });
});

describe("buildAutoRechargePayload", () => {
  const pack = findPack("growth");
  if (!pack) throw new Error("growth pack should exist");

  const baseArgs = {
    customerId: "cus_test123",
    paymentMethodId: "pm_test456",
    pack,
    userId: "user-uuid-789",
    installerId: 42 as number | null,
    attemptId: "attempt-uuid-abc",
  };

  it("produces the exact Stripe payload shape", () => {
    const payload = buildAutoRechargePayload(baseArgs);

    // Pinning every field so a stray change to the off-session
    // semantics, currency, or metadata shape is impossible to ship
    // without updating this test.
    expect(payload).toEqual({
      amount: 19500, // growth = £195.00
      currency: "gbp",
      customer: "cus_test123",
      payment_method: "pm_test456",
      off_session: true,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        purpose: "installer_credits_auto",
        user_id: "user-uuid-789",
        pack_id: "growth",
        pack_credits: "100",
        installer_id: "42",
        attempt_id: "attempt-uuid-abc",
      },
      description: "Propertoasty auto top-up — 100 credits (Growth)",
    });
  });

  it("passes the pack price through correctly for every pack", () => {
    for (const p of ["starter", "growth", "scale", "volume"] as const) {
      const pk = findPack(p);
      if (!pk) throw new Error(`missing pack ${p}`);
      const payload = buildAutoRechargePayload({ ...baseArgs, pack: pk });
      expect(payload.amount).toBe(pk.pricePence);
      expect(payload.metadata?.pack_id).toBe(pk.id);
      expect(payload.metadata?.pack_credits).toBe(String(pk.credits));
    }
  });

  it("renders empty installer_id when null (orphan user case)", () => {
    const payload = buildAutoRechargePayload({
      ...baseArgs,
      installerId: null,
    });
    expect(payload.metadata?.installer_id).toBe("");
  });

  it("always uses GBP + off-session true + confirm true", () => {
    const payload = buildAutoRechargePayload(baseArgs);
    expect(payload.currency).toBe("gbp");
    expect(payload.off_session).toBe(true);
    expect(payload.confirm).toBe(true);
  });

  it("uses metadata.purpose 'installer_credits_auto' so the webhook routes to the auto-recharge handler", () => {
    const payload = buildAutoRechargePayload(baseArgs);
    expect(payload.metadata?.purpose).toBe("installer_credits_auto");
  });
});
