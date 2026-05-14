// Google Places API — on-demand reviews lookup with 30-day caching.
//
// Approach:
//   - Installer cards on town pages trigger a batch fetch via the
//     /api/installers/google-refresh endpoint. The endpoint reads the
//     cached row first; if fresh (≤ 30 days), returns immediately.
//     Otherwise it kicks off a Places API call and writes the result.
//
//   - Two-stage resolution:
//       1) If google_place_id is null, do Text Search by company_name
//          + postcode to discover it. place_id is stable across business
//          lifecycle changes (only Google merge/split actions invalidate
//          it), so we cache it indefinitely.
//       2) With place_id, do Place Details to fetch rating +
//          userRatingCount. Cached 30 days.
//
//   - Conservative field masks. Place Details is billed per field-mask
//     tier; we only request rating + userRatingCount (the "Atmosphere"
//     basic tier, ~$5/1k requests).
//
// CRITICAL — Google Maps Platform ToS:
//   - We may cache rating / userRatingCount for up to 30 days.
//   - We must show "Powered by Google" attribution near the data when
//     displayed (handled in the installer card component).
//   - place_id may be cached indefinitely.
//   - Review TEXT has a stricter 24-hour caching limit — we don't
//     fetch review text, only the aggregate rating + count.
//
// References:
//   - Places API (New): https://developers.google.com/maps/documentation/places/web-service/op-overview
//   - Text Search: https://developers.google.com/maps/documentation/places/web-service/text-search
//   - Place Details: https://developers.google.com/maps/documentation/places/web-service/place-details
//   - Pricing + field masks: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

import { createAdminClient } from "@/lib/supabase/admin";

const PLACES_BASE = "https://places.googleapis.com/v1";
const CACHE_TTL_DAYS = 30;

export interface GoogleReviewsResult {
  /** 0–5, null if unknown */
  rating: number | null;
  /** total user reviews, null if unknown */
  reviewCount: number | null;
  /** stable Google handle — persist when resolved, reuse forever */
  placeId: string | null;
  /** 'ok' | 'not_found' | 'quota_exceeded' | 'error: ...' */
  status: string;
}

export interface CachedGoogleReview {
  rating: number | null;
  reviewCount: number | null;
  placeId: string | null;
  capturedAt: string | null;
  status: string | null;
}

function requireKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key || key.trim() === "") {
    throw new Error("GOOGLE_MAPS_SERVER_KEY not set");
  }
  return key;
}

/**
 * Cache TTL check — true means we should refetch.
 * Used by the API endpoint to short-circuit fresh rows.
 */
export function shouldRefreshGoogle(capturedAt: string | null): boolean {
  if (!capturedAt) return true;
  const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(capturedAt).getTime() < cutoff;
}

/**
 * Stage 1: resolve company_name + postcode to a Places place_id via
 * Text Search. Returns null place_id if no match. Never throws —
 * always returns a result with a meaningful status.
 */
async function resolvePlaceId(
  companyName: string,
  postcode: string | null,
): Promise<{ placeId: string | null; status: string }> {
  const query = postcode
    ? `${companyName} ${postcode}`
    : companyName;

  const url = `${PLACES_BASE}/places:searchText`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": requireKey(),
        // Field mask narrows pricing + payload to just the IDs.
        "X-Goog-FieldMask": "places.id,places.displayName",
      },
      body: JSON.stringify({
        textQuery: query,
        // Bias toward UK results since all our installers are UK-based.
        regionCode: "GB",
        // Cap response size; we only need the top candidate.
        pageSize: 1,
      }),
    });
  } catch (err) {
    return {
      placeId: null,
      status: `error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (res.status === 429) {
    return { placeId: null, status: "quota_exceeded" };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      placeId: null,
      status: `error: search ${res.status} ${body.slice(0, 120)}`,
    };
  }

  let json: { places?: Array<{ id?: string; displayName?: unknown }> };
  try {
    json = await res.json();
  } catch {
    return { placeId: null, status: "error: search invalid JSON" };
  }

  const top = json.places?.[0];
  if (!top || !top.id) {
    return { placeId: null, status: "not_found" };
  }
  return { placeId: top.id, status: "ok" };
}

/**
 * Stage 2: given a place_id, fetch rating + userRatingCount via Place
 * Details with a narrow field mask. Never throws.
 */
async function fetchPlaceDetails(
  placeId: string,
): Promise<{ rating: number | null; reviewCount: number | null; status: string }> {
  // Place Details "lookup" endpoint: GET /v1/places/{PLACE_ID}
  // FieldMask determines billing tier — rating + userRatingCount are
  // the Atmosphere fields.
  const url = `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": requireKey(),
        "X-Goog-FieldMask": "rating,userRatingCount",
      },
    });
  } catch (err) {
    return {
      rating: null,
      reviewCount: null,
      status: `error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (res.status === 404) {
    // place_id no longer valid — Google may have merged/split the
    // business. The caller should re-resolve next refresh.
    return { rating: null, reviewCount: null, status: "not_found" };
  }
  if (res.status === 429) {
    return { rating: null, reviewCount: null, status: "quota_exceeded" };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      rating: null,
      reviewCount: null,
      status: `error: details ${res.status} ${body.slice(0, 120)}`,
    };
  }

  let json: { rating?: number; userRatingCount?: number };
  try {
    json = await res.json();
  } catch {
    return { rating: null, reviewCount: null, status: "error: details invalid JSON" };
  }

  const rating =
    typeof json.rating === "number" && json.rating >= 0 && json.rating <= 5
      ? Math.round(json.rating * 10) / 10
      : null;
  const reviewCount =
    typeof json.userRatingCount === "number" && json.userRatingCount >= 0
      ? Math.floor(json.userRatingCount)
      : null;

  // A business that exists but has 0 reviews returns rating=undefined
  // + userRatingCount=undefined (Google omits the field). Treat that
  // as "not_found" for display purposes — we don't show "no reviews".
  if (rating == null || reviewCount == null || reviewCount === 0) {
    return { rating: null, reviewCount: null, status: "not_found" };
  }

  return { rating, reviewCount, status: "ok" };
}

/**
 * One-shot lookup combining stage 1 + 2.
 *
 * If cachedPlaceId is provided we skip the Text Search and go straight
 * to Place Details. If Place Details returns not_found (e.g. business
 * merged/closed), we DO re-resolve and try once more — that's the
 * "graceful re-resolve on 404" pattern.
 */
export async function fetchGoogleReviewsForInstaller(input: {
  companyName: string;
  postcode: string | null;
  cachedPlaceId: string | null;
}): Promise<GoogleReviewsResult> {
  // Stage 1 (only when needed)
  let placeId = input.cachedPlaceId;
  if (!placeId) {
    const resolved = await resolvePlaceId(input.companyName, input.postcode);
    if (resolved.status !== "ok" || !resolved.placeId) {
      return {
        rating: null,
        reviewCount: null,
        placeId: null,
        status: resolved.status,
      };
    }
    placeId = resolved.placeId;
  }

  // Stage 2
  let details = await fetchPlaceDetails(placeId);

  // If a cached place_id 404s, try once more with a fresh resolve.
  if (details.status === "not_found" && input.cachedPlaceId) {
    const resolved = await resolvePlaceId(input.companyName, input.postcode);
    if (resolved.status === "ok" && resolved.placeId && resolved.placeId !== input.cachedPlaceId) {
      placeId = resolved.placeId;
      details = await fetchPlaceDetails(placeId);
    }
  }

  return {
    rating: details.rating,
    reviewCount: details.reviewCount,
    placeId,
    status: details.status,
  };
}

/**
 * Persist the result. Always called after a fetch attempt, even on
 * failure, so we don't immediately re-attempt (the 30-day TTL applies
 * to FAILED lookups too — Google just doesn't have data for them).
 */
export async function persistGoogleResult(
  installerId: number,
  result: GoogleReviewsResult,
): Promise<void> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("installers")
    .update({
      google_place_id: result.placeId,
      google_rating: result.rating,
      google_review_count: result.reviewCount,
      google_captured_at: new Date().toISOString(),
      google_status: result.status,
    })
    .eq("id", installerId);
}
