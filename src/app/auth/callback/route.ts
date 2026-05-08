import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  completeInstallerClaim,
  type ClaimOutcome,
} from "@/lib/installer-claim/complete-claim";

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
    // No code at all → genuine bad link. Hard error.
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    // Soft failure: code was present but exchange didn't yield a
    // session. The two common causes are both benign for the user:
    //
    //   - Email-scanner pre-fetch (Outlook ATP / Defender Safe Links,
    //     Gmail link-checker) hit the URL before the human did and
    //     consumed the code. The email is still confirmed — the
    //     scanner just stole the session.
    //
    //   - User signed up in browser A, opened the email in browser B
    //     (or an in-app webview). PKCE flow needs the code-verifier
    //     from the original browser's localStorage; absent that, the
    //     exchange fails. Email is still confirmed.
    //
    // In both cases the right response is "your account is ready,
    // please sign in" — not the alarming "didn't go through" copy
    // which suggests something is broken. We surface a different
    // error code so the login page can flash the gentler message.
    console.warn("[auth/callback] code exchange failed", {
      msg: error?.message,
      hasUser: !!data.user,
    });
    return NextResponse.redirect(
      `${origin}/auth/login?error=callback_link_consumed`,
    );
  }

  // ── F2: complete the installer claim if user_metadata says so ───
  // The /installer-signup form stashes the chosen installer's ID in
  // raw_user_meta_data.claim_installer_id at signUp() time. Now that
  // we know the user owns the email (they confirmed the link), bind
  // installers.user_id and bump the user's role to 'installer'.
  let claimResult: ClaimOutcome | null = null;
  const claimRaw = (data.user.user_metadata as Record<string, unknown> | null)
    ?.claim_installer_id;
  const claimId =
    typeof claimRaw === "number"
      ? claimRaw
      : typeof claimRaw === "string"
        ? Number(claimRaw)
        : null;
  if (claimId && Number.isFinite(claimId) && claimId > 0) {
    const admin = createAdminClient();
    claimResult = await completeInstallerClaim({
      admin,
      userId: data.user.id,
      userEmail: data.user.email ?? "",
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
  if (claimResult?.kind === "claimed") {
    return NextResponse.redirect(`${origin}/installer`);
  }
  if (claimResult?.kind === "race-lost") {
    return NextResponse.redirect(`${origin}/installer-signup?error=race_lost`);
  }
  if (claimResult?.kind === "email-mismatch") {
    return NextResponse.redirect(
      `${origin}/installer-signup?id=${claimId}&error=email_mismatch`,
    );
  }
  if (claimResult?.kind === "no-email-on-file") {
    return NextResponse.redirect(
      `${origin}/installer-signup?id=${claimId}&error=no_email`,
    );
  }

  // Look up the role to decide where to land. Also check for an
  // email-matching unclaimed installer + auto-bind if found —
  // covers the case where a brand-new user confirmed their email
  // but the metadata-driven claim above didn't run (e.g. metadata
  // was cleared, signup happened via /auth/login rather than
  // /installer-signup).
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle<{ role: string | null }>();

  if (
    profile?.role !== "admin" &&
    profile?.role !== "installer" &&
    data.user.email
  ) {
    const admin = createAdminClient();
    const { data: matches } = await admin
      .from("installers")
      .select("id, company_name")
      .ilike("email", data.user.email)
      .is("user_id", null)
      .limit(2);
    if (matches && matches.length === 1) {
      const target = matches[0]!;
      const result = await completeInstallerClaim({
        admin,
        userId: data.user.id,
        userEmail: data.user.email,
        installerId: target.id,
      });
      if (result.kind === "claimed") {
        console.log("[auth/callback] auto-bound matching installer", {
          userId: data.user.id,
          installerId: target.id,
        });
        return NextResponse.redirect(`${origin}/installer`);
      }
      console.warn("[auth/callback] auto-bind failed", {
        userId: data.user.id,
        installerId: target.id,
        kind: result.kind,
      });
    }
  }

  return NextResponse.redirect(`${origin}${landingForRole(profile?.role)}`);
}
