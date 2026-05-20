// POST /api/installer/onboarding/card/confirm
//
// Called by the client after Stripe Elements confirms a SetupIntent
// successfully. We re-fetch the SetupIntent from Stripe (so the
// browser can't lie about success), verify the PaymentMethod is
// attached, persist the default payment method, optionally enable
// auto-recharge per the user's onboarding choice, stamp the
// milestone + grant credits.
//
// Body:
//   { setupIntentId: string,
//     autoRecharge?:
//        | { mode: "auto", packId, thresholdCredits }
//        | { mode: "manual" }
//   }
//
// "manual" leaves auto_recharge_enabled at the default (false) so
// the card is saved but never charged automatically — matches the
// "Manual top-up only" mode from the F spec.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { findPack } from "@/lib/billing/credit-packs";
import { grantOnboardingStep } from "@/lib/outreach/onboarding";

export const runtime = "nodejs";

const PackIdSchema = z.enum(["starter", "growth", "scale", "volume"]);

const AutoRechargeSchema = z
  .discriminatedUnion("mode", [
    z.object({
      mode: z.literal("auto"),
      packId: PackIdSchema,
      thresholdCredits: z.number().int().min(1),
    }),
    z.object({ mode: z.literal("manual") }),
  ])
  .optional();

const RequestSchema = z.object({
  setupIntentId: z.string().min(1),
  autoRecharge: AutoRechargeSchema,
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number }>();
  if (!installer) {
    return NextResponse.json(
      { ok: false, error: "No installer bound to this account" },
      { status: 403 },
    );
  }

  // Re-fetch from Stripe to verify the success. Defends against a
  // forged confirm call where the browser claims success without
  // a real SetupIntent.
  let intent;
  try {
    intent = await stripe.setupIntents.retrieve(parsed.data.setupIntentId);
  } catch (e) {
    console.error("[onboarding/card/confirm] retrieve failed", e);
    return NextResponse.json(
      { ok: false, error: "Couldn't verify SetupIntent" },
      { status: 502 },
    );
  }

  if (intent.status !== "succeeded") {
    return NextResponse.json(
      {
        ok: false,
        error: `SetupIntent status is ${intent.status} — not succeeded`,
      },
      { status: 400 },
    );
  }
  if (!intent.payment_method) {
    return NextResponse.json(
      { ok: false, error: "SetupIntent has no PaymentMethod" },
      { status: 400 },
    );
  }

  // Verify the intent is for THIS user's customer — defends
  // against an attacker passing a SetupIntent belonging to a
  // different account.
  const expectedCustomer = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (
    !expectedCustomer.data?.stripe_customer_id ||
    intent.customer !== expectedCustomer.data.stripe_customer_id
  ) {
    return NextResponse.json(
      { ok: false, error: "SetupIntent does not belong to this account" },
      { status: 403 },
    );
  }

  // Stash the PaymentMethod id on the user row + on the Stripe
  // Customer's invoice_settings.default_payment_method so future
  // off-session charges + future Checkout sessions both find it.
  const paymentMethodId =
    typeof intent.payment_method === "string"
      ? intent.payment_method
      : intent.payment_method.id;

  try {
    await stripe.customers.update(expectedCustomer.data.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  } catch (e) {
    console.warn(
      "[onboarding/card/confirm] customer default update failed",
      e instanceof Error ? e.message : e,
    );
    // Soft-fail — we still cache the id on our row, and the
    // auto-recharge trigger has a Stripe-side fallback.
  }

  // Apply onboarding-time auto-recharge choice + cache the default
  // payment method id on our row. All in one update to keep the
  // user row consistent.
  const userUpdate: Record<string, unknown> = {
    stripe_default_payment_method_id: paymentMethodId,
    // Clear any prior failure flag — the user just saved a fresh
    // card so any stale "card declined" banner should clear.
    auto_recharge_failed_at: null,
    auto_recharge_failure_reason: null,
  };

  if (parsed.data.autoRecharge?.mode === "auto") {
    const pack = findPack(parsed.data.autoRecharge.packId);
    if (!pack) {
      return NextResponse.json(
        { ok: false, error: "Unknown pack" },
        { status: 400 },
      );
    }
    userUpdate.auto_recharge_enabled = true;
    userUpdate.auto_recharge_pack_id = pack.id;
    userUpdate.auto_recharge_threshold_credits =
      parsed.data.autoRecharge.thresholdCredits;
  } else if (parsed.data.autoRecharge?.mode === "manual") {
    userUpdate.auto_recharge_enabled = false;
  }

  const { error: updateErr } = await admin
    .from("users")
    .update(userUpdate)
    .eq("id", user.id);
  if (updateErr) {
    console.error("[onboarding/card/confirm] user update failed", updateErr);
    return NextResponse.json(
      { ok: false, error: "Couldn't persist card settings" },
      { status: 500 },
    );
  }

  const grant = await grantOnboardingStep(admin, {
    userId: user.id,
    installerId: installer.id,
    step: "card",
  });

  console.log("[onboarding/card/confirm] success", {
    userId: user.id,
    installerId: installer.id,
    autoRechargeMode: parsed.data.autoRecharge?.mode ?? "none",
    creditsGranted: grant.creditsGranted,
  });

  return NextResponse.json({
    ok: true,
    creditsGranted: grant.creditsGranted,
    newBalance: grant.newBalance,
  });
}
