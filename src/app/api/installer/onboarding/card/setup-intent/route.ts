// POST /api/installer/onboarding/card/setup-intent
//
// Creates a Stripe SetupIntent so the client can collect card
// details WITHOUT charging anything. The PaymentMethod gets attached
// to the user's Customer for off-session reuse (auto top-up flow,
// future invoicing, manual top-ups from the credits portal).
//
// The actual confirmation runs in the browser via Stripe Elements;
// we don't store the PaymentMethod here. The /confirm endpoint
// fires after the browser confirms successfully + stamps the
// milestone + grants credits.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/billing/stripe-customer";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number }>();
  if (!installer) {
    return NextResponse.json(
      { ok: false, error: "No installer bound to this account" },
      { status: 403 },
    );
  }

  // Get-or-create the Stripe Customer (existing helper from the
  // auto-recharge flow). This is the same Customer that paid top-
  // ups attach to, so a future top-up will see the saved card.
  let customerId: string;
  try {
    customerId = await ensureStripeCustomer({
      admin,
      userId: user.id,
      email: user.email,
    });
  } catch (e) {
    console.error("[onboarding/card/setup-intent] customer create failed", e);
    return NextResponse.json(
      { ok: false, error: "Stripe customer setup failed" },
      { status: 502 },
    );
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        purpose: "installer_onboarding_card",
        installer_id: String(installer.id),
      },
    });
    return NextResponse.json({
      ok: true,
      clientSecret: setupIntent.client_secret,
    });
  } catch (e) {
    console.error("[onboarding/card/setup-intent] create failed", e);
    return NextResponse.json(
      { ok: false, error: "Stripe SetupIntent creation failed" },
      { status: 502 },
    );
  }
}
