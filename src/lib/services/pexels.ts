// Thin Pexels API wrapper for the social-card route.
//
// Pexels license does NOT require attribution but we surface the
// photographer name in the response anyway — polite and useful if
// we later want to render "Photo: X on Pexels" in a corner.
//
// Free tier: 200 requests/hour, 20k/month. Our edge cache on the
// social-card route means most calls are cache hits — the API
// is only touched on cold cards.
//
// Docs: https://www.pexels.com/api/documentation/

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";

export type PexelsOrientation = "landscape" | "portrait" | "square";

export interface PexelsPhoto {
  url: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
}

interface PexelsRawPhoto {
  id: number;
  photographer: string;
  photographer_url: string;
  url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsSearchResponse {
  photos?: PexelsRawPhoto[];
  page?: number;
  per_page?: number;
  total_results?: number;
}

/**
 * Search Pexels for photos matching `query`, pick one
 * deterministically by hashing `seed` into an index. Same seed
 * = same photo. Different seeds = different photos in the same
 * result set, so the daily agent gets variety across posts
 * without hammering the API.
 *
 * Returns null on any failure — caller falls back to a local
 * hero image.
 */
export async function pickPhotoDeterministic(args: {
  query: string;
  orientation: PexelsOrientation;
  seed: string;
  /** How many photos to include in the candidate pool. Larger =
   *  more variety but wider quality spread. 15 is a good balance
   *  for search terms that return dozens of usable results. */
  perPage?: number;
}): Promise<PexelsPhoto | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    console.warn("[pexels] PEXELS_API_KEY not set — falling back");
    return null;
  }
  const perPage = args.perPage ?? 15;
  const url = `${PEXELS_ENDPOINT}?query=${encodeURIComponent(
    args.query,
  )}&per_page=${perPage}&orientation=${args.orientation}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: key },
      // Edge runtime is happy with this. No need for a body-timeout
      // — Vercel's function timeout catches us if Pexels stalls.
    });
    if (!res.ok) {
      console.warn("[pexels] HTTP", res.status);
      return null;
    }
    const body = (await res.json()) as PexelsSearchResponse;
    const photos = body.photos ?? [];
    if (photos.length === 0) {
      console.warn("[pexels] empty result set for", args.query);
      return null;
    }
    const idx = hashToIndex(args.seed, photos.length);
    const p = photos[idx];
    // Use large2x (~1880px wide) — Satori will resize down to the
    // card canvas. Original is often 3000px+ and wastes bandwidth.
    return {
      url: p.src.large2x,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      pexelsUrl: p.url,
    };
  } catch (err) {
    console.warn("[pexels] fetch failed", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Deterministic string→[0, n) hash. FNV-1a variant, cheap enough
 * for edge runtime + no Node crypto required. Not cryptographic;
 * fine for picking one of N photos.
 */
function hashToIndex(seed: string, n: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % Math.max(1, n);
}
