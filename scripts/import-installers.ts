// One-shot importer for the MCS-certified installer directory.
//
// Reads the XLSX, normalises each row into our public.installers shape,
// and bulk-upserts in chunks of 200 (Supabase REST max is 1000 but
// smaller chunks give clearer progress + better error attribution).
//
// Idempotent: re-running an updated scrape upserts on (id), so existing
// installer_leads.installer_id references stay valid.
//
// Usage:
//   npx tsx scripts/import-installers.ts <path-to-xlsx>
//
// Env required:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import type { Database } from "../src/types/database";

type InstallerRow = Database["public"]["Tables"]["installers"]["Insert"];

interface RawRow {
  "Installer ID"?: number | string;
  "Certification #"?: string;
  "Certification Body"?: string;
  "Company Name"?: string;
  Email?: string;
  Telephone?: string | number;
  Website?: string;
  "Address Line 1"?: string;
  "Address Line 2"?: string;
  "Address Line 3"?: string;
  County?: string;
  Postcode?: string;
  Country?: string;
  Latitude?: number | string;
  Longitude?: number | string;
  "Boiler Upgrade Scheme"?: string;
  Technologies?: string;
  "Regions Covered"?: string;
  "Air Source Heat Pump"?: string;
  "Battery Storage"?: string;
  Biomass?: string;
  "Exhaust Air Heat Pump"?: string;
  "Gas Absorption Heat Pump"?: string;
  "Ground Source Heat Pump"?: string;
  "Water Source Heat Pump"?: string;
  Hydro?: string;
  "Micro CHP"?: string;
  "Solar Assisted Heat Pump"?: string;
  "Solar PV"?: string;
  "Solar Thermal"?: string;
  "Wind Turbine"?: string;
  "East Midlands"?: string;
  Eastern?: string;
  London?: string;
  "North East"?: string;
  "North West"?: string;
  "Northern Ireland"?: string;
  Scotland?: string;
  "South East"?: string;
  "South West"?: string;
  Wales?: string;
  "West Midlands"?: string;
  "Yorkshire & Humberside"?: string;
  "Technology Sub-Type"?: string;
  "Company Number"?: string | number;
  "CH Matched Name"?: string;
  "CH Matched Address"?: string;
  "Match Source"?: string;
  "Match Confidence"?: string;
}

const CHUNK_SIZE = 200;
const SCRAPED_DATE = "2026-04-21T07:44:00Z";

// "Y" / "y" → true. Anything else → false. The MCS export uses Y / blank.
function yn(v: unknown): boolean {
  return typeof v === "string" && v.trim().toUpperCase() === "Y";
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function confidence(v: unknown): "high" | "medium" | "low" | "uncertain" | null {
  const s = str(v)?.toLowerCase();
  if (s === "high" || s === "medium" || s === "low" || s === "uncertain") return s;
  return null;
}

function rowToInsert(r: RawRow): InstallerRow | null {
  const id = num(r["Installer ID"]);
  const cert = str(r["Certification #"]);
  const body = str(r["Certification Body"]);
  const name = str(r["Company Name"]);
  if (id == null || !cert || !body || !name) {
    console.warn(
      `  skipping row — missing required field (id=${id}, cert=${cert}, body=${body}, name=${name})`,
    );
    return null;
  }

  return {
    id,
    certification_number: cert,
    certification_body: body,
    company_name: name,
    email: str(r.Email),
    telephone: str(r.Telephone),
    website: str(r.Website),

    address_line_1: str(r["Address Line 1"]),
    address_line_2: str(r["Address Line 2"]),
    address_line_3: str(r["Address Line 3"]),
    county: str(r.County),
    postcode: str(r.Postcode),
    country: str(r.Country),
    latitude: num(r.Latitude),
    longitude: num(r.Longitude),

    bus_registered: yn(r["Boiler Upgrade Scheme"]),

    cap_air_source_heat_pump: yn(r["Air Source Heat Pump"]),
    cap_battery_storage: yn(r["Battery Storage"]),
    cap_biomass: yn(r.Biomass),
    cap_exhaust_air_heat_pump: yn(r["Exhaust Air Heat Pump"]),
    cap_gas_absorption_heat_pump: yn(r["Gas Absorption Heat Pump"]),
    cap_ground_source_heat_pump: yn(r["Ground Source Heat Pump"]),
    cap_water_source_heat_pump: yn(r["Water Source Heat Pump"]),
    cap_hydro: yn(r.Hydro),
    cap_micro_chp: yn(r["Micro CHP"]),
    cap_solar_assisted_heat_pump: yn(r["Solar Assisted Heat Pump"]),
    cap_solar_pv: yn(r["Solar PV"]),
    cap_solar_thermal: yn(r["Solar Thermal"]),
    cap_wind_turbine: yn(r["Wind Turbine"]),

    region_east_midlands: yn(r["East Midlands"]),
    region_eastern: yn(r.Eastern),
    region_london: yn(r.London),
    region_north_east: yn(r["North East"]),
    region_north_west: yn(r["North West"]),
    region_northern_ireland: yn(r["Northern Ireland"]),
    region_scotland: yn(r.Scotland),
    region_south_east: yn(r["South East"]),
    region_south_west: yn(r["South West"]),
    region_wales: yn(r.Wales),
    region_west_midlands: yn(r["West Midlands"]),
    region_yorkshire_humberside: yn(r["Yorkshire & Humberside"]),

    company_number: str(r["Company Number"]),
    ch_matched_name: str(r["CH Matched Name"]),
    ch_matched_address: str(r["CH Matched Address"]),
    ch_match_source: str(r["Match Source"]),
    ch_match_confidence: confidence(r["Match Confidence"]),

    technology_sub_type: str(r["Technology Sub-Type"]),
    raw_regions_covered: str(r["Regions Covered"]),
    raw_technologies: str(r.Technologies),

    source: "mcs_scraped",
    scraped_at: SCRAPED_DATE,
  };
}

async function main() {
  const xlsxPath = process.argv[2];
  if (!xlsxPath) {
    console.error(
      "Usage: npx tsx scripts/import-installers.ts <path-to-xlsx>",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.",
    );
    process.exit(1);
  }

  const absPath = path.resolve(xlsxPath);
  console.log(`📂 Reading ${absPath}…`);
  const buf = readFileSync(absPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  // Prefer the named "MCS Installers" sheet (the original XLSX export
  // shipped that sheet name). CSV imports come in as a single sheet
  // named "Sheet1" — fall back to whatever the first sheet is so we
  // accept either format without manual fiddling.
  const sheet =
    wb.Sheets["MCS Installers"] ?? wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    console.error(
      `No sheet found. Workbook has: ${JSON.stringify(wb.SheetNames)}`,
    );
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  console.log(`   ${rows.length} raw rows`);

  const inserts = rows.map(rowToInsert).filter((x): x is InstallerRow => x != null);
  console.log(`   ${inserts.length} valid rows to upsert`);

  const supabase = createClient<Database>(url, key);

  let total = 0;
  let failed = 0;
  for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("installers")
      .upsert(chunk, { onConflict: "id" });
    if (error) {
      failed += chunk.length;
      console.error(
        `  ❌ chunk ${i / CHUNK_SIZE + 1} failed:`,
        error.message,
      );
    } else {
      total += chunk.length;
      process.stdout.write(
        `\r  ✅ upserted ${total.toLocaleString()} / ${inserts.length.toLocaleString()}`,
      );
    }
  }
  process.stdout.write("\n");

  console.log(`\nDone — ${total.toLocaleString()} upserted, ${failed.toLocaleString()} failed`);

  // Quick sanity check
  const { count } = await supabase
    .from("installers")
    .select("*", { count: "exact", head: true });
  console.log(`Verified row count in public.installers: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
