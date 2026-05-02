import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeInstallerClaim } from "@/lib/installer-claim/complete-claim";

// GET /api/auth/post-signin-target
//
// Called by both the password sign-in flow + the auth callback to
// figure out where to send the user immediately after a successful
// authentication. Three jobs:
//
//   1. If the user has role='installer' or 'admin', return the
//      matching portal as the redirect target.
//
//   2. If the user has role='user' AND their email matches exactly
//      one unclaimed installer in the directory, automatically
//      complete the F2 binding using the email-match security
//      check baked into completeInstallerClaim. Then return
//      /installer.
//
//      This handles the common case where someone signed up via
//      /installer-signup but the bind didn't run during email
//      confirmation (e.g. they hit the existing-account sign-in
//      path which doesn't carry claim_installer_id forward).
//      Without this, they'd land on /dashboard with a "claim your
//      profile" CTA they have to click — which felt like the system
//      forgot what they signed up for.
//
//   3. Anything else → /dashboard.
//
// Auth: server-side session via the regular client. Returns 401 if
// not signed in. Otherwise always returns { ok: true, redirect }.

export const runtime = "nodejs";

interface TargetResponse {
  ok: boolean;
  redirect?: string;
  bound?: { installerId: number; companyName: string };
  error?: string;
}

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

export async function GET(): Promise<NextResponse<TargetResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<TargetResponse>(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  // Already an installer / admin — straight to the portal.
  if (profile?.role === "admin" || profile?.role === "installer") {
    return NextResponse.json<TargetResponse>({
      ok: true,
      redirect: landingForRole(profile.role),
    });
  }

  // Try to match an unclaimed installer by email. If exactly one
  // hit, auto-bind. Multiple matches → punt to /dashboard so the
  // user picks (the dashboard CTA only shows the first match anyway,
  // which is fine — collisions are rare).
  if (user.email) {
    const admin = createAdminClient();
    const { data: matches } = await admin
      .from("installers")
      .select("id, company_name")
      .ilike("email", user.email)
      .is("user_id", null)
      .limit(2);

    if (matches && matches.length === 1) {
      const target = matches[0]!;
      const result = await completeInstallerClaim({
        admin,
        userId: user.id,
        userEmail: user.email,
        installerId: target.id,
      });
      if (result.kind === "claimed") {
        console.log("[post-signin-target] auto-bound installer", {
          userId: user.id,
          installerId: target.id,
        });
        return NextResponse.json<TargetResponse>({
          ok: true,
          redirect: "/installer",
          bound: {
            installerId: target.id,
            companyName: result.companyName,
          },
        });
      }
      // Bind failed for some reason (race-lost, weird DB state).
      // Don't block the sign-in; let the dashboard CTA handle the
      // recovery. Log so we can spot patterns.
      console.warn("[post-signin-target] auto-bind failed", {
        userId: user.id,
        installerId: target.id,
        kind: result.kind,
      });
    }
  }

  return NextResponse.json<TargetResponse>({
    ok: true,
    redirect: landingForRole(profile?.role),
  });
}
