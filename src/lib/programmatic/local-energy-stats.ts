// Reader helpers for public.la_energy_stats + public.region_solar_stats,
// the two tables fed by scripts/seo/import-local-energy-stats.ts from
// DESNZ gov.uk publications.
//
// - loadLaHeatPumpStats — per-LA BUS heat pump install counts.
//   Called from /heat-pumps/[town-slug] on the la-* branch to render
//   the "X BUS-funded heat pumps installed in [LA] since 2022" line.
//
// - loadLaSolarRegionStats — per-LA solar cost, resolved through
//   the LA's parent GOR (there is no per-LA MCS solar publication).
//   Called from /solar-panels/[town-slug] on the la-* branch to
//   render "solar systems in [region] cost £X/kW on average".
//
// Both fail SOFT — return null on missing rows or query error so
// pages render with the generic fallback copy rather than 500ing.
// The importer is external + gated, so partial-import states are
// expected during a fresh deploy.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface LaHeatPumpStats {
  la_gss_code: string;
  la_name: string;
  region_name: string | null;
  bus_hp_installs_2022_23: number | null;
  bus_hp_installs_2023_24: number | null;
  bus_hp_installs_2024_25: number | null;
  bus_hp_installs_total: number | null;
  source: string;
  source_url: string;
  data_period: string;
}

export interface LaSolarRegionStats {
  region_gor_code: string;
  region_name: string;
  financial_year: string;
  mean_cost_per_kw_0_4kw_gbp: number | null;
  mean_cost_per_kw_4_10kw_gbp: number | null;
  installations_0_4kw: number | null;
  installations_4_10kw: number | null;
  installations_total: number | null;
  source: string;
  source_url: string;
}

/** Load per-LA BUS heat pump install counts. `laSlug` is the same
 *  scope_key we already carry on the LA-branch (e.g. "la-E08000003"). */
export async function loadLaHeatPumpStats(
  admin: AdminClient,
  laSlug: string,
): Promise<LaHeatPumpStats | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("la_energy_stats")
    .select(
      "la_gss_code, la_name, region_name, " +
        "bus_hp_installs_2022_23, bus_hp_installs_2023_24, " +
        "bus_hp_installs_2024_25, bus_hp_installs_total, " +
        "source, source_url, data_period",
    )
    .eq("la_slug", laSlug)
    .maybeSingle();
  if (error || !data) return null;
  return data as LaHeatPumpStats;
}

/** Load solar stats for the GOR that contains a given LA. Two-hop
 *  join (la_energy_stats → region_gor_code → region_solar_stats)
 *  handled here rather than pushed into a view because a view would
 *  need extra RLS + migration overhead for a single query pattern. */
export async function loadLaSolarRegionStats(
  admin: AdminClient,
  laSlug: string,
): Promise<LaSolarRegionStats | null> {
  // Step 1: LA → GOR code.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: la, error: laErr } = await (admin as any)
    .from("la_energy_stats")
    .select("region_gor_code")
    .eq("la_slug", laSlug)
    .maybeSingle();
  if (laErr || !la?.region_gor_code) return null;

  // Step 2: GOR + latest year → cost/count row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: region, error: regionErr } = await (admin as any)
    .from("region_solar_stats")
    .select(
      "region_gor_code, region_name, financial_year, " +
        "mean_cost_per_kw_0_4kw_gbp, mean_cost_per_kw_4_10kw_gbp, " +
        "installations_0_4kw, installations_4_10kw, installations_total, " +
        "source, source_url",
    )
    .eq("region_gor_code", la.region_gor_code)
    .order("financial_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (regionErr || !region) return null;
  return region as LaSolarRegionStats;
}
