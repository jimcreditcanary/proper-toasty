import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const TIERS: Record<number, { envKey: string; credits: number }> = {
  1: { envKey: "STRIPE_PRICE_1_CHECK", credits: 1 },
  3: { envKey: "STRIPE_PRICE_3_CHECKS", credits: 3 },
  7: { envKey: "STRIPE_PRICE_7_CHECKS", credits: 7 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credits, email } = body;

    const tier = TIERS[credits as number];
    if (!tier) {
      return NextResponse.json(
        { error: "Invalid credit tier. Choose 1, 3, or 7." },
        { status: 400 }
      );
    }

    const priceId = process.env[tier.envKey];
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe is not configured. Set ${tier.envKey} in your environment variables.` },
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
      mode: "payment",
      ...(email ? { customer_email: email } : {}),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        credits: tier.credits.toString(),
        // User ID will be set after they create an account / sign in
        source: "wizard",
      },
      success_url: `${appUrl}/verify?payment=success`,
      cancel_url: `${appUrl}/verify?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Wizard-checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
