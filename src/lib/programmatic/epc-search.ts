// Lightweight EPC search helper for programmatic-aggregate builds.
//
// Why a separate module from src/lib/services/epc.ts:
//
//   The existing service is geared to per-property lookups (auth,
//   cache, fuzzy matching, fallback to row-only when detail fails).
//   It's the wrong shape for "fetch every EPC in this postcode
//   district". This module exists for bulk-ish fetches:
//
//     - Iterate postcode districts for a town
//     - Paginate (page_size=100, multi-page if more rows)
//     - Throttle to be polite to the API (sleep between calls)
//     - Filter by post_town to drop spillover (e.g. an S2X postcode
//       that ships post_town='ROTHERHAM', not 'SHEFFIELD')
//
// Auth + endpoint match the existing service so we share the same
// EPC_API_KEY env var and same upstream.

import type { PilotTown } from "./towns";

export interface EpcSearchRowLean {
  certificateNumber: string;
  postcode: string;
  postTown: string;
  currentEnergyEfficiencyBand: string;
  registrationDate: string;
}

const EPC_BASE = "https://api.get-energy-performance-data.communities.gov.uk";

function requireToken(): string {
  const t = process.env.EPC_API_KEY;
  if (!t) {
    throw new Error(
      "EPC_API_KEY not set. Add it to .env.local (same key Vercel uses for the per-property service).",
    );
  }
  return t;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireToken()}`,
    Accept: "application/json",
  };
}

/**
 * Lower bound for politeness. The EPC API doesn't publish a hard
 * rate limit but doing 100 req/sec is asking to be throttled or
 * have the key revoked. 250ms = ~4 req/sec — safe and still gets
 * us through 50 districts in a couple of minutes.
 */
const MIN_REQUEST_GAP_MS = 250;

let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = MIN_REQUEST_GAP_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/**
 * Fetch all EPCs the API will return for a postcode prefix.
 *
 * page_size=100 is the existing service's choice (works for prod
 * for years). We page until either:
 *   - the API returns < page_size rows (last page)
 *   - we hit `maxPages` (caller-controlled, default 5 = up to 500
 *     rows per district — a representative sample, doesn't crawl
 *     every EPC in central Birmingham).
 */
export async function searchByPostcodePrefix(
  postcodePrefix: string,
  opts: { maxPages?: number; pageSize?: number } = {},
): Promise<EpcSearchRowLean[]> {
  const maxPages = opts.maxPages ?? 5;
  const pageSize = opts.pageSize ?? 100;
  const out: EpcSearchRowLean[] = [];

  for (let page = 1; page <= maxPages; page++) {
    await throttle();
    const url = new URL(`${EPC_BASE}/api/domestic/search`);
    url.searchParams.set("postcode", postcodePrefix.toUpperCase());
    url.searchParams.set("page_size", String(pageSize));
    if (page > 1) url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), { headers: authHeaders() });
    if (res.status === 404) return out;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `EPC search ${postcodePrefix} page ${page}: HTTP ${res.status} ${body.slice(0, 200)}`,
      );
    }

    // Defensive parse — the API has shipped both `{ data: [...] }`
    // and bare arrays across releases. The existing service has a
    // full Zod schema for this; we only need the lean fields, so
    // pluck them by hand and skip rows that don't match.
    const json = await res.json();
    const rows = extractRows(json);
    if (rows.length === 0) break;
    for (const r of rows) {
      const lean = toLean(r);
      if (lean) out.push(lean);
    }
    if (rows.length < pageSize) break;
  }
  return out;
}

/**
 * Iterate every postcode district for a town, accumulate rows.
 * Filters by post_town to keep only properties attributable to
 * this town (postcode prefixes overlap LA boundaries occasionally).
 */
export async function searchByTown(
  town: PilotTown,
  opts: {
    maxPagesPerDistrict?: number;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<EpcSearchRowLean[]> {
  const out: EpcSearchRowLean[] = [];
  const allowed = new Set(town.postTowns.map((s) => s.toUpperCase()));
  for (const district of town.postcodeDistricts) {
    opts.onProgress?.(`  ${town.slug}: searching ${district}...`);
    const rows = await searchByPostcodePrefix(district, {
      maxPages: opts.maxPagesPerDistrict,
    });
    const kept = rows.filter((r) =>
      r.postTown ? allowed.has(r.postTown.toUpperCase()) : false,
    );
    out.push(...kept);
    opts.onProgress?.(
      `  ${town.slug}: ${district} → ${rows.length} rows, ${kept.length} matched ${town.name}`,
    );
  }
  return out;
}

// ─── shape helpers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRows(json: any): any[] {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json)) return json;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLean(row: any): EpcSearchRowLean | null {
  if (!row || typeof row !== "object") return null;
  // The EPC API has shipped both camelCase and snake_case across
  // releases. Accept either; the existing service has a full
  // recursive snake-cliffer but we only need 5 fields here so
  // hand-pick is fine.
  const certNo =
    row.certificate_number ?? row.certificateNumber ?? row.lmkKey ?? null;
  const band =
    row.current_energy_efficiency_band ??
    row.currentEnergyEfficiencyBand ??
    row.current_energy_band ??
    null;
  const reg = row.registration_date ?? row.registrationDate ?? null;
  const pt = row.post_town ?? row.postTown ?? "";
  const pc = row.postcode ?? "";
  if (!certNo || !band) return null;
  return {
    certificateNumber: String(certNo),
    currentEnergyEfficiencyBand: String(band),
    registrationDate: typeof reg === "string" ? reg : "",
    postTown: typeof pt === "string" ? pt : "",
    postcode: typeof pc === "string" ? pc : "",
  };
}
