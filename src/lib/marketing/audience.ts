// Marketing audience preference — homeowner vs installer.
//
// Pinned in a long-lived `pt_audience` cookie set by the proxy
// (src/proxy.ts) when the user navigates to a canonical-audience
// landing page (/, /enterprise, /pricing, /installer-signup). The
// MarketingHeader reads it via getAudienceFromCookie() when a page
// doesn't explicitly declare its audience.
//
// Why a cookie + path-derived setter (rather than a Server Action
// triggered by toggle clicks): the toggle is a plain <Link>, no JS
// or hydration. Visiting a canonical page just IS the toggle action.
// Navigation to /privacy or /blog leaves the cookie alone, so the
// last canonical audience visited persists across "ambiguous" pages.

import { cookies } from "next/headers";

export type MarketingAudience = "homeowner" | "installer";

/** Cookie name. Short to keep request headers slim. `pt_` namespace
 *  for "propertoasty" so it doesn't collide with any other cookie
 *  on the same domain. */
export const AUDIENCE_COOKIE = "pt_audience";

/** 180 days. The audience choice is a soft preference, not auth —
 *  long enough to persist across realistic visit gaps without making
 *  it impossible to reset. */
export const AUDIENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/**
 * Map a request path to its canonical audience. Returns null for
 * paths that don't have one (legal, AI statement, blog/[slug] etc.) —
 * those leave the cookie alone.
 */
export function audienceFromPath(path: string): MarketingAudience | null {
  if (path === "/") return "homeowner";
  if (path === "/blog" || path.startsWith("/blog/")) return "homeowner";
  if (path === "/enterprise") return "installer";
  if (path === "/pricing") return "installer";
  if (path === "/installer-signup" || path.startsWith("/installer-signup/")) {
    return "installer";
  }
  return null;
}

/**
 * Read the audience preference from the request cookies. Falls back
 * to "homeowner" when the cookie is absent or unrecognised — the
 * larger of the two audiences for new visitors.
 *
 * Async because Next 16's `cookies()` is async — must be awaited.
 */
export async function getAudienceFromCookie(): Promise<MarketingAudience> {
  const c = await cookies();
  const value = c.get(AUDIENCE_COOKIE)?.value;
  return value === "installer" ? "installer" : "homeowner";
}
