// Pure-function tests for region + tech-bucket + tier preview logic.

import { describe, expect, it } from "vitest";
import {
  primaryRegion,
  primaryTechBucket,
  previewTier,
  regionDisplayName,
  techBucketDisplayName,
  tierLabel,
  tierCredits,
} from "../tier-preview";
import type { Database } from "@/types/database";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];
type FounderClaimsRow =
  Database["public"]["Tables"]["outreach_founder_claims"]["Row"];

// Build an installer with all fields false/null and let the test
// override the ones it cares about.
function mkInstaller(overrides: Partial<InstallerRow> = {}): InstallerRow {
  return {
    id: 1,
    certification_number: "MCS-1",
    certification_body: "MCS",
    company_name: "Test Ltd",
    email: "x@y.com",
    telephone: null,
    website: null,
    county: null,
    postcode: null,
    country: null,
    latitude: null,
    longitude: null,
    bus_registered: false,
    cap_air_source_heat_pump: false,
    cap_battery_storage: false,
    cap_biomass: false,
    cap_exhaust_air_heat_pump: false,
    cap_gas_absorption_heat_pump: false,
    cap_ground_source_heat_pump: false,
    cap_water_source_heat_pump: false,
    cap_hydro: false,
    cap_micro_chp: false,
    cap_solar_assisted_heat_pump: false,
    cap_solar_pv: false,
    cap_solar_thermal: false,
    cap_wind_turbine: false,
    region_east_midlands: false,
    region_eastern: false,
    region_london: false,
    region_north_east: false,
    region_north_west: false,
    region_northern_ireland: false,
    region_scotland: false,
    region_south_east: false,
    region_south_west: false,
    region_wales: false,
    region_west_midlands: false,
    region_yorkshire_humberside: false,
    company_number: null,
    ch_matched_name: null,
    ch_matched_address: null,
    ch_match_source: null,
    ch_match_confidence: null,
    reviews_score: 0,
    reviews_count: 0,
    source: "test",
    scraped_at: "2026-01-01T00:00:00Z",
    technology_sub_type: null,
    raw_regions_covered: null,
    raw_technologies: null,
    incorporation_date: null,
    years_in_business: null,
    companies_house_fetched_at: null,
    companies_house_status: null,
    checkatrade_score: null,
    checkatrade_review_count: null,
    checkatrade_url: null,
    checkatrade_fetched_at: null,
    checkatrade_status: null,
    google_place_id: null,
    google_rating: null,
    google_review_count: null,
    google_captured_at: null,
    google_status: null,
    sponsored_until: null,
    logo_url: null,
    meeting_duration_min: 60,
    travel_buffer_min: 30,
    user_id: null,
    claimed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as InstallerRow;
}

describe("primaryRegion — priority order", () => {
  it("London wins when set alongside anything else", () => {
    const i = mkInstaller({
      region_london: true,
      region_south_east: true,
      region_wales: true,
    });
    expect(primaryRegion(i)).toBe("london");
  });

  it("South East beats Wales beats North", () => {
    expect(primaryRegion(mkInstaller({ region_south_east: true, region_wales: true })))
      .toBe("south_east");
    expect(primaryRegion(mkInstaller({ region_wales: true, region_north_west: true })))
      .toBe("wales");
  });

  it("Northern Ireland comes last", () => {
    expect(primaryRegion(mkInstaller({ region_northern_ireland: true })))
      .toBe("northern_ireland");
  });

  it("returns null when no region flag is set", () => {
    expect(primaryRegion(mkInstaller())).toBeNull();
  });
});

describe("primaryTechBucket", () => {
  it("heat_pump for any of ASHP/GSHP/WSHP/ExhaustAir", () => {
    expect(primaryTechBucket(mkInstaller({ cap_air_source_heat_pump: true })))
      .toBe("heat_pump");
    expect(primaryTechBucket(mkInstaller({ cap_ground_source_heat_pump: true })))
      .toBe("heat_pump");
    expect(primaryTechBucket(mkInstaller({ cap_water_source_heat_pump: true })))
      .toBe("heat_pump");
    expect(primaryTechBucket(mkInstaller({ cap_exhaust_air_heat_pump: true })))
      .toBe("heat_pump");
  });

  it("heat_pump beats solar_pv beats battery beats solar_thermal", () => {
    expect(primaryTechBucket(mkInstaller({
      cap_air_source_heat_pump: true,
      cap_solar_pv: true,
    }))).toBe("heat_pump");
    expect(primaryTechBucket(mkInstaller({
      cap_solar_pv: true,
      cap_battery_storage: true,
    }))).toBe("solar_pv");
    expect(primaryTechBucket(mkInstaller({
      cap_battery_storage: true,
      cap_solar_thermal: true,
    }))).toBe("battery_storage");
  });

  it("excludes biomass / wind / hydro / micro-chp / gas absorption / solar assisted HP", () => {
    expect(primaryTechBucket(mkInstaller({ cap_biomass: true }))).toBeNull();
    expect(primaryTechBucket(mkInstaller({ cap_wind_turbine: true }))).toBeNull();
    expect(primaryTechBucket(mkInstaller({ cap_hydro: true }))).toBeNull();
    expect(primaryTechBucket(mkInstaller({ cap_micro_chp: true }))).toBeNull();
    expect(primaryTechBucket(mkInstaller({ cap_gas_absorption_heat_pump: true })))
      .toBeNull();
    expect(primaryTechBucket(mkInstaller({ cap_solar_assisted_heat_pump: true })))
      .toBeNull();
  });
});

describe("previewTier", () => {
  function mkClaims(overrides: Partial<FounderClaimsRow> = {}): FounderClaimsRow {
    return {
      region: "london",
      tech_bucket: "heat_pump",
      tier_1_filled: false,
      tier_1_claimed_by_installer_id: null,
      tier_1_claimed_at: null,
      tier_2_claimed_count: 0,
      updated_at: "2026-01-01T00:00:00Z",
      ...overrides,
    } as FounderClaimsRow;
  }

  it("founder when tier_1 unfilled", () => {
    expect(previewTier(mkClaims())).toBe("founder");
  });

  it("early_access when tier_1 filled and tier_2_count < 5", () => {
    expect(previewTier(mkClaims({ tier_1_filled: true, tier_2_claimed_count: 0 })))
      .toBe("early_access");
    expect(previewTier(mkClaims({ tier_1_filled: true, tier_2_claimed_count: 4 })))
      .toBe("early_access");
  });

  it("standard when tier_1 filled and tier_2_count = 5", () => {
    expect(previewTier(mkClaims({ tier_1_filled: true, tier_2_claimed_count: 5 })))
      .toBe("standard");
  });

  it("standard when claims row is missing entirely", () => {
    expect(previewTier(null)).toBe("standard");
  });
});

describe("display helpers", () => {
  it("regionDisplayName returns human strings", () => {
    expect(regionDisplayName("london")).toBe("London");
    expect(regionDisplayName("yorkshire_humberside")).toBe(
      "Yorkshire & the Humber",
    );
  });

  it("techBucketDisplayName returns lowercase phrases", () => {
    expect(techBucketDisplayName("heat_pump")).toBe("heat pump");
    expect(techBucketDisplayName("solar_pv")).toBe("solar PV");
  });

  it("tierLabel + tierCredits match spec", () => {
    expect(tierLabel("founder")).toBe("Founder");
    expect(tierCredits("founder")).toBe(300);
    expect(tierCredits("early_access")).toBe(100);
    expect(tierCredits("standard")).toBe(30);
  });
});
