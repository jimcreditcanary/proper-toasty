import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits ?? "0", 10);

    if (!userId || credits <= 0) {
      console.error("Invalid webhook metadata:", session.metadata);
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    const admin = createAdminClient();

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

  return NextResponse.json({ received: true });
}
