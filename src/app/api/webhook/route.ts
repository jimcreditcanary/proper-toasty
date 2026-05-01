import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPack } from "@/lib/billing/credit-packs";

// POST /api/webhook
//
// Stripe webhook handler. We care about two event types:
//
//   checkout.session.completed   →  user-driven credit pack purchase
//                                   (the Stripe Checkout flow).
//                                   Insert audit row, add credits,
//                                   persist customer_id, clear any
//                                   prior auto-recharge failure.
//
//   payment_intent.succeeded     →  off-session auto top-up (C2).
//                                   PaymentIntents from Checkout
//                                   ALSO emit this event, so we
//                                   filter to ones marked with
//                                   metadata.purpose === 'installer_credits_auto'
//                                   to avoid double-crediting.
//
// Idempotency: installer_credit_purchases has unique partial indexes
// on both stripe_session_id and stripe_payment_intent_id. Either is
// enough to dedupe a retry. The route returns 200 on dedup so Stripe
// stops retrying.

export const runtime = "nodejs";
export const maxDuration = 30;

// Raw body needed for Stripe signature verification. Disable Next's
// default body parsing.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verify failed";
    console.error("[webhook] signature verification failed", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[webhook] event received", {
    id: event.id,
    type: event.type,
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    return await handleCheckoutCompleted(session);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    return await handlePaymentIntentSucceeded(intent);
  }

  // Ignore everything else. Returning 200 stops Stripe retrying.
  return NextResponse.json({ received: true, ignored: event.type });
}

// ─── checkout.session.completed (Checkout-driven purchases) ──────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<NextResponse> {
  // Only handle our installer credit purchases. Stripe webhooks are
  // shared across an entire account; if the user runs other products
  // through this Stripe account we don't want to accidentally grant
  // credits.
  const purpose = session.metadata?.purpose;
  if (purpose !== "installer_credits") {
    console.log("[webhook] ignoring checkout — wrong purpose", { purpose });
    return NextResponse.json({ received: true, ignored: "non-credits" });
  }

  const userId = session.metadata?.user_id ?? null;
  const packId = session.metadata?.pack_id ?? null;
  const installerIdRaw = session.metadata?.installer_id ?? null;
  if (!userId || !packId) {
    console.error("[webhook] missing metadata", { userId, packId });
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }
  const pack = findPack(packId);
  if (!pack) {
    console.error("[webhook] unknown pack id", { packId });
    return NextResponse.json({ error: "Unknown pack" }, { status: 400 });
  }

  // Sanity check the amount Stripe actually charged matches our
  // catalogue. If it doesn't, something's gone weird (price drift,
  // tampered checkout). Bail without crediting; the audit row is
  // worth more than the credits.
  const amountPaid = session.amount_total ?? 0;
  if (amountPaid !== pack.pricePence) {
    console.error("[webhook] amount mismatch", {
      packId,
      expected: pack.pricePence,
      actual: amountPaid,
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const installerId =
    installerIdRaw && /^\d+$/.test(installerIdRaw)
      ? Number(installerIdRaw)
      : null;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  const admin = createAdminClient();

  // 1. Insert the audit row (unique index on stripe_session_id is
  //    the idempotency guard).
  const { error: insertErr } = await admin
    .from("installer_credit_purchases")
    .insert({
      user_id: userId,
      installer_id: installerId,
      pack_credits: pack.credits,
      price_pence: pack.pricePence,
      currency: session.currency ?? "gbp",
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status: "completed",
    });

  if (insertErr) {
    if (insertErr.code === "23505") {
      console.log("[webhook] duplicate session — already credited", {
        sessionId: session.id,
      });
      return NextResponse.json({ received: true, dedup: true });
    }
    console.error("[webhook] audit insert failed", insertErr);
    return NextResponse.json(
      { error: "Audit insert failed" },
      { status: 500 },
    );
  }

  // 2. Add credits + persist customer_id + heal any prior auto-recharge
  //    failure flag (a successful manual top-up clears the alarm).
  const { data: profile, error: fetchErr } = await admin
    .from("users")
    .select("credits, stripe_customer_id, auto_recharge_failed_at")
    .eq("id", userId)
    .maybeSingle<{
      credits: number;
      stripe_customer_id: string | null;
      auto_recharge_failed_at: string | null;
    }>();
  if (fetchErr || !profile) {
    console.error("[webhook] user fetch failed", fetchErr);
    return NextResponse.json({ error: "User fetch failed" }, { status: 500 });
  }

  const newBalance = (profile.credits ?? 0) + pack.credits;
  const updatePayload: Record<string, unknown> = { credits: newBalance };

  // Persist customer_id if checkout returned one and we don't have it
  // yet (defensive — ensureStripeCustomer should have set it earlier).
  if (customerId && !profile.stripe_customer_id) {
    updatePayload.stripe_customer_id = customerId;
  }
  // Heal the failure flag — a manual top-up means whatever blocked
  // the off-session recharge is no longer urgent.
  if (profile.auto_recharge_failed_at) {
    updatePayload.auto_recharge_failed_at = null;
    updatePayload.auto_recharge_failure_reason = null;
  }

  const { error: updateErr } = await admin
    .from("users")
    .update(updatePayload)
    .eq("id", userId);
  if (updateErr) {
    console.error("[webhook] credit update failed", updateErr);
    return NextResponse.json(
      { error: "Credit update failed" },
      { status: 500 },
    );
  }

  console.log("[webhook] credited", {
    userId,
    installerId,
    packId,
    creditsAdded: pack.credits,
    newBalance,
  });
  return NextResponse.json({ received: true, credited: pack.credits });
}

// ─── payment_intent.succeeded (off-session auto top-ups) ─────────────

async function handlePaymentIntentSucceeded(
  intent: Stripe.PaymentIntent,
): Promise<NextResponse> {
  // Only the off-session auto-recharge path. PaymentIntents from
  // Checkout also emit this event but we already credit them via
  // checkout.session.completed — filter by the bespoke purpose tag.
  const purpose = intent.metadata?.purpose;
  if (purpose !== "installer_credits_auto") {
    return NextResponse.json({ received: true, ignored: "non-auto" });
  }

  const userId = intent.metadata?.user_id ?? null;
  const packId = intent.metadata?.pack_id ?? null;
  const installerIdRaw = intent.metadata?.installer_id ?? null;
  const attemptId = intent.metadata?.attempt_id ?? null;
  if (!userId || !packId) {
    console.error("[webhook] auto-recharge missing metadata", { userId, packId });
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }
  const pack = findPack(packId);
  if (!pack) {
    console.error("[webhook] auto-recharge unknown pack", { packId });
    return NextResponse.json({ error: "Unknown pack" }, { status: 400 });
  }
  if (intent.amount !== pack.pricePence) {
    console.error("[webhook] auto-recharge amount mismatch", {
      packId,
      expected: pack.pricePence,
      actual: intent.amount,
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const installerId =
    installerIdRaw && /^\d+$/.test(installerIdRaw)
      ? Number(installerIdRaw)
      : null;

  const admin = createAdminClient();

  // 1. Insert audit row, deduped by stripe_payment_intent_id.
  const { error: insertErr } = await admin
    .from("installer_credit_purchases")
    .insert({
      user_id: userId,
      installer_id: installerId,
      pack_credits: pack.credits,
      price_pence: pack.pricePence,
      currency: intent.currency ?? "gbp",
      stripe_session_id: null,
      stripe_payment_intent_id: intent.id,
      status: "completed",
    });
  if (insertErr) {
    if (insertErr.code === "23505") {
      console.log("[webhook] duplicate payment_intent — already credited", {
        paymentIntentId: intent.id,
      });
      return NextResponse.json({ received: true, dedup: true });
    }
    console.error("[webhook] auto-recharge audit insert failed", insertErr);
    return NextResponse.json(
      { error: "Audit insert failed" },
      { status: 500 },
    );
  }

  // 2. Bump credits + clear failure flag.
  const { data: profile, error: fetchErr } = await admin
    .from("users")
    .select("credits, auto_recharge_failed_at")
    .eq("id", userId)
    .maybeSingle<{ credits: number; auto_recharge_failed_at: string | null }>();
  if (fetchErr || !profile) {
    console.error("[webhook] auto-recharge user fetch failed", fetchErr);
    return NextResponse.json({ error: "User fetch failed" }, { status: 500 });
  }
  const newBalance = (profile.credits ?? 0) + pack.credits;
  const updatePayload: Record<string, unknown> = { credits: newBalance };
  if (profile.auto_recharge_failed_at) {
    updatePayload.auto_recharge_failed_at = null;
    updatePayload.auto_recharge_failure_reason = null;
  }
  const { error: updateErr } = await admin
    .from("users")
    .update(updatePayload)
    .eq("id", userId);
  if (updateErr) {
    console.error("[webhook] auto-recharge credit update failed", updateErr);
    return NextResponse.json(
      { error: "Credit update failed" },
      { status: 500 },
    );
  }

  // 3. Mark the recharge attempt row as succeeded so the audit table
  //    matches reality. We persisted it as 'failed' / 'requires_action'
  //    pending the webhook (see auto-recharge.ts for why).
  if (attemptId) {
    await admin
      .from("installer_auto_recharge_attempts")
      .update({ status: "succeeded" })
      .eq("id", attemptId);
  }

  console.log("[webhook] auto-recharge credited", {
    userId,
    installerId,
    packId,
    creditsAdded: pack.credits,
    newBalance,
    attemptId,
  });
  return NextResponse.json({ received: true, credited: pack.credits });
}
