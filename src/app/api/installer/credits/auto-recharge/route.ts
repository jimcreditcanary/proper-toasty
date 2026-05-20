import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { findPack } from "@/lib/billing/credit-packs";
import {
  ALLOWED_THRESHOLDS,
  AUTO_RECHARGE_DEFAULT_THRESHOLD,
  isAllowedThreshold,
  type AllowedThreshold,
} from "@/lib/billing/auto-recharge-config";

// /api/installer/credits/auto-recharge
//
//   GET   — return the user's current settings + whether they have
//           a saved card, so the UI can decide whether to offer the
//           toggle vs. "make a manual purchase first".
//
//   POST  — { packId, thresholdCredits } turns auto top-up on,
//           { packId: null } turns it off. The user has to have a
//           saved card on their Stripe Customer; we re-check at this
//           layer so we don't accidentally enable for someone whose
//           card was deleted.

export const runtime = "nodejs";

interface SettingsResponse {
  ok: boolean;
  enabled?: boolean;
  packId?: "starter" | "growth" | "scale" | "volume" | null;
  thresholdCredits?: number | null;
  effectiveThresholdCredits?: number;
  hasSavedCard?: boolean;
  cardBrand?: string | null;
  cardLast4?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  error?: string;
}

const PostSchema = z.object({
  packId: z.enum(["starter", "growth", "scale", "volume"]).nullable(),
  thresholdCredits: z
    .number()
    .int()
    .refine((v): v is AllowedThreshold => isAllowedThreshold(v), {
      message: `thresholdCredits must be one of ${ALLOWED_THRESHOLDS.join(", ")}`,
    })
    .optional(),
});

export async function GET(): Promise<NextResponse<SettingsResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<SettingsResponse>(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select(
      "stripe_customer_id, auto_recharge_pack_id, auto_recharge_threshold_credits, auto_recharge_failed_at, auto_recharge_failure_reason",
    )
    .eq("id", user.id)
    .maybeSingle<{
      stripe_customer_id: string | null;
      auto_recharge_pack_id:
        | "starter"
        | "growth"
        | "scale"
        | "volume"
        | null;
      auto_recharge_threshold_credits: number | null;
      auto_recharge_failed_at: string | null;
      auto_recharge_failure_reason: string | null;
    }>();

  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let hasSavedCard = false;

  if (profile?.stripe_customer_id) {
    try {
      const list = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
        limit: 1,
      });
      const pm = list.data[0];
      if (pm?.card) {
        hasSavedCard = true;
        cardBrand = pm.card.brand;
        cardLast4 = pm.card.last4;
      }
    } catch (e) {
      console.warn(
        "[auto-recharge/settings] payment method lookup failed",
        e instanceof Error ? e.message : e,
      );
    }
  }

  return NextResponse.json<SettingsResponse>({
    ok: true,
    enabled: !!profile?.auto_recharge_pack_id,
    packId: profile?.auto_recharge_pack_id ?? null,
    thresholdCredits: profile?.auto_recharge_threshold_credits ?? null,
    effectiveThresholdCredits:
      profile?.auto_recharge_threshold_credits ??
      AUTO_RECHARGE_DEFAULT_THRESHOLD,
    hasSavedCard,
    cardBrand,
    cardLast4,
    failedAt: profile?.auto_recharge_failed_at ?? null,
    failureReason: profile?.auto_recharge_failure_reason ?? null,
  });
}

export async function POST(req: Request): Promise<NextResponse<SettingsResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<SettingsResponse>(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<SettingsResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<SettingsResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const packId = parsed.data.packId;
  const thresholdCredits = parsed.data.thresholdCredits ?? null;

  const admin = createAdminClient();

  if (packId !== null) {
    // Enabling — must have a Customer + saved card + valid pack.
    const pack = findPack(packId);
    if (!pack) {
      return NextResponse.json<SettingsResponse>(
        { ok: false, error: "Unknown pack" },
        { status: 400 },
      );
    }
    const { data: profile } = await admin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle<{ stripe_customer_id: string | null }>();
    if (!profile?.stripe_customer_id) {
      return NextResponse.json<SettingsResponse>(
        {
          ok: false,
          error: "Save a card first so we have something to charge.",
        },
        { status: 400 },
      );
    }
    try {
      const list = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
        limit: 1,
      });
      if (list.data.length === 0) {
        return NextResponse.json<SettingsResponse>(
          {
            ok: false,
            error: "No card on file. Save a card first.",
          },
          { status: 400 },
        );
      }
    } catch (e) {
      console.error(
        "[auto-recharge/settings] Stripe lookup failed",
        e instanceof Error ? e.message : e,
      );
      return NextResponse.json<SettingsResponse>(
        { ok: false, error: "Couldn't verify saved card. Try again." },
        { status: 500 },
      );
    }
  }

  // Update the row. Toggling on or off also clears the failure flag —
  // this gives the user a way to dismiss a stale "failed" banner.
  // When disabling we leave the threshold alone so re-enabling later
  // remembers the user's last pick.
  const updatePayload: {
    auto_recharge_pack_id: typeof packId;
    auto_recharge_failed_at: null;
    auto_recharge_failure_reason: null;
    auto_recharge_threshold_credits?: number | null;
  } = {
    auto_recharge_pack_id: packId,
    auto_recharge_failed_at: null,
    auto_recharge_failure_reason: null,
  };
  if (packId !== null) {
    updatePayload.auto_recharge_threshold_credits = thresholdCredits;
  }

  const { error: updateErr } = await admin
    .from("users")
    .update(updatePayload)
    .eq("id", user.id);
  if (updateErr) {
    console.error("[auto-recharge/settings] update failed", updateErr);
    return NextResponse.json<SettingsResponse>(
      { ok: false, error: "Couldn't save settings" },
      { status: 500 },
    );
  }

  console.log("[auto-recharge/settings] updated", {
    userId: user.id,
    packId,
    thresholdCredits,
  });

  return NextResponse.json<SettingsResponse>({
    ok: true,
    enabled: packId !== null,
    packId,
    thresholdCredits,
    effectiveThresholdCredits:
      thresholdCredits ?? AUTO_RECHARGE_DEFAULT_THRESHOLD,
  });
}
