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
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "quantity must be at least 1" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email!,
      line_items: [
        {
          price: process.env.STRIPE_CREDIT_PRICE_ID!,
          quantity,
        },
      ],
      metadata: {
        user_id: user.id,
        credits: quantity.toString(),
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
