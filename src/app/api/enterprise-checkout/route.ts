import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const TIERS: Record<
  number,
  { envKey: string; credits: number; pricePerCredit: number }
> = {
  25: { envKey: "STRIPE_PRICE_ENT_25", credits: 25, pricePerCredit: 1.8 },
  50: { envKey: "STRIPE_PRICE_ENT_50", credits: 50, pricePerCredit: 1.5 },
  100: { envKey: "STRIPE_PRICE_ENT_100", credits: 100, pricePerCredit: 1.2 },
  250: { envKey: "STRIPE_PRICE_ENT_250", credits: 250, pricePerCredit: 0.9 },
  500: { envKey: "STRIPE_PRICE_ENT_500", credits: 500, pricePerCredit: 0.7 },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to subscribe." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { credits } = body;

    const tier = TIERS[credits as number];
    if (!tier) {
      return NextResponse.json(
        { error: "Invalid enterprise tier." },
        { status: 400 }
      );
    }

    const priceId = process.env[tier.envKey];
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Stripe not configured for this tier. Set ${tier.envKey} in environment variables.`,
        },
        { status: 503 }
      );
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      request.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
      ""
    ).replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        credits: tier.credits.toString(),
        price_per_credit: tier.pricePerCredit.toString(),
        plan_type: "monthly_block",
        source: "enterprise",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          credits: tier.credits.toString(),
          price_per_credit: tier.pricePerCredit.toString(),
          plan_type: "monthly_block",
        },
      },
      success_url: `${appUrl}/dashboard/billing?subscribed=true`,
      cancel_url: `${appUrl}/enterprise?cancelled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Enterprise checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
