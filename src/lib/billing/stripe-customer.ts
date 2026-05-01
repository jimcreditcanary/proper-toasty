// Get-or-create the Stripe Customer for a Propertoasty user.
//
// We attach every credit-pack Checkout to a Customer so that:
//   1. Future off-session recharges (C2 auto top-up) can charge the
//      saved card without redirecting the user to Stripe again.
//   2. All purchases line up under one Stripe entity for support /
//      reconciliation.
//
// users.stripe_customer_id is the source of truth. If it's set we
// re-use it; otherwise we create a fresh Customer in Stripe and
// persist the id back. The unique partial index on the column
// stops a concurrent double-create from sticking.

import { stripe } from "@/lib/stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

interface EnsureCustomerArgs {
  admin: AdminClient;
  userId: string;
  email: string;
}

export async function ensureStripeCustomer(
  args: EnsureCustomerArgs,
): Promise<string> {
  const { admin, userId, email } = args;

  // Fast path: customer already on file.
  const { data: existing, error: lookupErr } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (lookupErr) {
    throw new Error(`user lookup failed: ${lookupErr.message}`);
  }
  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // Create the Customer. We pass our own user id in metadata so
  // anyone reading the Stripe dashboard can trace from a Customer
  // back to a Propertoasty account.
  const customer = await stripe.customers.create({
    email,
    metadata: {
      app_user_id: userId,
    },
  });

  // Persist back. If a concurrent request beat us to it, the
  // unique partial index on stripe_customer_id will reject the
  // second update — we then re-read and return whatever's there.
  const { error: updateErr } = await admin
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId)
    .is("stripe_customer_id", null);

  if (updateErr) {
    // Race-loss handler: the column is now non-null. Re-read.
    console.warn(
      "[stripe-customer] persist update failed — re-reading",
      updateErr.message,
    );
    const { data: again } = await admin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle<{ stripe_customer_id: string | null }>();
    if (again?.stripe_customer_id) return again.stripe_customer_id;
    throw new Error(`could not persist stripe_customer_id: ${updateErr.message}`);
  }

  // Defensive re-read in case a concurrent request created its own
  // Customer first. Discarding our brand-new Customer is fine —
  // Stripe doesn't bill until you actually create a charge.
  const { data: again } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (again?.stripe_customer_id && again.stripe_customer_id !== customer.id) {
    console.warn(
      "[stripe-customer] race — keeping winning customer",
      { kept: again.stripe_customer_id, discarded: customer.id },
    );
    return again.stripe_customer_id;
  }

  return customer.id;
}
