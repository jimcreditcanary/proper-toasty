// Resolve an installer's "area" — slug + label + centroid — for the
// installer-bylined blog post page.
//
// Best-effort chain, in priority order:
//
//   1. Postcode district matches a PILOT_TOWNS slug → use that town
//      (slug, name, lat/lng).
//   2. County string matches a PILOT_TOWNS county → use the town in
//      that county (first match).
//   3. Fall back to the installer's own lat/lng + county/postcode-
//      derived label, with no directory slug.
//
// The returned `slug` is null when we couldn't find a curated town;
// the caller hides the "See full directory" link in that case but
// still uses lat/lng + label for the related-installers query +
// heading copy.

import { PILOT_TOWNS, type PilotTown } from "@/lib/programmatic/towns";

export interface InstallerArea {
  slug: string | null;
  /** "Sheffield", "the SW1 area" — used in headings + copy. */
  label: string;
  lat: number;
  lng: number;
}

function postcodeDistrict(postcode: string | null): string | null {
  if (!postcode) return null;
  const m = /^([A-Z]{1,2}\d[A-Z\d]?)/i.exec(postcode.trim());
  return m ? m[1].toUpperCase() : null;
}

function matchByPostcodeDistrict(postcode: string | null): PilotTown | null {
  const district = postcodeDistrict(postcode);
  if (!district) return null;
  return (
    PILOT_TOWNS.find((t) =>
      t.postcodeDistricts.some((d) => d.toUpperCase() === district),
    ) ?? null
  );
}

function matchByCounty(county: string | null): PilotTown | null {
  if (!county) return null;
  const target = county.trim().toLowerCase();
  if (!target) return null;
  return (
    PILOT_TOWNS.find((t) => t.county.toLowerCase() === target) ?? null
  );
}

/**
 * Resolve an installer's area for the blog-post sidebar links + the
 * related-installers query. Best-effort — see file header for the
 * priority chain.
 */
export function resolveInstallerArea(input: {
  postcode: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
}): InstallerArea | null {
  const town =
    matchByPostcodeDistrict(input.postcode) ?? matchByCounty(input.county);
  if (town) {
    return {
      slug: town.slug,
      label: town.name,
      lat: town.lat,
      lng: town.lng,
    };
  }

  // Fall back to the installer's own coordinates — no curated slug,
  // but the related-installers query still works.
  if (input.latitude != null && input.longitude != null) {
    const district = postcodeDistrict(input.postcode);
    const label = input.county?.trim()
      ? input.county.trim()
      : district
        ? `the ${district} area`
        : "your area";
    return {
      slug: null,
      label,
      lat: input.latitude,
      lng: input.longitude,
    };
  }

  return null;
}
