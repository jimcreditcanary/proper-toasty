import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { findPack } from "@/lib/billing/credit-packs";
import { DEFAULT_AUTO_RECHARGE_THRESHOLD } from "@/lib/billing/auto-recharge";

// /api/installer/credits/auto-recharge
//
// GET — return the user's current settings + whether they have a
//       saved card. Powers both the /installer/credits inline
//       controls and the dedicated /installer/billing/auto-recharge
//       settings page.
//
// POST — write settings. The body shape is:
//
//          { mode: "auto",
//            packId,            // CREDIT_PACKS.id
//            thresholdCredits } // positive integer
//
//          { mode: "manual" }   // save card, never auto-charge
//
//          { mode: "off" }      // disable; keeps the saved card
//                               // and prior pack/threshold so
//                               // re-enabling is one click
//
// Enabling auto mode requires a saved card on the Stripe Customer.
// We re-check at this layer so we can't accidentally enable for
// someone whose card got deleted.

export const runtime = "nodejs";

const PackIdSchema = z.enum(["starter", "growth", "scale", "volume"]);

const PostSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("auto"),
    packId: PackIdSchema,
    thresholdCredits: z
      .number()
      .int()
      .min(1, "Threshold must be a positive integer"),
  }),
  z.object({ mode: z.literal("manual") }),
  z.object({ mode: z.literal("off") }),
]);

interface SettingsResponse {
  ok: boolean;
  // Effective mode reflecting the persisted state.
  mode?: "auto" | "manual" | "off";
  enabled?: boolean;
  packId?: "starter" | "growth" | "scale" | "volume" | null;
  thresholdCredits?: number | null;
  /** What the trigger will actually use (column value or default). */
  effectiveThreshold?: number;
  hasSavedCard?: boolean;
  cardBrand?: string | null;
  cardLast4?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  error?: string;
}

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
      "stripe_customer_id, auto_recharge_enabled, auto_recharge_pack_id, auto_recharge_threshold_credits, auto_recharge_failed_at, auto_recharge_failure_reason",
    )
    .eq("id", user.id)
    .maybeSingle<{
      stripe_customer_id: string | null;
      auto_recharge_enabled: boolean | null;
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

  const enabled = !!profile?.auto_recharge_enabled;
  const mode: "auto" | "manual" | "off" = enabled
    ? "auto"
    : hasSavedCard
      ? "manual"
      : "off";

  return NextResponse.json<SettingsResponse>({
    ok: true,
    mode,
    enabled,
    packId: profile?.auto_recharge_pack_id ?? null,
    thresholdCredits: profile?.auto_recharge_threshold_credits ?? null,
    effectiveThreshold:
      profile?.auto_recharge_threshold_credits ??
      DEFAULT_AUTO_RECHARGE_THRESHOLD,
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
  const input = parsed.data;
  const admin = createAdminClient();

  if (input.mode === "auto") {
    const pack = findPack(input.packId);
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
          error: "Save a card first — auto-recharge needs somewhere to charge.",
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

    const { error: updateErr } = await admin
      .from("users")
      .update({
        auto_recharge_enabled: true,
        auto_recharge_pack_id: input.packId,
        auto_recharge_threshold_credits: input.thresholdCredits,
        auto_recharge_failed_at: null,
        auto_recharge_failure_reason: null,
      })
      .eq("id", user.id);
    if (updateErr) {
      console.error("[auto-recharge/settings] update failed", updateErr);
      return NextResponse.json<SettingsResponse>(
        { ok: false, error: "Couldn't save settings" },
        { status: 500 },
      );
    }

    console.log("[auto-recharge/settings] enabled", {
      userId: user.id,
      packId: input.packId,
      thresholdCredits: input.thresholdCredits,
    });

    return NextResponse.json<SettingsResponse>({
      ok: true,
      mode: "auto",
      enabled: true,
      packId: input.packId,
      thresholdCredits: input.thresholdCredits,
      effectiveThreshold: input.thresholdCredits,
    });
  }

  // mode = manual or off — both just disable auto-recharge.
  // "manual" is a UX label meaning "I want a card saved but no auto
  // charges"; the schema doesn't distinguish it from "off" because
  // whether a card is saved is determined by the Stripe Customer
  // and the SetupIntent flow, not this column.
  const { error: updateErr } = await admin
    .from("users")
    .update({
      auto_recharge_enabled: false,
      auto_recharge_failed_at: null,
      auto_recharge_failure_reason: null,
    })
    .eq("id", user.id);
  if (updateErr) {
    console.error("[auto-recharge/settings] disable failed", updateErr);
    return NextResponse.json<SettingsResponse>(
      { ok: false, error: "Couldn't save settings" },
      { status: 500 },
    );
  }

  console.log("[auto-recharge/settings] disabled", {
    userId: user.id,
    requestedMode: input.mode,
  });

  return NextResponse.json<SettingsResponse>({
    ok: true,
    mode: input.mode,
    enabled: false,
  });
}
