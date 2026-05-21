// Regression guard for the Google Search Console "Not found (404)"
// coverage issue: sitemap-towns.xml was emitting installer-directory
// URLs (/heat-pump-installers/*, /solar-panel-installers/*) for every
// indexed aggregate — including aggregates with no centroid (lat/lng
// null). Those installer pages 404 (they rank installers by distance
// and need coordinates), so Google found dead URLs in the sitemap.
//
// The fix: only advertise installer URLs when the aggregate has
// coordinates. Guide URLs (/heat-pumps/*, /solar-panels/*) render
// fine without coordinates and stay listed.

import { describe, expect, it, vi } from "vitest";
import type { TownAggregateRow } from "@/lib/programmatic/town-aggregates";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

const state = vi.hoisted(() => ({
  towns: [] as TownAggregateRow[],
  las: [] as TownAggregateRow[],
  pcds: [] as TownAggregateRow[],
}));

vi.mock("@/lib/programmatic/town-aggregates", () => ({
  loadIndexedTownAggregates: () => Promise.resolve(state.towns),
  loadIndexedLAAggregates: () => Promise.resolve(state.las),
  loadIndexedPostcodeDistrictAggregates: () => Promise.resolve(state.pcds),
}));

import { GET } from "./route";

function makeRow(overrides: Partial<TownAggregateRow>): TownAggregateRow {
  return {
    scope_key: "pc-x1",
    display_name: "Example",
    country: "England",
    region: null,
    county: null,
    lat: null,
    lng: null,
    // `data` shape is irrelevant to the sitemap; cast a stub.
    data: { sample_size: 100 } as TownAggregateRow["data"],
    sample_size: 100,
    indexed: true,
    index_reason: null,
    refreshed_at: "2026-05-20T00:00:00.000Z",
    source_dump_date: null,
    ...overrides,
  };
}

async function getSitemap(): Promise<string> {
  const res = await GET();
  return res.text();
}

describe("sitemap-towns.xml — installer URLs gated on coordinates", () => {
  it("omits installer URLs for an indexed PCD aggregate with no centroid", async () => {
    state.towns = [];
    state.las = [];
    state.pcds = [makeRow({ scope_key: "pc-de4", lat: null, lng: null })];

    const xml = await getSitemap();

    // Guide pages still listed — they render without coordinates.
    expect(xml).toContain("/heat-pumps/pc-de4<");
    expect(xml).toContain("/solar-panels/pc-de4<");
    // Installer directories must NOT be listed — they 404 without a centroid.
    expect(xml).not.toContain("/heat-pump-installers/pc-de4");
    expect(xml).not.toContain("/solar-panel-installers/pc-de4");
  });

  it("includes installer URLs for an indexed PCD aggregate with a centroid", async () => {
    state.towns = [];
    state.las = [];
    state.pcds = [makeRow({ scope_key: "pc-s1", lat: 53.38, lng: -1.47 })];

    const xml = await getSitemap();

    expect(xml).toContain("/heat-pump-installers/pc-s1<");
    expect(xml).toContain("/solar-panel-installers/pc-s1<");
  });

  it("gates LA installer URLs on coordinates too", async () => {
    state.towns = [];
    // Use a GSS not in PILOT_TOWNS so it isn't filtered out as a dupe.
    state.las = [
      makeRow({ scope_key: "la-e06000001", lat: null, lng: null }),
      makeRow({ scope_key: "la-e06000005", lat: 54.6, lng: -1.3 }),
    ];
    state.pcds = [];

    const xml = await getSitemap();

    // Coordless LA: guide yes, installer no.
    expect(xml).toContain("/heat-pumps/la-e06000001<");
    expect(xml).not.toContain("/heat-pump-installers/la-e06000001");
    // LA with coordinates: installer yes.
    expect(xml).toContain("/heat-pump-installers/la-e06000005<");
  });
});
