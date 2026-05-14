// scripts/epc-bulk/aggregate.ts — stream-process the EPC bulk zip,
// dedupe to one cert per UPRN (most-recent wins), compute per-LAD
// and per-archetype rollups, write JSON to tmp/epc-aggregates/.
//
// Memory pattern (~25M UK certs, ~36M unique UPRNs):
//
//   - Set<string> of seen UPRNs            ~1.5 GB RAM peak
//   - Per-LAD accumulators (~330 LADs)        ~few MB
//   - Per-archetype accumulators (~80)        ~few MB
//
// Disk pattern: never unzip the whole archive. `unzip -p` streams
// one CSV at a time to stdout; we never have more than the zip
// (5.4 GB) + the running tx buffer on disk.
//
// Processing order: REVERSE chronological (2026 → 2012). First sight
// of a UPRN wins, so the most recent cert is always the one we
// accumulate. Older certs for the same property are skipped on
// dedup, never read into the aggregators.
//
// Usage:
//   npx tsx scripts/epc-bulk/aggregate.ts
//   npx tsx scripts/epc-bulk/aggregate.ts --zip ~/Desktop/epc-bulk-domestic-2026-05-13.zip
//   npx tsx scripts/epc-bulk/aggregate.ts --years 2024,2025,2026   # quick sanity run

import "../../src/lib/dev/load-env";

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parse } from "csv-parse";

// ─── Args ───────────────────────────────────────────────────────────

interface Args {
  zipPath: string;
  outDir: string;
  years: number[];
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let zipPath = path.join(
    process.env.HOME ?? "/tmp",
    "Desktop",
    `epc-bulk-domestic-${new Date().toISOString().slice(0, 10)}.zip`,
  );
  let outDir = path.join(
    process.cwd(),
    "tmp",
    "epc-aggregates",
  );
  // Default: all 15 cert years, reverse chrono.
  let years = Array.from({ length: 15 }, (_, i) => 2026 - i);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zip" && argv[i + 1]) {
      zipPath = argv[++i];
    } else if (a === "--out" && argv[i + 1]) {
      outDir = argv[++i];
    } else if (a === "--years" && argv[i + 1]) {
      years = argv[++i]
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => b - a);
    }
  }

  return { zipPath, outDir, years };
}

// ─── CSV row shape ──────────────────────────────────────────────────

type Row = Record<string, string>;

interface CertSummary {
  uprn: string;
  band: string | null;
  efficiency: number | null;
  property_type: string | null;
  built_form: string | null;
  age_band: string | null;
  floor_area: number | null;
  heating_cost: number | null;
  mains_gas: boolean | null;
  lad_code: string | null;
  lad_label: string | null;
  country: string | null;
  region: string | null;
  postcode_district: string | null;
  posttown: string | null;
  lodgement_date: string | null;
}

function rowToCert(row: Row): CertSummary | null {
  const uprn = row.uprn?.trim();
  if (!uprn) return null;
  // Skip UPRN 0 / empty / non-numeric.
  if (!/^\d+$/.test(uprn) || uprn === "0") return null;

  const band = (row.current_energy_rating ?? "").trim().toUpperCase();
  const validBand = ["A", "B", "C", "D", "E", "F", "G"].includes(band)
    ? band
    : null;

  const num = (s: string | undefined): number | null => {
    if (!s) return null;
    const cleaned = s.replace(/[^0-9.\-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const mainsGasRaw = (row.mains_gas_flag ?? "").trim().toUpperCase();
  const mainsGas =
    mainsGasRaw === "Y" || mainsGasRaw === "TRUE"
      ? true
      : mainsGasRaw === "N" || mainsGasRaw === "FALSE"
        ? false
        : null;

  // Postcode district = part before the space, uppercase.
  // "S1 1AB" -> "S1", "M14 5GH" -> "M14", "GIR 0AA" -> "GIR".
  const pcRaw = row.postcode?.trim().toUpperCase() ?? "";
  const pcdMatch = pcRaw.match(/^[A-Z]{1,2}\d[A-Z\d]?/);
  const postcode_district = pcdMatch ? pcdMatch[0] : null;

  return {
    uprn,
    band: validBand,
    efficiency: num(row.current_energy_efficiency),
    property_type: row.property_type?.trim() || null,
    built_form: row.built_form?.trim() || null,
    age_band: row.construction_age_band?.trim() || null,
    floor_area: num(row.total_floor_area),
    heating_cost: num(row.heating_cost_current),
    mains_gas: mainsGas,
    lad_code: row.local_authority?.trim() || null,
    lad_label: row.local_authority_label?.trim() || null,
    country: row.country?.trim() || null,
    region: row.region?.trim() || null,
    postcode_district,
    posttown: row.posttown?.trim() || null,
    lodgement_date: row.lodgement_date?.trim() || null,
  };
}

// ─── Aggregator ─────────────────────────────────────────────────────

const BANDS = ["A", "B", "C", "D", "E", "F", "G"] as const;
type Band = (typeof BANDS)[number];

interface Accumulator {
  sample_size: number;
  band_counts: Partial<Record<Band, number>>;
  floor_area_samples: number[];
  heating_cost_samples: number[];
  mains_gas_yes: number;
  mains_gas_seen: number;
  property_type_counts: Map<string, number>;
  age_band_counts: Map<string, number>;
  built_form_counts: Map<string, number>;
  /** Per-postcode-district accumulator: dominant post_town for the
   *  display name. Town accumulators leave this empty. */
  posttown_counts: Map<string, number>;
  // Identity context — first non-empty wins
  display_name: string | null;
  country: string | null;
  region: string | null;
  earliest_lodgement: string | null;
  latest_lodgement: string | null;
}

function newAccumulator(): Accumulator {
  return {
    sample_size: 0,
    band_counts: {},
    floor_area_samples: [],
    heating_cost_samples: [],
    mains_gas_yes: 0,
    mains_gas_seen: 0,
    property_type_counts: new Map(),
    age_band_counts: new Map(),
    built_form_counts: new Map(),
    posttown_counts: new Map(),
    display_name: null,
    country: null,
    region: null,
    earliest_lodgement: null,
    latest_lodgement: null,
  };
}

function accumulate(acc: Accumulator, cert: CertSummary): void {
  if (!cert.band) return; // skip rows with no usable band
  acc.sample_size += 1;
  acc.band_counts[cert.band as Band] =
    (acc.band_counts[cert.band as Band] ?? 0) + 1;
  // Storing every floor_area value is ~200 MB worst case (25M floats);
  // we sample to a 200,000-value cap per aggregator to keep RAM in check.
  // 200k is plenty for stable p25/p50/p75 estimation.
  if (cert.floor_area != null && cert.floor_area > 0 && cert.floor_area < 2000) {
    if (acc.floor_area_samples.length < 20_000) {
      acc.floor_area_samples.push(cert.floor_area);
    }
  }
  if (
    cert.heating_cost != null &&
    cert.heating_cost > 0 &&
    cert.heating_cost < 20_000
  ) {
    if (acc.heating_cost_samples.length < 20_000) {
      acc.heating_cost_samples.push(cert.heating_cost);
    }
  }
  if (cert.mains_gas != null) {
    acc.mains_gas_seen += 1;
    if (cert.mains_gas) acc.mains_gas_yes += 1;
  }
  if (cert.property_type) {
    acc.property_type_counts.set(
      cert.property_type,
      (acc.property_type_counts.get(cert.property_type) ?? 0) + 1,
    );
  }
  if (cert.age_band) {
    acc.age_band_counts.set(
      cert.age_band,
      (acc.age_band_counts.get(cert.age_band) ?? 0) + 1,
    );
  }
  if (cert.built_form) {
    acc.built_form_counts.set(
      cert.built_form,
      (acc.built_form_counts.get(cert.built_form) ?? 0) + 1,
    );
  }
  if (cert.posttown) {
    acc.posttown_counts.set(
      cert.posttown,
      (acc.posttown_counts.get(cert.posttown) ?? 0) + 1,
    );
  }
  if (!acc.country && cert.country) acc.country = cert.country;
  if (!acc.region && cert.region) acc.region = cert.region;
  if (!acc.display_name && cert.lad_label) acc.display_name = cert.lad_label;
  const reg = cert.lodgement_date?.slice(0, 10) ?? null;
  if (reg) {
    if (!acc.earliest_lodgement || reg < acc.earliest_lodgement) {
      acc.earliest_lodgement = reg;
    }
    if (!acc.latest_lodgement || reg > acc.latest_lodgement) {
      acc.latest_lodgement = reg;
    }
  }
}

function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const idx = Math.floor((sortedAsc.length - 1) * p);
  return sortedAsc[idx] ?? null;
}

function median(sortedAsc: number[]): number | null {
  if (sortedAsc.length === 0) return null;
  const m = Math.floor(sortedAsc.length / 2);
  if (sortedAsc.length % 2 === 0 && sortedAsc.length > 1) {
    return (sortedAsc[m - 1] + sortedAsc[m]) / 2;
  }
  return sortedAsc[m] ?? null;
}

function bandPct(
  band_counts: Partial<Record<Band, number>>,
  sample: number,
): Partial<Record<Band, number>> {
  const pct: Partial<Record<Band, number>> = {};
  for (const b of BANDS) {
    const c = band_counts[b];
    if (c) pct[b] = Math.round((c / sample) * 1000) / 10;
  }
  return pct;
}

function pickMedianBand(
  band_counts: Partial<Record<Band, number>>,
  sample: number,
): Band | null {
  if (sample === 0) return null;
  const half = sample / 2;
  let running = 0;
  for (const b of BANDS) {
    running += band_counts[b] ?? 0;
    if (running >= half) return b;
  }
  return null;
}

function topMix(
  counts: Map<string, number>,
  sample: number,
  topN = 10,
): Record<string, number> {
  if (sample === 0) return {};
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
  const out: Record<string, number> = {};
  for (const [k, v] of sorted) {
    out[k] = Math.round((v / sample) * 1000) / 10;
  }
  return out;
}

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
  /** Most-common post-town in the accumulator. Used for the
   *  postcode-district display name ("S1 (Sheffield)"). Empty for
   *  town / LAD / archetype scopes — they have their own name. */
  dominant_posttown: string | null;
  earliest_lodgement: string | null;
  latest_lodgement: string | null;
}

function finalise(acc: Accumulator, scopeKey: string): AggregateOutput {
  // Sort the sample arrays once for all percentile reads.
  const floorSorted = [...acc.floor_area_samples].sort((a, b) => a - b);
  const heatSorted = [...acc.heating_cost_samples].sort((a, b) => a - b);

  return {
    scope_key: scopeKey,
    display_name: acc.display_name,
    country: acc.country,
    region: acc.region,
    sample_size: acc.sample_size,
    band_distribution: acc.band_counts,
    band_distribution_pct: bandPct(acc.band_counts, acc.sample_size),
    median_band: pickMedianBand(acc.band_counts, acc.sample_size),
    best_band: BANDS.find((b) => acc.band_counts[b]) ?? null,
    worst_band: [...BANDS].reverse().find((b) => acc.band_counts[b]) ?? null,
    median_floor_area_m2: median(floorSorted),
    floor_area_p25_m2: percentile(floorSorted, 0.25),
    floor_area_p75_m2: percentile(floorSorted, 0.75),
    median_heating_cost_current_gbp: median(heatSorted),
    heating_cost_p25_gbp: percentile(heatSorted, 0.25),
    heating_cost_p75_gbp: percentile(heatSorted, 0.75),
    mains_gas_pct:
      acc.mains_gas_seen > 0
        ? Math.round((acc.mains_gas_yes / acc.mains_gas_seen) * 1000) / 10
        : null,
    property_type_distribution: topMix(acc.property_type_counts, acc.sample_size),
    construction_age_distribution: topMix(
      acc.age_band_counts,
      acc.sample_size,
    ),
    built_form_distribution: topMix(acc.built_form_counts, acc.sample_size),
    dominant_posttown:
      acc.posttown_counts.size > 0
        ? [...acc.posttown_counts.entries()].sort(
            (a, b) => b[1] - a[1],
          )[0][0]
        : null,
    earliest_lodgement: acc.earliest_lodgement,
    latest_lodgement: acc.latest_lodgement,
  };
}

// ─── Archetype key derivation ───────────────────────────────────────

// Map raw EPC built_form + age_band to a small set of archetype slugs.
// The slugs match the curated PILOT_ARCHETYPES list when possible so
// /heat-pumps/[archetype-slug] can pull the same row.

function eraSlug(ageBand: string | null): string | null {
  if (!ageBand) return null;
  const a = ageBand.toLowerCase().trim();
  if (a.includes("before 1900") || a.includes("pre 1900") || a.startsWith("pre-1900")) {
    return "pre-1900";
  }
  if (a.includes("1900-1929") || a.includes("1900 - 1929")) return "edwardian-era";
  if (a.includes("1930-1949") || a.includes("1930 - 1949")) return "interwar-1930s";
  if (a.includes("1950-1966") || a.includes("1950 - 1966")) return "postwar-1950s";
  if (a.includes("1967-1975") || a.includes("1967 - 1975")) return "late-1960s";
  if (a.includes("1976-1982") || a.includes("1976 - 1982")) return "late-1970s";
  if (a.includes("1983-1990") || a.includes("1983 - 1990")) return "1980s";
  if (a.includes("1991-1995") || a.includes("1991 - 1995")) return "early-1990s";
  if (a.includes("1996-2002") || a.includes("1996 - 2002")) return "late-1990s";
  if (a.includes("2003-2006") || a.includes("2003 - 2006")) return "early-2000s";
  if (a.includes("2007-2011") || a.includes("2007 - 2011")) return "late-2000s";
  if (a.includes("2012 onwards") || a.includes("2012-")) return "post-2012";
  return null;
}

function typeSlug(propertyType: string | null, builtForm: string | null): string | null {
  const pt = propertyType?.toLowerCase().trim() ?? "";
  const bf = builtForm?.toLowerCase().trim() ?? "";
  if (pt === "flat" || pt === "maisonette") return "flat";
  if (pt === "bungalow") return "bungalow";
  if (pt === "park home") return "park-home";
  if (pt === "house" || pt === "") {
    if (bf.includes("detached") && !bf.includes("semi")) return "detached-house";
    if (bf.includes("semi")) return "semi-detached-house";
    if (bf.includes("end-terrace") || bf.includes("end terrace")) {
      return "end-terrace-house";
    }
    if (bf.includes("mid-terrace") || bf.includes("mid terrace") || bf.includes("terrace")) {
      return "mid-terrace-house";
    }
  }
  return null;
}

function archetypeKey(cert: CertSummary): string | null {
  const t = typeSlug(cert.property_type, cert.built_form);
  const e = eraSlug(cert.age_band);
  if (!t || !e) return null;
  return `${t}--${e}`;
}

// ─── Sharded UPRN Set ───────────────────────────────────────────────
//
// V8's native Set<string> has a hard maximum of 2^24 = 16,777,216
// entries. The UK has ~30M dwellings and the EPC register holds
// ~22M unique UPRNs once you span 13+ years of lodgements — both
// well past the limit.
//
// ShardedUprnSet wraps N internal Sets, dispatching add()/has() by
// hash of the UPRN. With 32 shards each holds ~1M entries — comfortable
// margin under the V8 limit.

class ShardedUprnSet {
  private readonly shards: Set<string>[];
  private readonly mask: number;
  private _size = 0;

  constructor(shardCount = 32) {
    // Round up to next power of 2 for bitmask sharding.
    let n = 1;
    while (n < shardCount) n <<= 1;
    this.shards = Array.from({ length: n }, () => new Set<string>());
    this.mask = n - 1;
  }

  private bucket(uprn: string): number {
    // Cheap hash: parseInt of the last 4 digits, modulo shard count.
    // UPRNs are numeric so this distributes evenly enough.
    const tail = uprn.length >= 4 ? uprn.slice(-4) : uprn;
    const n = parseInt(tail, 10) | 0;
    return n & this.mask;
  }

  has(uprn: string): boolean {
    return this.shards[this.bucket(uprn)].has(uprn);
  }

  add(uprn: string): void {
    const s = this.shards[this.bucket(uprn)];
    if (!s.has(uprn)) {
      s.add(uprn);
      this._size += 1;
    }
  }

  get size(): number {
    return this._size;
  }
}

// ─── Stream-parse one year file ─────────────────────────────────────

interface YearRunStats {
  rows: number;
  unique: number;
  skipped_dup: number;
  skipped_no_uprn: number;
  elapsed_ms: number;
}

async function processYear(
  zipPath: string,
  year: number,
  seenUprns: ShardedUprnSet,
  ladAccs: Map<string, Accumulator>,
  archAccs: Map<string, Accumulator>,
  pcdAccs: Map<string, Accumulator>,
): Promise<YearRunStats> {
  const member = `certificates-${year}.csv`;
  const started = Date.now();
  const stats: YearRunStats = {
    rows: 0,
    unique: 0,
    skipped_dup: 0,
    skipped_no_uprn: 0,
    elapsed_ms: 0,
  };

  const child = spawn("unzip", ["-p", zipPath, member], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Surface unzip errors but don't fail the whole run on stderr noise.
  child.stderr.on("data", (chunk: Buffer) => {
    const msg = chunk.toString().trim();
    if (msg) console.warn(`[unzip ${year}] ${msg}`);
  });

  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_records_with_error: true,
  });

  child.stdout.pipe(parser);

  let lastReportAt = Date.now();
  let lastReportRows = 0;

  for await (const row of parser as AsyncIterable<Row>) {
    stats.rows += 1;
    const cert = rowToCert(row);
    if (!cert) {
      stats.skipped_no_uprn += 1;
    } else if (seenUprns.has(cert.uprn)) {
      stats.skipped_dup += 1;
    } else {
      seenUprns.add(cert.uprn);
      stats.unique += 1;

      // LAD accumulator
      if (cert.lad_code) {
        let acc = ladAccs.get(cert.lad_code);
        if (!acc) {
          acc = newAccumulator();
          ladAccs.set(cert.lad_code, acc);
        }
        accumulate(acc, cert);
      }

      // Archetype accumulator
      const arch = archetypeKey(cert);
      if (arch) {
        let acc = archAccs.get(arch);
        if (!acc) {
          acc = newAccumulator();
          archAccs.set(arch, acc);
        }
        accumulate(acc, cert);
      }

      // Postcode-district accumulator
      if (cert.postcode_district) {
        let acc = pcdAccs.get(cert.postcode_district);
        if (!acc) {
          acc = newAccumulator();
          pcdAccs.set(cert.postcode_district, acc);
        }
        accumulate(acc, cert);
      }
    }

    // Progress every ~3s.
    const now = Date.now();
    if (now - lastReportAt >= 3000) {
      const dt = (now - lastReportAt) / 1000;
      const rateKps = ((stats.rows - lastReportRows) / dt / 1000);
      const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      console.log(
        `  ${year}: ${stats.rows.toLocaleString()} rows (${stats.unique.toLocaleString()} unique) @ ${rateKps.toFixed(0)}k/s | RSS ${memMb} MB | UPRNs ${seenUprns.size.toLocaleString()}`,
      );
      lastReportAt = now;
      lastReportRows = stats.rows;
    }
  }

  await new Promise<void>((resolve) => child.on("close", () => resolve()));
  stats.elapsed_ms = Date.now() - started;
  return stats;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { zipPath, outDir, years } = parseArgs();

  if (!fs.existsSync(zipPath)) {
    console.error(`[epc-bulk] Zip not found at: ${zipPath}`);
    console.error(`[epc-bulk] Run scripts/epc-bulk/download.ts first.`);
    process.exit(1);
  }

  console.log("[epc-bulk] EPC aggregator");
  console.log(`[epc-bulk] Zip: ${zipPath}`);
  console.log(`[epc-bulk] Output dir: ${outDir}`);
  console.log(`[epc-bulk] Years (reverse chrono): ${years.join(", ")}`);
  console.log("");

  fs.mkdirSync(outDir, { recursive: true });

  const seenUprns = new ShardedUprnSet(32);
  const ladAccs = new Map<string, Accumulator>();
  const archAccs = new Map<string, Accumulator>();
  const pcdAccs = new Map<string, Accumulator>();
  const startedAt = Date.now();
  const yearStats: Array<{ year: number; stats: YearRunStats }> = [];

  for (const year of years) {
    console.log(`[epc-bulk] Processing certificates-${year}.csv...`);
    try {
      const stats = await processYear(
        zipPath,
        year,
        seenUprns,
        ladAccs,
        archAccs,
        pcdAccs,
      );
      yearStats.push({ year, stats });
      console.log(
        `  ${year} done: ${stats.rows.toLocaleString()} rows, ${stats.unique.toLocaleString()} unique kept, ${stats.skipped_dup.toLocaleString()} dedup'd in ${(stats.elapsed_ms / 1000).toFixed(0)}s`,
      );
    } catch (err) {
      console.error(`  ${year} FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("");
  console.log(`[epc-bulk] Total unique properties: ${seenUprns.size.toLocaleString()}`);
  console.log(`[epc-bulk] LAD aggregates: ${ladAccs.size}`);
  console.log(`[epc-bulk] Archetype aggregates: ${archAccs.size}`);
  console.log(`[epc-bulk] Postcode-district aggregates: ${pcdAccs.size}`);
  console.log("");
  console.log("[epc-bulk] Finalising + writing JSON...");

  const ladOut: AggregateOutput[] = [];
  for (const [code, acc] of ladAccs.entries()) {
    ladOut.push(finalise(acc, code));
  }
  ladOut.sort((a, b) => b.sample_size - a.sample_size);

  const archOut: AggregateOutput[] = [];
  for (const [key, acc] of archAccs.entries()) {
    archOut.push(finalise(acc, key));
  }
  archOut.sort((a, b) => b.sample_size - a.sample_size);

  const pcdOut: AggregateOutput[] = [];
  for (const [key, acc] of pcdAccs.entries()) {
    pcdOut.push(finalise(acc, key));
  }
  pcdOut.sort((a, b) => b.sample_size - a.sample_size);

  const ladPath = path.join(outDir, "lad-aggregates.json");
  const archPath = path.join(outDir, "archetype-aggregates.json");
  const pcdPath = path.join(outDir, "postcode-district-aggregates.json");
  const metaPath = path.join(outDir, "meta.json");

  fs.writeFileSync(
    ladPath,
    JSON.stringify(ladOut, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    archPath,
    JSON.stringify(archOut, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    pcdPath,
    JSON.stringify(pcdOut, null, 2),
    "utf-8",
  );
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        source_dump_date: new Date().toISOString().slice(0, 10),
        zip_path: zipPath,
        years_processed: years,
        total_rows_seen: yearStats.reduce((a, b) => a + b.stats.rows, 0),
        total_unique_kept: seenUprns.size,
        total_dedup_skipped: yearStats.reduce(
          (a, b) => a + b.stats.skipped_dup,
          0,
        ),
        lad_count: ladOut.length,
        archetype_count: archOut.length,
        pcd_count: pcdOut.length,
        elapsed_seconds: Math.round((Date.now() - startedAt) / 1000),
        per_year: yearStats.map((y) => ({
          year: y.year,
          rows: y.stats.rows,
          unique: y.stats.unique,
          elapsed_s: Math.round(y.stats.elapsed_ms / 1000),
        })),
      },
      null,
      2,
    ),
    "utf-8",
  );

  console.log("");
  console.log(`[epc-bulk] Wrote ${ladPath}`);
  console.log(`[epc-bulk] Wrote ${archPath}`);
  console.log(`[epc-bulk] Wrote ${pcdPath}`);
  console.log(`[epc-bulk] Wrote ${metaPath}`);
  console.log("");
  console.log(`[epc-bulk] Done. Total elapsed: ${Math.round((Date.now() - startedAt) / 60000)} min`);
  console.log("");
  console.log("Next: npx tsx scripts/epc-bulk/upload.ts");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
