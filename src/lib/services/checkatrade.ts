// Checkatrade reviews — best-effort lookup with 90-day caching.
//
// Approach:
//   - Rendered installer cards trigger an on-demand fetch via the
//     /api/installers/checkatrade-refresh endpoint. The endpoint
//     reads the cached row first; if the row is fresh (≤ 90 days)
//     it returns immediately. Otherwise it kicks off a scrape and
//     returns the cached value (possibly null) so the UI doesn't
//     wait — the next render gets the new data.
//
//   - The scraper itself (fetchCheckatradeForInstaller) is best-
//     effort. Checkatrade doesn't publish an API and their pages are
//     JS-rendered, so we attempt to hit their public search endpoint
//     and parse what we can. If the scrape fails for any reason we
//     still write a row to the DB so we don't try again immediately.
//
// IMPORTANT — CAVEATS:
//   1. Checkatrade's TOS may prohibit scraping. This is a placeholder
//      implementation. Before relying on it for production, either:
//        - Get explicit permission from Checkatrade, OR
//        - Switch to a paid API (Trustpilot has one, ~£6k/yr), OR
//        - Use a different review source you control (e.g. on-platform
//          reviews from your own homeowners after they've contacted
//          an installer).
//
//   2. The actual HTTP call is intentionally optimistic — Checkatrade
//      may block the request (Cloudflare bot detection, etc). Cache
//      writes set checkatrade_status to a string we can dashboard
//      ('ok' | 'not_found' | 'blocked' | 'error: ...').

import { createAdminClient } from "@/lib/supabase/admin";

export interface CheckatradeResult {
  score: number | null;        // 0–5, null if unknown
  reviewCount: number | null;  // null if unknown
  url: string | null;          // canonical Checkatrade URL if matched
  status: string;              // 'ok' | 'not_found' | 'blocked' | 'error: ...'
}

const CACHE_TTL_DAYS = 90;

export interface CachedReview {
  score: number | null;
  reviewCount: number | null;
  url: string | null;
  fetchedAt: string | null;
  status: string | null;
}

// Check the cache + decide whether to refetch. Returns the cached value
// and a flag indicating whether the caller should fire a background
// refresh.
export function shouldRefresh(fetchedAt: string | null): boolean {
  if (!fetchedAt) return true;
  const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(fetchedAt).getTime() < cutoff;
}

// Best-effort scrape. Returns a result with status indicating outcome.
// Never throws — always returns a writable result so we can persist
// the attempt.
export async function fetchCheckatradeForInstaller(input: {
  companyName: string;
  postcode: string | null;
}): Promise<CheckatradeResult> {
  const query = encodeURIComponent(
    `${input.companyName}${input.postcode ? ` ${input.postcode}` : ""}`,
  );
  const searchUrl = `https://www.checkatrade.com/search?keywords=${query}`;

  let res: Response;
  try {
    res = await fetch(searchUrl, {
      // A realistic UA reduces (but doesn't eliminate) bot blocks.
      // Checkatrade's WAF can still 403 us.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    return {
      score: null,
      reviewCount: null,
      url: null,
      status: `error: ${e instanceof Error ? e.message : "fetch failed"}`,
    };
  }

  if (res.status === 403 || res.status === 401 || res.status === 429) {
    return { score: null, reviewCount: null, url: null, status: "blocked" };
  }
  if (res.status === 404) {
    return { score: null, reviewCount: null, url: null, status: "not_found" };
  }
  if (!res.ok) {
    return {
      score: null,
      reviewCount: null,
      url: null,
      status: `error: http_${res.status}`,
    };
  }

  let html: string;
  try {
    html = await res.text();
  } catch {
    return {
      score: null,
      reviewCount: null,
      url: null,
      status: "error: read failed",
    };
  }

  // Checkatrade's search results are JS-rendered. The initial HTML
  // contains some JSON-LD + meta tags but rarely the actual rating.
  // Look for __NEXT_DATA__ which their app embeds.
  //
  // The shape changes — we look for any "averageRating" / "reviewCount"
  // / "url" keys in the embedded JSON. If we find a top result with a
  // rating, we use it. If not, fall back to "no_data" status (cached
  // 90 days so we don't keep retrying).
  const nextDataMatch = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!nextDataMatch) {
    return {
      score: null,
      reviewCount: null,
      url: null,
      status: "no_data",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(nextDataMatch[1]);
  } catch {
    return {
      score: null,
      reviewCount: null,
      url: null,
      status: "error: json parse",
    };
  }

  // Walk the parsed JSON looking for the first object that looks like
  // a search result with averageRating/reviewCount. Recursive but
  // bounded by depth.
  const top = findFirstResult(parsed, 0);
  if (!top) {
    return {
      score: null,
      reviewCount: null,
      url: null,
      status: "no_match",
    };
  }

  return {
    score: top.score,
    reviewCount: top.reviewCount,
    url: top.url,
    status: "ok",
  };
}

interface ResultLike {
  score: number | null;
  reviewCount: number | null;
  url: string | null;
}

function findFirstResult(node: unknown, depth: number): ResultLike | null {
  if (depth > 8 || node == null) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findFirstResult(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  // Heuristic: a node is a "result" if it has both a numeric rating
  // field and a URL/slug. Field names vary across page versions.
  const score = num(obj.averageRating ?? obj.rating ?? obj.score);
  const reviewCount = num(
    obj.reviewCount ?? obj.totalReviews ?? obj.numberOfReviews,
  );
  const slug = str(obj.slug ?? obj.url ?? obj.profileUrl);

  if (score != null && (reviewCount != null || slug)) {
    return {
      score: clampScore(score),
      reviewCount: reviewCount ?? null,
      url: slug ? canonicaliseUrl(slug) : null,
    };
  }

  for (const v of Object.values(obj)) {
    const r = findFirstResult(v, depth + 1);
    if (r) return r;
  }
  return null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function clampScore(n: number): number | null {
  // Some endpoints return 0–10; rescale.
  if (n > 5) n = n / 2;
  if (n < 0 || n > 5) return null;
  return Math.round(n * 10) / 10;
}

function canonicaliseUrl(slugOrUrl: string): string {
  if (slugOrUrl.startsWith("http")) return slugOrUrl;
  if (slugOrUrl.startsWith("/")) return `https://www.checkatrade.com${slugOrUrl}`;
  return `https://www.checkatrade.com/trades/${slugOrUrl}`;
}

// Persist the result. Always called after a fetch attempt, even on
// failure, so we don't immediately re-attempt (the 90-day TTL applies
// to FAILED looks too — Checkatrade just doesn't have data for them).
export async function persistCheckatradeResult(
  installerId: number,
  result: CheckatradeResult,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("installers")
    .update({
      checkatrade_score: result.score,
      checkatrade_review_count: result.reviewCount,
      checkatrade_url: result.url,
      checkatrade_status: result.status,
      checkatrade_fetched_at: new Date().toISOString(),
    })
    .eq("id", installerId);
}
