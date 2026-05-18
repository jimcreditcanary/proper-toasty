// Thin wrapper around the outreach_claim_founder_offer RPC.
//
// Called from /auth/callback (after a brand-new outreach signup
// confirms their email) and from /api/installer-signup/claim-as-self
// (when an already-signed-in user clicks the outreach link). Both
// paths first run completeInstallerClaim — that binds the installer
// + grants the +30 starter — then this fires to assign the tier.
//
// Idempotent: the RPC throws "recipient X has already claimed" on
// re-entry; the wrapper catches that as a soft-skip rather than
// surfacing it.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { verifyClaimToken } from "@/lib/outreach/claim-token";
import type { Tier } from "@/lib/outreach/tier-preview";

type AdminClient = SupabaseClient<Database>;

export type OutreachClaimOutcome =
  | { ok: true; tier: Tier; region: string; techBucket: string }
  | { ok: false; reason: "invalid_token" | "already_claimed" | "rpc_error"; error?: string };

export async function runOutreachClaim(args: {
  admin: AdminClient;
  userId: string;
  outreachToken: string;
}): Promise<OutreachClaimOutcome> {
  const recipientId = verifyClaimToken(args.outreachToken);
  if (!recipientId) {
    return { ok: false, reason: "invalid_token" };
  }

  const { data, error } = await args.admin.rpc(
    "outreach_claim_founder_offer",
    {
      p_recipient_id: recipientId,
      p_user_id: args.userId,
    },
  );
  if (error) {
    // The RPC throws on re-claim attempts ("already claimed"); treat
    // that as an idempotent no-op rather than surface as a failure.
    if (error.message?.toLowerCase().includes("already claimed")) {
      return { ok: false, reason: "already_claimed" };
    }
    console.error("[outreach/claim-rpc] failed", error);
    return { ok: false, reason: "rpc_error", error: error.message };
  }

  // Set-returning function — first row.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ok: false, reason: "rpc_error", error: "no row returned" };
  }
  return {
    ok: true,
    tier: row.tier as Tier,
    region: row.region as string,
    techBucket: row.tech_bucket as string,
  };
}
