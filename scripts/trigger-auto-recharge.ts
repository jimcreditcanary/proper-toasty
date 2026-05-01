// Manually trigger a C2 auto-recharge attempt for a given user.
//
// Calls `maybeRunAutoRecharge` directly with a forced low balance so
// you don't have to debit real credits to test the flow. The function
// reads the user's auto_recharge_pack_id + stripe_customer_id and
// fires the off-session PaymentIntent like it would in production.
//
// Use cases:
//   - End-to-end test the auto top-up wiring without burning lead-
//     accept credits.
//   - Reproduce a failure on a user who hit a card error.
//   - Verify a fix to the trigger code without driving the UI.
//
// Pre-reqs (otherwise the function returns silently):
//   1. The user has bought at least one pack manually (so a card is
//      saved on their Stripe Customer).
//   2. They've toggled auto top-up ON for a specific pack.
//   3. They don't already have an unresolved
//      auto_recharge_failed_at timestamp.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/trigger-auto-recharge.ts <email>
//
// Example:
//   npx tsx --env-file=.env.local scripts/trigger-auto-recharge.ts james.fell@creditcanary.co.uk

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { maybeRunAutoRecharge } from "../src/lib/billing/auto-recharge";

const email = process.argv[2];
if (!email) {
  console.error(
    "Missing email argument.\n  Usage: npx tsx --env-file=.env.local scripts/trigger-auto-recharge.ts <email>",
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — pass --env-file=.env.local.",
  );
  process.exit(1);
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "Missing STRIPE_SECRET_KEY — the auto-recharge module needs it to call Stripe.",
  );
  process.exit(1);
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log(`→ Looking up user for ${email}…`);
  const { data: profile, error } = await admin
    .from("users")
    .select(
      "id, email, credits, stripe_customer_id, auto_recharge_pack_id, auto_recharge_failed_at, auto_recharge_failure_reason",
    )
    .ilike("email", email)
    .maybeSingle();
  if (error) {
    console.error("✗ user lookup failed:", error.message);
    process.exit(1);
  }
  if (!profile) {
    console.error("✗ no user found with that email.");
    process.exit(1);
  }

  console.log("✓ user found", {
    id: profile.id,
    email: profile.email,
    credits: profile.credits,
    stripe_customer_id: profile.stripe_customer_id,
    auto_recharge_pack_id: profile.auto_recharge_pack_id,
    auto_recharge_failed_at: profile.auto_recharge_failed_at,
    auto_recharge_failure_reason: profile.auto_recharge_failure_reason,
  });

  // Sanity-check the pre-reqs and tell the user clearly which one's
  // missing. The function would silently no-op otherwise.
  if (!profile.auto_recharge_pack_id) {
    console.warn(
      "! auto_recharge_pack_id is null — auto top-up is OFF for this user.\n  Toggle it on at /installer/credits before re-running.",
    );
    process.exit(1);
  }
  if (!profile.stripe_customer_id) {
    console.warn(
      "! stripe_customer_id is null — buy a pack manually first so Stripe creates a Customer + saves the card.",
    );
    process.exit(1);
  }
  if (profile.auto_recharge_failed_at) {
    console.warn(
      "! auto_recharge_failed_at is set — the trigger will skip this user. Clear it:\n",
      "  update public.users set auto_recharge_failed_at = null, auto_recharge_failure_reason = null where id = '" +
        profile.id +
        "';",
    );
    process.exit(1);
  }

  console.log(
    "\n→ Firing maybeRunAutoRecharge with forced balanceAfter=5 (under the threshold of 10)…",
  );
  await maybeRunAutoRecharge({
    admin,
    userId: profile.id,
    balanceAfter: 5,
  });
  console.log("\n✓ Trigger returned. Now check:");
  console.log(`  - Stripe → Payments → look for a fresh PaymentIntent on customer ${profile.stripe_customer_id}`);
  console.log(`  - Stripe → Webhooks → confirm payment_intent.succeeded landed (if the test card succeeded)`);
  console.log(`  - Supabase → installer_auto_recharge_attempts → newest row should show status='succeeded' (or 'failed' / 'requires_action')`);
  console.log(`  - Supabase → installer_credit_purchases → if succeeded, a new row keyed by stripe_payment_intent_id`);
  console.log(`  - Supabase → public.users.credits → bumped by the pack's credit count`);
  console.log(
    `\n  Also check the failure-email path by setting Stripe test mode to use card 4000 0000 0000 9995 (insufficient_funds) as the saved card.`,
  );
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
