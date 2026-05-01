import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { findPack } from "@/lib/billing/credit-packs";

// POST /api/installer/credits/checkout
//
// Body: { packId: 'starter'|'growth'|'scale'|'volume' }
//
// Creates a Stripe Checkout session for the chosen credit pack and
// returns its `url` so the client can `window.location =`.
//
// Auth: must be signed in. We don't gate on role='installer' here
// because admins might want to top up a connected installer account
// for support testing — they'll see the same flow.
//
// Pricing: defined in `src/lib/billing/credit-packs.ts` and passed
// inline as `price_data` so we don't need a Stripe Price ID per
// pack. The webhook re-fetches the pack from the metadata to
// defend against tampered amounts (Stripe trusts the line items
// it actually charged for, but the webhook still uses pack_id +
// our table to determine credits).

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  packId: z.enum(["starter", "growth", "scale", "volume"]),
});

interface CheckoutResponse {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  // Auth — must have a signed-in user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json<CheckoutResponse>(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  // Body validation.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<CheckoutResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<CheckoutResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const pack = findPack(parsed.data.packId);
  if (!pack) {
    return NextResponse.json<CheckoutResponse>(
      { ok: false, error: "Unknown credit pack" },
      { status: 400 },
    );
  }

  // Look up the bound installer (if any) so the webhook can stamp
  // installer_id on the audit row. If the user hasn't claimed an
  // installer yet, the purchase still succeeds — credits go to the
  // user account, installer_id stays null.
  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();

  // App URL for success/cancel redirects. Falls back to the request
  // origin so this works on preview deploys without env config.
  const url = new URL(req.url);
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? url.origin
  ).replace(/\/+$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: pack.pricePence,
            product_data: {
              name: `${pack.credits} credits — ${pack.label} pack`,
              description: `Propertoasty installer credits. Each accepted lead costs 5 credits.${
                installer ? ` Pack credited to ${installer.company_name}.` : ""
              }`,
            },
            tax_behavior: "inclusive",
          },
        },
      ],
      // Metadata the webhook reads back to credit the right account.
      // Keep it minimal — Stripe's metadata limit is 50 keys / 500
      // chars per value but we never want to lean on that.
      metadata: {
        purpose: "installer_credits",
        user_id: user.id,
        pack_id: pack.id,
        pack_credits: String(pack.credits),
        installer_id: installer?.id ? String(installer.id) : "",
      },
      success_url: `${appUrl}/installer/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/installer/credits?cancelled=1`,
    });

    if (!session.url) {
      console.error("[credits/checkout] Stripe returned no URL", {
        sessionId: session.id,
      });
      return NextResponse.json<CheckoutResponse>(
        { ok: false, error: "Couldn't start checkout" },
        { status: 500 },
      );
    }

    console.log("[credits/checkout] session created", {
      userId: user.id,
      packId: pack.id,
      installerId: installer?.id ?? null,
      sessionId: session.id,
    });

    return NextResponse.json<CheckoutResponse>({ ok: true, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[credits/checkout] Stripe failed", message);
    return NextResponse.json<CheckoutResponse>(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
