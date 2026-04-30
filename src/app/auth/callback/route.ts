import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Honour an explicit `?next=` if the original sign-in flow set one
  // (e.g. middleware redirected the user from a deep link). Otherwise
  // route by role.
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`);
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
