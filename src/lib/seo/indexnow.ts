// IndexNow — instant URL submission to Bing (+ Yandex, Seznam, Naver …).
//
// IndexNow lets us PUSH new/changed URLs to participating engines the
// moment content changes, instead of waiting for a crawl. Google does
// NOT use IndexNow, so this is a Bing-family win only.
//
// Setup:
//   - INDEX_NOW_KEY env var holds the key (set in Vercel).
//   - The key is served at https://www.propertoasty.com/<key>.txt via a
//     next.config rewrite → /api/indexnow-key (so engines can verify
//     ownership).
//   - pingIndexNow() POSTs a URL list to api.indexnow.org, which fans it
//     out to all participating engines.
//
// Fire-and-forget: callers should `void pingIndexNow(...)` without
// awaiting in a request hot path — a slow/failed submit must never block
// or fail the user's action. Errors are swallowed (logged).

import { ORG_PROFILE } from "./org-profile";

const ENDPOINT = "https://api.indexnow.org/indexnow";
// IndexNow caps a single submission at 10,000 URLs.
const MAX_URLS = 10_000;

/** True when IndexNow is configured (key present). */
export function indexNowEnabled(): boolean {
  return Boolean(process.env.INDEX_NOW_KEY);
}

/**
 * Submit one or more absolute URLs to IndexNow. No-ops when the key is
 * unset (dev / preview) or the list is empty. Never throws.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEX_NOW_KEY;
  if (!key) return;

  const origin = ORG_PROFILE.url.replace(/\/+$/, "");
  const host = new URL(origin).host;
  // Only submit URLs on our own host (IndexNow rejects cross-host) and
  // de-dupe.
  const list = Array.from(
    new Set(
      urls.filter((u) => typeof u === "string" && u.startsWith(`${origin}/`)),
    ),
  ).slice(0, MAX_URLS);
  if (list.length === 0) return;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${origin}/${key}.txt`,
        urlList: list,
      }),
    });
    if (!res.ok) {
      console.warn(`[indexnow] submit returned ${res.status} for ${list.length} url(s)`);
    }
  } catch (e) {
    console.warn(
      "[indexnow] submit failed",
      e instanceof Error ? e.message : e,
    );
  }
}
