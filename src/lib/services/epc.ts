import type { z } from "zod";
import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import {
  EpcCertificateRawSchema,
  EpcSearchResponseSchema,
  epcSearchRowFromRaw,
  type EpcByAddressResponse,
  type EpcCertificate,
  type EpcRecommendation,
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

// The GOV.UK EPC API now validates UPRN as "an integer greater than
// 0" — sending the legacy zero-padded 12-char string ("000000123456")
// trips a 400. We send the bare integer instead, and skip the call
// entirely when the UPRN parses to 0 / NaN / negative (the address
// service occasionally hands us empty UPRNs for new-builds + some
// pseudo-properties that don't have one yet).
/**
 * Normalise object keys to snake_case recursively. The EPC API has
 * moved between camelCase and snake_case across releases — sometimes
 * within the same response shape (search vs detail). Rather than
 * maintain two parallel schemas that drift apart, we coerce every
 * incoming key to snake_case before zod validation, then keep our
 * canonical types in snake_case.
 *
 * Pure key transform — values pass through untouched. Cheap; the
 * cert detail payload is a few KB at most.
 */
function camelToSnakeKeys(input: unknown): unknown {
  if (input == null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(camelToSnakeKeys);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    // Insert underscore before any capital letter that follows a
    // lower-case letter, then lowercase the lot.
    const snake = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    out[snake] = camelToSnakeKeys(value);
  }
  return out;
}

/**
 * Extract the actual cert object from whatever envelope the EPC API
 * decided to use today. Returns the most cert-like object it can find,
 * or null if there isn't one. Handles:
 *
 *   { ...cert... }           → returns input
 *   { data: { ...cert... } } → returns input.data
 *   { data: [{ ...cert... }] } → returns input.data[0]
 *
 * "Cert-like" is recognised by the presence of `certificate_number`
 * (snake_case after key normalisation). Falling back to the candidate
 * itself if it has *any* cert fields lets us cope with future shapes.
 */
function unwrapCertEnvelope(input: unknown): unknown {
  if (input == null || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  // Already looks like a cert.
  if ("certificate_number" in obj) return obj;

  // New EPC API envelope: { body: { data: {...} } }. The `body`
  // wrapper appeared with the v3 endpoint refresh — older responses
  // shipped { data: {...} } directly. Peel `body` first and let the
  // rest of the chain handle the now-unwrapped layer.
  if ("body" in obj && obj.body && typeof obj.body === "object") {
    const peeled = unwrapCertEnvelope(obj.body);
    if (peeled) return peeled;
  }

  // { data: {...} } or { data: [...] }
  if ("data" in obj) {
    const inner = obj.data;
    if (Array.isArray(inner)) {
      // Pick the first object element. EPC detail responses occasionally
      // come back with a single-element array; longer arrays would be
      // unusual but we'd still rather take the first match than fail.
      const first = inner.find((v) => v && typeof v === "object");
      if (first) return first;
    } else if (inner && typeof inner === "object") {
      return inner;
    }
  }

  // Last-ditch: maybe the cert fields are at the top level mixed with
  // envelope fields. If we see at least one cert-style key, return as-is.
  // Added the v3 nested-shape hints (walls / roofs / main_heating)
  // so a body-stripped { walls: [...], roofs: [...], ... } payload
  // still gets recognised as a cert.
  const certKeyHints = [
    "certificate_number",
    "current_energy_efficiency_band",
    "potential_energy_efficiency_band",
    "current_energy_efficiency_rating",
    "uprn",
    "address_line_1",
    "walls",
    "roofs",
    "main_heating",
    "dwelling_type",
  ];
  if (certKeyHints.some((k) => k in obj)) return obj;

  return null;
}

function uprnToInt(uprn: string | number | null | undefined): number | null {
  if (uprn == null) return null;
  const trimmed = typeof uprn === "number" ? uprn : String(uprn).trim();
  if (trimmed === "" || trimmed === 0) return null;
  const n = typeof trimmed === "number" ? trimmed : parseInt(trimmed, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** First non-empty string from a list of optional candidates. Used to
 *  collapse the EPC API's many spellings of the same logical field
 *  (assessor name, email, etc.) into a single canonical column. */
function pickFirst(...vals: Array<string | undefined | null>): string | null {
  for (const v of vals) {
    if (v != null && v.trim() !== "") return v.trim();
  }
  return null;
}

/** The new GOV.UK EPC API returns several classification fields in one
 *  of three shapes for the same logical value:
 *    "Mid-terrace house"                                 — flat string
 *    4                                                   — integer enum code
 *    { value: "Mid-terrace house", language: "1" }       — coded object
 *
 *  We want a human-readable string everywhere downstream. Strings
 *  pass through, numbers become their stringified form (admin tooling
 *  can still join against the code), and objects yield `.value`.
 *  Returns null when nothing usable is present. */
function unwrapValueLike(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input === "string") return input.trim() || null;
  if (typeof input === "number") return String(input);
  if (typeof input === "object" && "value" in input) {
    const v = (input as { value: unknown }).value;
    if (typeof v === "string") return v.trim() || null;
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** Like unwrapValueLike but coerces to number. Cost fields ship as
 *  { value: 1080, currency: "GBP" } in the new API — we just want the
 *  £ figure. Strips trailing currency strings ("£1,080") for the
 *  legacy-string path. Returns null on anything that can't sensibly
 *  cast (NaN, empty objects, etc.). */
function unwrapNumberLike(input: unknown): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input === "string") {
    const cleaned = input.replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof input === "object" && "value" in input) {
    const v = (input as { value: unknown }).value;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      const cleaned = v.replace(/[^\d.-]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

/** Pull a description value off the new EPC API's nested shape. The
 *  v3 endpoint ships fabric/heating/lighting fields as one of:
 *
 *    1. `{ description: { value: "..." } }`  (single object)
 *    2. `[{ description: { value: "..." } }, ...]`  (array — walls /
 *       roofs / floors / main_heating / main_heating_controls)
 *    3. plain string  (legacy flat shape)
 *    4. `{ value: "..." }`  (some fields, no `.description` wrapper)
 *
 *  We pick array index `idx` (default 0) when an array is supplied.
 *  Returns null when nothing useful is present so callers can still
 *  fall back to the older flat field. */
function unwrapDescription(input: unknown, idx = 0): string | null {
  if (input == null) return null;
  if (typeof input === "string") return input.trim() || null;
  if (Array.isArray(input)) {
    return unwrapDescription(input[idx]);
  }
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    // shape 1: { description: { value: "..." } }
    if ("description" in obj) {
      const desc = obj.description;
      const direct = unwrapValueLike(desc);
      if (direct) return direct;
    }
    // shape 4: { value: "..." }
    const valueOnly = unwrapValueLike(obj);
    if (valueOnly) return valueOnly;
  }
  return null;
}

/** Pull the energy-efficiency rating off the same nested shape, e.g.
 *  `walls[0].energy_efficiency.value` (string like "Average"). Falls
 *  back to top-level `*_energy_eff` for legacy flat rows. */
function unwrapEnergyEff(input: unknown, idx = 0): string | null {
  if (input == null) return null;
  if (typeof input === "string") return input.trim() || null;
  if (Array.isArray(input)) {
    return unwrapEnergyEff(input[idx]);
  }
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    for (const key of [
      "energy_efficiency",
      "energy_eff",
      "rating",
      "energy_efficiency_rating",
    ]) {
      if (key in obj) {
        const v = unwrapValueLike(obj[key]);
        if (v) return v;
      }
    }
  }
  return null;
}

/** Read a boolean off a nested SAP energy-source field. Newer EPC
 *  responses ship `sap_energy_source.mains_gas` as a nested boolean
 *  (replacing the old `mains_gas_flag: "Y" | "N"`). Returns "Y" / "N"
 *  to keep the canonical schema field stable downstream — the brief's
 *  Yes/No render reads either. */
function unwrapMainsGas(raw: Record<string, unknown>): string | null {
  // Old flat shape first.
  const flat = unwrapValueLike(raw.mains_gas_flag);
  if (flat) return flat;

  // Newer nested shape.
  const sap = raw.sap_energy_source;
  if (sap && typeof sap === "object" && "mains_gas" in sap) {
    const v = (sap as { mains_gas?: unknown }).mains_gas;
    if (typeof v === "boolean") return v ? "Y" : "N";
    if (typeof v === "string") {
      const s = v.trim().toUpperCase();
      if (s === "Y" || s === "N") return s;
      if (s === "TRUE") return "Y";
      if (s === "FALSE") return "N";
    }
  }
  return null;
}

/** EPC certificates are valid for 10 years from registration. Derive
 *  the canonical `validUntil` date + `expired` boolean from any ISO
 *  date string. Returns nulls when the input can't be parsed. */
function computeValidity(
  isoDateLike: string | null
): { validUntil: string | null; expired: boolean } {
  if (!isoDateLike) return { validUntil: null, expired: false };
  // Accept date-only ("2014-11-20") or datetime ("2014-11-20T..."). Slice
  // first to a date-only ISO so we don't get tripped up by timezone math.
  const datePart = isoDateLike.slice(0, 10);
  const start = new Date(datePart);
  if (isNaN(start.getTime())) return { validUntil: null, expired: false };
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 10);
  const validUntil = end.toISOString().slice(0, 10);
  const expired = end.getTime() < Date.now();
  return { validUntil, expired };
}

// `parseNumber` was the legacy string|number coercer used before the
// schema went fully permissive. unwrapNumberLike (above) supersedes
// it — also handles the new {value, currency} object shape.
// Kept removed; uses migrated to unwrapNumberLike.

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

  const ta = na.split(" ");
  const tb = nb.split(" ");
  const setA = new Set(ta);
  const setB = new Set(tb);
  const shared = [...setA].filter((t) => setB.has(t)).length;
  const denom = Math.max(setA.size, setB.size);
  const tokenScore = denom === 0 ? 0 : shared / denom;

  // Door-number heuristic — UK addresses almost always start with a
  // numeric token ("19 Hereford Road"). When both addresses share
  // their first token AND it's a number AND we share at least one
  // other token (the street name), that's a confident match even
  // if the address has trailing extras (city, county, postcode)
  // that drag the raw token-set ratio down.
  //
  //   "19 hereford road"             ↔
  //   "19 hereford road london w5"
  // → token-set ratio = 3/5 = 0.6
  // → first-token-is-number + shared = strong signal for the same
  //   property, bumped to 0.85.
  if (
    ta.length > 0 &&
    tb.length > 0 &&
    ta[0] === tb[0] &&
    /^\d+[a-z]?$/.test(ta[0]) &&
    shared >= 2
  ) {
    return Math.max(tokenScore, 0.85);
  }
  return tokenScore;
}

// ─── raw calls ────────────────────────────────────────────────────────────────

async function searchByUprn(uprn: string): Promise<EpcSearchRow[]> {
  const intUprn = uprnToInt(uprn);
  if (intUprn == null) return [];
  const url = new URL(`${EPC_BASE}/api/domestic/search`);
  url.searchParams.set("uprn", String(intUprn));
  url.searchParams.set("page_size", "10");

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`EPC search(uprn) failed: ${res.status} ${body.slice(0, 200)}`);
  }
  // Normalise camelCase → snake_case so we don't depend on which casing
  // the API ships this week. See camelToSnakeKeys for the why.
  const normalised = camelToSnakeKeys(await res.json());
  const parsed = EpcSearchResponseSchema.safeParse(normalised);
  if (!parsed.success) {
    console.warn("[epc] search(uprn) unexpected shape", {
      uprn: intUprn,
      sampleIssues: parsed.error.issues.slice(0, 3),
    });
    throw new Error("EPC search returned unexpected shape");
  }
  return parsed.data.data.map(epcSearchRowFromRaw);
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
  const normalised = camelToSnakeKeys(await res.json());
  const parsed = EpcSearchResponseSchema.safeParse(normalised);
  if (!parsed.success) {
    console.warn("[epc] search(postcode) unexpected shape", {
      postcode,
      sampleIssues: parsed.error.issues.slice(0, 3),
    });
    throw new Error("EPC search returned unexpected shape");
  }
  return parsed.data.data.map(epcSearchRowFromRaw);
}

async function fetchCertificate(certificateNumber: string): Promise<EpcCertificate | null> {
  const cached = await cacheGet<EpcCertificate>("epc:cert-v6", certificateNumber);
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

  // Normalise keys to snake_case before validating. GOV.UK's EPC API
  // has switched between camelCase and snake_case in past releases —
  // observed in production: cert detail rows arriving with
  // `currentEnergyEfficiencyBand` (camelCase) while our schema expects
  // `current_energy_efficiency_band` (snake_case). The validator
  // happily accepts the row but every typed field is undefined,
  // resulting in a "found: true, certBand: null" surface that's much
  // worse than a clean schema failure. Coerce keys to one shape and
  // keep the schema canonical.
  const normalisedJson = camelToSnakeKeys(json);

  // The EPC API has shipped at least three envelope shapes for the
  // cert detail endpoint:
  //
  //   1. flat:           { current_energy_efficiency_band: "C", ... }
  //   2. wrapped object: { data: { current_energy_efficiency_band: "C", ... } }
  //   3. wrapped array:  { data: [ { current_energy_efficiency_band: "C", ... } ] }
  //
  // Observed in production (cert 8106-6225-0229-4107-9633): shape (3).
  // The previous wrapped schema only accepted shape (2), so the parser
  // fell through to the flat shape, which (via .passthrough()) accepted
  // `{ data: [...] }` as a vacuous flat cert with `data` as an unknown
  // top-level field. Result: every typed band/rating field undefined.
  //
  // Fix: peel back any wrapping to find the actual cert object, then
  // validate that. The EpcCertificateRawSchema is the single source of
  // truth for the cert shape regardless of envelope.
  const candidate = unwrapCertEnvelope(normalisedJson);
  if (!candidate) {
    console.warn("[epc] cert detail: couldn't locate cert object in response", {
      certificateNumber,
      topLevelKeys:
        normalisedJson && typeof normalisedJson === "object"
          ? Object.keys(normalisedJson as object)
          : typeof normalisedJson,
    });
    return null;
  }

  const parsed = EpcCertificateRawSchema.safeParse(candidate);
  if (!parsed.success) {
    console.warn("[epc] cert detail unexpected shape", {
      certificateNumber,
      candidateKeys:
        candidate && typeof candidate === "object"
          ? Object.keys(candidate as object).slice(0, 16)
          : typeof candidate,
      sampleIssues: parsed.error.issues.slice(0, 3),
    });
    return null;
  }
  const raw: EpcCertificateRaw = parsed.data;

  // Pre-unwrap the band/property fields. Duplicating the unwrap
  // calls in the diagnostic and in `normalised` would be lossy
  // — keep them in one place.
  const currentBand = pickFirst(
    unwrapValueLike(raw.current_energy_efficiency_band),
    unwrapValueLike(raw.current_energy_band)
  );
  const potentialBand = pickFirst(
    unwrapValueLike(raw.potential_energy_efficiency_band),
    unwrapValueLike(raw.potential_energy_band)
  );
  // dwelling_type can ship as a plain string OR a nested { value: ... }
  // wrapper in the v3 endpoint. unwrapValueLike already handles both.
  const dwellingTypeStr = unwrapValueLike(raw.dwelling_type);
  const propertyTypeStr = unwrapValueLike(raw.property_type);

  // Diagnostic — fires on first request when a key field is still
  // missing after unwrapping. Logs the FULL raw key list so we can
  // chase the next renamed field without waiting for a user report.
  const missing: string[] = [];
  if (!currentBand) missing.push("currentEnergyBand");
  if (!potentialBand) missing.push("potentialEnergyBand");
  if (!dwellingTypeStr && !propertyTypeStr) missing.push("propertyType");
  if (missing.length > 0) {
    console.warn("[epc] cert parsed but key fields are missing", {
      certificateNumber,
      missing,
      allKeys: Object.keys(raw),
    });
  }

  const normalised: EpcCertificate = {
    // ── Identifiers + admin ─────────────────────────────────────────
    certificateNumber: unwrapValueLike(raw.certificate_number) ?? certificateNumber,
    uprn: unwrapValueLike(raw.uprn),
    address: [
      unwrapValueLike(raw.address_line_1),
      unwrapValueLike(raw.address_line_2),
      unwrapValueLike(raw.address_line_3),
      unwrapValueLike(raw.post_town),
    ]
      .filter(Boolean)
      .join(", "),
    postcode: unwrapValueLike(raw.postcode),
    registrationDate: unwrapValueLike(raw.registration_date),
    transactionType: unwrapValueLike(raw.transaction_type),
    council: unwrapValueLike(raw.council),

    // ── Ratings + bands ─────────────────────────────────────────────
    currentEnergyBand: currentBand,
    potentialEnergyBand: potentialBand,
    currentEnergyRating: unwrapNumberLike(
      raw.current_energy_efficiency_rating ??
        raw.current_energy_rating ??
        raw.energy_rating_current
    ),
    potentialEnergyRating: unwrapNumberLike(
      raw.potential_energy_efficiency_rating ??
        raw.potential_energy_rating ??
        raw.energy_rating_potential
    ),
    environmentImpactCurrent: unwrapNumberLike(
      raw.environment_impact_current ?? raw.environmental_impact_current
    ),
    environmentImpactPotential: unwrapNumberLike(
      raw.environment_impact_potential ?? raw.environmental_impact_potential
    ),
    energyConsumptionCurrent: unwrapNumberLike(raw.energy_consumption_current),
    energyConsumptionPotential: unwrapNumberLike(raw.energy_consumption_potential),
    co2EmissionsCurrent: unwrapNumberLike(raw.co2_emissions_current),
    co2EmissionsPotential: unwrapNumberLike(raw.co2_emissions_potential),

    // ── Property classification ─────────────────────────────────────
    propertyType: pickFirst(propertyTypeStr, dwellingTypeStr),
    dwellingType:
      dwellingTypeStr ??
      ([propertyTypeStr, unwrapValueLike(raw.built_form)]
        .filter(Boolean)
        .join(" — ") || null),
    builtForm: unwrapValueLike(raw.built_form),
    constructionAgeBand:
      unwrapValueLike(raw.construction_age_band) ??
      unwrapValueLike(raw.construction_age),
    tenure: unwrapValueLike(raw.tenure),
    totalFloorAreaM2: unwrapNumberLike(raw.total_floor_area),
    floorHeightM: unwrapNumberLike(raw.floor_height),
    extensionCount: unwrapNumberLike(raw.extension_count ?? raw.extensions_count),
    numberHabitableRooms: unwrapNumberLike(
      raw.number_habitable_rooms ?? raw.habitable_room_count
    ),
    numberHeatedRooms: unwrapNumberLike(
      raw.number_heated_rooms ?? raw.heated_room_count
    ),

    // ── Heating ─────────────────────────────────────────────────────
    // unwrapDescription/unwrapEnergyEff transparently handle BOTH the
    // new nested arrays (main_heating[0].description.value) and the
    // legacy flat strings (main_heating_description). pickFirst
    // returns whichever path actually produced data.
    mainFuel: unwrapValueLike(raw.main_fuel),
    mainHeatingDescription: pickFirst(
      unwrapDescription(raw.main_heating),
      unwrapValueLike(raw.main_heating_description),
      unwrapValueLike(raw.mainheat_description),
    ),
    mainHeatingEnergyEff: pickFirst(
      unwrapEnergyEff(raw.main_heating),
      unwrapValueLike(raw.mainheat_energy_eff),
    ),
    mainHeatingControlsDescription: pickFirst(
      unwrapDescription(raw.main_heating_controls),
      unwrapValueLike(raw.mainheatcont_description),
    ),
    mainHeatingControlsEnergyEff: pickFirst(
      unwrapEnergyEff(raw.main_heating_controls),
      unwrapValueLike(raw.mainheatcont_energy_eff),
    ),
    hotWaterDescription: pickFirst(
      unwrapDescription(raw.hot_water),
      unwrapValueLike(raw.hot_water_description),
    ),
    hotWaterEnergyEff: pickFirst(
      unwrapEnergyEff(raw.hot_water),
      unwrapValueLike(raw.hot_water_energy_eff),
    ),
    mainsGasFlag: unwrapMainsGas(raw),

    // ── Secondary heating + open chimneys/fireplaces ────────────────
    secondaryHeatingDescription: pickFirst(
      unwrapDescription(raw.secondary_heating),
      unwrapValueLike(raw.secondheat_description),
      unwrapValueLike(raw.secondary_heating_description),
      unwrapValueLike(raw.main_heating_2_description),
    ),
    numberOpenFireplaces: unwrapNumberLike(
      raw.number_open_fireplaces ?? raw.open_fireplaces_count,
    ),
    numberOpenChimneys: unwrapNumberLike(
      raw.number_open_chimneys ?? raw.open_chimneys_count,
    ),

    // ── Fabric + glazing ────────────────────────────────────────────
    // New API: walls/roofs/floors are arrays, window is a single
    // object. Index [0] for the primary; roofs[1] surfaces as the
    // secondary roof so installers see mixed-roof properties.
    wallsDescription: pickFirst(
      unwrapDescription(raw.walls),
      unwrapValueLike(raw.walls_description),
    ),
    wallsEnergyEff: pickFirst(
      unwrapEnergyEff(raw.walls),
      unwrapValueLike(raw.walls_energy_eff),
    ),
    roofDescription: pickFirst(
      unwrapDescription(raw.roofs ?? raw.roof),
      unwrapValueLike(raw.roof_description),
    ),
    roofEnergyEff: pickFirst(
      unwrapEnergyEff(raw.roofs ?? raw.roof),
      unwrapValueLike(raw.roof_energy_eff),
    ),
    roofDescription2: unwrapDescription(raw.roofs, 1),
    roofEnergyEff2: unwrapEnergyEff(raw.roofs, 1),
    floorDescription: pickFirst(
      unwrapDescription(raw.floors ?? raw.floor),
      unwrapValueLike(raw.floor_description),
    ),
    floorEnergyEff: pickFirst(
      unwrapEnergyEff(raw.floors ?? raw.floor),
      unwrapValueLike(raw.floor_energy_eff),
    ),
    windowsDescription: pickFirst(
      unwrapDescription(raw.window ?? raw.windows),
      unwrapValueLike(raw.windows_description),
    ),
    windowsEnergyEff: pickFirst(
      unwrapEnergyEff(raw.window ?? raw.windows),
      unwrapValueLike(raw.windows_energy_eff),
    ),
    glazedType: unwrapValueLike(raw.glazed_type),
    glazedArea: unwrapValueLike(raw.glazed_area),
    multiGlazeProportion: unwrapNumberLike(
      raw.multi_glaze_proportion ?? raw.multiple_glazed_proportion
    ),

    // ── Lighting ────────────────────────────────────────────────────
    lightingDescription: pickFirst(
      unwrapDescription(raw.lighting),
      unwrapValueLike(raw.lighting_description),
    ),
    lightingEnergyEff: pickFirst(
      unwrapEnergyEff(raw.lighting),
      unwrapValueLike(raw.lighting_energy_eff),
    ),
    lowEnergyLightingPct: unwrapNumberLike(raw.low_energy_lighting),
    fixedLightingOutletsCount: unwrapNumberLike(raw.fixed_lighting_outlets_count),
    lowEnergyFixedLightingCount: unwrapNumberLike(
      raw.low_energy_fixed_lighting ?? raw.low_energy_fixed_lighting_outlets_count
    ),

    // ── Per-bill breakdown (£/yr) ──────────────────────────────────
    // New API ships these as { value, currency }; legacy as numbers
    // or strings. unwrapNumberLike handles all three shapes.
    heatingCostCurrent: unwrapNumberLike(raw.heating_cost_current),
    heatingCostPotential: unwrapNumberLike(raw.heating_cost_potential),
    hotWaterCostCurrent: unwrapNumberLike(raw.hot_water_cost_current),
    hotWaterCostPotential: unwrapNumberLike(raw.hot_water_cost_potential),
    lightingCostCurrent: unwrapNumberLike(raw.lighting_cost_current),
    lightingCostPotential: unwrapNumberLike(raw.lighting_cost_potential),

    // ── Lodgement + inspection ─────────────────────────────────────
    inspectionDate: unwrapValueLike(raw.inspection_date),
    lodgementDate:
      unwrapValueLike(raw.lodgement_date) ??
      (typeof raw.lodgement_datetime === "string"
        ? raw.lodgement_datetime.slice(0, 10)
        : null),

    // ── Assessor / accreditation ───────────────────────────────────
    assessorName: pickFirst(
      unwrapValueLike(raw.inspector_name),
      unwrapValueLike(raw.assessor_name)
    ),
    assessorEmail: pickFirst(
      unwrapValueLike(raw.energy_assessor_email),
      unwrapValueLike(raw.assessor_email),
      unwrapValueLike(raw.inspector_email)
    ),
    assessorCompany: unwrapValueLike(raw.inspector_company_name),
    accreditationScheme: unwrapValueLike(raw.accreditation_scheme),

    // ── Validity (computed) ────────────────────────────────────────
    // EPCs are valid for 10 years from the registration / lodgement
    // date. We anchor on registration_date when present (matches the
    // displayed "valid until" on the GOV.UK certificate page) and
    // fall back to lodgement_date.
    ...computeValidity(
      unwrapValueLike(raw.registration_date) ??
        unwrapValueLike(raw.lodgement_date) ??
        null
    ),
  };

  await cacheSet("epc:cert-v6", certificateNumber, normalised, TTL_SECONDS);
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
    dwellingType: null,
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

    // Secondary heating + open fires/chimneys live only on the
    // detail endpoint, so the search-row fallback null-fills them.
    secondaryHeatingDescription: null,
    numberOpenFireplaces: null,
    numberOpenChimneys: null,

    wallsDescription: null,
    wallsEnergyEff: null,
    roofDescription: null,
    roofEnergyEff: null,
    roofDescription2: null,
    roofEnergyEff2: null,
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

    // The search row carries no assessor / lodgement detail; only the
    // detail endpoint does. Leave the typed fields null so the rest
    // of the app can degrade gracefully.
    inspectionDate: null,
    lodgementDate: null,
    assessorName: null,
    assessorEmail: null,
    assessorCompany: null,
    accreditationScheme: null,

    // Validity: derive from the search row's registration date when
    // we have one. Means a degraded "search row only" cert still
    // surfaces a sensible "valid until" + expired flag.
    ...computeValidity(row.registrationDate || null),
  };
}

// ─── public entry ─────────────────────────────────────────────────────────────

export interface GetEpcInput {
  uprn?: string | null;
  postcode?: string | null;
  addressLine1?: string | null;
  // Optional: the full single-line address, e.g. "Flat 12, The Old Mill,
  // Mill Road, Halifax". When present, the fuzzy matcher scores both
  // addressLine1 and addressFull against each EPC search row and keeps
  // the higher score. For multi-flat blocks where Postcoder collapses
  // the flat number into a different field than addressLine1, this is
  // the difference between matching the right flat and matching its
  // neighbour at threshold.
  addressFull?: string | null;
}

// Build a stable cache key from the input. UPRN is the preferred anchor
// (one per property); postcode+address is the fallback. Returns null when
// there's nothing to key on — in that case we skip the cache entirely.
//
// Note: when addressFull is supplied we key on it (more specific than
// line1) so two flats sharing the same line1 don't collide in the cache.
function epcCacheKey(input: GetEpcInput): string | null {
  if (input.uprn) {
    const n = uprnToInt(input.uprn);
    if (n != null) return `uprn:${n}`;
  }
  if (input.postcode && (input.addressFull || input.addressLine1)) {
    const pc = normalisePostcode(input.postcode);
    const addr = (input.addressFull ?? input.addressLine1 ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
    return `pcaddr-v2:${pc}:${addr}`;
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
 * namespace "epc:by-address-v6". This means re-analysing the same property
 * skips the upstream UPRN/postcode search + detail fetch entirely.
 */
export async function getEpc(input: GetEpcInput): Promise<EpcByAddressResponse> {
  const ck = epcCacheKey(input);
  if (ck) {
    const cached = await cacheGet<EpcByAddressResponse>("epc:by-address-v6", ck);
    if (cached) return cached;
  }

  const result = await resolveEpcUncached(input);

  if (ck) {
    const ttl = result.found ? TTL_SECONDS : MISS_TTL_SECONDS;
    await cacheSet("epc:by-address-v6", ck, result, ttl);
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

  if (rows.length === 0 && input.postcode && (input.addressLine1 || input.addressFull)) {
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
    // Score against BOTH addressLine1 and addressFull (when present) and
    // keep the higher score. addressFull is a one-liner like
    // "Flat 12, The Old Mill, Mill Road, Halifax" — much more specific
    // than line1 alone in multi-occupancy buildings, where line1 is
    // often just the building name shared by 67 flats.
    const candidates = [input.addressLine1, input.addressFull].filter(
      (s): s is string => typeof s === "string" && s.length > 0
    );
    const scored = rows
      .map((r) => {
        const rowAddr = rowAddress(r);
        const best = candidates.reduce((max, c) => Math.max(max, matchScore(c, rowAddr)), 0);
        return { r, score: best };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.r.registrationDate || "").localeCompare(a.r.registrationDate || "");
      });
    const top = scored[0];
    // Threshold 0.35 forgives minor address-shape mismatches between
    // Postcoder (PAF) and the EPC API. The door-number heuristic in
    // matchScore guards against false-positive neighbour matches.
    //
    // For multi-flat blocks (>5 candidates), bump to 0.55 — at lower
    // scores we'd be matching by building name alone, which happily
    // returns whichever flat happens to be first in the list. Better
    // to return "no match" honestly than confidently match the wrong
    // flat.
    const threshold = rows.length > 5 ? 0.55 : 0.35;
    if (!top || top.score < threshold) {
      // Log the top candidates so we can diagnose stubborn cases
      // where an EPC clearly exists but no row scores high enough.
      console.warn("[epc] no postcode+address match above threshold", {
        input: input.addressFull ?? input.addressLine1,
        postcode: input.postcode,
        threshold,
        candidatePool: rows.length,
        topCandidates: scored.slice(0, 3).map((c) => ({
          address: rowAddress(c.r),
          score: Math.round(c.score * 100) / 100,
        })),
      });
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

  // Pull improvement recommendations off the side endpoint. Best-
  // effort: a failure here doesn't fail the EPC lookup. Returns
  // null when the call errors so downstream renderers can show a
  // "couldn't load recommendations" hint vs an empty array (cert
  // genuinely had none lodged). Cached separately under its own
  // namespace so swap-out is independent of the cert cache.
  const recommendations = await fetchRecommendations(best.certificateNumber);

  return {
    found: true,
    matchMethod,
    certificate: cert,
    registrationDate: cert.registrationDate ?? best.registrationDate ?? "",
    ageYears: yearsBetween(cert.registrationDate ?? best.registrationDate ?? null),
    recommendations,
  };
}

/**
 * GOV.UK recommendations endpoint — improvement measures the assessor
 * flagged on the cert. Each row carries an indicative cost band, a
 * predicted band-rating uplift, and a typical annual savings band.
 *
 * Returns null on error (so the caller can render "couldn't load")
 * vs [] when the API succeeds with no recommendations.
 */
async function fetchRecommendations(
  certificateNumber: string,
): Promise<EpcRecommendation[] | null> {
  const cached = await cacheGet<EpcRecommendation[]>(
    "epc:recs-v1",
    certificateNumber,
  );
  if (cached) return cached;

  const url = new URL(`${EPC_BASE}/api/domestic/recommendations`);
  url.searchParams.set("certificate_number", certificateNumber);

  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: authHeaders() });
  } catch (err) {
    console.warn("[epc] recommendations fetch failed (network)", {
      certificateNumber,
      err: err instanceof Error ? err.message : err,
    });
    return null;
  }

  if (res.status === 404) {
    // No recommendations lodged — cache empty array to skip the
    // round-trip on repeat lookups.
    await cacheSet("epc:recs-v1", certificateNumber, [], TTL_SECONDS);
    return [];
  }
  if (!res.ok) {
    console.warn("[epc] recommendations endpoint non-OK", {
      certificateNumber,
      status: res.status,
    });
    return null;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    console.warn("[epc] recommendations JSON parse failed", {
      certificateNumber,
      err: err instanceof Error ? err.message : err,
    });
    return null;
  }

  // Same envelope strangeness as the cert endpoint: API has shipped
  // both `{ data: [...] }` and bare arrays. Normalise.
  const normalised = camelToSnakeKeys(json);
  let rows: unknown[] = [];
  if (Array.isArray(normalised)) {
    rows = normalised;
  } else if (
    normalised &&
    typeof normalised === "object" &&
    "data" in normalised &&
    Array.isArray((normalised as { data: unknown }).data)
  ) {
    rows = (normalised as { data: unknown[] }).data;
  } else {
    console.warn("[epc] recommendations: unexpected envelope", {
      certificateNumber,
      keys:
        normalised && typeof normalised === "object"
          ? Object.keys(normalised as object)
          : typeof normalised,
    });
    return null;
  }

  const out: EpcRecommendation[] = rows.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const row = r as Record<string, unknown>;
    const summary =
      unwrapValueLike(row.improvement_summary) ??
      unwrapValueLike(row.improvement_summary_text) ??
      unwrapValueLike(row.improvement_description_text);
    if (!summary) return [];
    return [
      {
        improvementSummary: summary,
        improvementDescription: unwrapValueLike(
          row.improvement_description ??
            row.improvement_description_text ??
            row.improvement_long_description,
        ),
        improvementItem: unwrapNumberLike(
          row.improvement_item ?? row.improvement_number,
        ),
        indicativeCost: unwrapValueLike(row.indicative_cost),
        typicalSavingPerYear: unwrapValueLike(
          row.typical_saving_per_year ?? row.indicative_savings,
        ),
        energyPerformanceRatingImprovement: unwrapNumberLike(
          row.energy_performance_rating_improvement,
        ),
        energyPerformanceBandImprovement: unwrapValueLike(
          row.energy_performance_band_improvement,
        ),
        environmentalImpactRatingImprovement: unwrapNumberLike(
          row.environmental_impact_rating_improvement,
        ),
        greenDealCategoryCode: unwrapValueLike(row.green_deal_category_code),
      },
    ];
  });

  // Sort by improvementItem (lower = higher priority). Rows with no
  // item number sort to the end.
  out.sort((a, b) => {
    const ai = a.improvementItem ?? Number.POSITIVE_INFINITY;
    const bi = b.improvementItem ?? Number.POSITIVE_INFINITY;
    return ai - bi;
  });

  await cacheSet("epc:recs-v1", certificateNumber, out, TTL_SECONDS);
  return out;
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
