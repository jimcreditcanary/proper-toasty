// Renamed from middleware.ts → proxy.ts in Next 16 — same shape, the
// `middleware` file convention is deprecated in favour of `proxy`.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  AUDIENCE_COOKIE,
  AUDIENCE_COOKIE_MAX_AGE,
  audienceFromPath,
} from "@/lib/marketing/audience";

// Routes that require a live Supabase session refresh.
// updateSession() writes Supabase auth-refresh cookies, which makes
// Next.js stamp the response `cache-control: private, no-cache,
// no-store, must-revalidate`. That's correct for authenticated routes
// (a logged-in user's response shouldn't end up in a shared CDN
// cache), but WRONG for public SEO pages — Bing in particular reads
// the headers as "personalised content, don't index" and refuses to
// crawl. So we gate the session check to auth-relevant paths only.
const AUTH_ROUTE_PREFIXES = [
  "/check",
  "/admin",
  "/installer",
  "/dashboard",
  "/auth",
  "/account",
];

function needsAuthSession(path: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/"),
  );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Safety-net for Supabase auth callbacks that land on the wrong path
  // (e.g. `?code=…` arriving at `/` instead of `/auth/callback`).
  // This used to live inside updateSession(); we lift it here so the
  // redirect still runs for paths that bypass the session update.
  const code = request.nextUrl.searchParams.get("code");
  if (code && !path.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get("next") ?? "/dashboard";
    url.pathname = "/auth/callback";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  // Public marketing/SEO pages skip the session check entirely —
  // they don't read auth state, and writing session cookies on them
  // makes the response uncacheable for crawlers + the Vercel edge
  // cache.
  const response = needsAuthSession(path)
    ? await updateSession(request)
    : NextResponse.next({ request });

  // Audience-preference cookie. When the user navigates to a canonical-
  // audience landing page (/ → homeowner, /enterprise → installer,
  // etc.), pin their preference for downstream pages that aren't
  // canonical (legal, AI statement). MarketingHeader reads this in
  // getAudienceFromCookie().
  //
  // CRITICAL — only set the cookie when the value would actually change.
  // Every set-cookie response triggers private/no-cache in Next.js,
  // which defeats CDN caching + crawler indexability. Setting the
  // cookie unconditionally on every `/` visit was the second
  // contributor (alongside the always-on Supabase session update) to
  // Bing's "URL cannot appear" diagnosis.
  const isRedirect = response.headers.has("location");
  const desiredAudience = audienceFromPath(path);
  const existingAudience = request.cookies.get(AUDIENCE_COOKIE)?.value;
  if (
    desiredAudience &&
    !isRedirect &&
    existingAudience !== desiredAudience
  ) {
    // Set on BOTH the request and the response. The request mutation
    // means the page rendering downstream sees the new value via
    // `cookies()` from `next/headers`. The response mutation persists
    // it back to the browser.
    request.cookies.set(AUDIENCE_COOKIE, desiredAudience);
    response.cookies.set(AUDIENCE_COOKIE, desiredAudience, {
      path: "/",
      sameSite: "lax",
      maxAge: AUDIENCE_COOKIE_MAX_AGE,
      // No `secure: true` here — cookie is non-sensitive (just a UI
      // preference). secure on dev means localhost can't see it.
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any path ending in a static-asset extension. `.ico` was
     *   missing from this list, which meant /installer/favicon.ico
     *   was being auth-gated (307 to /auth/login) instead of
     *   passing through to the rewrite rule that maps nested
     *   favicons back to the canonical /favicon.ico. Now covered.
     * - public folder
     * - API routes that use API key auth (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf)$).*)",
  ],
};
