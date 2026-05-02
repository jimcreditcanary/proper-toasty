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
import { track, identify } from "@/lib/analytics";
import { INSTALLER_FREE_STARTER_CREDITS } from "@/lib/booking/credits";
import { sendEmail } from "@/lib/email/client";
import { buildInstallerWelcomeEmail } from "@/lib/email/templates/installer-welcome";

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

  // Free starter credits — first-claim only. Race-safe via the
  // IS NULL guard in the WHERE clause: if a parallel claim somehow
  // also fired (shouldn't happen given we just won the CAS above
  // on the installer row, but defence in depth), only one will see
  // a null `installer_starter_credits_granted_at` and apply the
  // grant. Failures here don't fail the claim — the installer is
  // still bound, they just don't get the freebie. We log and
  // monitor.
  const grantedNow = await grantStarterCreditsIfFirstClaim(admin, userId);

  // Welcome email — fire only if we just granted the credits, so
  // the email is genuinely a first-time-claim moment (re-claims
  // after disconnect/reconnect don't re-spam). Fire-and-forget +
  // fail-soft: if Postmark errors, we log + carry on rather than
  // failing the claim.
  if (grantedNow) {
    void sendWelcomeEmail({ admin, userId, installer });
  }

  // Activation event — fired exactly once per (user, installer)
  // pair. identify() sets installer-level attributes that persist
  // across all subsequent events from this user, so dashboards can
  // group by company without a join.
  identify({
    userId,
    properties: {
      role: "installer",
      installer_id: installerId,
      company_name: installer.company_name,
    },
  });
  track("installer_claim_completed", {
    props: {
      installer_id: installerId,
      company_name: installer.company_name,
    },
    userId,
  });

  return {
    kind: "claimed",
    installerId,
    companyName: installer.company_name,
  };
}

// ─── Starter-credits grant ──────────────────────────────────────────

/**
 * Returns true when this call was the one that actually granted +
 * stamped — caller uses it to decide whether to fire the welcome
 * email (we don't want to re-send on every reclaim).
 */
async function grantStarterCreditsIfFirstClaim(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  try {
    // Read current balance + grant flag in one shot.
    const { data: profile } = await admin
      .from("users")
      .select("credits, installer_starter_credits_granted_at")
      .eq("id", userId)
      .maybeSingle<{
        credits: number;
        installer_starter_credits_granted_at: string | null;
      }>();
    if (!profile) return false;
    if (profile.installer_starter_credits_granted_at) return false; // Already granted.

    const newBalance = (profile.credits ?? 0) + INSTALLER_FREE_STARTER_CREDITS;
    const grantedAt = new Date().toISOString();
    // CAS — only update if the column is still NULL. Beats the row-
    // lock race on identical-timestamp parallel claims.
    const { data: updated, error } = await admin
      .from("users")
      .update({
        credits: newBalance,
        installer_starter_credits_granted_at: grantedAt,
      })
      .eq("id", userId)
      .is("installer_starter_credits_granted_at", null)
      .select("id")
      .maybeSingle();
    if (error) {
      console.warn("[claim] starter credits grant failed", {
        userId,
        err: error.message,
      });
      return false;
    }
    if (!updated) {
      // Lost the CAS — another concurrent claim got there first.
      // Not an error, just means the grant already happened.
      return false;
    }
    console.log("[claim] starter credits granted", {
      userId,
      amount: INSTALLER_FREE_STARTER_CREDITS,
      newBalance,
    });
    return true;
  } catch (err) {
    console.warn("[claim] starter credits grant threw", {
      userId,
      err: err instanceof Error ? err.message : err,
    });
    return false;
  }
}

// ─── Welcome email ──────────────────────────────────────────────────

async function sendWelcomeEmail(args: {
  admin: SupabaseClient<Database>;
  userId: string;
  installer: { company_name: string; email: string | null };
}): Promise<void> {
  try {
    // Use the auth user's email — it's guaranteed present (the user
    // just signed in to claim) and is the address they actually
    // monitor. installers.email might be the company's general inbox
    // which they don't read.
    const { data } = await args.admin.auth.admin.getUserById(args.userId);
    const to = data?.user?.email;
    if (!to) {
      console.warn("[claim] welcome email skipped — no auth email", {
        userId: args.userId,
      });
      return;
    }

    // First name = first word of company name (best fallback we have
    // — we don't collect a personal name at signup time).
    const firstName = args.installer.company_name.split(/\s+/)[0] || "there";
    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
    ).replace(/\/+$/, "");

    const built = buildInstallerWelcomeEmail({
      firstName,
      companyName: args.installer.company_name,
      starterCredits: INSTALLER_FREE_STARTER_CREDITS,
      dashboardUrl: `${appBaseUrl}/installer`,
    });

    const sendResult = await sendEmail({
      to,
      subject: built.subject,
      html: built.html,
      text: built.text,
      tags: [
        { name: "kind", value: "installer-welcome" },
        { name: "userId", value: args.userId },
      ],
    });
    if (!sendResult.ok && !sendResult.skipped) {
      console.warn("[claim] welcome email send failed", {
        userId: args.userId,
        err: sendResult.error,
      });
    }
  } catch (err) {
    console.warn("[claim] welcome email threw", {
      userId: args.userId,
      err: err instanceof Error ? err.message : err,
    });
  }
}
