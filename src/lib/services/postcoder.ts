// Postcoder NGD address lookup — postcode → addresses (with UPRN + lat/lng).
//
// Replaces the OS Places DPA lookup (Aug 2026): OS revoked our
// commercial access to the Places API, Postcoder gives us the same
// Royal Mail PAF + AddressBase-equivalent data through a single
// endpoint.
//
// Endpoint: https://ws.postcoder.com/pcw/{apikey}/ngd/{postcode}
//
// Auth: API key is a URL path segment, not a header or query param.
// We keep it server-side and never log it. If a request fails, the
// error message is scrubbed of the URL before it surfaces.
//
// Billing: every REQUEST costs 3.5 credits (regardless of how many
// addresses come back). Caching per-postcode for 30 days is therefore
// critical for cost — a busy postcode with 30 residents costs one
// request, not thirty. Postcode → address list is very stable so
// 30 days is safe.
//
// Query params we pin:
//   addtags = royalmailaddresses,planning
//     - royalmailaddresses: gives us addressline1..6, uprn, udprn,
//       buildingnumber, thoroughfare, subbuildingname, buildingname,
//       posttown, postcode, latitude, longitude, deliverypointsuffix.
//     - planning: gives us classificationcode, classificationdescription,
//       localcustodiancode, lowertierlocalauthoritygsscode.
//   lines = 4          — 4-line Royal Mail address (organisation +
//                        subbuilding + building + street). Enough
//                        for the wizard's addressLine1/line2 pair.
//   format = json      — default, made explicit.
//
// We do NOT pass `identifier` yet — if we later want per-brand or
// per-user attribution in Postcoder's usage dashboard, add it here.

import { cacheGet, cacheSet } from "@/lib/services/api-cache";

const POSTCODER_BASE = "https://ws.postcoder.com/pcw";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — postcode → addresses is stable

// ─── Response shape ──────────────────────────────────────────────
//
// Postcoder returns an array of address objects. We type only the
// fields we actually use — the raw object is kept in `metadata.raw`
// so downstream reads can pivot into new fields without a code
// change here.

export interface PostcoderNgdAddress {
  // Core fields (always present).
  uprn?: string | number | null;
  udprn?: string | number | null;
  parentuprn?: string | number | null;
  fulladdress?: string | null;
  summaryline?: string | null;
  postcode?: string | null;
  posttown?: string | null;
  country?: string | null; // "England" / "Wales" / "Scotland" / "Northern Ireland"
  latitude?: number | null;
  longitude?: number | null;

  // royalmailaddresses addtag.
  addressline1?: string | null;
  addressline2?: string | null;
  addressline3?: string | null;
  addressline4?: string | null;
  organisationname?: string | null;
  subbuildingname?: string | null;
  buildingname?: string | null;
  buildingnumber?: string | null;
  dependentthoroughfare?: string | null;
  thoroughfare?: string | null;
  deliverypointsuffix?: string | null;

  // planning addtag.
  classificationcode?: string | null;
  classificationdescription?: string | null;
  localcustodiancode?: number | string | null;
  localcustodiandescription?: string | null;
  lowertierlocalauthoritygsscode?: string | null;

  // Escape hatch — anything else Postcoder returns.
  [k: string]: unknown;
}

// ─── Config guard ────────────────────────────────────────────────

function requireKey(): string {
  const key = process.env.POSTCODER_API_KEY;
  if (!key) throw new Error("POSTCODER_API_KEY not set");
  return key;
}

export function postcoderConfigured(): boolean {
  return !!process.env.POSTCODER_API_KEY;
}

function normalisePostcode(p: string): string {
  return p.trim().toUpperCase().replace(/\s+/g, "");
}

// ─── Lookup ──────────────────────────────────────────────────────

/**
 * Look up addresses by UK postcode via Postcoder NGD.
 *
 * Returns the raw address rows (typed loosely — see PostcoderNgdAddress).
 * Cached for 30 days per normalised postcode. A cache hit costs 0
 * credits; a miss costs 3.5.
 *
 * On upstream failure, throws with the sanitised URL (API key stripped)
 * so the /api/address/lookup route can echo a diagnostic without
 * leaking the credential.
 */
export async function lookupAddressesByPostcode(
  postcode: string,
): Promise<PostcoderNgdAddress[]> {
  const cacheKey = normalisePostcode(postcode);

  // Cache first — free.
  const cached = await cacheGet<PostcoderNgdAddress[]>(
    "postcoder:ngd",
    cacheKey,
  );
  if (cached) return cached;

  const key = requireKey();

  // Postcoder wants the postcode URL-encoded. We keep the space for
  // readability in the outbound URL — encodeURIComponent handles it.
  const humanPostcode = `${cacheKey.slice(0, -3)} ${cacheKey.slice(-3)}`;
  const searchTerm = encodeURIComponent(humanPostcode);
  const params = new URLSearchParams({
    addtags: "royalmailaddresses,planning",
    lines: "4",
    format: "json",
  });
  const url = `${POSTCODER_BASE}/${key}/ngd/${searchTerm}?${params.toString()}`;
  const publicUrl = `${POSTCODER_BASE}/[key]/ngd/${searchTerm}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      // Server-side call — no CORS, don't send cookies.
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Postcoder network error: ${detail}. url=${publicUrl}`);
  }

  if (!res.ok) {
    // 429 is rate-limit / credit exhaustion. 401/403 = bad key.
    // 4xx generally = client error, 5xx = Postcoder outage.
    let body = "";
    try {
      body = (await res.text()).slice(0, 500);
    } catch {
      /* ignore */
    }
    throw new Error(
      `Postcoder HTTP ${res.status} ${res.statusText}. url=${publicUrl}. body=${body}`,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Postcoder JSON parse error: ${detail}. url=${publicUrl}`);
  }

  // Empty postcode: Postcoder returns [] rather than a 404. We still
  // cache the miss — a bad postcode isn't going to become good, and
  // caching means a stubborn user doesn't cost 3.5 credits per retry.
  const rows: PostcoderNgdAddress[] = Array.isArray(json)
    ? (json as PostcoderNgdAddress[])
    : [];

  // Cache and return. Cache empty arrays too — see above.
  await cacheSet("postcoder:ngd", cacheKey, rows, TTL_SECONDS);
  return rows;
}

// ─── Country mapping ─────────────────────────────────────────────
//
// Postcoder returns country as free text — "England", "Scotland",
// "Wales", "Northern Ireland". Map to the UkCountry enum used
// throughout the wizard, defensively (case-insensitive, trim).

export function postcoderCountryToUkCountry(
  raw: string | null | undefined,
): "England" | "Wales" | "Scotland" | "Northern Ireland" | null {
  if (!raw) return null;
  const normalised = raw.trim().toLowerCase();
  if (normalised === "england") return "England";
  if (normalised === "wales") return "Wales";
  if (normalised === "scotland") return "Scotland";
  if (
    normalised === "northern ireland" ||
    normalised === "n ireland" ||
    normalised === "n. ireland"
  ) {
    return "Northern Ireland";
  }
  return null;
}
