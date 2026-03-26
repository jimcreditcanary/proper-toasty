import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// GET /api/credits — get current credit balance
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ credits: profile?.credits ?? 0 });
  } catch (error) {
    console.error("Credits GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/credits — create a Stripe checkout session to buy credits
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { credits } = body;

    const TIERS: Record<number, { envKey: string; credits: number }> = {
      10: { envKey: "STRIPE_PRICE_ID_10", credits: 10 },
      50: { envKey: "STRIPE_PRICE_ID_50", credits: 50 },
      200: { envKey: "STRIPE_PRICE_ID_200", credits: 200 },
    };

    const tier = TIERS[credits as number];
    if (!tier) {
      return NextResponse.json(
        { error: "Invalid credit tier. Choose 10, 50, or 200." },
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email!,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        credits: tier.credits.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Credits POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
