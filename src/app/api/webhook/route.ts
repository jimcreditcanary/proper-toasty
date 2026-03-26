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
    await admin.from("payments").insert({
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

    // Add credits to user
    const { data: user } = await admin
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    await admin
      .from("users")
      .update({ credits: (user?.credits ?? 0) + credits })
      .eq("id", userId);
  }

  return NextResponse.json({ received: true });
}
