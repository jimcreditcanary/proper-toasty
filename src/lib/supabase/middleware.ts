import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Roles we know about today. Anything else (or no row at all) gets
// treated as 'user' — the lowest-trust state.
type AppRole = "admin" | "user" | "installer";

const ADMIN_PATH = "/admin";
const INSTALLER_PATH = "/installer";
const DASHBOARD_PATH = "/dashboard";

export async function updateSession(request: NextRequest) {
  // Safety net: a Supabase auth confirmation can land on the wrong path
  // (e.g. `/` instead of `/auth/callback`) when the email's `redirect_to`
  // wasn't whitelisted. If we see a `?code=` on any non-auth route, forward
  // to the callback so the session exchange actually runs.
  const path = request.nextUrl.pathname;
  const code = request.nextUrl.searchParams.get("code");
  if (code && !path.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get("next") ?? "/dashboard";
    url.pathname = "/auth/callback";
    // Keep `code`; rewrite anything else to a clean `next`
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedPath =
    path.startsWith(DASHBOARD_PATH) ||
    path.startsWith(ADMIN_PATH) ||
    path.startsWith(INSTALLER_PATH);

  // Unauthenticated request to a protected path → push to login.
  if (!user && isProtectedPath && !path.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Logged in + hitting an admin or installer portal → enforce role.
  // We only do the DB lookup when it matters (the role-gated paths) so
  // every other request stays on the cheap auth-only path.
  if (user && (path.startsWith(ADMIN_PATH) || path.startsWith(INSTALLER_PATH))) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, blocked")
      .eq("id", user.id)
      .maybeSingle<{ role: AppRole | null; blocked: boolean | null }>();

    const role = (profile?.role ?? "user") as AppRole;
    const blocked = profile?.blocked === true;

    // Blocked users see nothing. Send them home with a flag.
    if (blocked) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("error", "blocked");
      return NextResponse.redirect(url);
    }

    if (path.startsWith(ADMIN_PATH) && role !== "admin") {
      // Installer trying to reach /admin → bounce to their portal.
      // Plain user trying to reach /admin → /dashboard (fallback).
      const url = request.nextUrl.clone();
      url.pathname = role === "installer" ? INSTALLER_PATH : DASHBOARD_PATH;
      return NextResponse.redirect(url);
    }

    if (
      path.startsWith(INSTALLER_PATH) &&
      role !== "installer" &&
      role !== "admin"
    ) {
      // Plain user trying to reach /installer → /dashboard.
      // (Admins can use /installer too — handy for support.)
      const url = request.nextUrl.clone();
      url.pathname = DASHBOARD_PATH;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
