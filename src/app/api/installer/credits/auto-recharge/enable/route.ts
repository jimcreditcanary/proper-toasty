import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { parseEnableToken } from "@/lib/billing/enable-token";

// GET /api/installer/credits/auto-recharge/enable?token=xxx
//
// One-click magic-link endpoint reached from the "first purchase"
// nudge email. Sets the user's auto_recharge_pack_id to the pack
// encoded in the token, then 303-redirects to /installer/credits
// with a flash flag so the page renders an "Auto top-up is now on"
// banner.
//
// Auth: the HMAC signature on the token is the auth — same trust
// model as any password-reset / magic-link system. We never want
// to require the user to be signed in to flip a setting from an
// email they obviously already control.

export const runtime = "nodejs";

function landing(state: "ok" | "invalid" | "no_card" | "missing_user", origin: string): URL {
  return new URL(
    `/installer/credits?autoRechargeEnabled=${state}`,
    origin,
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(landing("invalid", url.origin), 303);
  }
  const parsed = parseEnableToken(token);
  if (!parsed) {
    console.warn("[auto-recharge/enable] invalid token");
    return NextResponse.redirect(landing("invalid", url.origin), 303);
  }
  const { userId, packId } = parsed;

  const admin = createAdminClient();

  // Sanity check: the user must still have a saved card on file.
  // Otherwise the toggle would land in a state where auto top-up is
  // "on" but can't actually charge.
  const { data: profile, error: profileErr } = await admin
    .from("users")
    .select("stripe_customer_id, auto_recharge_pack_id")
    .eq("id", userId)
    .maybeSingle<{
      stripe_customer_id: string | null;
      auto_recharge_pack_id: string | null;
    }>();
  if (profileErr || !profile) {
    console.warn("[auto-recharge/enable] user lookup failed", {
      userId,
      err: profileErr?.message,
    });
    return NextResponse.redirect(landing("missing_user", url.origin), 303);
  }
  if (!profile.stripe_customer_id) {
    return NextResponse.redirect(landing("no_card", url.origin), 303);
  }
  try {
    const list = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: "card",
      limit: 1,
    });
    if (list.data.length === 0) {
      return NextResponse.redirect(landing("no_card", url.origin), 303);
    }
  } catch (e) {
    console.warn(
      "[auto-recharge/enable] Stripe lookup failed",
      e instanceof Error ? e.message : e,
    );
    // Don't block — Stripe blip shouldn't punish the user. Worst case
    // the trigger no-ops on its first run.
  }

  // Idempotent — re-clicking the link with the same pack is fine.
  if (profile.auto_recharge_pack_id === packId) {
    return NextResponse.redirect(landing("ok", url.origin), 303);
  }

  const { error: updateErr } = await admin
    .from("users")
    .update({
      auto_recharge_pack_id: packId,
      auto_recharge_failed_at: null,
      auto_recharge_failure_reason: null,
    })
    .eq("id", userId);
  if (updateErr) {
    console.error("[auto-recharge/enable] update failed", updateErr);
    return NextResponse.redirect(landing("invalid", url.origin), 303);
  }

  console.log("[auto-recharge/enable] enabled via magic link", {
    userId,
    packId,
  });
  return NextResponse.redirect(landing("ok", url.origin), 303);
}
