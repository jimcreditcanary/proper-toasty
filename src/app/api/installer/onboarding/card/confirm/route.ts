// POST /api/installer/onboarding/card/confirm
//
// Called by the client after Stripe Elements confirms a SetupIntent
// successfully. We re-fetch the SetupIntent from Stripe (so the
// browser can't lie about success), verify the PaymentMethod is
// attached, and stamp the milestone + grant credits.
//
// Body: { setupIntentId: string }

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { grantOnboardingStep } from "@/lib/outreach/onboarding";

export const runtime = "nodejs";

const RequestSchema = z.object({
  setupIntentId: z.string().min(1),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
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

  // Re-fetch from Stripe to verify the success. Defends against a
  // forged confirm call where the browser claims success without
  // a real SetupIntent.
  let intent;
  try {
    intent = await stripe.setupIntents.retrieve(parsed.data.setupIntentId);
  } catch (e) {
    console.error("[onboarding/card/confirm] retrieve failed", e);
    return NextResponse.json(
      { ok: false, error: "Couldn't verify SetupIntent" },
      { status: 502 },
    );
  }

  if (intent.status !== "succeeded") {
    return NextResponse.json(
      {
        ok: false,
        error: `SetupIntent status is ${intent.status} — not succeeded`,
      },
      { status: 400 },
    );
  }
  if (!intent.payment_method) {
    return NextResponse.json(
      { ok: false, error: "SetupIntent has no PaymentMethod" },
      { status: 400 },
    );
  }

  // Verify the intent is for THIS user's customer — defends
  // against an attacker passing a SetupIntent belonging to a
  // different account.
  const expectedCustomer = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (
    !expectedCustomer.data?.stripe_customer_id ||
    intent.customer !== expectedCustomer.data.stripe_customer_id
  ) {
    return NextResponse.json(
      { ok: false, error: "SetupIntent does not belong to this account" },
      { status: 403 },
    );
  }

  const grant = await grantOnboardingStep(admin, {
    userId: user.id,
    installerId: installer.id,
    step: "card",
  });

  return NextResponse.json({
    ok: true,
    creditsGranted: grant.creditsGranted,
    newBalance: grant.newBalance,
  });
}
