// Renamed from middleware.ts → proxy.ts in Next 16 — same shape, the
// `middleware` file convention is deprecated in favour of `proxy`.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  AUDIENCE_COOKIE,
  AUDIENCE_COOKIE_MAX_AGE,
  audienceFromPath,
} from "@/lib/marketing/audience";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Audience-preference cookie. When the user navigates to a canonical-
  // audience landing page (/ → homeowner, /enterprise → installer,
  // etc.), pin their preference for downstream pages that aren't
  // canonical (legal, AI statement). MarketingHeader reads this in
  // getAudienceFromCookie().
  //
  // Skip for non-canonical paths so visits to /privacy don't reset
  // the user's last toggle choice. Skip for redirects too — Supabase
  // can return a redirect from updateSession (auth callback / role
  // gate) and we don't want to spray cookies on those responses.
  const isRedirect = response.headers.has("location");
  const audience = audienceFromPath(request.nextUrl.pathname);
  if (audience && !isRedirect) {
    // Set on BOTH the request and the response. The request mutation
    // means the page rendering downstream sees the new value via
    // `cookies()` from `next/headers`. The response mutation persists
    // it back to the browser.
    request.cookies.set(AUDIENCE_COOKIE, audience);
    response.cookies.set(AUDIENCE_COOKIE, audience, {
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
