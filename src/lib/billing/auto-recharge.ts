// C2 — auto top-up trigger.
//
// Called from places that debit credits (currently the lead-accept
// handler). If the user's new balance is at or below the threshold
// AND they've enabled auto top-up AND we've got a saved card on
// their Stripe Customer, fire an off-session PaymentIntent for the
// configured pack.
//
// Successful charges flow through the standard webhook
// (payment_intent.succeeded handler) which adds credits + flips the
// audit row to 'succeeded'. Failures are persisted here as
// 'failed' / 'requires_action' rows in
// installer_auto_recharge_attempts and the user's
// auto_recharge_pack_id is cleared (one-strike-out — they have to
// re-enable manually after fixing whatever broke).
//
// Designed to be fire-and-forget from the caller's perspective.
// `maybeRunAutoRecharge` returns void; if anything goes wrong we
// log it but never re-throw, because credit debits should never be
// blocked by an auto-recharge problem.

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { findPack, type CreditPack } from "@/lib/billing/credit-packs";
import { sendEmail } from "@/lib/email/client";
import { buildAutoRechargeFailedEmail } from "@/lib/email/templates/installer-auto-recharge-failed";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

// Threshold: balance ≤ this triggers the recharge. Hard-coded for
// simplicity — F1 spec calls for 10. Bump to a column on users if
// we ever want per-installer thresholds.
export const AUTO_RECHARGE_THRESHOLD = 10;

interface MaybeRunArgs {
  admin: AdminClient;
  userId: string;
  // Balance immediately after the debit. Caller is the one that
  // just decremented credits and knows the truth without a re-read.
  balanceAfter: number;
}

// Fire-and-forget entry point. Safe to await or not.
export async function maybeRunAutoRecharge(args: MaybeRunArgs): Promise<void> {
  try {
    if (args.balanceAfter > AUTO_RECHARGE_THRESHOLD) return;
    await runAutoRecharge(args);
  } catch (e) {
    console.error(
      "[auto-recharge] unexpected error",
      e instanceof Error ? e.message : e,
    );
  }
}

async function runAutoRecharge({
  admin,
  userId,
  balanceAfter,
}: MaybeRunArgs): Promise<void> {
  // Read the user's settings + Customer + linked installer in one
  // round-trip via maybeSingle. We pull email here too so we don't
  // need a second roundtrip for the failure email.
  const { data: profile, error: profileErr } = await admin
    .from("users")
    .select(
      "id, email, stripe_customer_id, auto_recharge_pack_id, auto_recharge_failed_at",
    )
    .eq("id", userId)
    .maybeSingle<{
      id: string;
      email: string;
      stripe_customer_id: string | null;
      auto_recharge_pack_id:
        | "starter"
        | "growth"
        | "scale"
        | "volume"
        | null;
      auto_recharge_failed_at: string | null;
    }>();
  if (profileErr || !profile) {
    console.warn("[auto-recharge] user lookup failed", profileErr?.message);
    return;
  }
  if (!profile.auto_recharge_pack_id) {
    return; // Disabled — nothing to do.
  }
  if (!profile.stripe_customer_id) {
    console.warn("[auto-recharge] enabled but no Customer", { userId });
    return;
  }
  const pack = findPack(profile.auto_recharge_pack_id);
  if (!pack) {
    console.warn("[auto-recharge] unknown pack id on user", {
      userId,
      packId: profile.auto_recharge_pack_id,
    });
    return;
  }

  // Skip if there's a recent failure on this account — the email
  // already nudged them to top up manually, no need to keep banging
  // the API. The flag is cleared on next successful purchase.
  if (profile.auto_recharge_failed_at) {
    console.log("[auto-recharge] skipping — prior failure on file", { userId });
    return;
  }

  // Look up the linked installer (for the audit row). Optional.
  const { data: installer } = await admin
    .from("installers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle<{ id: number }>();

  // Find a saved payment method on the Customer. We pick the
  // default if set, otherwise the first card Stripe lists. If
  // there's nothing on file we bail with a failure record so the
  // banner shows up — usually means the original Checkout didn't
  // save the card for some reason.
  const paymentMethod = await pickDefaultPaymentMethod(profile.stripe_customer_id);
  if (!paymentMethod) {
    console.warn("[auto-recharge] no saved card on Customer", {
      userId,
      customerId: profile.stripe_customer_id,
    });
    await persistFailure({
      admin,
      userId,
      installerId: installer?.id ?? null,
      pack,
      balanceAtTrigger: balanceAfter,
      paymentIntentId: null,
      failureCode: "no_payment_method",
      failureMessage:
        "No card on file. Make a manual purchase to save a card, then re-enable auto top-up.",
      sendEmailTo: profile.email,
    });
    return;
  }

  // Pre-write a 'pending' audit row first so we have an id to
  // reference in the PaymentIntent metadata. We persist as 'failed'
  // optimistically and only flip to 'succeeded' once the webhook
  // confirms — that way a charge that succeeds at Stripe but our
  // server crashes before recording isn't silently lost.
  const { data: attemptRow, error: attemptErr } = await admin
    .from("installer_auto_recharge_attempts")
    .insert({
      user_id: userId,
      installer_id: installer?.id ?? null,
      pack_id: pack.id,
      pack_credits: pack.credits,
      price_pence: pack.pricePence,
      status: "failed",
      balance_at_trigger: balanceAfter,
    })
    .select("id")
    .single<{ id: string }>();
  if (attemptErr || !attemptRow) {
    console.error("[auto-recharge] attempt row insert failed", attemptErr);
    return;
  }
  const attemptId = attemptRow.id;

  // Fire the off-session PaymentIntent.
  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: pack.pricePence,
      currency: "gbp",
      customer: profile.stripe_customer_id,
      payment_method: paymentMethod,
      off_session: true,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        purpose: "installer_credits_auto",
        user_id: userId,
        pack_id: pack.id,
        pack_credits: String(pack.credits),
        installer_id: installer?.id ? String(installer.id) : "",
        attempt_id: attemptId,
      },
      description: `Propertoasty auto top-up — ${pack.credits} credits (${pack.label})`,
    });
  } catch (err) {
    // off_session=true throws StripeCardError when the card needs
    // 3DS or is declined. Pull the structured fields we care about.
    const stripeErr = err as Stripe.errors.StripeError;
    const code = stripeErr.code ?? "stripe_error";
    const declineCode = stripeErr.decline_code ?? null;
    const piId = stripeErr.payment_intent?.id ?? null;
    const requiresAction =
      stripeErr.code === "authentication_required" ||
      stripeErr.payment_intent?.status === "requires_action";

    const message = friendlyDeclineMessage({
      code,
      declineCode,
      raw: stripeErr.message,
    });
    console.warn("[auto-recharge] charge failed", {
      userId,
      code,
      declineCode,
      requiresAction,
      raw: stripeErr.message,
    });

    await admin
      .from("installer_auto_recharge_attempts")
      .update({
        status: requiresAction ? "requires_action" : "failed",
        stripe_payment_intent_id: piId,
        failure_code: declineCode ?? code,
        failure_message: stripeErr.message ?? null,
      })
      .eq("id", attemptId);

    await markUserFailed({
      admin,
      userId,
      reason: message,
    });

    await sendFailureEmail({
      to: profile.email,
      pack,
      reason: message,
    });
    return;
  }

  // Stripe accepted the request. Stamp the PaymentIntent id on the
  // attempt row. The webhook will flip status='succeeded' when
  // payment_intent.succeeded fires.
  await admin
    .from("installer_auto_recharge_attempts")
    .update({
      stripe_payment_intent_id: intent.id,
    })
    .eq("id", attemptId);

  console.log("[auto-recharge] charge accepted", {
    userId,
    paymentIntentId: intent.id,
    packId: pack.id,
    attemptId,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

async function pickDefaultPaymentMethod(
  customerId: string,
): Promise<string | null> {
  // Prefer the Customer's default payment method if it's set. If
  // the Customer has been deleted (or the id was created in a
  // different Stripe account / mode) Stripe throws
  // resource_missing — treat that as "no card", same as if a real
  // card was simply absent. The off-session trigger then writes a
  // failure record + emails the user.
  let customer: Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>;
  try {
    customer = await stripe.customers.retrieve(customerId);
  } catch (err) {
    const stripeErr = err as Stripe.errors.StripeError;
    if (
      stripeErr.code === "resource_missing" ||
      stripeErr.statusCode === 404
    ) {
      console.warn(
        "[auto-recharge] customer id missing on Stripe — treating as no card",
        { customerId },
      );
      return null;
    }
    throw err;
  }
  if (customer.deleted) return null;
  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPm === "string") return defaultPm;
  if (defaultPm && typeof defaultPm === "object" && "id" in defaultPm) {
    return defaultPm.id as string;
  }

  // Otherwise grab the first card on file. Stripe's listPaymentMethods
  // returns most-recently-attached first.
  const list = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });
  return list.data[0]?.id ?? null;
}

async function persistFailure(args: {
  admin: AdminClient;
  userId: string;
  installerId: number | null;
  pack: CreditPack;
  balanceAtTrigger: number;
  paymentIntentId: string | null;
  failureCode: string;
  failureMessage: string;
  sendEmailTo: string;
}): Promise<void> {
  await args.admin.from("installer_auto_recharge_attempts").insert({
    user_id: args.userId,
    installer_id: args.installerId,
    pack_id: args.pack.id,
    pack_credits: args.pack.credits,
    price_pence: args.pack.pricePence,
    status: "failed",
    stripe_payment_intent_id: args.paymentIntentId,
    failure_code: args.failureCode,
    failure_message: args.failureMessage,
    balance_at_trigger: args.balanceAtTrigger,
  });
  await markUserFailed({
    admin: args.admin,
    userId: args.userId,
    reason: args.failureMessage,
  });
  await sendFailureEmail({
    to: args.sendEmailTo,
    pack: args.pack,
    reason: args.failureMessage,
  });
}

async function markUserFailed(args: {
  admin: AdminClient;
  userId: string;
  reason: string;
}): Promise<void> {
  // Stamp the failure flag + clear auto_recharge_pack_id so we
  // don't keep retrying. User has to re-enable manually after
  // fixing the underlying issue.
  const { error } = await args.admin
    .from("users")
    .update({
      auto_recharge_pack_id: null,
      auto_recharge_failed_at: new Date().toISOString(),
      auto_recharge_failure_reason: args.reason,
    })
    .eq("id", args.userId);
  if (error) {
    console.error("[auto-recharge] markUserFailed update failed", error.message);
  }
}

async function sendFailureEmail(args: {
  to: string;
  pack: CreditPack;
  reason: string;
}): Promise<void> {
  try {
    const topUpUrl = `${normalisedBase()}/installer/credits`;
    const email = buildAutoRechargeFailedEmail({
      contactName: null,
      packLabel: args.pack.label,
      packCredits: args.pack.credits,
      reason: args.reason,
      topUpUrl,
    });
    const result = await sendEmail({
      to: args.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: "kind", value: "installer_auto_recharge_failed" }],
    });
    console.log("[auto-recharge] failure email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  } catch (e) {
    console.warn(
      "[auto-recharge] failure email send failed",
      e instanceof Error ? e.message : e,
    );
  }
}

function normalisedBase(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://propertoasty.com";
  const url = base.startsWith("http") ? base : `https://${base}`;
  return url.replace(/\/+$/, "");
}

// Map Stripe's `code` / `decline_code` to a human-friendly sentence.
// We keep these terse and actionable — the email goes to busy
// installers who just want to know what to fix.
function friendlyDeclineMessage(args: {
  code: string;
  declineCode: string | null;
  raw: string | undefined;
}): string {
  switch (args.declineCode ?? args.code) {
    case "card_declined":
    case "generic_decline":
      return "Your card was declined. Try a different card or check with your bank.";
    case "insufficient_funds":
      return "Insufficient funds on the card. Top up your account or use a different card.";
    case "lost_card":
    case "stolen_card":
      return "The card on file has been reported lost or stolen. Use a new card to continue.";
    case "expired_card":
      return "The card on file has expired. Add a new card.";
    case "incorrect_cvc":
    case "invalid_cvc":
      return "Your card's CVC was rejected. Use a different card.";
    case "authentication_required":
      return "Your bank needs you to confirm this payment in person — that's not possible off-session. Use the card again on the credits page to authorise.";
    case "no_payment_method":
      return args.raw ?? "No card on file.";
    default:
      return args.raw ?? "Stripe declined the payment without giving us a reason.";
  }
}
