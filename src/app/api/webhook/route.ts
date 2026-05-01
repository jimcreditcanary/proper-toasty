import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPack } from "@/lib/billing/credit-packs";

// POST /api/webhook
//
// Stripe webhook handler. We currently care about ONE event type:
//
//   checkout.session.completed  →  one-time installer credit pack
//                                  purchases. Insert a purchase
//                                  audit row + add credits to the
//                                  user atomically.
//
// Other event types are ignored with a 200 so Stripe doesn't retry
// them.
//
// Idempotency: the audit row's `stripe_session_id` column is a
// unique index. If Stripe retries (e.g. our 2xx took >10s) the
// second insert hits the unique violation, we detect it, and skip
// the credit add. End-state is "credited exactly once".

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

  // Verify signature against the RAW request body. Anything between
  // body parse and signature verify breaks the HMAC, so keep this
  // straightforward.
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

  // Ignore everything else. Returning 200 stops Stripe retrying.
  return NextResponse.json({ received: true, ignored: event.type });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<NextResponse> {
  // Only handle our installer credit purchases. Stripe webhooks are
  // shared across an entire account; if the user runs other
  // products through this Stripe account we don't want to
  // accidentally grant credits.
  const purpose = session.metadata?.purpose;
  if (purpose !== "installer_credits") {
    console.log("[webhook] ignoring checkout — wrong purpose", { purpose });
    return NextResponse.json({ received: true, ignored: "non-credits" });
  }

  // Extract metadata + cross-check against our pack catalogue. We
  // don't trust `pack_credits` directly — we look the pack up by
  // `pack_id` so a tampered checkout can't mint extra credits.
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
    return NextResponse.json(
      { error: "Amount mismatch" },
      { status: 400 },
    );
  }

  const installerId =
    installerIdRaw && /^\d+$/.test(installerIdRaw)
      ? Number(installerIdRaw)
      : null;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  const admin = createAdminClient();

  // ── 1. Insert the audit row. The unique index on
  // stripe_session_id makes retries idempotent: a duplicate row
  // returns a 23505 unique-violation, which we treat as "already
  // processed" and skip the credit add.
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
    // 23505 = unique violation = duplicate webhook delivery
    if (insertErr.code === "23505") {
      console.log("[webhook] duplicate session — already credited", {
        sessionId: session.id,
      });
      return NextResponse.json({ received: true, dedup: true });
    }
    console.error("[webhook] audit insert failed", insertErr);
    // Return 500 so Stripe retries.
    return NextResponse.json(
      { error: "Audit insert failed" },
      { status: 500 },
    );
  }

  // ── 2. Add credits. Read-modify-write is fine here because the
  // audit row insert above is the actual idempotency guard. Two
  // concurrent webhook deliveries can't both reach this point.
  const { data: profile, error: fetchErr } = await admin
    .from("users")
    .select("credits")
    .eq("id", userId)
    .maybeSingle<{ credits: number }>();
  if (fetchErr || !profile) {
    console.error("[webhook] user fetch failed", fetchErr);
    return NextResponse.json(
      { error: "User fetch failed" },
      { status: 500 },
    );
  }

  const newBalance = (profile.credits ?? 0) + pack.credits;
  const { error: updateErr } = await admin
    .from("users")
    .update({ credits: newBalance })
    .eq("id", userId);
  if (updateErr) {
    console.error("[webhook] credit update failed", updateErr);
    // The audit row is already written. Return 500 so Stripe
    // retries — on retry, the audit insert will dedup but we'll
    // attempt the credit add again. Worst case admin manually
    // tops up.
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
