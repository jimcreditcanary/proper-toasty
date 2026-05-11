// Pilot town seed — 3 towns to validate the programmatic pipeline
// before we scale to 50 + then to ~2,000 nationally.
//
// Each row carries everything the page generator + the build script
// need: slug (URL), display name, ONS GSS code (for the optional
// local-authority-filtered EPC search), the post_town value the EPC
// API returns for properties in this town (used to filter spillover
// rows when we search by postcode prefix), county / region, and a
// centroid for any map-aware content.
//
// GSS codes verified against api.postcodes.io on 2026-05-11.
// Note: Sheffield is E08000039 (2024 boundary review), NOT the
// historic E08000019.
//
// post_town values are UPPERCASE because the EPC API ships them in
// uppercase — we case-insensitive-match on read but storing
// canonical uppercase here avoids any subtle bug from a tweak to
// the comparison.
//
// Postcode districts: an array of district prefixes the build
// script iterates over when searching EPC by postcode. Listed in
// rough geographic order — not significant for the algorithm but
// keeps the source readable.
//
// FUTURE: when scaling past 50, this seed moves to a `towns`
// Supabase table (loaded from the ONS Built-Up Areas 2022 list).
// For now, hand-curated array is fine — easy to review changes
// in git diff, no migration overhead.

export interface PilotTown {
  slug: string;
  name: string;
  /** ONS GSS code for the local authority. Verified via
   *  postcodes.io; if the EPC API rejects the local-authority
   *  filter we fall back to postcode prefixes. */
  laGssCode: string;
  /** UPPERCASE post_town value as it appears on EPC rows for
   *  properties in this town. Used to filter spillover when
   *  searching by postcode prefix. Some towns ship multiple
   *  variants (e.g. Brighton & Hove → 'BRIGHTON' or 'HOVE') —
   *  list every variant we want to attribute to this town. */
  postTowns: string[];
  /** Postcode districts the build script iterates over to
   *  collect a representative sample. Order doesn't matter. */
  postcodeDistricts: string[];
  county: string;
  region: string;
  country: "England" | "Wales";
  lat: number;
  lng: number;
}

export const PILOT_TOWNS: PilotTown[] = [
  {
    slug: "sheffield",
    name: "Sheffield",
    laGssCode: "E08000039",
    postTowns: ["SHEFFIELD"],
    postcodeDistricts: [
      "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10",
      "S11", "S12", "S13", "S14", "S17",
    ],
    county: "South Yorkshire",
    region: "Yorkshire and the Humber",
    country: "England",
    lat: 53.3811,
    lng: -1.4701,
  },
  {
    slug: "bristol",
    name: "Bristol",
    laGssCode: "E06000023",
    postTowns: ["BRISTOL"],
    postcodeDistricts: [
      "BS1", "BS2", "BS3", "BS4", "BS5", "BS6", "BS7", "BS8", "BS9",
      "BS10", "BS11", "BS13", "BS14", "BS15", "BS16",
    ],
    county: "City of Bristol",
    region: "South West",
    country: "England",
    lat: 51.4545,
    lng: -2.5879,
  },
  {
    slug: "brighton-and-hove",
    name: "Brighton and Hove",
    laGssCode: "E06000043",
    postTowns: ["BRIGHTON", "HOVE"],
    postcodeDistricts: [
      "BN1", "BN2", "BN3", "BN41", "BN42",
    ],
    county: "East Sussex",
    region: "South East",
    country: "England",
    lat: 50.8225,
    lng: -0.1372,
  },
];

export function getTownBySlug(slug: string): PilotTown | null {
  return PILOT_TOWNS.find((t) => t.slug === slug) ?? null;
}

/** Slug list for static-params + sitemap generation. */
export function allTownSlugs(): string[] {
  return PILOT_TOWNS.map((t) => t.slug);
}
