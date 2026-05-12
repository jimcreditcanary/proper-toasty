// Pure functions for computing town-level EPC aggregates from
// EPC search rows + reading aggregates back from Supabase.
//
// Pilot scope: search rows only carry the CURRENT energy band per
// property (not property type, floor area, heating cost, etc — those
// live on the cert detail endpoint which is too expensive to call
// per-row at city scale). So the pilot's "unique data point" per
// town is the band-distribution histogram + sample size. Plenty to
// clear the AEO validator's ≥1 unique-data-point rule.
//
// When we scale to the bulk EPC dump in Phase 2b, this module gains
// the richer aggregate fields (property type mix, age mix, floor
// area median, heating cost median). The page component already
// expects optional richer fields and renders gracefully when
// they're absent.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PilotTown } from "./towns";

export type EnergyBand = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export const ALL_BANDS: EnergyBand[] = ["A", "B", "C", "D", "E", "F", "G"];

/**
 * Aggregate payload — what we store in
 * epc_area_aggregates.data (JSONB).
 *
 * Every numeric field tolerates `null` so a sparse rollup (lean
 * search rows only, no detail-endpoint fetches) doesn't have to
 * pad with zeros.
 */
export interface TownAggregateData {
  /** Number of EPCs sampled. Build-time validator rejects pages
   *  below the minimum (default 50). */
  sample_size: number;

  /** Count of EPCs per current-band. Bands with zero hits omitted. */
  band_distribution: Partial<Record<EnergyBand, number>>;
  /** Same data, as percentages (0–100 with 1 decimal). */
  band_distribution_pct: Partial<Record<EnergyBand, number>>;
  /** Most common band — the "typical home" for the town. */
  median_band: EnergyBand | null;
  /** Numerically lowest band represented (best-performing). */
  best_band: EnergyBand | null;
  /** Numerically highest band represented (worst-performing). */
  worst_band: EnergyBand | null;

  /** Date range of EPC registrations in the sample (ISO). Useful
   *  context — "data from EPCs lodged 2008–2025". */
  earliest_registration: string | null;
  latest_registration: string | null;

  // ─── Bulk-dump-only fields (populated by Phase 2b) ───────────
  /** Median total floor area in m². Null until bulk-dump ingest. */
  median_floor_area_m2?: number | null;
  /** Property type mix — keys like "Flat", "Mid-terrace house". */
  property_type_distribution?: Record<string, number>;
  /** Construction age band mix — keys like "1930-1949", "Pre 1900". */
  construction_age_distribution?: Record<string, number>;
  /** % of properties with mains gas connection. */
  mains_gas_pct?: number | null;
  /** Median current heating cost, £/yr. */
  median_heating_cost_current_gbp?: number | null;
  /** Median heating cost after recommended improvements, £/yr. */
  median_heating_cost_potential_gbp?: number | null;
}

/**
 * Lean shape we accept from EPC search rows — matches the existing
 * EpcSearchRow type (src/lib/schemas/epc.ts) for the fields we use,
 * but redeclared here so this module doesn't import the schema bag.
 */
export interface EpcRowInput {
  currentEnergyEfficiencyBand: string;
  registrationDate: string;
  postTown?: string;
  postcode?: string;
}

/**
 * Compute a TownAggregateData payload from a batch of EPC search
 * rows. Pure function — same inputs always yield the same outputs.
 *
 * Rows with an empty / unrecognised current band are skipped (not
 * counted toward `sample_size`). Defensive: the EPC API has shipped
 * lowercase / missing bands in some historical releases.
 */
export function computeTownAggregate(rows: EpcRowInput[]): TownAggregateData {
  const counts: Partial<Record<EnergyBand, number>> = {};
  let sample = 0;
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const r of rows) {
    const band = normaliseBand(r.currentEnergyEfficiencyBand);
    if (!band) continue;
    counts[band] = (counts[band] ?? 0) + 1;
    sample += 1;
    const reg = r.registrationDate?.slice(0, 10) ?? null;
    if (reg) {
      if (!earliest || reg < earliest) earliest = reg;
      if (!latest || reg > latest) latest = reg;
    }
  }

  const pct: Partial<Record<EnergyBand, number>> = {};
  for (const b of ALL_BANDS) {
    const c = counts[b];
    if (c) {
      pct[b] = Math.round((c / sample) * 1000) / 10; // 1 decimal
    }
  }

  return {
    sample_size: sample,
    band_distribution: counts,
    band_distribution_pct: pct,
    median_band: pickMedianBand(counts, sample),
    best_band: ALL_BANDS.find((b) => counts[b]) ?? null,
    worst_band: [...ALL_BANDS].reverse().find((b) => counts[b]) ?? null,
    earliest_registration: earliest,
    latest_registration: latest,
  };
}

function normaliseBand(input: string | undefined | null): EnergyBand | null {
  if (!input) return null;
  const u = input.trim().toUpperCase();
  return (ALL_BANDS as string[]).includes(u) ? (u as EnergyBand) : null;
}

/**
 * Pick the median band — i.e. the band that contains the 50th
 * percentile of the sample when bands are ordered A → G.
 *
 * (Mode would be valid too but median is more robust to a fat
 * lower-end tail; UK's typical home is band D and that's the figure
 * we want surfaced.)
 */
function pickMedianBand(
  counts: Partial<Record<EnergyBand, number>>,
  sample: number,
): EnergyBand | null {
  if (sample === 0) return null;
  const half = sample / 2;
  let running = 0;
  for (const b of ALL_BANDS) {
    running += counts[b] ?? 0;
    if (running >= half) return b;
  }
  return null;
}

// ─── DB ────────────────────────────────────────────────────────────

type AdminClient = SupabaseClient<Database>;

export interface TownAggregateRow {
  scope_key: string;
  display_name: string;
  country: "England" | "Wales" | "Scotland" | "Northern Ireland";
  region: string | null;
  county: string | null;
  lat: number | null;
  lng: number | null;
  data: TownAggregateData;
  sample_size: number;
  indexed: boolean;
  index_reason: string | null;
  refreshed_at: string;
  source_dump_date: string | null;
}

/**
 * Load a single town's aggregate, or null when none has been
 * computed yet. Used by the page route to render or noindex.
 */
export async function loadTownAggregate(
  admin: AdminClient,
  slug: string,
): Promise<TownAggregateRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("epc_area_aggregates")
    .select("*")
    .eq("scope", "town")
    .eq("scope_key", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as TownAggregateRow;
}

/**
 * Load every indexed town aggregate — used by sitemap-towns.xml +
 * the llms-content registry.
 */
export async function loadIndexedTownAggregates(
  admin: AdminClient,
): Promise<TownAggregateRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("epc_area_aggregates")
    .select("*")
    .eq("scope", "town")
    .eq("indexed", true)
    .order("scope_key", { ascending: true });
  if (error || !data) return [];
  return data as TownAggregateRow[];
}

/**
 * Identifier + display metadata for a local-authority-scope upsert.
 * Mirrors the bits of PilotTown we use, but slug-shaped (e.g.
 * "sheffield-council") and named after the council itself rather
 * than any one town. Keeps the LA upsert decoupled from the seed
 * shape, so a future LA-only ingest doesn't have to fabricate
 * PilotTown rows.
 */
export interface LocalAuthorityIdent {
  /** URL-shape slug, e.g. "sheffield-council". Used as scope_key. */
  slug: string;
  /** Display name shown on the page header, e.g. "Sheffield". */
  displayName: string;
  country: "England" | "Wales" | "Scotland" | "Northern Ireland";
  region: string | null;
  county: string | null;
  /** LA centroid for "near you" cross-links. Optional. */
  lat: number | null;
  lng: number | null;
}

/**
 * Upsert an LA-scope aggregate row. Same compute as the town
 * aggregate today (the EPC search API returns all rows for a
 * council; we don't yet post-town-filter for the town scope, so
 * both scopes contain identical numbers). When the bulk-CSV ingest
 * lands in Phase 2b this gains the richer fields (property type
 * mix, floor area median, etc.) and the town scope grows a
 * post_town filter that makes the two genuinely different.
 *
 * Idempotent — upserts on (scope='local_authority', scope_key=slug).
 */
export async function upsertLAAggregate(
  admin: AdminClient,
  la: LocalAuthorityIdent,
  data: TownAggregateData,
  opts: {
    minSampleSize?: number;
    sourceDumpDate?: string | null;
    forceIndexed?: boolean | null;
  } = {},
): Promise<void> {
  const minSample = opts.minSampleSize ?? 50;
  let indexed = data.sample_size >= minSample;
  let indexReason: string | null = null;
  if (!indexed) {
    indexReason = `sample_size=${data.sample_size} below ${minSample} minimum`;
  }
  if (opts.forceIndexed === false) {
    indexed = false;
    indexReason = indexReason ?? "manually set to noindex";
  } else if (opts.forceIndexed === true) {
    indexed = true;
    indexReason = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("epc_area_aggregates").upsert(
    {
      scope: "local_authority",
      scope_key: la.slug,
      display_name: la.displayName,
      country: la.country,
      region: la.region,
      county: la.county,
      lat: la.lat,
      lng: la.lng,
      data,
      sample_size: data.sample_size,
      indexed,
      index_reason: indexReason,
      refreshed_at: new Date().toISOString(),
      source_dump_date: opts.sourceDumpDate ?? null,
    },
    { onConflict: "scope,scope_key" },
  );
  if (error) {
    throw new Error(`Upsert failed for LA ${la.slug}: ${error.message}`);
  }
}

/**
 * Load all indexed LA-scope aggregates. Mirrors loadIndexedTownAggregates;
 * used by future sitemap-areas.xml + the admin tooling that needs
 * to enumerate populated areas.
 */
export async function loadIndexedLAAggregates(
  admin: AdminClient,
): Promise<TownAggregateRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("epc_area_aggregates")
    .select("*")
    .eq("scope", "local_authority")
    .eq("indexed", true)
    .order("scope_key", { ascending: true });
  if (error || !data) return [];
  return data as TownAggregateRow[];
}

/**
 * Derive a stable LA slug from a council name. Lowercase, replace
 * non-alphanumerics with hyphens, collapse runs, trim hyphens.
 * "Kingston upon Hull, City of" → "kingston-upon-hull-city-of".
 * "Sheffield" → "sheffield".
 */
export function laSlugFromCouncilName(councilName: string): string {
  return councilName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Upsert a computed aggregate. Used by the build script.
 *
 * `indexed` defaults to true when sample_size ≥ minSampleSize;
 * caller can override (e.g. force-noindex on a town that the
 * editorial team flagged for some other reason).
 */
export async function upsertTownAggregate(
  admin: AdminClient,
  town: PilotTown,
  data: TownAggregateData,
  opts: {
    minSampleSize?: number;
    sourceDumpDate?: string | null;
    forceIndexed?: boolean | null;
  } = {},
): Promise<void> {
  const minSample = opts.minSampleSize ?? 50;
  let indexed = data.sample_size >= minSample;
  let indexReason: string | null = null;
  if (!indexed) {
    indexReason = `sample_size=${data.sample_size} below ${minSample} minimum`;
  }
  if (opts.forceIndexed === false) {
    indexed = false;
    indexReason = indexReason ?? "manually set to noindex";
  } else if (opts.forceIndexed === true) {
    indexed = true;
    indexReason = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("epc_area_aggregates").upsert(
    {
      scope: "town",
      scope_key: town.slug,
      display_name: town.name,
      country: town.country,
      region: town.region,
      county: town.county,
      lat: town.lat,
      lng: town.lng,
      data,
      sample_size: data.sample_size,
      indexed,
      index_reason: indexReason,
      refreshed_at: new Date().toISOString(),
      source_dump_date: opts.sourceDumpDate ?? null,
    },
    { onConflict: "scope,scope_key" },
  );
  if (error) {
    throw new Error(
      `Upsert failed for town ${town.slug}: ${error.message}`,
    );
  }
}
