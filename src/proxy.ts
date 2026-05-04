// Renamed from middleware.ts → proxy.ts in Next 16 — same shape, the
// `middleware` file convention is deprecated in favour of `proxy`.
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
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
