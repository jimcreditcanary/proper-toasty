import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Default landing path per role — when the caller didn't supply a
// `?next=` we want them to land somewhere sensible for who they are.
function landingForRole(role: string | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "installer":
      return "/installer";
    default:
      return "/dashboard";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  // ── F2: complete the installer claim if user_metadata says so ───
  // The /installer-signup form stashes the chosen installer's ID in
  // raw_user_meta_data.claim_installer_id at signUp() time. Now that
  // we know the user owns the email (they confirmed the link), bind
  // installers.user_id and bump the user's role to 'installer'.
  //
  // CAS pattern: only update where user_id is null. Two people racing
  // to claim the same profile means whichever one confirms first wins;
  // the other gets an "already claimed" view next time they hit
  // /installer-signup.
  let claimResult: ClaimOutcome = { kind: "no-claim" };
  const claimRaw = (data.user.user_metadata as Record<string, unknown> | null)
    ?.claim_installer_id;
  const claimId =
    typeof claimRaw === "number"
      ? claimRaw
      : typeof claimRaw === "string"
        ? Number(claimRaw)
        : null;
  if (claimId && Number.isFinite(claimId) && claimId > 0) {
    claimResult = await completeInstallerClaim({
      userId: data.user.id,
      userEmail: data.user.email ?? null,
      installerId: claimId,
    });
    // Best-effort: clear the metadata flag so a re-issued
    // confirmation can't re-trigger the claim. Failures are
    // non-fatal — the binding's done, the rest is hygiene.
    try {
      await supabase.auth.updateUser({
        data: { claim_installer_id: null },
      });
    } catch (e) {
      console.warn(
        "[auth/callback] could not clear claim_installer_id metadata",
        e instanceof Error ? e.message : e,
      );
    }
  }

  // Honour an explicit `?next=` if the original sign-in flow set one
  // (e.g. middleware redirected the user from a deep link). Otherwise
  // route by role.
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`);
  }

  // If we just successfully bound an installer, route them straight
  // to the installer portal regardless of what the role lookup says
  // (PostgREST may not have noticed the role flip yet).
  if (claimResult.kind === "claimed") {
    return NextResponse.redirect(`${origin}/installer`);
  }
  // If the claim failed because someone else got there first, send
  // the user to the installer-signup page with a flag so the page
  // can render an explanation.
  if (claimResult.kind === "race-lost") {
    return NextResponse.redirect(`${origin}/installer-signup?error=race_lost`);
  }

  // Look up the role to decide where to land. Anonymous fallback to
  // /dashboard so a brand-new account always lands somewhere even if
  // the row hasn't been linked yet.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle<{ role: string | null }>();

  return NextResponse.redirect(`${origin}${landingForRole(profile?.role)}`);
}

// ─── Installer claim binder ──────────────────────────────────────────

type ClaimOutcome =
  | { kind: "no-claim" }
  | { kind: "claimed"; installerId: number }
  | { kind: "race-lost"; reason: string }
  | { kind: "error"; reason: string };

async function completeInstallerClaim(args: {
  userId: string;
  userEmail: string | null;
  installerId: number;
}): Promise<ClaimOutcome> {
  const admin = createAdminClient();

  // Double-check the installer still exists + is unclaimed before we
  // try the update. Saves a confusing zero-row response when the row
  // disappeared (highly unlikely, but cheap to check).
  const { data: installer, error: lookupErr } = await admin
    .from("installers")
    .select("id, user_id, company_name")
    .eq("id", args.installerId)
    .maybeSingle<{ id: number; user_id: string | null; company_name: string }>();
  if (lookupErr || !installer) {
    console.warn("[auth/callback] claim target missing", {
      installerId: args.installerId,
      err: lookupErr?.message,
    });
    return { kind: "error", reason: "installer-missing" };
  }
  if (installer.user_id && installer.user_id !== args.userId) {
    console.log("[auth/callback] claim race lost — already bound", {
      installerId: args.installerId,
      ownerUserId: installer.user_id,
    });
    return { kind: "race-lost", reason: "already-claimed" };
  }
  if (installer.user_id === args.userId) {
    // Idempotent — a re-confirmation bringing them back through the
    // callback shouldn't error. Make sure their role is still
    // 'installer' and we're done.
    await admin
      .from("users")
      .update({ role: "installer" })
      .eq("id", args.userId)
      .neq("role", "installer");
    return { kind: "claimed", installerId: args.installerId };
  }

  // CAS — update only where user_id is still NULL. If a concurrent
  // confirmation got here first, this returns 0 rows.
  const claimedAt = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("installers")
    .update({ user_id: args.userId, claimed_at: claimedAt })
    .eq("id", args.installerId)
    .is("user_id", null)
    .select("id");
  if (updateErr) {
    console.error("[auth/callback] installer bind failed", {
      installerId: args.installerId,
      err: updateErr.message,
    });
    return { kind: "error", reason: updateErr.message };
  }
  if (!updated || updated.length === 0) {
    return { kind: "race-lost", reason: "concurrent-claim" };
  }

  // Bump role to 'installer' so middleware lets them into /installer.
  // The handle_new_user trigger created the public.users row at signup
  // with role='user' — flip it.
  const { error: roleErr } = await admin
    .from("users")
    .update({ role: "installer" })
    .eq("id", args.userId);
  if (roleErr) {
    console.error("[auth/callback] role flip failed", {
      userId: args.userId,
      err: roleErr.message,
    });
    // Don't unwind the bind — admins can fix the role manually if it
    // ever goes wrong. The bind is the harder thing to recover.
  }

  console.log("[auth/callback] installer claim completed", {
    userId: args.userId,
    userEmail: args.userEmail,
    installerId: args.installerId,
    company: installer.company_name,
  });

  return { kind: "claimed", installerId: args.installerId };
}
