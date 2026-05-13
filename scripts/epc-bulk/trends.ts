// scripts/epc-bulk/trends.ts — generate the trended snapshots that
// back /research/uk-affordability-index.
//
// Unlike aggregate.ts which dedupes to "most recent cert per UPRN
// to get a current-state snapshot", this script keeps every cert
// lodged in each snapshot year — the snapshot IS the lodgement
// cohort for that year. So 2012 = "what did 2012 lodgements look
// like", not "where do those properties stand today".
//
// Outputs national + per-region rollups for the snapshot years:
// EPC band shares, median floor area, median heating cost, mains
// gas share, property type mix.
//
// Usage:
//   npx tsx scripts/epc-bulk/trends.ts
//   npx tsx scripts/epc-bulk/trends.ts --years 2012,2016,2020,2024,2026
//   npx tsx scripts/epc-bulk/trends.ts --zip ~/Desktop/epc-bulk-domestic-2026-05-13.zip

import "../../src/lib/dev/load-env";

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parse } from "csv-parse";

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
  let outDir = path.join(process.cwd(), "tmp", "epc-aggregates");
  // Default snapshot years — every 4 years + this year.
  let years = [2012, 2016, 2020, 2024, 2026];

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
        .filter((n) => !isNaN(n));
    }
  }
  return { zipPath, outDir, years };
}

type Row = Record<string, string>;
type Band = "A" | "B" | "C" | "D" | "E" | "F" | "G";
const BANDS: Band[] = ["A", "B", "C", "D", "E", "F", "G"];

interface Acc {
  sample: number;
  band_counts: Partial<Record<Band, number>>;
  floor_area: number[];
  heating_cost: number[];
  mains_gas_seen: number;
  mains_gas_yes: number;
  property_type: Map<string, number>;
  age_band: Map<string, number>;
}

function newAcc(): Acc {
  return {
    sample: 0,
    band_counts: {},
    floor_area: [],
    heating_cost: [],
    mains_gas_seen: 0,
    mains_gas_yes: 0,
    property_type: new Map(),
    age_band: new Map(),
  };
}

function accumulate(acc: Acc, row: Row): void {
  const band = (row.current_energy_rating ?? "").trim().toUpperCase();
  if (!(BANDS as string[]).includes(band)) return;
  acc.sample += 1;
  acc.band_counts[band as Band] = (acc.band_counts[band as Band] ?? 0) + 1;

  const num = (s: string | undefined): number | null => {
    if (!s) return null;
    const cleaned = s.replace(/[^0-9.\-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };
  const fa = num(row.total_floor_area);
  if (fa != null && fa > 0 && fa < 2000 && acc.floor_area.length < 100_000) {
    acc.floor_area.push(fa);
  }
  const hc = num(row.heating_cost_current);
  if (hc != null && hc > 0 && hc < 20_000 && acc.heating_cost.length < 100_000) {
    acc.heating_cost.push(hc);
  }

  const mgRaw = (row.mains_gas_flag ?? "").trim().toUpperCase();
  if (mgRaw === "Y" || mgRaw === "TRUE") {
    acc.mains_gas_seen += 1;
    acc.mains_gas_yes += 1;
  } else if (mgRaw === "N" || mgRaw === "FALSE") {
    acc.mains_gas_seen += 1;
  }

  const pt = row.property_type?.trim();
  if (pt) acc.property_type.set(pt, (acc.property_type.get(pt) ?? 0) + 1);
  const ab = row.construction_age_band?.trim();
  if (ab) acc.age_band.set(ab, (acc.age_band.get(ab) ?? 0) + 1);
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0 && sorted.length > 1) {
    return (sorted[m - 1] + sorted[m]) / 2;
  }
  return sorted[m] ?? null;
}

interface SnapshotOutput {
  year: number;
  region: string;
  sample_size: number;
  band_distribution_pct: Partial<Record<Band, number>>;
  band_c_or_better_pct: number;
  band_d_or_worse_pct: number;
  median_floor_area_m2: number | null;
  median_heating_cost_gbp: number | null;
  mains_gas_pct: number | null;
  top_property_type: string | null;
  top_age_band: string | null;
}

function finalise(year: number, region: string, acc: Acc): SnapshotOutput {
  const pct: Partial<Record<Band, number>> = {};
  for (const b of BANDS) {
    const c = acc.band_counts[b];
    if (c) pct[b] = Math.round((c / acc.sample) * 1000) / 10;
  }
  const bandCBetter =
    (acc.band_counts.A ?? 0) +
    (acc.band_counts.B ?? 0) +
    (acc.band_counts.C ?? 0);
  const bandDWorse =
    (acc.band_counts.D ?? 0) +
    (acc.band_counts.E ?? 0) +
    (acc.band_counts.F ?? 0) +
    (acc.band_counts.G ?? 0);
  const topEntry = <T>(m: Map<T, number>): T | null => {
    let best: T | null = null;
    let bestN = 0;
    for (const [k, v] of m.entries()) {
      if (v > bestN) {
        best = k;
        bestN = v;
      }
    }
    return best;
  };
  return {
    year,
    region,
    sample_size: acc.sample,
    band_distribution_pct: pct,
    band_c_or_better_pct:
      acc.sample > 0
        ? Math.round((bandCBetter / acc.sample) * 1000) / 10
        : 0,
    band_d_or_worse_pct:
      acc.sample > 0
        ? Math.round((bandDWorse / acc.sample) * 1000) / 10
        : 0,
    median_floor_area_m2: median(acc.floor_area),
    median_heating_cost_gbp: median(acc.heating_cost),
    mains_gas_pct:
      acc.mains_gas_seen > 0
        ? Math.round((acc.mains_gas_yes / acc.mains_gas_seen) * 1000) / 10
        : null,
    top_property_type: topEntry(acc.property_type),
    top_age_band: topEntry(acc.age_band),
  };
}

async function processYear(
  zipPath: string,
  year: number,
): Promise<{ national: Acc; byRegion: Map<string, Acc> }> {
  const member = `certificates-${year}.csv`;
  const national = newAcc();
  const byRegion = new Map<string, Acc>();

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

  let rowCount = 0;
  let lastReport = Date.now();

  for await (const row of parser as AsyncIterable<Row>) {
    rowCount += 1;
    accumulate(national, row);
    const region = row.region?.trim() || "Unknown";
    let r = byRegion.get(region);
    if (!r) {
      r = newAcc();
      byRegion.set(region, r);
    }
    accumulate(r, row);

    if (Date.now() - lastReport >= 3000) {
      console.log(
        `  ${year}: ${rowCount.toLocaleString()} rows, national sample ${national.sample.toLocaleString()}`,
      );
      lastReport = Date.now();
    }
  }
  await new Promise<void>((resolve) => child.on("close", () => resolve()));
  console.log(
    `  ${year} done: ${rowCount.toLocaleString()} rows seen`,
  );
  return { national, byRegion };
}

async function main(): Promise<void> {
  const { zipPath, outDir, years } = parseArgs();

  if (!fs.existsSync(zipPath)) {
    console.error(`[trends] Zip not found at: ${zipPath}`);
    process.exit(1);
  }

  console.log("[trends] EPC trended snapshots");
  console.log(`[trends] Zip: ${zipPath}`);
  console.log(`[trends] Snapshot years: ${years.join(", ")}`);
  console.log("");

  fs.mkdirSync(outDir, { recursive: true });

  const snapshots: SnapshotOutput[] = [];

  for (const year of years) {
    console.log(`[trends] Processing certificates-${year}.csv...`);
    try {
      const { national, byRegion } = await processYear(zipPath, year);
      snapshots.push(finalise(year, "UK total", national));
      for (const [region, acc] of byRegion.entries()) {
        snapshots.push(finalise(year, region, acc));
      }
    } catch (err) {
      console.error(
        `  ${year} FAILED:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const outPath = path.join(outDir, "trends.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshots, null, 2), "utf-8");

  console.log("");
  console.log(`[trends] Wrote ${outPath}`);
  console.log(`[trends] ${snapshots.length} snapshot rows across ${years.length} years`);
  console.log("");
  console.log("Next: pipe this into /research/uk-affordability-index page.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
