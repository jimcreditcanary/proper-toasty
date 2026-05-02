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
// SECURITY — email-match enforcement:
//
//   The user's auth email MUST equal the installer record's email
//   on file (case-insensitive, trimmed). Without this, any signed-in
//   user could claim any installer in the directory just by knowing
//   the id (e.g. claim Octopus Energy from a personal account).
//
//   Edge cases:
//     - Installer has no email on file → claim is blocked. The user
//       is told to email support to verify ownership manually.
//     - Email mismatch → claim is blocked. We surface a *masked*
//       hint of the installer's address so a legit owner who's
//       changed email knows what's expected, without leaking the
//       full address to a probe.
//
//   This is intentionally strict for v1. Generic shared inboxes
//   (info@company.com) where the actual person uses bob@company.com
//   end up using the F3 admin-review path (/installer-signup/request)
//   to verify ownership.
//
// CAS pattern: update only where user_id is still NULL. Two callers
// racing for the same installer means whichever lands first wins;
// the other gets a "race-lost" outcome they can show in the UI.
//
// Idempotent: re-running with the same (userId, installerId) is a
// no-op (just confirms the role is set).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { maskEmail } from "@/lib/installer-claim/email-mask";

type AdminClient = SupabaseClient<Database>;

export type ClaimOutcome =
  | { kind: "claimed"; installerId: number; companyName: string }
  | { kind: "race-lost"; reason: string }
  | {
      kind: "email-mismatch";
      installerEmailHint: string | null;
      companyName: string;
    }
  | { kind: "no-email-on-file"; companyName: string }
  | { kind: "error"; reason: string };

export async function completeInstallerClaim(args: {
  admin: AdminClient;
  userId: string;
  /** The auth-confirmed email of the user attempting the claim. */
  userEmail: string;
  installerId: number;
}): Promise<ClaimOutcome> {
  const { admin, userId, userEmail, installerId } = args;

  const { data: installer, error: lookupErr } = await admin
    .from("installers")
    .select("id, user_id, company_name, email")
    .eq("id", installerId)
    .maybeSingle<{
      id: number;
      user_id: string | null;
      company_name: string;
      email: string | null;
    }>();
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

  // Email-match security check. Skip when we're just confirming an
  // existing self-bind (idempotent re-run) — the binding's already
  // done and the user is who they were before.
  if (installer.user_id !== userId) {
    const installerEmail = installer.email?.toLowerCase().trim() ?? null;
    const callerEmail = userEmail.toLowerCase().trim();
    if (!installerEmail) {
      console.warn("[claim] blocked — no email on installer record", {
        installerId,
        userId,
      });
      return {
        kind: "no-email-on-file",
        companyName: installer.company_name,
      };
    }
    if (installerEmail !== callerEmail) {
      console.warn("[claim] blocked — email mismatch", {
        installerId,
        userId,
        userEmail: callerEmail,
        // Don't log the installer's full email — masked is plenty
        // for support traceability without leaking PII.
        installerEmailMasked: maskEmail(installer.email),
      });
      return {
        kind: "email-mismatch",
        installerEmailHint: maskEmail(installer.email),
        companyName: installer.company_name,
      };
    }
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
