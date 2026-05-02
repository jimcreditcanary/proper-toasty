import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPack, type CreditPack } from "@/lib/billing/credit-packs";
import { buildEnableToken } from "@/lib/billing/enable-token";
import { sendEmail } from "@/lib/email/client";
import { buildPurchaseConfirmedEmail } from "@/lib/email/templates/installer-purchase-confirmed";
import { buildEnableAutoTopUpEmail } from "@/lib/email/templates/installer-enable-auto-topup";
import { buildAutoRechargeConfirmedEmail } from "@/lib/email/templates/installer-auto-recharge-confirmed";
import { track } from "@/lib/analytics";

// POST /api/webhook
//
// Stripe webhook handler. We care about two event types:
//
//   checkout.session.completed   →  user-driven credit pack purchase
//                                   (the Stripe Checkout flow).
//                                   Insert audit row, add credits,
//                                   persist customer_id, clear any
//                                   prior auto-recharge failure,
//                                   send the receipt email + (on
//                                   first-ever purchase) the auto
//                                   top-up nudge email.
//
//   payment_intent.succeeded     →  off-session auto top-up (C2).
//                                   PaymentIntents from Checkout
//                                   ALSO emit this event, so we
//                                   filter to ones marked with
//                                   metadata.purpose === 'installer_credits_auto'
//                                   to avoid double-crediting.
//                                   Sends the auto-recharge
//                                   confirmation email.
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

  // Stripe-hosted receipt URL — best-effort fetch from the underlying
  // charge. Failures are non-fatal; the user still gets the credits
  // and the email just omits the download link.
  const receiptUrl = paymentIntentId
    ? await fetchReceiptUrl(paymentIntentId)
    : null;

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
      stripe_receipt_url: receiptUrl,
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
    .select(
      "email, credits, stripe_customer_id, auto_recharge_failed_at, auto_recharge_pack_id",
    )
    .eq("id", userId)
    .maybeSingle<{
      email: string;
      credits: number;
      stripe_customer_id: string | null;
      auto_recharge_failed_at: string | null;
      auto_recharge_pack_id: string | null;
    }>();
  if (fetchErr || !profile) {
    console.error("[webhook] user fetch failed", fetchErr);
    return NextResponse.json({ error: "User fetch failed" }, { status: 500 });
  }

  const newBalance = (profile.credits ?? 0) + pack.credits;
  const updatePayload: Record<string, unknown> = { credits: newBalance };

  if (customerId && !profile.stripe_customer_id) {
    updatePayload.stripe_customer_id = customerId;
  }
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

  // 3. Detect "first ever purchase" by counting installer_credit_purchases
  //    for this user. Exact count of 1 means the row we just inserted is
  //    the only one. We send the auto-top-up nudge email in that case.
  const { count: purchaseCount } = await admin
    .from("installer_credit_purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const isFirstPurchase = (purchaseCount ?? 0) === 1;

  // 4. Send the receipt confirmation email + (first purchase only +
  //    auto-recharge not already on) the nudge email. Soft-fail.
  await sendCheckoutEmails({
    userId,
    email: profile.email,
    pack,
    newBalance,
    receiptUrl,
    isFirstPurchase: isFirstPurchase && !profile.auto_recharge_pack_id,
  });

  // Revenue analytics — pack + price as event properties so the
  // funnel chart can show £/credit + most-popular pack.
  track("installer_credits_purchased", {
    props: {
      pack_credits: pack.credits,
      price_pence: pack.pricePence,
      method: "checkout",
    },
    userId,
  });

  return NextResponse.json({ received: true, credited: pack.credits });
}

// ─── payment_intent.succeeded (off-session auto top-ups) ─────────────

async function handlePaymentIntentSucceeded(
  intent: Stripe.PaymentIntent,
): Promise<NextResponse> {
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

  const receiptUrl = await fetchReceiptUrl(intent.id);
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
      stripe_receipt_url: receiptUrl,
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
    .select("email, credits, auto_recharge_failed_at")
    .eq("id", userId)
    .maybeSingle<{
      email: string;
      credits: number;
      auto_recharge_failed_at: string | null;
    }>();
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

  // 3. Send the auto-recharge confirmation email. Soft-fail.
  try {
    const email = buildAutoRechargeConfirmedEmail({
      contactName: null,
      packLabel: pack.label,
      packCredits: pack.credits,
      pricePence: pack.pricePence,
      newBalance,
      receiptUrl,
      creditsPortalUrl: `${normalisedBase()}/installer/credits`,
    });
    const result = await sendEmail({
      to: profile.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "kind", value: "installer_auto_recharge_confirmed" },
        { name: "user_id", value: userId },
      ],
    });
    console.log("[webhook] auto-recharge confirmation email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  } catch (e) {
    console.warn(
      "[webhook] auto-recharge confirmation email failed",
      e instanceof Error ? e.message : e,
    );
  }

  // Same revenue event as the Checkout path; method tag lets us
  // segment auto-topup vs manual purchases in PostHog.
  track("installer_credits_purchased", {
    props: {
      pack_credits: pack.credits,
      price_pence: pack.pricePence,
      method: "auto_topup",
    },
    userId,
  });

  return NextResponse.json({ received: true, credited: pack.credits });
}

// ─── Helpers ────────────────────────────────────────────────────────

// Fetch the Stripe-hosted receipt URL for the underlying Charge.
// Both Checkout and off-session PaymentIntents end up with a Charge;
// the URL lives on `charge.receipt_url`. Best-effort: returns null
// on any failure rather than blowing up the webhook.
async function fetchReceiptUrl(
  paymentIntentId: string,
): Promise<string | null> {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeRef = intent.latest_charge;
    const chargeId = typeof chargeRef === "string" ? chargeRef : chargeRef?.id;
    if (!chargeId) return null;
    const charge = await stripe.charges.retrieve(chargeId);
    return charge.receipt_url ?? null;
  } catch (e) {
    console.warn(
      "[webhook] fetchReceiptUrl failed",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

async function sendCheckoutEmails(args: {
  userId: string;
  email: string;
  pack: CreditPack;
  newBalance: number;
  receiptUrl: string | null;
  isFirstPurchase: boolean;
}): Promise<void> {
  const creditsPortalUrl = `${normalisedBase()}/installer/credits`;

  // Receipt confirmation — every successful manual purchase.
  try {
    const email = buildPurchaseConfirmedEmail({
      contactName: null,
      packLabel: args.pack.label,
      packCredits: args.pack.credits,
      pricePence: args.pack.pricePence,
      newBalance: args.newBalance,
      receiptUrl: args.receiptUrl,
      creditsPortalUrl,
    });
    const result = await sendEmail({
      to: args.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "kind", value: "installer_purchase_confirmed" },
        { name: "user_id", value: args.userId },
      ],
    });
    console.log("[webhook] purchase confirmation email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  } catch (e) {
    console.warn(
      "[webhook] purchase confirmation email failed",
      e instanceof Error ? e.message : e,
    );
  }

  // First-purchase auto top-up nudge — only on the user's first ever
  // purchase AND only if auto top-up isn't already on.
  if (!args.isFirstPurchase) return;

  try {
    let enableUrl: string;
    try {
      const token = buildEnableToken(args.userId, args.pack.id);
      enableUrl = `${normalisedBase()}/api/installer/credits/auto-recharge/enable?token=${encodeURIComponent(token)}`;
    } catch (e) {
      // Missing INSTALLER_AUTO_TOPUP_SECRET — skip the nudge rather
      // than send a broken link.
      console.warn(
        "[webhook] enable token build failed — skipping nudge email",
        e instanceof Error ? e.message : e,
      );
      return;
    }

    const email = buildEnableAutoTopUpEmail({
      contactName: null,
      packLabel: args.pack.label,
      packCredits: args.pack.credits,
      enableUrl,
      creditsPortalUrl,
    });
    const result = await sendEmail({
      to: args.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [
        { name: "kind", value: "installer_enable_auto_topup" },
        { name: "user_id", value: args.userId },
      ],
    });
    console.log("[webhook] auto-topup nudge email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  } catch (e) {
    console.warn(
      "[webhook] auto-topup nudge email failed",
      e instanceof Error ? e.message : e,
    );
  }
}

function normalisedBase(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://propertoasty.com";
  const url = base.startsWith("http") ? base : `https://${base}`;
  return url.replace(/\/+$/, "");
}
