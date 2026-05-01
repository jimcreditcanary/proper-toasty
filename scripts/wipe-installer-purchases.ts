// Wipe a user's credit purchase history so the "first purchase"
// email flow can be retested cleanly. Mostly used during dev for
// the C2 polish PR — the nudge email only fires on the user's first
// ever purchase, so once you've made one, you have to roll the
// state back to test it again.
//
// What gets deleted/reset (default):
//   - installer_credit_purchases rows for this user
//   - installer_auto_recharge_attempts rows for this user
//   - users.credits → 0
//   - users.auto_recharge_pack_id → null (so the nudge will fire on
//     next purchase)
//   - users.auto_recharge_failed_at + failure_reason → null
//
// What's kept:
//   - users.stripe_customer_id (the saved card stays valid; pass
//     --reset-stripe to clear it too and force ensureStripeCustomer
//     to create a fresh Customer on next checkout).
//
// The Stripe Customer object itself isn't deleted — Stripe's account
// retains the test-mode payment history. That's fine; we don't try
// to undo Stripe-side state from a dev script.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/wipe-installer-purchases.ts <email>
//   npx tsx --env-file=.env.local scripts/wipe-installer-purchases.ts <email> --reset-stripe

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const resetStripe = args.includes("--reset-stripe");

if (!email) {
  console.error(
    "Missing email argument.\n  Usage: npx tsx --env-file=.env.local scripts/wipe-installer-purchases.ts <email> [--reset-stripe]",
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

const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log(`→ Looking up user for ${email}…`);
  const { data: profile, error: lookupErr } = await admin
    .from("users")
    .select(
      "id, email, credits, stripe_customer_id, auto_recharge_pack_id, auto_recharge_failed_at",
    )
    .ilike("email", email!)
    .maybeSingle();
  if (lookupErr) {
    console.error("✗ user lookup failed:", lookupErr.message);
    process.exit(1);
  }
  if (!profile) {
    console.error("✗ no user found with that email.");
    process.exit(1);
  }
  console.log("✓ user before:", {
    id: profile.id,
    credits: profile.credits,
    stripe_customer_id: profile.stripe_customer_id,
    auto_recharge_pack_id: profile.auto_recharge_pack_id,
    auto_recharge_failed_at: profile.auto_recharge_failed_at,
  });

  // Count rows we're about to delete (purely so the output's
  // useful — the deletes themselves are batch operations).
  const { count: purchaseCount } = await admin
    .from("installer_credit_purchases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);
  const { count: attemptCount } = await admin
    .from("installer_auto_recharge_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  console.log(
    `→ Will delete ${purchaseCount ?? 0} purchase(s) + ${attemptCount ?? 0} auto-recharge attempt(s)…`,
  );

  const { error: purgeErr } = await admin
    .from("installer_credit_purchases")
    .delete()
    .eq("user_id", profile.id);
  if (purgeErr) {
    console.error("✗ purchase delete failed:", purgeErr.message);
    process.exit(1);
  }
  console.log("✓ purchases deleted");

  const { error: attemptsErr } = await admin
    .from("installer_auto_recharge_attempts")
    .delete()
    .eq("user_id", profile.id);
  if (attemptsErr) {
    console.error("✗ attempts delete failed:", attemptsErr.message);
    process.exit(1);
  }
  console.log("✓ auto-recharge attempts deleted");

  const updates: Record<string, unknown> = {
    credits: 0,
    auto_recharge_pack_id: null,
    auto_recharge_failed_at: null,
    auto_recharge_failure_reason: null,
  };
  if (resetStripe) {
    updates.stripe_customer_id = null;
  }

  const { error: updateErr } = await admin
    .from("users")
    .update(updates)
    .eq("id", profile.id);
  if (updateErr) {
    console.error("✗ user update failed:", updateErr.message);
    process.exit(1);
  }
  console.log(
    `✓ user reset (credits=0, auto_recharge cleared${resetStripe ? ", stripe_customer_id cleared" : ", stripe_customer_id KEPT"})`,
  );

  // Verify.
  const { data: after } = await admin
    .from("users")
    .select(
      "id, email, credits, stripe_customer_id, auto_recharge_pack_id, auto_recharge_failed_at",
    )
    .eq("id", profile.id)
    .maybeSingle();
  console.log("\n✓ user after:", after);

  console.log("\n──────────────── Done ────────────────\n");
  console.log(
    "Next purchase will be treated as the user's first — receipt email AND the auto top-up nudge email should both fire.",
  );
  if (!resetStripe) {
    console.log(
      "Saved card on the existing Stripe Customer still works for the next Checkout (customer_id was kept).",
    );
  } else {
    console.log(
      "Stripe Customer cleared locally — next Checkout will create a brand-new Customer and you'll need to re-enter card details.",
    );
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
