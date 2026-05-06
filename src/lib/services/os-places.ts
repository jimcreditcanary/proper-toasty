// OS Places API — postcode → addresses (with UPRN, lat/lng).
//
// We hit https://api.os.uk/search/places/v1/postcode with the Project
// API Key as a query parameter. Server-side only — never ship the key
// to the browser, and never log it.
//
// Auth options OS supports:
//   1. ?key=<API_KEY>          ← what we use
//   2. OAuth2 (Bearer token)   ← unused; would also need OS_PLACES_API_SECRET
//
// The DPA dataset is Royal Mail PAF + AddressBase — postal addresses only,
// which is exactly what a homeowner expects in a "pick your address" picker.
// LPI also exists (every UPRN incl. sheds and outbuildings) but we don't
// want it surfacing to end users.
//
// Quotas: OS DataHub Premium plans get £1k/mo of free premium-data credit
// BUT OS Places is excluded from that credit because it embeds Royal Mail
// PAF data — a separate Royal Mail PAF Data Solutions Provider Licence
// applies. There's a free trial (commonly cited as ~2 months) for
// evaluation; after that, contact OS for commercial pricing.

import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import {
  OsPlacesPostcodeResponseSchema,
  type OsPlacesDpaRow,
} from "@/lib/schemas/os-places";

const OS_PLACES_BASE = "https://api.os.uk/search/places/v1/postcode";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — postcode → addresses is stable.

function requireKey(): string {
  const key = process.env.OS_PLACES_API_KEY;
  if (!key) throw new Error("OS_PLACES_API_KEY not set");
  return key;
}

function normalisePostcode(p: string): string {
  return p.trim().toUpperCase().replace(/\s+/g, "");
}

/** True when the OS_PLACES_API_KEY env var is set. Lets the caller
 *  decide between OS Places primary or Postcoder fallback at runtime. */
export function osPlacesConfigured(): boolean {
  return !!process.env.OS_PLACES_API_KEY;
}

/**
 * Look up addresses by postcode via OS Places.
 *
 * Returns the unwrapped DPA rows. Each row carries a real OS UPRN + WGS84
 * lat/lng for the property itself (not just the postcode centroid), which
 * is what the rest of the pipeline (EPC by UPRN, Solar by lat/lng) needs.
 */
export async function lookupAddressesByPostcode(
  postcode: string
): Promise<OsPlacesDpaRow[]> {
  const key = normalisePostcode(postcode);

  const cached = await cacheGet<OsPlacesDpaRow[]>("os-places:postcode", key);
  if (cached) return cached;

  // OS Places needs the postcode in its standard "OUTWARD INWARD" form
  // (e.g. "HX3 7DG"). It accepts the unspaced form too, but the spaced
  // version round-trips more reliably with their own caching layer.
  const spaced =
    key.length >= 5 ? `${key.slice(0, -3)} ${key.slice(-3)}` : key;

  const url = new URL(OS_PLACES_BASE);
  url.searchParams.set("postcode", spaced);
  url.searchParams.set("dataset", "DPA");
  url.searchParams.set("maxresults", "100");
  url.searchParams.set("key", requireKey());

  const res = await fetch(url.toString());
  // 400 with no results vs genuine bad postcode — OS returns 400 for
  // "no results" too. Treat as empty rather than throwing.
  if (res.status === 400 || res.status === 404) return [];
  if (res.status === 401 || res.status === 403) {
    throw new Error("OS Places rejected our request (auth / licence)");
  }
  if (res.status === 429) throw new Error("OS Places rate limit (429)");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OS Places failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const parsed = OsPlacesPostcodeResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("OS Places returned unexpected shape");
  }

  const rows: OsPlacesDpaRow[] = (parsed.data.results ?? [])
    .map((r) => r.DPA ?? r.LPI)
    .filter((r): r is OsPlacesDpaRow => r !== undefined);

  await cacheSet("os-places:postcode", key, rows, TTL_SECONDS);
  return rows;
}
