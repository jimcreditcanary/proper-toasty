import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import {
  EpcSearchResponseSchema,
  EpcCertificateResponseSchema,
  type EpcByAddressResponse,
  type EpcCertificate,
  type EpcSearchRow,
} from "@/lib/schemas/epc";

const EPC_BASE = "https://api.get-energy-performance-data.communities.gov.uk";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function requireToken(): string {
  const token = process.env.EPC_API_KEY;
  if (!token) throw new Error("EPC_API_KEY not set");
  return token;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireToken()}`,
    Accept: "application/json",
  };
}

function normalisePostcode(p: string): string {
  return p.trim().toUpperCase().replace(/\s+/g, "");
}

function padUprn(uprn: string | number): string {
  return String(uprn).trim().padStart(12, "0");
}

function parseNumber(v: string | number | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function yearsBetween(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function rowAddress(row: EpcSearchRow): string {
  return [row.addressLine1, row.addressLine2, row.addressLine3, row.addressLine4]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(flat|apartment|apt|unit|house|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchScore(a: string, b: string): number {
  const na = normaliseForMatch(a);
  const nb = normaliseForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (nb.startsWith(na) || na.startsWith(nb)) return 0.9;
  if (nb.includes(na) || na.includes(nb)) return 0.8;

  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const shared = [...ta].filter((t) => tb.has(t)).length;
  const denom = Math.max(ta.size, tb.size);
  return denom === 0 ? 0 : shared / denom;
}

// ─── raw calls ────────────────────────────────────────────────────────────────

async function searchByUprn(uprn: string): Promise<EpcSearchRow[]> {
  const url = new URL(`${EPC_BASE}/api/domestic/search`);
  url.searchParams.set("uprn", padUprn(uprn));
  url.searchParams.set("page_size", "10");

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`EPC search(uprn) failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const parsed = EpcSearchResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("EPC search returned unexpected shape");
  return parsed.data.data;
}

async function searchByPostcode(postcode: string): Promise<EpcSearchRow[]> {
  const url = new URL(`${EPC_BASE}/api/domestic/search`);
  url.searchParams.set("postcode", normalisePostcode(postcode));
  url.searchParams.set("page_size", "100");

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`EPC search(postcode) failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const parsed = EpcSearchResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("EPC search returned unexpected shape");
  return parsed.data.data;
}

async function fetchCertificate(certificateNumber: string): Promise<EpcCertificate | null> {
  const cached = await cacheGet<EpcCertificate>("epc:cert", certificateNumber);
  if (cached) return cached;

  const url = new URL(`${EPC_BASE}/api/certificate`);
  url.searchParams.set("certificate_number", certificateNumber);

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`EPC fetch cert failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const parsed = EpcCertificateResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("EPC cert returned unexpected shape");

  const raw = parsed.data.data;
  const normalised: EpcCertificate = {
    certificateNumber: raw.certificate_number ?? certificateNumber,
    uprn: raw.uprn != null ? String(raw.uprn) : null,
    address: [raw.address_line_1, raw.address_line_2, raw.address_line_3, raw.post_town]
      .filter(Boolean)
      .join(", "),
    postcode: raw.postcode ?? null,
    registrationDate: raw.registration_date ?? null,
    currentEnergyBand: raw.current_energy_efficiency_band ?? null,
    potentialEnergyBand: raw.potential_energy_efficiency_band ?? null,
    currentEnergyRating: raw.current_energy_efficiency_rating ?? null,
    propertyType: raw.property_type ?? null,
    builtForm: raw.built_form ?? null,
    constructionAgeBand: raw.construction_age_band ?? null,
    totalFloorAreaM2: parseNumber(raw.total_floor_area),
    mainFuel: raw.main_fuel ?? null,
    mainHeatingDescription: raw.main_heating_description ?? null,
    mainsGasFlag: raw.mains_gas_flag ?? null,
    transactionType: raw.transaction_type ?? null,
    council: raw.council ?? null,
  };

  await cacheSet("epc:cert", certificateNumber, normalised, TTL_SECONDS);
  return normalised;
}

// Build a cert from a search row when the detail endpoint comes back lean.
function certFromRow(row: EpcSearchRow): EpcCertificate {
  return {
    certificateNumber: row.certificateNumber,
    uprn: row.uprn != null ? String(row.uprn) : null,
    address: rowAddress(row),
    postcode: row.postcode || null,
    registrationDate: row.registrationDate || null,
    currentEnergyBand: row.currentEnergyEfficiencyBand || null,
    potentialEnergyBand: null,
    currentEnergyRating: null,
    propertyType: null,
    builtForm: null,
    constructionAgeBand: null,
    totalFloorAreaM2: null,
    mainFuel: null,
    mainHeatingDescription: null,
    mainsGasFlag: null,
    transactionType: null,
    council: row.council || null,
  };
}

// ─── public entry ─────────────────────────────────────────────────────────────

export interface GetEpcInput {
  uprn?: string | null;
  postcode?: string | null;
  addressLine1?: string | null;
}

/**
 * Resolve the EPC for an address. Prefers UPRN lookup (exact match) and falls
 * back to postcode + address fuzzy match. When only the search row is
 * available (detail endpoint 404s, the cert pre-dates the richer dataset, etc.)
 * we return the trimmed row rather than giving up — the UI surfaces whatever
 * fields are present.
 */
export async function getEpc(input: GetEpcInput): Promise<EpcByAddressResponse> {
  let rows: EpcSearchRow[] = [];
  let matchMethod: "uprn" | "postcode+address" = "postcode+address";

  if (input.uprn) {
    try {
      rows = await searchByUprn(input.uprn);
      matchMethod = "uprn";
    } catch (err) {
      console.warn("EPC UPRN search failed, falling back to postcode:", err);
    }
  }

  if (rows.length === 0 && input.postcode && input.addressLine1) {
    rows = await searchByPostcode(input.postcode);
    matchMethod = "postcode+address";
    if (rows.length === 0) return { found: false, reason: "No EPC lodged at this postcode." };
  }

  if (rows.length === 0) {
    return { found: false, reason: "No identifier provided for the EPC lookup." };
  }

  let best: EpcSearchRow | undefined;
  if (matchMethod === "uprn") {
    // UPRN is exact; if the API returns more than one (shouldn't usually), take
    // the most recently registered.
    best = rows.sort((a, b) => (b.registrationDate || "").localeCompare(a.registrationDate || ""))[0];
  } else {
    const scored = rows
      .map((r) => ({ r, score: matchScore(input.addressLine1 ?? "", rowAddress(r)) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.r.registrationDate || "").localeCompare(a.r.registrationDate || "");
      });
    const top = scored[0];
    if (!top || top.score < 0.5) {
      return { found: false, reason: "No EPC matches this address closely enough." };
    }
    best = top.r;
  }

  if (!best) return { found: false, reason: "No matching EPC found." };

  // Try the richer detail endpoint. If it errors or returns nothing, fall back
  // to the search-row data.
  let cert: EpcCertificate | null = null;
  try {
    cert = await fetchCertificate(best.certificateNumber);
  } catch (err) {
    console.warn("EPC detail fetch failed, using search row:", err);
  }
  if (!cert) cert = certFromRow(best);

  return {
    found: true,
    matchMethod,
    certificate: cert,
    registrationDate: cert.registrationDate ?? best.registrationDate ?? "",
    ageYears: yearsBetween(cert.registrationDate ?? best.registrationDate ?? null),
  };
}

/**
 * Back-compat wrapper — the orchestrator still calls getEpcByAddress.
 */
export async function getEpcByAddress(
  postcode: string,
  addressLine1: string
): Promise<EpcByAddressResponse> {
  return getEpc({ postcode, addressLine1 });
}
