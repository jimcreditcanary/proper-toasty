import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromTable(admin: ReturnType<typeof createAdminClient>, table: string) {
  return (admin as any).from(table);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── One-time payment (pay-as-you-go credit packs) ──
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Skip subscription checkouts — handled by invoice.paid
    if (session.mode === "subscription") {
      // Create enterprise subscription record
      const userId = session.metadata?.user_id;
      const credits = parseInt(session.metadata?.credits ?? "0", 10);
      const pricePerCredit = parseFloat(
        session.metadata?.price_per_credit ?? "0"
      );
      const planType = session.metadata?.plan_type ?? "monthly_block";
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : null;

      if (userId && subId) {
        await fromTable(admin, "enterprise_subscriptions").insert({
          user_id: userId,
          stripe_subscription_id: subId,
          plan_type: planType,
          monthly_credits: credits,
          price_per_credit: pricePerCredit,
          status: "active",
        });

        // Mark user as enterprise
        await fromTable(admin, "users")
          .update({ enterprise: true })
          .eq("id", userId);

        console.log(
          `Created enterprise subscription for user ${userId}: ${credits} credits/mo`
        );
      }

      return NextResponse.json({ received: true });
    }

    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits ?? "0", 10);

    if (!userId || credits <= 0) {
      console.error("Invalid webhook metadata:", session.metadata);
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    // Record payment
    const { error: paymentError } = await admin.from("payments").insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      amount: session.amount_total ?? 0,
      credits_purchased: credits,
      status: "completed",
    });

    if (paymentError) {
      console.error("Failed to record payment:", paymentError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    // Add credits to user
    const { data: user, error: fetchError } = await admin
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch user:", fetchError);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    const { error: updateError } = await admin
      .from("users")
      .update({ credits: (user?.credits ?? 0) + credits })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update credits:", updateError);
      return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
    }

    console.log(`Added ${credits} credits to user ${userId}`);
  }

  // ── Subscription invoice paid (monthly renewal) ──
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    // In newer Stripe API versions, subscription may be on parent_subscription_details or subscription_details
    const invoiceAny = invoice as unknown as Record<string, unknown>;
    const subId =
      typeof invoiceAny.subscription === "string"
        ? invoiceAny.subscription
        : (invoice as unknown as { subscription_details?: { id?: string } }).subscription_details?.id ?? null;

    if (subId) {
      // Look up our subscription record
      const { data: sub } = await fromTable(admin, "enterprise_subscriptions")
        .select("id, user_id, monthly_credits")
        .eq("stripe_subscription_id", subId)
        .single();

      if (sub) {
        // Add monthly credits
        const { data: user } = await admin
          .from("users")
          .select("credits")
          .eq("id", sub.user_id)
          .single();

        if (user) {
          await admin
            .from("users")
            .update({ credits: (user.credits ?? 0) + sub.monthly_credits })
            .eq("id", sub.user_id);
        }

        // Record enterprise invoice
        await fromTable(admin, "enterprise_invoices").insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid ?? 0,
          credits: sub.monthly_credits,
          status: "paid",
          period_start: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : null,
          period_end: invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null,
        });

        console.log(
          `Enterprise renewal: +${sub.monthly_credits} credits for user ${sub.user_id}`
        );
      }
    }
  }

  // ── Subscription status changes ──
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const subAny = subscription as unknown as Record<string, unknown>;
    const status = subscription.status;

    const mappedStatus =
      status === "active"
        ? "active"
        : status === "past_due"
          ? "past_due"
          : status === "canceled" || status === "unpaid"
            ? "cancelled"
            : "active";

    const updateData: Record<string, unknown> = {
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    };

    // current_period_start/end may be on the object or nested in newer API versions
    if (typeof subAny.current_period_start === "number") {
      updateData.current_period_start = new Date(
        (subAny.current_period_start as number) * 1000
      ).toISOString();
    }
    if (typeof subAny.current_period_end === "number") {
      updateData.current_period_end = new Date(
        (subAny.current_period_end as number) * 1000
      ).toISOString();
    }

    await fromTable(admin, "enterprise_subscriptions")
      .update(updateData)
      .eq("stripe_subscription_id", subscription.id);

    // If cancelled, remove enterprise flag
    if (mappedStatus === "cancelled") {
      const userId = subscription.metadata?.user_id;
      if (userId) {
        await fromTable(admin, "users")
          .update({ enterprise: false })
          .eq("id", userId);
      }
    }

    console.log(
      `Subscription ${subscription.id} status → ${mappedStatus}`
    );
  }

  return NextResponse.json({ received: true });
}
