// Get-or-create the Stripe Customer for a Propertoasty user.
//
// We attach every credit-pack Checkout to a Customer so that:
//   1. Future off-session recharges (C2 auto top-up) can charge the
//      saved card without redirecting the user to Stripe again.
//   2. All purchases line up under one Stripe entity for support /
//      reconciliation.
//
// users.stripe_customer_id is the source of truth. If it's set AND
// Stripe still recognises the id we re-use it; otherwise we self-heal
// by creating a fresh Customer and persisting the new id.
//
// Why the validation matters: an orphaned id sneaks in whenever the
// Stripe key gets switched between modes (test ↔ live), the Customer
// gets deleted in the dashboard, or the row was copied between
// Stripe accounts. Without the check, every subsequent checkout
// would 400 with "No such customer" and the user would be stuck.

import type Stripe from "stripe";
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

  // Fast path: customer already on file. Validate it with Stripe
  // before trusting it — orphaned ids cause every downstream call
  // to fail until a human clears the column.
  const { data: existing, error: lookupErr } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (lookupErr) {
    throw new Error(`user lookup failed: ${lookupErr.message}`);
  }
  if (existing?.stripe_customer_id) {
    const validated = await retrieveValidCustomer(existing.stripe_customer_id);
    if (validated) {
      return validated;
    }
    // Stale id — clear it and fall through to the create path. We
    // don't return here so the same call can recover.
    console.warn(
      "[stripe-customer] stored customer id is stale, recreating",
      { userId, staleId: existing.stripe_customer_id },
    );
    const { error: clearErr } = await admin
      .from("users")
      .update({ stripe_customer_id: null })
      .eq("id", userId)
      .eq("stripe_customer_id", existing.stripe_customer_id);
    if (clearErr) {
      // Soft fail — the create + persist below will hit the unique
      // index and we'll re-read whatever ended up there.
      console.warn(
        "[stripe-customer] could not clear stale id",
        clearErr.message,
      );
    }
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

// Retrieve a Customer from Stripe and treat the result as either
// "valid + return id" or "missing/deleted — caller should self-heal".
// Other Stripe errors (auth, network) bubble up as throws because
// we can't safely recreate without knowing they're truly orphaned.
async function retrieveValidCustomer(
  customerId: string,
): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) {
      return null;
    }
    return customer.id;
  } catch (err) {
    // Stripe returns StripeInvalidRequestError with code 'resource_missing'
    // when the id is wrong (mode mismatch, deleted customer, different
    // account). That's the recoverable case.
    const stripeErr = err as Stripe.errors.StripeError;
    if (
      stripeErr.code === "resource_missing" ||
      stripeErr.statusCode === 404
    ) {
      return null;
    }
    // Anything else — re-throw. We don't want to silently mint a new
    // Customer if Stripe just had a transient outage.
    throw err;
  }
}
