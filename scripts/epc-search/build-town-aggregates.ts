#!/usr/bin/env tsx
//
// Build town-level EPC aggregates from the GOV.UK EPC search API,
// upsert into public.epc_area_aggregates.
//
// What it does, in order:
//
//   1. Read the PILOT_TOWNS seed.
//   2. For each town (filtered by --towns arg if passed):
//        a. Walk every postcode district in `postcodeDistricts`.
//        b. Hit /api/domestic/search?postcode=<district>&page_size=100,
//           paginate up to 5 pages per district (= 500-row cap).
//        c. Filter rows by post_town to drop spillover.
//        d. Compute the aggregate via computeTownAggregate().
//        e. Upsert into epc_area_aggregates with onConflict(scope, scope_key).
//   3. Report a summary: per-town sample size + indexed flag.
//
// Re-runnable: upserts cleanly. Re-run monthly when the EPC API
// has fresh rows.
//
// Cost: ~15 postcode districts × ~3 pages per town × ~250ms throttle
// = roughly 11 seconds of API time per town. Sheffield + Bristol +
// Brighton in ~30s.
//
// Usage:
//
//   # Build all pilot towns
//   node --env-file=.env.local node_modules/.bin/tsx \
//     scripts/epc-search/build-town-aggregates.ts
//
//   # Just one
//   node --env-file=.env.local node_modules/.bin/tsx \
//     scripts/epc-search/build-town-aggregates.ts --towns sheffield
//
//   # Synthetic seed (no API calls) — used to verify the page
//   # renders before we wire up the real EPC_API_KEY.
//   node --env-file=.env.local node_modules/.bin/tsx \
//     scripts/epc-search/build-town-aggregates.ts --synthetic

import { createAdminClient } from "../../src/lib/supabase/admin";
import { PILOT_TOWNS, type PilotTown } from "../../src/lib/programmatic/towns";
import { searchByTown } from "../../src/lib/programmatic/epc-search";
import {
  computeTownAggregate,
  upsertTownAggregate,
  type TownAggregateData,
  type EnergyBand,
} from "../../src/lib/programmatic/town-aggregates";

function parseArgs(): { towns: string[] | null; synthetic: boolean } {
  const args = process.argv.slice(2);
  let towns: string[] | null = null;
  let synthetic = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--towns") {
      towns = (args[i + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      i += 1;
    } else if (args[i] === "--synthetic") {
      synthetic = true;
    }
  }
  return { towns, synthetic };
}

/**
 * Synthetic aggregate — a plausible UK band distribution. Lets us
 * seed the DB without making any EPC API calls, so we can verify
 * the page renders before wiring up the real key.
 */
function syntheticAggregate(): TownAggregateData {
  // Rough 2024 E&W distribution per gov.uk lodgement data:
  //   A: 0.5%, B: 5%, C: 27%, D: 45%, E: 18%, F: 3%, G: 0.5%
  // Scaled to a 2,000-property sample.
  const dist: Partial<Record<EnergyBand, number>> = {
    A: 10,
    B: 100,
    C: 540,
    D: 900,
    E: 360,
    F: 60,
    G: 30,
  };
  const sample = Object.values(dist).reduce((a, b) => a + b!, 0);
  const pct: Partial<Record<EnergyBand, number>> = {};
  for (const [k, v] of Object.entries(dist)) {
    pct[k as EnergyBand] = Math.round((v! / sample) * 1000) / 10;
  }
  return {
    sample_size: sample,
    band_distribution: dist,
    band_distribution_pct: pct,
    median_band: "D",
    best_band: "A",
    worst_band: "G",
    earliest_registration: "2008-04-01",
    latest_registration: "2026-05-01",
  };
}

async function buildOne(
  town: PilotTown,
  synthetic: boolean,
): Promise<{ slug: string; sample: number; indexed: boolean }> {
  console.log(`\n→ ${town.name} (${town.slug})`);
  let data: TownAggregateData;

  if (synthetic) {
    data = syntheticAggregate();
    console.log(`  synthetic: sample=${data.sample_size}`);
  } else {
    const rows = await searchByTown(town, {
      // One page of 5000 council-filtered rows per town is plenty
      // for the band-distribution rollup. Larger councils have more
      // than 5000 EPCs but the sample is statistically representative
      // either way.
      pageSize: 5000,
      maxPages: 1,
      onProgress: (msg) => console.log(msg),
    });
    data = computeTownAggregate(rows);
    console.log(
      `  collected ${rows.length} rows; aggregate sample=${data.sample_size}`,
    );
  }

  const admin = createAdminClient();
  await upsertTownAggregate(admin, town, data, {
    minSampleSize: 50,
    sourceDumpDate: synthetic ? "synthetic-2026-05" : null,
  });
  const indexed = data.sample_size >= 50;
  console.log(`  upserted (indexed=${indexed})`);
  return { slug: town.slug, sample: data.sample_size, indexed };
}

async function main() {
  const { towns, synthetic } = parseArgs();
  const list = towns
    ? PILOT_TOWNS.filter((t) => towns.includes(t.slug))
    : PILOT_TOWNS;

  if (list.length === 0) {
    console.error(
      `No towns matched. Pilot slugs: ${PILOT_TOWNS.map((t) => t.slug).join(", ")}`,
    );
    process.exit(1);
  }

  console.log(
    `\nBuilding aggregates for ${list.length} town(s)${synthetic ? " [SYNTHETIC]" : ""}\n`,
  );

  const results: Array<{ slug: string; sample: number; indexed: boolean }> = [];
  for (const town of list) {
    try {
      results.push(await buildOne(town, synthetic));
    } catch (err) {
      console.error(
        `  ✗ ${town.slug} failed: ${err instanceof Error ? err.message : err}`,
      );
      results.push({ slug: town.slug, sample: 0, indexed: false });
    }
  }

  console.log("\n──── summary ────");
  for (const r of results) {
    const mark = r.indexed ? "✓" : "✗";
    console.log(
      `  ${mark} ${r.slug.padEnd(20)} sample=${r.sample.toString().padStart(5)}  indexed=${r.indexed}`,
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error("Crashed:", err);
  process.exit(2);
});
