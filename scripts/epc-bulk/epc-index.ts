// scripts/epc-bulk/epc-index.ts — analysis pass for the Propertoasty
// EPC Index.
//
// Streams the same zip as aggregate.ts but tracks a different set
// of numbers needed for the recurring "Propertoasty EPC Index"
// blog series:
//
//   1. Mean SAP per LAD (latest cert per property) — drives the
//      "most" / "least" efficient town rankings.
//   2. Mean SAP per (LAD, lodgement year) — drives "biggest improver"
//      by comparing the mean SAP of lodgements in year X vs year Y
//      for the same LAD. Cohort selection bias acknowledged in the
//      methodology note.
//   3. Sum of (heating_cost_potential - heating_cost_current),
//      hot_water_cost_potential - hot_water_cost_current,
//      lighting_cost_potential - lighting_cost_current — these are
//      the £/yr "if you cleared the EPC recommendations" deltas
//      built into every certificate.
//   4. Sum of (energy_consumption_current - energy_consumption_potential)
//      — kWh equivalent.
//   5. Per-property counts to derive shares (% of homes at band X,
//      % below their potential band, etc.)
//
// All results land in tmp/epc-aggregates/epc-index-insights.json —
// a single ~200 KB file that the blog editor consumes for each
// quarterly Index post.
//
// Memory: Welford's running mean for SAP per LAD; running sums for
// cost/energy. No per-property storage; just the small aggregator
// maps. Peak RAM ~1 GB (dominated by the UPRN dedup Set).
//
// Usage:
//   npx tsx scripts/epc-bulk/epc-index.ts
//   npx tsx scripts/epc-bulk/epc-index.ts --zip /path/to/epc.zip

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
  // fallback: any epc-bulk-domestic-*.zip on the desktop
  if (!fs.existsSync(zipPath)) {
    const desktop = path.join(process.env.HOME ?? "/tmp", "Desktop");
    const matches = fs.existsSync(desktop)
      ? fs.readdirSync(desktop).filter((f) => f.startsWith("epc-bulk-domestic-") && f.endsWith(".zip"))
      : [];
    if (matches.length > 0) {
      matches.sort();
      zipPath = path.join(desktop, matches[matches.length - 1]);
    }
  }
  let outDir = path.join(process.cwd(), "tmp", "epc-aggregates");
  let years = Array.from({ length: 15 }, (_, i) => 2026 - i);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--zip" && argv[i + 1]) zipPath = argv[++i];
    else if (a === "--out" && argv[i + 1]) outDir = argv[++i];
    else if (a === "--years" && argv[i + 1]) {
      years = argv[++i].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    }
  }
  return { zipPath, outDir, years };
}

// ─── Sharded UPRN Set (same as aggregate.ts) ────────────────────────

class ShardedUprnSet {
  private readonly shards: Set<string>[];
  private readonly mask: number;
  private _size = 0;
  constructor(shardCount = 32) {
    let n = 1;
    while (n < shardCount) n <<= 1;
    this.shards = Array.from({ length: n }, () => new Set<string>());
    this.mask = n - 1;
  }
  private bucket(uprn: string): number {
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

// ─── Per-LAD accumulator ────────────────────────────────────────────

interface LadAcc {
  lad_code: string;
  lad_label: string | null;
  country: string | null;
  region: string | null;
  // Welford's running mean for current + potential SAP
  n: number;
  meanCurrent: number;
  meanPotential: number;
  // Running sums for cost + energy savings (always non-negative for
  // potential >= current, but allow negatives in case of edge data)
  sumHeatingCostCurrent: number;
  sumHeatingCostPotential: number;
  sumHotWaterCostCurrent: number;
  sumHotWaterCostPotential: number;
  sumLightingCostCurrent: number;
  sumLightingCostPotential: number;
  sumEnergyCurrent: number;
  sumEnergyPotential: number;
  // For % of homes at potential band vs not — count properties where
  // potential_band == current_band (already at potential).
  alreadyAtPotential: number;
  // Band distribution counts (current).
  bandCounts: Record<string, number>;
}

function newLad(code: string): LadAcc {
  return {
    lad_code: code,
    lad_label: null,
    country: null,
    region: null,
    n: 0,
    meanCurrent: 0,
    meanPotential: 0,
    sumHeatingCostCurrent: 0,
    sumHeatingCostPotential: 0,
    sumHotWaterCostCurrent: 0,
    sumHotWaterCostPotential: 0,
    sumLightingCostCurrent: 0,
    sumLightingCostPotential: 0,
    sumEnergyCurrent: 0,
    sumEnergyPotential: 0,
    alreadyAtPotential: 0,
    bandCounts: {},
  };
}

interface PerYearLadAcc {
  n: number;
  meanCurrent: number; // Welford
}

function newPerYear(): PerYearLadAcc {
  return { n: 0, meanCurrent: 0 };
}

// ─── CSV row processing ─────────────────────────────────────────────

type Row = Record<string, string>;

function num(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface Cert {
  uprn: string;
  lad_code: string;
  lad_label: string | null;
  country: string | null;
  region: string | null;
  currentBand: string | null;
  potentialBand: string | null;
  currentSap: number | null;
  potentialSap: number | null;
  heatingCurrent: number | null;
  heatingPotential: number | null;
  hotWaterCurrent: number | null;
  hotWaterPotential: number | null;
  lightingCurrent: number | null;
  lightingPotential: number | null;
  energyCurrent: number | null;
  energyPotential: number | null;
  lodgementYear: number | null;
}

function rowToCert(row: Row): Cert | null {
  const uprn = row.uprn?.trim();
  if (!uprn || !/^\d+$/.test(uprn) || uprn === "0") return null;
  const lad = row.local_authority?.trim();
  if (!lad) return null;

  const cb = (row.current_energy_rating ?? "").trim().toUpperCase();
  const pb = (row.potential_energy_rating ?? "").trim().toUpperCase();
  const valid = (b: string): string | null => ["A","B","C","D","E","F","G"].includes(b) ? b : null;

  const lodgementYear = (() => {
    const d = row.lodgement_date?.trim();
    if (!d) return null;
    const y = parseInt(d.slice(0, 4), 10);
    return Number.isInteger(y) && y >= 2000 && y <= 2030 ? y : null;
  })();

  return {
    uprn,
    lad_code: lad,
    lad_label: row.local_authority_label?.trim() || null,
    country: row.country?.trim() || null,
    region: row.region?.trim() || null,
    currentBand: valid(cb),
    potentialBand: valid(pb),
    currentSap: num(row.current_energy_efficiency),
    potentialSap: num(row.potential_energy_efficiency),
    heatingCurrent: num(row.heating_cost_current),
    heatingPotential: num(row.heating_cost_potential),
    hotWaterCurrent: num(row.hot_water_cost_current),
    hotWaterPotential: num(row.hot_water_cost_potential),
    lightingCurrent: num(row.lighting_cost_current),
    lightingPotential: num(row.lighting_cost_potential),
    energyCurrent: num(row.energy_consumption_current),
    energyPotential: num(row.energy_consumption_potential),
    lodgementYear,
  };
}

function accumulateLad(acc: LadAcc, cert: Cert): void {
  if (cert.currentSap == null || cert.currentSap < 0 || cert.currentSap > 200) return;
  acc.n += 1;
  acc.meanCurrent += (cert.currentSap - acc.meanCurrent) / acc.n;
  if (cert.potentialSap != null && cert.potentialSap >= 0 && cert.potentialSap <= 200) {
    acc.meanPotential += (cert.potentialSap - acc.meanPotential) / acc.n;
  }
  if (cert.heatingCurrent != null && cert.heatingCurrent > 0 && cert.heatingCurrent < 20_000) {
    acc.sumHeatingCostCurrent += cert.heatingCurrent;
  }
  if (cert.heatingPotential != null && cert.heatingPotential > 0 && cert.heatingPotential < 20_000) {
    acc.sumHeatingCostPotential += cert.heatingPotential;
  }
  if (cert.hotWaterCurrent != null && cert.hotWaterCurrent > 0 && cert.hotWaterCurrent < 5000) {
    acc.sumHotWaterCostCurrent += cert.hotWaterCurrent;
  }
  if (cert.hotWaterPotential != null && cert.hotWaterPotential > 0 && cert.hotWaterPotential < 5000) {
    acc.sumHotWaterCostPotential += cert.hotWaterPotential;
  }
  if (cert.lightingCurrent != null && cert.lightingCurrent > 0 && cert.lightingCurrent < 5000) {
    acc.sumLightingCostCurrent += cert.lightingCurrent;
  }
  if (cert.lightingPotential != null && cert.lightingPotential > 0 && cert.lightingPotential < 5000) {
    acc.sumLightingCostPotential += cert.lightingPotential;
  }
  if (cert.energyCurrent != null && cert.energyCurrent > 0 && cert.energyCurrent < 500_000) {
    acc.sumEnergyCurrent += cert.energyCurrent;
  }
  if (cert.energyPotential != null && cert.energyPotential > 0 && cert.energyPotential < 500_000) {
    acc.sumEnergyPotential += cert.energyPotential;
  }
  if (cert.currentBand && cert.potentialBand && cert.currentBand === cert.potentialBand) {
    acc.alreadyAtPotential += 1;
  }
  if (cert.currentBand) {
    acc.bandCounts[cert.currentBand] = (acc.bandCounts[cert.currentBand] ?? 0) + 1;
  }
  if (!acc.lad_label && cert.lad_label) acc.lad_label = cert.lad_label;
  if (!acc.country && cert.country) acc.country = cert.country;
  if (!acc.region && cert.region) acc.region = cert.region;
}

function accumulatePerYear(acc: PerYearLadAcc, sap: number): void {
  acc.n += 1;
  acc.meanCurrent += (sap - acc.meanCurrent) / acc.n;
}

// ─── Stream-parse one year ──────────────────────────────────────────

interface YearStats {
  rows: number;
  unique: number;
  elapsed_ms: number;
}

async function processYear(
  zipPath: string,
  year: number,
  seen: ShardedUprnSet,
  ladAccs: Map<string, LadAcc>,
  perYearLad: Map<string, Map<number, PerYearLadAcc>>,
): Promise<YearStats> {
  const member = `certificates-${year}.csv`;
  const started = Date.now();
  const stats: YearStats = { rows: 0, unique: 0, elapsed_ms: 0 };

  const child = spawn("unzip", ["-p", zipPath, member], {
    stdio: ["ignore", "pipe", "pipe"],
  });
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

  let lastReport = Date.now();
  let lastRows = 0;

  for await (const row of parser as AsyncIterable<Row>) {
    stats.rows += 1;
    const cert = rowToCert(row);
    if (!cert) continue;

    // EVERY-ROW path: per-year per-LAD running mean for the "biggest
    // improver" analysis. Cohort = "what lodgements in year X looked
    // like in LAD Y", so we don't dedup here.
    if (cert.currentSap != null && cert.lodgementYear != null) {
      let byYear = perYearLad.get(cert.lad_code);
      if (!byYear) {
        byYear = new Map();
        perYearLad.set(cert.lad_code, byYear);
      }
      let py = byYear.get(cert.lodgementYear);
      if (!py) {
        py = newPerYear();
        byYear.set(cert.lodgementYear, py);
      }
      accumulatePerYear(py, cert.currentSap);
    }

    // DEDUPED path: latest-cert-per-UPRN aggregate for "current state"
    // insights (most efficient, savings potential, etc.)
    if (!seen.has(cert.uprn)) {
      seen.add(cert.uprn);
      stats.unique += 1;
      let acc = ladAccs.get(cert.lad_code);
      if (!acc) {
        acc = newLad(cert.lad_code);
        ladAccs.set(cert.lad_code, acc);
      }
      accumulateLad(acc, cert);
    }

    const now = Date.now();
    if (now - lastReport >= 3000) {
      const rate = ((stats.rows - lastRows) / ((now - lastReport) / 1000) / 1000).toFixed(0);
      const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      console.log(
        `  ${year}: ${stats.rows.toLocaleString()} rows (${stats.unique.toLocaleString()} unique) @ ${rate}k/s | RSS ${memMb} MB | UPRNs ${seen.size.toLocaleString()}`,
      );
      lastReport = now;
      lastRows = stats.rows;
    }
  }

  await new Promise<void>((resolve) => child.on("close", () => resolve()));
  stats.elapsed_ms = Date.now() - started;
  return stats;
}

// ─── Build output ───────────────────────────────────────────────────

const MIN_SAMPLE = 1000; // Don't surface LADs with too few certs.

interface LadOutput {
  lad_code: string;
  lad_label: string | null;
  country: string | null;
  sample_size: number;
  mean_sap_current: number;
  mean_sap_potential: number;
  uplift_potential: number; // potential - current
  pct_already_at_potential: number;
  total_heating_cost_current_gbp: number;
  total_heating_cost_potential_gbp: number;
  total_savings_potential_gbp: number; // (heating + hot water + lighting) current - potential
  total_energy_current_kwh: number;
  total_energy_potential_kwh: number;
  total_energy_savings_kwh: number;
}

function buildLadOutput(acc: LadAcc): LadOutput {
  const heatSavings = acc.sumHeatingCostCurrent - acc.sumHeatingCostPotential;
  const hwSavings = acc.sumHotWaterCostCurrent - acc.sumHotWaterCostPotential;
  const lightSavings = acc.sumLightingCostCurrent - acc.sumLightingCostPotential;
  const totalSavings = heatSavings + hwSavings + lightSavings;
  return {
    lad_code: acc.lad_code,
    lad_label: acc.lad_label,
    country: acc.country,
    sample_size: acc.n,
    mean_sap_current: Math.round(acc.meanCurrent * 10) / 10,
    mean_sap_potential: Math.round(acc.meanPotential * 10) / 10,
    uplift_potential: Math.round((acc.meanPotential - acc.meanCurrent) * 10) / 10,
    pct_already_at_potential:
      acc.n > 0 ? Math.round((acc.alreadyAtPotential / acc.n) * 1000) / 10 : 0,
    total_heating_cost_current_gbp: Math.round(acc.sumHeatingCostCurrent),
    total_heating_cost_potential_gbp: Math.round(acc.sumHeatingCostPotential),
    total_savings_potential_gbp: Math.round(totalSavings),
    total_energy_current_kwh: Math.round(acc.sumEnergyCurrent),
    total_energy_potential_kwh: Math.round(acc.sumEnergyPotential),
    total_energy_savings_kwh: Math.round(acc.sumEnergyCurrent - acc.sumEnergyPotential),
  };
}

interface ImproverEntry {
  lad_code: string;
  lad_label: string | null;
  year_start: number;
  year_end: number;
  mean_sap_start: number;
  mean_sap_end: number;
  delta: number;
  sample_start: number;
  sample_end: number;
}

function computeImprovers(
  perYearLad: Map<string, Map<number, PerYearLadAcc>>,
  ladAccs: Map<string, LadAcc>,
  yearStart: number,
  yearEnd: number,
  minSample = 500,
): ImproverEntry[] {
  const out: ImproverEntry[] = [];
  for (const [lad, byYear] of perYearLad.entries()) {
    const start = byYear.get(yearStart);
    const end = byYear.get(yearEnd);
    if (!start || !end) continue;
    if (start.n < minSample || end.n < minSample) continue;
    out.push({
      lad_code: lad,
      lad_label: ladAccs.get(lad)?.lad_label ?? null,
      year_start: yearStart,
      year_end: yearEnd,
      mean_sap_start: Math.round(start.meanCurrent * 10) / 10,
      mean_sap_end: Math.round(end.meanCurrent * 10) / 10,
      delta: Math.round((end.meanCurrent - start.meanCurrent) * 10) / 10,
      sample_start: start.n,
      sample_end: end.n,
    });
  }
  return out;
}

async function main(): Promise<void> {
  const { zipPath, outDir, years } = parseArgs();
  if (!fs.existsSync(zipPath)) {
    console.error(`[epc-index] Zip not found: ${zipPath}`);
    process.exit(1);
  }
  console.log("[epc-index] EPC Index analysis");
  console.log(`[epc-index] Zip: ${zipPath}`);
  console.log(`[epc-index] Years (reverse chrono): ${years.join(", ")}`);
  console.log("");

  fs.mkdirSync(outDir, { recursive: true });
  const seen = new ShardedUprnSet(32);
  const ladAccs = new Map<string, LadAcc>();
  const perYearLad = new Map<string, Map<number, PerYearLadAcc>>();
  const started = Date.now();

  for (const year of years) {
    console.log(`[epc-index] Processing certificates-${year}.csv...`);
    try {
      const s = await processYear(zipPath, year, seen, ladAccs, perYearLad);
      console.log(
        `  ${year} done: ${s.rows.toLocaleString()} rows, ${s.unique.toLocaleString()} unique kept (${(s.elapsed_ms / 1000).toFixed(0)}s)`,
      );
    } catch (err) {
      console.error(`  ${year} FAILED:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("");
  console.log(`[epc-index] Total unique properties: ${seen.size.toLocaleString()}`);
  console.log(`[epc-index] LADs tracked: ${ladAccs.size}`);
  console.log("");

  // Build per-LAD output
  const ladOut: LadOutput[] = [];
  for (const acc of ladAccs.values()) {
    if (acc.n < MIN_SAMPLE) continue;
    ladOut.push(buildLadOutput(acc));
  }
  // National totals across all qualifying LADs
  const totalProperties = ladOut.reduce((a, b) => a + b.sample_size, 0);
  const totalSavings = ladOut.reduce((a, b) => a + b.total_savings_potential_gbp, 0);
  const totalEnergySavings = ladOut.reduce((a, b) => a + b.total_energy_savings_kwh, 0);
  const totalHeatingCurrent = ladOut.reduce((a, b) => a + b.total_heating_cost_current_gbp, 0);
  const totalHeatingPotential = ladOut.reduce((a, b) => a + b.total_heating_cost_potential_gbp, 0);

  // Rankings
  const ranked = [...ladOut].sort((a, b) => b.mean_sap_current - a.mean_sap_current);
  const mostEfficient = ranked.slice(0, 25);
  const leastEfficient = ranked.slice(-25).reverse();
  // Per-capita savings (£ per property in the LAD)
  const perCapita = [...ladOut]
    .map((l) => ({
      ...l,
      savings_per_property_gbp: l.sample_size > 0 ? Math.round(l.total_savings_potential_gbp / l.sample_size) : 0,
    }))
    .sort((a, b) => b.savings_per_property_gbp - a.savings_per_property_gbp);

  // Improvers — 2014 vs 2024 (10-year window). Min 500 lodgements
  // in each year to qualify.
  const improvers = computeImprovers(perYearLad, ladAccs, 2014, 2024, 500)
    .sort((a, b) => b.delta - a.delta);

  const out = {
    methodology: {
      zip_path: zipPath,
      run_at: new Date().toISOString(),
      years_processed: years,
      total_rows_seen: 0, // filled below
      total_unique_kept: seen.size,
      min_sample_size: MIN_SAMPLE,
      notes: [
        "Mean SAP = mean of current_energy_efficiency, latest cert per UPRN.",
        "National totals SUM across LADs with sample_size >= min_sample_size only.",
        "Savings = (heating_cost_current + hot_water_cost_current + lighting_cost_current) - same fields potential, summed across the cohort.",
        "Energy savings = energy_consumption_current - energy_consumption_potential (kWh/yr/m²; the CSV publishes per-floor-area, but it's directly comparable for a given property).",
        "Improver analysis = compare mean SAP of lodgements in 2014 vs 2024 within the same LAD. Selection bias: 2024-lodged properties skew newer/improved. Treat as 'how the local lodgement cohort has changed', not 'how the housing stock has actually improved'.",
        "Excludes LADs with <1,000 unique properties to avoid noise.",
        "Source: GOV.UK EPC Register bulk dump (Open Government Licence v3.0).",
      ],
    },
    national: {
      lads_qualifying: ladOut.length,
      total_properties: totalProperties,
      total_heating_cost_current_gbp: totalHeatingCurrent,
      total_heating_cost_potential_gbp: totalHeatingPotential,
      total_savings_potential_gbp: totalSavings,
      total_savings_per_property_gbp: totalProperties > 0 ? Math.round(totalSavings / totalProperties) : 0,
      total_energy_savings_kwh: totalEnergySavings,
      total_energy_savings_per_property_kwh: totalProperties > 0 ? Math.round(totalEnergySavings / totalProperties) : 0,
    },
    most_efficient_lads: mostEfficient,
    least_efficient_lads: leastEfficient,
    biggest_improvers: improvers.slice(0, 20),
    biggest_decliners: improvers.slice(-10).reverse(),
    top_per_capita_savings: perCapita.slice(0, 20),
    all_lads: ranked,
  };

  const outPath = path.join(outDir, "epc-index-insights.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");

  console.log(`[epc-index] Wrote ${outPath}`);
  console.log(`[epc-index] Total elapsed: ${Math.round((Date.now() - started) / 60000)} min`);
  console.log("");
  console.log("Headlines:");
  console.log(`  Most efficient LAD:    ${mostEfficient[0]?.lad_label} (mean SAP ${mostEfficient[0]?.mean_sap_current}, n=${mostEfficient[0]?.sample_size})`);
  console.log(`  Least efficient LAD:   ${leastEfficient[0]?.lad_label} (mean SAP ${leastEfficient[0]?.mean_sap_current}, n=${leastEfficient[0]?.sample_size})`);
  console.log(`  Biggest improver:      ${improvers[0]?.lad_label} (Δ +${improvers[0]?.delta} SAP, 2014→2024)`);
  console.log(`  National savings:      £${(totalSavings / 1e9).toFixed(2)}B/yr potential`);
  console.log(`  National energy waste: ${(totalEnergySavings / 1e9).toFixed(2)} TWh/yr equivalent`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
