// Bind an installer record to a Propertoasty user account.
//
// Two callers today:
//
//   1. /auth/callback — runs after a brand-new user confirms their
//      email. The installer id arrives in user_metadata.claim_installer_id
//      from the F2 signup form.
//
//   2. /api/installer-signup/claim-as-self — runs when an existing
//      signed-in user clicks "Claim this profile" rather than going
//      through a fresh signup.
//
// CAS pattern: update only where user_id is still NULL. Two callers
// racing for the same installer means whichever lands first wins;
// the other gets a "race-lost" outcome they can show in the UI.
//
// Idempotent: re-running with the same (userId, installerId) is a
// no-op (just confirms the role is set).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export type ClaimOutcome =
  | { kind: "claimed"; installerId: number; companyName: string }
  | { kind: "race-lost"; reason: string }
  | { kind: "error"; reason: string };

export async function completeInstallerClaim(args: {
  admin: AdminClient;
  userId: string;
  installerId: number;
}): Promise<ClaimOutcome> {
  const { admin, userId, installerId } = args;

  const { data: installer, error: lookupErr } = await admin
    .from("installers")
    .select("id, user_id, company_name")
    .eq("id", installerId)
    .maybeSingle<{ id: number; user_id: string | null; company_name: string }>();
  if (lookupErr || !installer) {
    console.warn("[claim] target missing", {
      installerId,
      err: lookupErr?.message,
    });
    return { kind: "error", reason: "installer-missing" };
  }
  if (installer.user_id && installer.user_id !== userId) {
    console.log("[claim] race lost — already bound", {
      installerId,
      ownerUserId: installer.user_id,
    });
    return { kind: "race-lost", reason: "already-claimed" };
  }
  if (installer.user_id === userId) {
    // Idempotent re-claim. Belt-and-braces re-flip the role.
    await admin
      .from("users")
      .update({ role: "installer" })
      .eq("id", userId)
      .neq("role", "installer");
    return {
      kind: "claimed",
      installerId,
      companyName: installer.company_name,
    };
  }

  const claimedAt = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("installers")
    .update({ user_id: userId, claimed_at: claimedAt })
    .eq("id", installerId)
    .is("user_id", null)
    .select("id");
  if (updateErr) {
    console.error("[claim] bind failed", {
      installerId,
      err: updateErr.message,
    });
    return { kind: "error", reason: updateErr.message };
  }
  if (!updated || updated.length === 0) {
    return { kind: "race-lost", reason: "concurrent-claim" };
  }

  const { error: roleErr } = await admin
    .from("users")
    .update({ role: "installer" })
    .eq("id", userId);
  if (roleErr) {
    // Don't unwind the bind — admins can fix the role manually.
    console.error("[claim] role flip failed", {
      userId,
      err: roleErr.message,
    });
  }

  console.log("[claim] bound", {
    userId,
    installerId,
    company: installer.company_name,
  });
  return {
    kind: "claimed",
    installerId,
    companyName: installer.company_name,
  };
}
