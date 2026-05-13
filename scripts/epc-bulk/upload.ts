// scripts/epc-bulk/upload.ts — upsert the JSON aggregates produced by
// aggregate.ts into Supabase. Three scopes:
//
//   1. scope='local_authority' — one row per UK LAD (~330 rows). Backs
//      future /heat-pumps/<la-slug> and /solar-panels/<la-slug> pages.
//
//   2. scope='town' — for every PILOT_TOWN that has a matching LAD GSS
//      code, mirror that LAD's aggregate under the town's slug.
//      This is the "scale 52 town pages from API-search rollups to
//      bulk-CSV rollups" move — same DB shape, richer numbers.
//
//   3. scope='archetype' — one row per property archetype (type × era).
//      ~80 rows. Backs /heat-pumps/<archetype-slug> pages.
//
// Idempotent: re-running with the same input JSON produces the same
// state. Safe to run as part of a monthly cron.
//
// Usage:
//   npx tsx scripts/epc-bulk/upload.ts
//   npx tsx scripts/epc-bulk/upload.ts --in tmp/epc-aggregates
//   npx tsx scripts/epc-bulk/upload.ts --scope local_authority   # just one scope
//   npx tsx scripts/epc-bulk/upload.ts --dry-run                  # no DB writes

import "../../src/lib/dev/load-env";

import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "../../src/lib/supabase/admin";
import {
  PILOT_TOWNS,
  type PilotTown,
} from "../../src/lib/programmatic/towns";

const VALID_SCOPES = [
  "local_authority",
  "town",
  "archetype",
] as const;
type Scope = (typeof VALID_SCOPES)[number];

interface Args {
  inDir: string;
  scopes: Scope[];
  dryRun: boolean;
  minSampleSize: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let inDir = path.join(process.cwd(), "tmp", "epc-aggregates");
  let scopes: Scope[] = [...VALID_SCOPES];
  let dryRun = false;
  let minSampleSize = 50;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--in" && argv[i + 1]) {
      inDir = argv[++i];
    } else if (a === "--scope" && argv[i + 1]) {
      const requested = argv[++i].split(",").map((s) => s.trim().toLowerCase());
      const valid = requested.filter((s): s is Scope =>
        (VALID_SCOPES as readonly string[]).includes(s),
      );
      if (valid.length === 0) {
        console.error(
          `[epc-bulk] No valid scopes in --scope. Valid: ${VALID_SCOPES.join(", ")}`,
        );
        process.exit(1);
      }
      scopes = valid;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--min-sample" && argv[i + 1]) {
      minSampleSize = parseInt(argv[++i], 10);
    }
  }

  return { inDir, scopes, dryRun, minSampleSize };
}

// ─── Aggregate shape (matches aggregate.ts output) ─────────────────

type Band = "A" | "B" | "C" | "D" | "E" | "F" | "G";

interface AggregateOutput {
  scope_key: string;
  display_name: string | null;
  country: string | null;
  region: string | null;
  sample_size: number;
  band_distribution: Partial<Record<Band, number>>;
  band_distribution_pct: Partial<Record<Band, number>>;
  median_band: Band | null;
  best_band: Band | null;
  worst_band: Band | null;
  median_floor_area_m2: number | null;
  floor_area_p25_m2: number | null;
  floor_area_p75_m2: number | null;
  median_heating_cost_current_gbp: number | null;
  heating_cost_p25_gbp: number | null;
  heating_cost_p75_gbp: number | null;
  mains_gas_pct: number | null;
  property_type_distribution: Record<string, number>;
  construction_age_distribution: Record<string, number>;
  built_form_distribution: Record<string, number>;
  earliest_lodgement: string | null;
  latest_lodgement: string | null;
}

// ─── DB shape conversion ────────────────────────────────────────────

// The existing epc_area_aggregates.data JSONB column expects the
// TownAggregateData shape (see src/lib/programmatic/town-aggregates.ts).
// We map the aggregate output into that shape verbatim — the new
// bulk-dump fields (floor area, heating cost, property type mix, etc.)
// fit cleanly because TownAggregateData already declared them as
// optional. Older town rows without these fields continue to render;
// new town/LAD/archetype rows include the richer data.
function toDbPayload(agg: AggregateOutput): Record<string, unknown> {
  return {
    sample_size: agg.sample_size,
    band_distribution: agg.band_distribution,
    band_distribution_pct: agg.band_distribution_pct,
    median_band: agg.median_band,
    best_band: agg.best_band,
    worst_band: agg.worst_band,
    earliest_registration: agg.earliest_lodgement,
    latest_registration: agg.latest_lodgement,
    // ── Bulk-dump-only fields (now populated) ─────────────────────
    median_floor_area_m2: agg.median_floor_area_m2,
    floor_area_p25_m2: agg.floor_area_p25_m2,
    floor_area_p75_m2: agg.floor_area_p75_m2,
    median_heating_cost_current_gbp: agg.median_heating_cost_current_gbp,
    heating_cost_p25_gbp: agg.heating_cost_p25_gbp,
    heating_cost_p75_gbp: agg.heating_cost_p75_gbp,
    mains_gas_pct: agg.mains_gas_pct,
    property_type_distribution: agg.property_type_distribution,
    construction_age_distribution: agg.construction_age_distribution,
    built_form_distribution: agg.built_form_distribution,
  };
}

function ladSlugFromGss(gss: string, displayName: string | null): string {
  // GSS code is the canonical scope_key for LA rows. We prefix
  // `la-` so it doesn't collide with town slugs that happen to look
  // alphanumeric. Display name still drives the page header copy.
  return `la-${gss.toLowerCase()}`;
}

function inferCountry(
  agg: AggregateOutput,
): "England" | "Wales" | "Scotland" | "Northern Ireland" | null {
  if (agg.country) {
    const c = agg.country.trim();
    if (c === "England" || c === "Wales" || c === "Scotland" || c === "Northern Ireland") {
      return c;
    }
  }
  // Fall back to GSS prefix — E######### = England, W = Wales, etc.
  const gss = agg.scope_key.toUpperCase();
  if (gss.startsWith("E")) return "England";
  if (gss.startsWith("W")) return "Wales";
  if (gss.startsWith("S")) return "Scotland";
  if (gss.startsWith("N")) return "Northern Ireland";
  return null;
}

// ─── Per-scope upserts ──────────────────────────────────────────────

interface ScopeStats {
  scope: Scope;
  attempted: number;
  written: number;
  noindex: number;
  skipped: number;
  errors: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertOne(admin: any, row: Record<string, unknown>): Promise<void> {
  const { error } = await admin
    .from("epc_area_aggregates")
    .upsert(row, { onConflict: "scope,scope_key" });
  if (error) throw new Error(error.message);
}

async function uploadLocalAuthorities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  laAggs: AggregateOutput[],
  dryRun: boolean,
  minSampleSize: number,
  sourceDumpDate: string,
): Promise<ScopeStats> {
  const stats: ScopeStats = {
    scope: "local_authority",
    attempted: 0,
    written: 0,
    noindex: 0,
    skipped: 0,
    errors: 0,
  };

  for (const agg of laAggs) {
    stats.attempted += 1;
    if (!agg.scope_key) {
      stats.skipped += 1;
      continue;
    }
    const country = inferCountry(agg);
    if (!country) {
      stats.skipped += 1;
      continue;
    }
    const slug = ladSlugFromGss(agg.scope_key, agg.display_name);
    const indexed = agg.sample_size >= minSampleSize;
    if (!indexed) stats.noindex += 1;

    const row = {
      scope: "local_authority",
      scope_key: slug,
      display_name: agg.display_name ?? slug,
      country,
      region: agg.region,
      county: null,
      lat: null,
      lng: null,
      data: toDbPayload(agg),
      sample_size: agg.sample_size,
      indexed,
      index_reason: indexed
        ? null
        : `sample_size=${agg.sample_size} below ${minSampleSize} minimum`,
      refreshed_at: new Date().toISOString(),
      source_dump_date: sourceDumpDate,
    };

    if (dryRun) {
      stats.written += 1;
      continue;
    }
    try {
      await upsertOne(admin, row);
      stats.written += 1;
    } catch (err) {
      stats.errors += 1;
      console.warn(
        `[upload] LA ${slug} (${agg.display_name}) FAILED: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return stats;
}

async function uploadTowns(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  laAggs: AggregateOutput[],
  dryRun: boolean,
  minSampleSize: number,
  sourceDumpDate: string,
): Promise<ScopeStats> {
  const stats: ScopeStats = {
    scope: "town",
    attempted: 0,
    written: 0,
    noindex: 0,
    skipped: 0,
    errors: 0,
  };

  // Build LAD-code lookup from aggregates.
  const byGss = new Map<string, AggregateOutput>();
  for (const agg of laAggs) {
    byGss.set(agg.scope_key.toUpperCase(), agg);
  }

  for (const town of PILOT_TOWNS) {
    stats.attempted += 1;
    const agg = byGss.get(town.laGssCode.toUpperCase());
    if (!agg) {
      console.warn(
        `[upload] town ${town.slug}: no LAD aggregate for ${town.laGssCode}`,
      );
      stats.skipped += 1;
      continue;
    }
    const indexed = agg.sample_size >= minSampleSize;
    if (!indexed) stats.noindex += 1;

    const row = buildTownRow(town, agg, indexed, minSampleSize, sourceDumpDate);

    if (dryRun) {
      stats.written += 1;
      continue;
    }
    try {
      await upsertOne(admin, row);
      stats.written += 1;
    } catch (err) {
      stats.errors += 1;
      console.warn(
        `[upload] town ${town.slug} FAILED: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return stats;
}

function buildTownRow(
  town: PilotTown,
  agg: AggregateOutput,
  indexed: boolean,
  minSampleSize: number,
  sourceDumpDate: string,
): Record<string, unknown> {
  return {
    scope: "town",
    scope_key: town.slug,
    display_name: town.name,
    country: town.country,
    region: town.region,
    county: town.county,
    lat: town.lat,
    lng: town.lng,
    data: toDbPayload(agg),
    sample_size: agg.sample_size,
    indexed,
    index_reason: indexed
      ? null
      : `sample_size=${agg.sample_size} below ${minSampleSize} minimum`,
    refreshed_at: new Date().toISOString(),
    source_dump_date: sourceDumpDate,
  };
}

async function uploadArchetypes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  archAggs: AggregateOutput[],
  dryRun: boolean,
  minSampleSize: number,
  sourceDumpDate: string,
): Promise<ScopeStats> {
  const stats: ScopeStats = {
    scope: "archetype",
    attempted: 0,
    written: 0,
    noindex: 0,
    skipped: 0,
    errors: 0,
  };

  for (const agg of archAggs) {
    stats.attempted += 1;
    if (!agg.scope_key) {
      stats.skipped += 1;
      continue;
    }
    const indexed = agg.sample_size >= minSampleSize;
    if (!indexed) stats.noindex += 1;

    const row = {
      scope: "archetype",
      scope_key: agg.scope_key,
      display_name: prettyArchetypeName(agg.scope_key),
      // Archetypes are nation-wide; default to England for the BUS
      // copy gate, but a future per-nation breakdown could refine.
      country: "England" as const,
      region: null,
      county: null,
      lat: null,
      lng: null,
      data: toDbPayload(agg),
      sample_size: agg.sample_size,
      indexed,
      index_reason: indexed
        ? null
        : `sample_size=${agg.sample_size} below ${minSampleSize} minimum`,
      refreshed_at: new Date().toISOString(),
      source_dump_date: sourceDumpDate,
    };

    if (dryRun) {
      stats.written += 1;
      continue;
    }
    try {
      await upsertOne(admin, row);
      stats.written += 1;
    } catch (err) {
      stats.errors += 1;
      console.warn(
        `[upload] archetype ${agg.scope_key} FAILED: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return stats;
}

function prettyArchetypeName(slug: string): string {
  // "mid-terrace-house--interwar-1930s" → "Mid-terrace 1930s house"
  const [type, era] = slug.split("--");
  const typePretty = (type ?? "")
    .replace(/-/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase());
  const eraPretty = (era ?? "")
    .replace(/-/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase());
  return `${typePretty} (${eraPretty})`;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { inDir, scopes, dryRun, minSampleSize } = parseArgs();

  const ladPath = path.join(inDir, "lad-aggregates.json");
  const archPath = path.join(inDir, "archetype-aggregates.json");
  const metaPath = path.join(inDir, "meta.json");

  if (!fs.existsSync(ladPath)) {
    console.error(`[upload] ${ladPath} not found.`);
    console.error(`[upload] Run scripts/epc-bulk/aggregate.ts first.`);
    process.exit(1);
  }

  const laAggs = JSON.parse(fs.readFileSync(ladPath, "utf-8")) as AggregateOutput[];
  const archAggs = fs.existsSync(archPath)
    ? (JSON.parse(fs.readFileSync(archPath, "utf-8")) as AggregateOutput[])
    : [];
  const meta = fs.existsSync(metaPath)
    ? (JSON.parse(fs.readFileSync(metaPath, "utf-8")) as Record<string, unknown>)
    : {};
  const sourceDumpDate =
    (meta.source_dump_date as string | undefined) ??
    new Date().toISOString().slice(0, 10);

  console.log("[epc-bulk] EPC aggregate upload");
  console.log(`[epc-bulk] Source dump: ${sourceDumpDate}`);
  console.log(`[epc-bulk] LAD aggregates: ${laAggs.length}`);
  console.log(`[epc-bulk] Archetype aggregates: ${archAggs.length}`);
  console.log(`[epc-bulk] Scopes to upload: ${scopes.join(", ")}`);
  console.log(`[epc-bulk] Min sample size for indexed: ${minSampleSize}`);
  console.log(`[epc-bulk] Dry run: ${dryRun}`);
  console.log("");

  const admin = createAdminClient();
  const results: ScopeStats[] = [];

  if (scopes.includes("local_authority")) {
    console.log("[upload] Upserting local_authority rows...");
    results.push(
      await uploadLocalAuthorities(
        admin,
        laAggs,
        dryRun,
        minSampleSize,
        sourceDumpDate,
      ),
    );
  }

  if (scopes.includes("town")) {
    console.log("[upload] Upserting town rows (PILOT_TOWNS)...");
    results.push(
      await uploadTowns(admin, laAggs, dryRun, minSampleSize, sourceDumpDate),
    );
  }

  if (scopes.includes("archetype")) {
    console.log("[upload] Upserting archetype rows...");
    results.push(
      await uploadArchetypes(
        admin,
        archAggs,
        dryRun,
        minSampleSize,
        sourceDumpDate,
      ),
    );
  }

  console.log("");
  console.log("[upload] Summary:");
  for (const r of results) {
    console.log(
      `  ${r.scope.padEnd(18)} attempted=${r.attempted}  written=${r.written}  noindex=${r.noindex}  skipped=${r.skipped}  errors=${r.errors}`,
    );
  }

  const totalErrors = results.reduce((a, b) => a + b.errors, 0);
  if (totalErrors > 0) {
    console.log("");
    console.log(
      `[upload] ${totalErrors} rows failed — check log lines above.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
