import type { z } from "zod";
import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import {
  EpcCertificateRawSchema,
  EpcSearchResponseSchema,
  EpcCertificateResponseSchema,
  type EpcByAddressResponse,
  type EpcCertificate,
  type EpcSearchRow,
} from "@/lib/schemas/epc";

type EpcCertificateRaw = z.infer<typeof EpcCertificateRawSchema>;

const EPC_BASE = "https://api.get-energy-performance-data.communities.gov.uk";
// Hit TTL for a found EPC — 30 days matches how often upstream refreshes.
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
// Miss TTL — shorter so a newly-registered EPC is picked up within a week
// rather than being pinned "not found" for a month.
const MISS_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

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
  const cached = await cacheGet<EpcCertificate>("epc:cert-v2", certificateNumber);
  if (cached) return cached;

  const url = new URL(`${EPC_BASE}/api/certificate`);
  url.searchParams.set("certificate_number", certificateNumber);

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`EPC fetch cert failed: ${res.status} ${body.slice(0, 200)}`);
  }

  // Lenient envelope handling — we've seen the API return both
  // `{ data: {...} }` and the raw cert directly. Accept either rather
  // than throwing on shape, so the eligibility engine still gets the
  // detail-level fields when the envelope is missing.
  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    console.warn("[epc] cert detail JSON parse failed", {
      certificateNumber,
      err: err instanceof Error ? err.message : err,
    });
    return null;
  }

  // Try the wrapped shape first; fall through to the raw cert.
  let raw: EpcCertificateRaw;
  const wrapped = EpcCertificateResponseSchema.safeParse(json);
  if (wrapped.success) {
    raw = wrapped.data.data;
  } else {
    const flat = EpcCertificateRawSchema.safeParse(json);
    if (!flat.success) {
      console.warn("[epc] cert detail unexpected shape", {
        certificateNumber,
        topLevelKeys:
          json && typeof json === "object" ? Object.keys(json as object) : typeof json,
        sampleIssues: flat.error.issues.slice(0, 3),
      });
      return null;
    }
    raw = flat.data;
  }
  const normalised: EpcCertificate = {
    // ── Identifiers + admin ─────────────────────────────────────────
    certificateNumber: raw.certificate_number ?? certificateNumber,
    uprn: raw.uprn != null ? String(raw.uprn) : null,
    address: [raw.address_line_1, raw.address_line_2, raw.address_line_3, raw.post_town]
      .filter(Boolean)
      .join(", "),
    postcode: raw.postcode ?? null,
    registrationDate: raw.registration_date ?? null,
    transactionType: raw.transaction_type ?? null,
    council: raw.council ?? null,

    // ── Ratings + bands ─────────────────────────────────────────────
    currentEnergyBand: raw.current_energy_efficiency_band ?? null,
    potentialEnergyBand: raw.potential_energy_efficiency_band ?? null,
    currentEnergyRating: raw.current_energy_efficiency_rating ?? null,
    potentialEnergyRating: raw.potential_energy_efficiency_rating ?? null,
    environmentImpactCurrent: raw.environment_impact_current ?? null,
    environmentImpactPotential: raw.environment_impact_potential ?? null,
    energyConsumptionCurrent: raw.energy_consumption_current ?? null,
    energyConsumptionPotential: raw.energy_consumption_potential ?? null,
    co2EmissionsCurrent: raw.co2_emissions_current ?? null,
    co2EmissionsPotential: raw.co2_emissions_potential ?? null,

    // ── Property classification ─────────────────────────────────────
    propertyType: raw.property_type ?? null,
    builtForm: raw.built_form ?? null,
    constructionAgeBand: raw.construction_age_band ?? null,
    tenure: raw.tenure ?? null,
    totalFloorAreaM2: parseNumber(raw.total_floor_area),
    floorHeightM: parseNumber(raw.floor_height),
    extensionCount: raw.extension_count ?? null,
    numberHabitableRooms: raw.number_habitable_rooms ?? null,
    numberHeatedRooms: raw.number_heated_rooms ?? null,

    // ── Heating ─────────────────────────────────────────────────────
    mainFuel: raw.main_fuel ?? null,
    mainHeatingDescription: raw.main_heating_description ?? null,
    mainHeatingEnergyEff: raw.mainheat_energy_eff ?? null,
    mainHeatingControlsDescription: raw.mainheatcont_description ?? null,
    mainHeatingControlsEnergyEff: raw.mainheatcont_energy_eff ?? null,
    hotWaterDescription: raw.hot_water_description ?? null,
    hotWaterEnergyEff: raw.hot_water_energy_eff ?? null,
    mainsGasFlag: raw.mains_gas_flag ?? null,

    // ── Fabric + glazing ────────────────────────────────────────────
    wallsDescription: raw.walls_description ?? null,
    wallsEnergyEff: raw.walls_energy_eff ?? null,
    roofDescription: raw.roof_description ?? null,
    roofEnergyEff: raw.roof_energy_eff ?? null,
    floorDescription: raw.floor_description ?? null,
    floorEnergyEff: raw.floor_energy_eff ?? null,
    windowsDescription: raw.windows_description ?? null,
    windowsEnergyEff: raw.windows_energy_eff ?? null,
    glazedType: raw.glazed_type ?? null,
    glazedArea: raw.glazed_area ?? null,
    multiGlazeProportion: raw.multi_glaze_proportion ?? null,

    // ── Lighting ────────────────────────────────────────────────────
    lightingDescription: raw.lighting_description ?? null,
    lightingEnergyEff: raw.lighting_energy_eff ?? null,
    lowEnergyLightingPct: raw.low_energy_lighting ?? null,
    fixedLightingOutletsCount: raw.fixed_lighting_outlets_count ?? null,
    lowEnergyFixedLightingCount: raw.low_energy_fixed_lighting ?? null,

    // ── Per-bill breakdown (£/yr) ──────────────────────────────────
    heatingCostCurrent: parseNumber(raw.heating_cost_current),
    heatingCostPotential: parseNumber(raw.heating_cost_potential),
    hotWaterCostCurrent: parseNumber(raw.hot_water_cost_current),
    hotWaterCostPotential: parseNumber(raw.hot_water_cost_potential),
    lightingCostCurrent: parseNumber(raw.lighting_cost_current),
    lightingCostPotential: parseNumber(raw.lighting_cost_potential),
  };

  await cacheSet("epc:cert-v2", certificateNumber, normalised, TTL_SECONDS);
  return normalised;
}

// Build a cert from a search row when the detail endpoint comes back
// lean. Search rows only carry identifiers + the current energy band
// — every detail field is null. The detail endpoint fills these in
// when it works; this fallback keeps the eligibility engine running
// even when it doesn't.
function certFromRow(row: EpcSearchRow): EpcCertificate {
  return {
    certificateNumber: row.certificateNumber,
    uprn: row.uprn != null ? String(row.uprn) : null,
    address: rowAddress(row),
    postcode: row.postcode || null,
    registrationDate: row.registrationDate || null,
    transactionType: null,
    council: row.council || null,

    currentEnergyBand: row.currentEnergyEfficiencyBand || null,
    potentialEnergyBand: null,
    currentEnergyRating: null,
    potentialEnergyRating: null,
    environmentImpactCurrent: null,
    environmentImpactPotential: null,
    energyConsumptionCurrent: null,
    energyConsumptionPotential: null,
    co2EmissionsCurrent: null,
    co2EmissionsPotential: null,

    propertyType: null,
    builtForm: null,
    constructionAgeBand: null,
    tenure: null,
    totalFloorAreaM2: null,
    floorHeightM: null,
    extensionCount: null,
    numberHabitableRooms: null,
    numberHeatedRooms: null,

    mainFuel: null,
    mainHeatingDescription: null,
    mainHeatingEnergyEff: null,
    mainHeatingControlsDescription: null,
    mainHeatingControlsEnergyEff: null,
    hotWaterDescription: null,
    hotWaterEnergyEff: null,
    mainsGasFlag: null,

    wallsDescription: null,
    wallsEnergyEff: null,
    roofDescription: null,
    roofEnergyEff: null,
    floorDescription: null,
    floorEnergyEff: null,
    windowsDescription: null,
    windowsEnergyEff: null,
    glazedType: null,
    glazedArea: null,
    multiGlazeProportion: null,

    lightingDescription: null,
    lightingEnergyEff: null,
    lowEnergyLightingPct: null,
    fixedLightingOutletsCount: null,
    lowEnergyFixedLightingCount: null,

    heatingCostCurrent: null,
    heatingCostPotential: null,
    hotWaterCostCurrent: null,
    hotWaterCostPotential: null,
    lightingCostCurrent: null,
    lightingCostPotential: null,
  };
}

// ─── public entry ─────────────────────────────────────────────────────────────

export interface GetEpcInput {
  uprn?: string | null;
  postcode?: string | null;
  addressLine1?: string | null;
}

// Build a stable cache key from the input. UPRN is the preferred anchor
// (one per property); postcode+address is the fallback. Returns null when
// there's nothing to key on — in that case we skip the cache entirely.
function epcCacheKey(input: GetEpcInput): string | null {
  if (input.uprn) return `uprn:${padUprn(input.uprn)}`;
  if (input.postcode && input.addressLine1) {
    const pc = normalisePostcode(input.postcode);
    const addr = input.addressLine1.toLowerCase().trim().replace(/\s+/g, " ");
    return `pcaddr:${pc}:${addr}`;
  }
  return null;
}

/**
 * Resolve the EPC for an address. Prefers UPRN lookup (exact match) and falls
 * back to postcode + address fuzzy match. When only the search row is
 * available (detail endpoint 404s, the cert pre-dates the richer dataset, etc.)
 * we return the trimmed row rather than giving up — the UI surfaces whatever
 * fields are present.
 *
 * The whole result is cached for 30 days (7 on miss) in api_cache under
 * namespace "epc:by-address-v2". This means re-analysing the same property
 * skips the upstream UPRN/postcode search + detail fetch entirely.
 */
export async function getEpc(input: GetEpcInput): Promise<EpcByAddressResponse> {
  const ck = epcCacheKey(input);
  if (ck) {
    const cached = await cacheGet<EpcByAddressResponse>("epc:by-address-v2", ck);
    if (cached) return cached;
  }

  const result = await resolveEpcUncached(input);

  if (ck) {
    const ttl = result.found ? TTL_SECONDS : MISS_TTL_SECONDS;
    await cacheSet("epc:by-address-v2", ck, result, ttl);
  }
  return result;
}

async function resolveEpcUncached(input: GetEpcInput): Promise<EpcByAddressResponse> {
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
