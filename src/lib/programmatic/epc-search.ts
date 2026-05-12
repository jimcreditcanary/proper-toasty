// EPC search helper for programmatic aggregate builds.
//
// Now built against the OFFICIAL contract documented at
// https://get-energy-performance-data.communities.gov.uk/api-technical-documentation
// (rather than the legacy district-prefix shape we were guessing at).
//
// Key facts:
//
//   - Base URL: api.get-energy-performance-data.communities.gov.uk
//   - Auth: Bearer (process.env.EPC_API_KEY)
//   - Search endpoint: /api/domestic/search
//   - Primary filter we use: `council[]=<council-name>` — one
//     request per town instead of dozens of postcode-prefix calls.
//   - page_size up to 5000 (was 100 in our legacy code)
//   - current_page (1-indexed) for offset pagination
//   - Response shape: { data: [...], pagination: { totalRecords,
//     currentPage, totalPages, nextPage, prevPage, pageSize } }
//   - Rate limit: 6000 requests / 5 minutes
//
// For the pilot we pull a single 5000-row page per council. That's
// plenty for the band-distribution rollup; full national coverage
// will come via the bulk CSV download endpoint (separate file).

import type { PilotTown } from "./towns";

export interface EpcSearchRowLean {
  certificateNumber: string;
  postcode: string;
  postTown: string;
  council: string;
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

// 200ms gap = 5 req/sec, well under the 6000/5min cap. Pilot run
// across 50 towns at one request each is ~10 seconds even with
// throttle.
const MIN_REQUEST_GAP_MS = 200;
let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = MIN_REQUEST_GAP_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/**
 * Fetch EPC rows for a single council name.
 *
 * `councilName` MUST match the council list the API accepts (see
 * https://get-energy-performance-data.communities.gov.uk/api-technical-documentation/codes).
 * If the API returns an empty page, the council name is probably
 * wrong — caller should log this and the town gets indexed=false.
 *
 * For the pilot we pull a single page of up to 5000 rows. Bigger
 * councils have more EPCs than that; the 5000-row sample is still
 * statistically representative for a band-distribution aggregate.
 *
 * Set `allPages: true` to walk every page (used when computing a
 * full-population aggregate for a small council, or when we move to
 * bulk-style rollups). Throttled — won't trip the 6000/5min limit.
 */
export async function searchByCouncil(
  councilName: string,
  opts: {
    pageSize?: number;
    maxPages?: number;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<EpcSearchRowLean[]> {
  const pageSize = opts.pageSize ?? 5000;
  const maxPages = opts.maxPages ?? 1;
  const out: EpcSearchRowLean[] = [];

  for (let page = 1; page <= maxPages; page++) {
    await throttle();
    const url = new URL(`${EPC_BASE}/api/domestic/search`);
    // URLSearchParams.append produces `council%5B%5D=Sheffield`
    // (the API expects PHP-style `council[]` indexed arrays).
    url.searchParams.append("council[]", councilName);
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("current_page", String(page));

    const res = await fetch(url.toString(), { headers: authHeaders() });
    if (res.status === 404) {
      // "No certificates could be found for that query" — valid
      // empty response, not a failure.
      opts.onProgress?.(`  council=${councilName}: 404 (no certificates)`);
      break;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `EPC search council=${councilName} page ${page}: HTTP ${res.status} ${body.slice(0, 300)}`,
      );
    }

    const json = (await res.json()) as unknown;
    const rows = extractRows(json);
    if (rows.length === 0) {
      opts.onProgress?.(`  council=${councilName} page ${page}: 0 rows`);
      break;
    }

    for (const r of rows) {
      const lean = toLean(r);
      if (lean) out.push(lean);
    }

    const total = extractTotalPages(json);
    opts.onProgress?.(
      `  council=${councilName} page ${page}${total ? `/${total}` : ""} → +${rows.length} rows (total: ${out.length})`,
    );

    if (rows.length < pageSize) break;
    if (total && page >= total) break;
  }

  return out;
}

/**
 * Convenience wrapper — fetch EPCs for a town from the seed.
 * Falls back to address-filter if councilName is null on the seed
 * (rare — most pilot towns have an explicit council).
 */
export async function searchByTown(
  town: PilotTown,
  opts: {
    pageSize?: number;
    maxPages?: number;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<EpcSearchRowLean[]> {
  if (town.councilName) {
    return searchByCouncil(town.councilName, opts);
  }
  // Address fallback — broader, can include false positives where
  // the town's name appears in a street name. Only used when we
  // don't have an explicit council mapping.
  return searchByAddressKeyword(town.name, opts);
}

/**
 * Fallback: filter by free-text address. Useful when the council
 * name in the seed doesn't match the API's accepted list.
 */
export async function searchByAddressKeyword(
  keyword: string,
  opts: {
    pageSize?: number;
    maxPages?: number;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<EpcSearchRowLean[]> {
  const pageSize = opts.pageSize ?? 5000;
  const maxPages = opts.maxPages ?? 1;
  const out: EpcSearchRowLean[] = [];

  for (let page = 1; page <= maxPages; page++) {
    await throttle();
    const url = new URL(`${EPC_BASE}/api/domestic/search`);
    url.searchParams.set("address", keyword);
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("current_page", String(page));

    const res = await fetch(url.toString(), { headers: authHeaders() });
    if (res.status === 404) break;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `EPC search address=${keyword} page ${page}: HTTP ${res.status} ${body.slice(0, 300)}`,
      );
    }
    const json = (await res.json()) as unknown;
    const rows = extractRows(json);
    if (rows.length === 0) break;
    for (const r of rows) {
      const lean = toLean(r);
      if (lean) out.push(lean);
    }
    opts.onProgress?.(
      `  address=${keyword} page ${page} → +${rows.length} rows (total: ${out.length})`,
    );
    if (rows.length < pageSize) break;
  }

  return out;
}

// ─── shape helpers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRows(json: any): any[] {
  // Documented shape: { data: [...], pagination: {...} }
  if (Array.isArray(json?.data)) return json.data;
  // Legacy shapes seen in older releases.
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json)) return json;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTotalPages(json: any): number | null {
  const p = json?.pagination;
  if (p && typeof p.totalPages === "number") return p.totalPages;
  if (p && typeof p.total_pages === "number") return p.total_pages;
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLean(row: any): EpcSearchRowLean | null {
  if (!row || typeof row !== "object") return null;
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
  const council = row.council ?? "";
  if (!certNo || !band) return null;
  return {
    certificateNumber: String(certNo),
    currentEnergyEfficiencyBand: String(band),
    registrationDate: typeof reg === "string" ? reg : "",
    postTown: typeof pt === "string" ? pt : "",
    postcode: typeof pc === "string" ? pc : "",
    council: typeof council === "string" ? council : "",
  };
}
