// Pure functions for resolving an installer's region + tech_bucket
// + previewing what tier they'd land if they claimed RIGHT NOW.
//
// "Preview" because tier assignment is decided atomically inside the
// outreach_claim_founder_offer RPC at actual claim time — between
// send and click the founder spot may have been claimed by someone
// else. The selector uses the preview to pick the initial template
// (we want a founder-tier installer to receive the founder-tier
// copy in their initial email), but the landing page reads live
// claim state and shows the actual tier on offer.

import type { Database } from "@/types/database";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];
type FounderClaimsRow =
  Database["public"]["Tables"]["outreach_founder_claims"]["Row"];

export type Region =
  | "london"
  | "south_east"
  | "south_west"
  | "eastern"
  | "wales"
  | "north_west"
  | "yorkshire_humberside"
  | "west_midlands"
  | "east_midlands"
  | "north_east"
  | "scotland"
  | "northern_ireland";

export type TechBucket =
  | "heat_pump"
  | "solar_pv"
  | "battery_storage"
  | "solar_thermal";

export type Tier = "founder" | "early_access" | "standard";

/**
 * Primary region per the Phase 0 priority order: London first,
 * then SE → SW → East → Wales → NW → Yorks → WM → EM → NE →
 * Scotland → NI. Returns null when no region_* flag is set
 * (data-quality issue — installer shouldn't have been eligible).
 */
export function primaryRegion(installer: InstallerRow): Region | null {
  if (installer.region_london) return "london";
  if (installer.region_south_east) return "south_east";
  if (installer.region_south_west) return "south_west";
  if (installer.region_eastern) return "eastern";
  if (installer.region_wales) return "wales";
  if (installer.region_north_west) return "north_west";
  if (installer.region_yorkshire_humberside) return "yorkshire_humberside";
  if (installer.region_west_midlands) return "west_midlands";
  if (installer.region_east_midlands) return "east_midlands";
  if (installer.region_north_east) return "north_east";
  if (installer.region_scotland) return "scotland";
  if (installer.region_northern_ireland) return "northern_ireland";
  return null;
}

/**
 * Primary tech bucket per the Phase 0 mapping:
 *   heat_pump      = any of ASHP/GSHP/WSHP/ExhaustAir
 *                    (BUS-eligible homeowner-facing heat pumps;
 *                    excludes biomass, gas absorption, solar
 *                    assisted, micro-CHP, hydro, wind)
 *   solar_pv       = cap_solar_pv
 *   battery_storage= cap_battery_storage
 *   solar_thermal  = cap_solar_thermal
 *
 * Priority order: heat_pump > solar_pv > battery_storage >
 * solar_thermal. Returns null for non-homeowner-facing capabilities
 * only (biomass-only installer etc).
 */
export function primaryTechBucket(installer: InstallerRow): TechBucket | null {
  if (
    installer.cap_air_source_heat_pump ||
    installer.cap_ground_source_heat_pump ||
    installer.cap_water_source_heat_pump ||
    installer.cap_exhaust_air_heat_pump
  ) {
    return "heat_pump";
  }
  if (installer.cap_solar_pv) return "solar_pv";
  if (installer.cap_battery_storage) return "battery_storage";
  if (installer.cap_solar_thermal) return "solar_thermal";
  return null;
}

/**
 * Tier preview given the live founder_claims row for this
 * (region, tech_bucket). Mirrors the decision logic inside the
 * RPC so the selector picks the right initial template.
 */
export function previewTier(claims: FounderClaimsRow | null): Tier {
  if (!claims) return "standard";
  if (!claims.tier_1_filled) return "founder";
  if (claims.tier_2_claimed_count < 5) return "early_access";
  return "standard";
}

/** Human-readable region label for merge vars. */
export function regionDisplayName(region: Region): string {
  const map: Record<Region, string> = {
    london: "London",
    south_east: "South East",
    south_west: "South West",
    eastern: "the East",
    wales: "Wales",
    north_west: "the North West",
    yorkshire_humberside: "Yorkshire & the Humber",
    west_midlands: "the West Midlands",
    east_midlands: "the East Midlands",
    north_east: "the North East",
    scotland: "Scotland",
    northern_ireland: "Northern Ireland",
  };
  return map[region];
}

/** Human-readable tech bucket label for merge vars. */
export function techBucketDisplayName(bucket: TechBucket): string {
  const map: Record<TechBucket, string> = {
    heat_pump: "heat pump",
    solar_pv: "solar PV",
    battery_storage: "battery storage",
    solar_thermal: "solar thermal",
  };
  return map[bucket];
}

/** Human-readable tier label for merge vars. */
export function tierLabel(tier: Tier): string {
  const map: Record<Tier, string> = {
    founder: "Founder",
    early_access: "Early Access",
    standard: "Standard",
  };
  return map[tier];
}

/** Credits granted for each tier — single source of truth, mirrors
 *  the RPC's hard-coded values. UI uses this for the landing page
 *  "claim N credits" CTA. */
export function tierCredits(tier: Tier): number {
  const map: Record<Tier, number> = {
    founder: 300,
    early_access: 100,
    standard: 30,
  };
  return map[tier];
}
