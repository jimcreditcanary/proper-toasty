#!/usr/bin/env tsx
//
// Import per-LA BUS heat pump install counts + per-region solar PV
// cost data from gov.uk XLSX publications into public.la_energy_stats
// and public.region_solar_stats. Re-runnable — truncates and reloads.
//
// Data sources:
//   - BUS heat pump installations per LA (E&W, 2022/23-2024/25)
//     DESNZ Boiler Upgrade Scheme statistics, Table A1.7:
//     https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics
//
//   - Solar PV cost per UK region (11 GORs, 2013/14-2025/26)
//     DESNZ Solar PV Cost Data, Regional costs (DNC) sheet:
//     https://www.gov.uk/government/statistics/solar-pv-cost-data
//
// The BUS file lists both region-total rows (E12xxxxxxx / W92xxxxxxx)
// and LA rows (E06/E07/E08/E09/W06). We walk the sheet in order,
// tracking the current region as region-total rows go past, and
// attach each LA to the most-recently-seen region. Suppressed cells
// ([c1]/[c2]) round-trip to null rather than 0 so pages don't quote
// "0 installs" when the real value is 1-4.
//
// Usage:
//   npx tsx scripts/seo/import-local-energy-stats.ts
//
// Env: needs Supabase service-role creds from .env.local.

import "../../src/lib/dev/load-env";
import * as XLSX from "xlsx";
import { createAdminClient } from "../../src/lib/supabase/admin";
// Uses the SAME slugification our aggregates use, so a BUS row for
// "Bristol, City of" ends up at scope_key "la-bristol-city-of" and
// joins cleanly to the epc_area_aggregates row of the same key.
import { laSlugFromCouncilName } from "../../src/lib/programmatic/town-aggregates";

const BUS_URL =
  "https://assets.publishing.service.gov.uk/media/699dc550db2401de164d6c5d/Boiler_Upgrade_Scheme_BUS_Statistics_January_2026.xlsx";
const SOLAR_URL =
  "https://assets.publishing.service.gov.uk/media/6a1709cc65bc5f798327f404/Solar_Costs_2025-26__DNC_.xlsx";

// ─── Types ─────────────────────────────────────────────────────────

interface LARow {
  la_gss_code: string;
  la_slug: string;
  la_name: string;
  region_gor_code: string | null;
  region_name: string | null;
  bus_hp_installs_2022_23: number | null;
  bus_hp_installs_2023_24: number | null;
  bus_hp_installs_2024_25: number | null;
  bus_hp_installs_total: number | null;
}

interface RegionRow {
  region_gor_code: string;
  region_name: string;
  financial_year: string;
  mean_cost_per_kw_0_4kw_gbp: number | null;
  mean_cost_per_kw_4_10kw_gbp: number | null;
  mean_cost_per_kw_10_50kw_gbp: number | null;
  installations_0_4kw: number | null;
  installations_4_10kw: number | null;
  installations_10_50kw: number | null;
  installations_total: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────

async function fetchXlsx(url: string): Promise<XLSX.WorkBook> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return XLSX.read(buf, { type: "buffer" });
}

/** Turn "[c1]" / "[c2]" / "" / null into null; numeric strings into
 *  a Number; already-numeric passes through. Never returns NaN. */
function toNumberOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.startsWith("[")) return null; // suppressed
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isLaGss(code: string): boolean {
  // England: E06 (unitary), E07 (non-metropolitan district), E08
  // (metropolitan borough), E09 (London borough). Wales: W06
  // (principal authority). Excludes E11 (metropolitan county —
  // aggregate above LA level) which appears as a heading row.
  return /^(E06|E07|E08|E09|W06)\d+$/.test(code);
}

function isRegionOrCountryGss(code: string): boolean {
  // Government Office Regions (E12), country codes (E92/W92/S92/N92/K04).
  return /^(E12|E92|W92|S92|N92|K04)\d+$/.test(code);
}

// Normalise the LA name from the BUS spreadsheet.
//   - Trim
//   - Take the English side of "English / Cymraeg" bilingual labels
//     used for Welsh authorities ("Caerphilly / Caerffili" →
//     "Caerphilly"). AI overviews and users search by the English
//     name; the Welsh side is redundant for our purposes.
function cleanLaName(raw: string): string {
  const trimmed = raw.trim();
  const slashIdx = trimmed.indexOf(" / ");
  return slashIdx > 0 ? trimmed.slice(0, slashIdx).trim() : trimmed;
}

// Region name normalisation — the BUS file uses SHOUTED region
// names ("EAST"), the Solar file uses title-case + full form ("East
// of England"). Canonicalise on GOR code but keep a display name.
const GOR_DISPLAY_NAME: Record<string, string> = {
  E12000001: "North East",
  E12000002: "North West",
  E12000003: "Yorkshire and The Humber",
  E12000004: "East Midlands",
  E12000005: "West Midlands",
  E12000006: "East of England",
  E12000007: "London",
  E12000008: "South East",
  E12000009: "South West",
  W92000004: "Wales",
  S92000003: "Scotland",
};

// Solar file uses full names — map them back to GOR codes.
const SOLAR_REGION_TO_GOR: Record<string, string> = {
  "East Midlands": "E12000004",
  "East of England": "E12000006",
  London: "E12000007",
  "North East": "E12000001",
  "North West": "E12000002",
  "South East": "E12000008",
  "South West": "E12000009",
  "West Midlands": "E12000005",
  "Yorkshire and The Humber": "E12000003",
  Scotland: "S92000003",
  Wales: "W92000004",
};

// ─── BUS parser (per-LA heat pump installs) ────────────────────────

function parseBusA17(wb: XLSX.WorkBook): LARow[] {
  const ws = wb.Sheets["A1.7"];
  if (!ws) throw new Error("BUS: sheet 'A1.7' missing");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
  });

  // Locate the header row (contains "Area Codes" in col 0). Data
  // starts on the row below. Hardcoded around row 11 in the
  // January 2026 file — search rather than pin so future releases
  // that shift rows survive.
  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i]?.[0] ?? "").trim() === "Area Codes") {
      dataStart = i + 1;
      break;
    }
  }
  if (dataStart < 0) throw new Error("BUS A1.7: header row not found");

  const out: LARow[] = [];
  let currentRegion: { code: string; name: string } | null = null;

  for (let i = dataStart; i < rows.length; i++) {
    const row = rows[i];
    const code = String(row?.[0] ?? "").trim();
    if (!code) continue;

    if (isRegionOrCountryGss(code)) {
      // Region / country header — remember it for subsequent LA
      // rows. E92 (ENGLAND) + K04 (E&W) + W92 (WALES) also count
      // as parent-region context for LAs below them.
      const gorDisplay =
        GOR_DISPLAY_NAME[code] ??
        cleanLaName(String(row?.[1] ?? "")).replace(/\b\w/g, (c) =>
          c.toUpperCase(),
        );
      // Only remember true GOR (E12/W92) rows as "region" — the
      // country-level (E92/K04) rows are too coarse. For Welsh LAs
      // the "WALES" row IS the region.
      if (/^(E12|W92)/.test(code)) {
        currentRegion = { code, name: gorDisplay };
      }
      continue;
    }

    if (!isLaGss(code)) continue; // skip county/met-county rows

    // LA rows have the name in either col C (county/unitary) or
    // col D (LA district). Take whichever is non-empty.
    const rawName =
      String(row?.[3] ?? "").trim() || String(row?.[2] ?? "").trim();
    if (!rawName) continue;

    const y1 = toNumberOrNull(row?.[4]);
    const y2 = toNumberOrNull(row?.[5]);
    const y3 = toNumberOrNull(row?.[6]);
    const total =
      y1 == null && y2 == null && y3 == null
        ? null
        : (y1 ?? 0) + (y2 ?? 0) + (y3 ?? 0);

    const cleanName = cleanLaName(rawName);
    out.push({
      la_gss_code: code,
      // Match the aggregates' scope_key shape ("la-bristol-city-of"),
      // NOT `la-<gss>`. This lets the /heat-pumps/[la-slug] loader
      // join stats to the aggregate row by scope_key alone. The
      // GSS code is kept for reference/debugging.
      la_slug: `la-${laSlugFromCouncilName(cleanName)}`,
      la_name: cleanName,
      region_gor_code: currentRegion?.code ?? null,
      region_name: currentRegion?.name ?? null,
      bus_hp_installs_2022_23: y1,
      bus_hp_installs_2023_24: y2,
      bus_hp_installs_2024_25: y3,
      bus_hp_installs_total: total,
    });
  }
  return out;
}

// ─── Solar Cost parser (per-region £/kW + install counts) ──────────

function parseSolarRegionalDnc(wb: XLSX.WorkBook): RegionRow[] {
  const sheetName = "Regional costs (DNC)";
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Solar: sheet '${sheetName}' missing`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
  });

  // Data starts on row 5 (col headers on row 4). Columns:
  //   0: Financial year   1: Region   2: Total installs analysed
  //   3: Not included     4: Coverage 5: Mean £/kW (all)
  //   6: 0-4kW count      7: 0-4kW mean £/kW
  //   8: 4-10kW count     9: 4-10kW mean £/kW
  //  10: 10-50kW count   11: 10-50kW mean £/kW
  const out: RegionRow[] = [];
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    const fy = String(row?.[0] ?? "").trim();
    const region = String(row?.[1] ?? "").trim();
    if (!fy || !region) continue;
    const gor = SOLAR_REGION_TO_GOR[region];
    if (!gor) {
      console.warn(`  ! Solar: unmapped region "${region}", skipping`);
      continue;
    }

    const installs0_4 = toNumberOrNull(row?.[6]);
    const installs4_10 = toNumberOrNull(row?.[8]);
    const installs10_50 = toNumberOrNull(row?.[10]);
    const total =
      installs0_4 == null && installs4_10 == null && installs10_50 == null
        ? null
        : (installs0_4 ?? 0) + (installs4_10 ?? 0) + (installs10_50 ?? 0);

    out.push({
      region_gor_code: gor,
      region_name: GOR_DISPLAY_NAME[gor] ?? region,
      financial_year: fy,
      mean_cost_per_kw_0_4kw_gbp: toNumberOrNull(row?.[7]),
      mean_cost_per_kw_4_10kw_gbp: toNumberOrNull(row?.[9]),
      mean_cost_per_kw_10_50kw_gbp: toNumberOrNull(row?.[11]),
      installations_0_4kw: installs0_4,
      installations_4_10kw: installs4_10,
      installations_10_50kw: installs10_50,
      installations_total: total,
    });
  }
  return out;
}

// ─── Upserts ───────────────────────────────────────────────────────

async function upsertLARows(rows: LARow[]): Promise<void> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (admin as any).from("la_energy_stats");

  // Wipe and reload — the source XLSX is authoritative per release.
  const { error: delErr } = await table
    .delete()
    .neq("la_gss_code", "___never___");
  if (delErr) throw delErr;

  // Chunk to avoid Supabase's 1000-row payload cap.
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await table.insert(chunk);
    if (error) throw error;
  }
}

async function upsertRegionRows(rows: RegionRow[]): Promise<void> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (admin as any).from("region_solar_stats");

  const { error: delErr } = await table
    .delete()
    .neq("region_gor_code", "___never___");
  if (delErr) throw delErr;

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await table.insert(chunk);
    if (error) throw error;
  }
}

// ─── Main ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[1/4] Fetching BUS statistics XLSX from gov.uk…");
  const busWb = await fetchXlsx(BUS_URL);
  const laRows = parseBusA17(busWb);
  console.log(`      parsed ${laRows.length} LA rows`);
  console.log(
    `      example: ${laRows[0]?.la_name} (${laRows[0]?.la_gss_code}) — ` +
      `total=${laRows[0]?.bus_hp_installs_total}, region=${laRows[0]?.region_name}`,
  );

  console.log("\n[2/4] Fetching Solar PV Cost XLSX from gov.uk…");
  const solarWb = await fetchXlsx(SOLAR_URL);
  const regionRows = parseSolarRegionalDnc(solarWb);
  console.log(`      parsed ${regionRows.length} region-year rows`);
  const latestYear = [...regionRows]
    .map((r) => r.financial_year)
    .sort()
    .pop();
  console.log(`      latest year in file: ${latestYear}`);

  console.log("\n[3/4] Upserting la_energy_stats…");
  await upsertLARows(laRows);
  console.log(`      ✓ ${laRows.length} rows`);

  console.log("\n[4/4] Upserting region_solar_stats…");
  await upsertRegionRows(regionRows);
  console.log(`      ✓ ${regionRows.length} rows`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
