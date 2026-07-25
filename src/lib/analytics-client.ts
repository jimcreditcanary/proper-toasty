// Client-side analytics helpers. Pairs with src/lib/analytics.ts —
// server-side track() is the canonical event API, this file just
// forwards from the browser to the beacon route at
// /api/telemetry/check-step (which then calls the typed track()).
//
// Anonymous identity comes from a UUID stored in localStorage under
// `pt_anon_id`. Generated on first call, reused thereafter so
// consecutive wizard steps stitch into the same PostHog distinct_id.
// We don't share the anon_id with the server session (auth users get
// a proper userId on capture); this is purely for pre-auth traffic.

"use client";

const ANON_ID_KEY = "pt_anon_id";

/** Lazy-generated anonymous UUID. Falls back to Math.random-based
 *  ID when crypto.randomUUID isn't available (very old browsers). */
export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(ANON_ID_KEY, fresh);
    return fresh;
  } catch {
    // Private-mode Safari denies localStorage. Fall back to an
    // ephemeral per-page ID — the funnel loses stitching for these
    // users but the event still fires and the step-viewed count
    // stays honest.
    return `ephemeral_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export interface CheckStepEventContext {
  from_presurvey_link?: boolean;
  from_installer_prebind?: boolean;
}

/** Fire a check-wizard step-viewed beacon. Fire-and-forget —
 *  never awaited, never surfaces errors to the user. Uses
 *  navigator.sendBeacon when available (survives page unload),
 *  falls back to fetch otherwise. */
export function logCheckStepViewed(
  step:
    | "address"
    | "preview"
    | "questions"
    | "floorplan"
    | "analysis"
    | "lead_capture"
    | "report",
  ctx: CheckStepEventContext = {},
): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    step,
    anon_id: getOrCreateAnonId(),
    from_presurvey_link: ctx.from_presurvey_link ?? false,
    from_installer_prebind: ctx.from_installer_prebind ?? false,
    // Drop query strings — referrer paths with tokens in them would
    // leak into PostHog. Keep same-origin paths only; cross-origin
    // referrers become null (privacy-friendly + more useful signal).
    referrer_path: sameOriginReferrerPath(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(
        "/api/telemetry/check-step",
        blob,
      );
      if (ok) return;
    }
  } catch {
    // Fall through to fetch.
  }

  // Fallback path — keepalive:true lets the browser flush the
  // request even if the tab is being closed.
  void fetch("/api/telemetry/check-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Swallow — we don't surface analytics failures to users.
  });
}

function sameOriginReferrerPath(): string | null {
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const url = new URL(ref);
    if (url.origin !== window.location.origin) return null;
    // Return the path only — never the query string (tokens leak).
    return url.pathname;
  } catch {
    return null;
  }
}
