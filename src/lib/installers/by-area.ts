// Select installers covering a geographic area for a given capability.
//
// Used by the InstallerListSection component on the town / LA /
// postcode-district pages. Returns the nearest N installers to the
// area centroid, filtered by capability flag (heat pump / solar / both).
//
// Why distance-based rather than region-flag-based: the MCS region
// coverage flags (region_yorkshire_humberside, etc.) are coarse —
// an installer in Sheffield is also in "Yorkshire & Humberside" but
// the flag also catches installers in Hull, 70 miles away. Distance
// gives us a tighter ranking + matches user intent ("solar near me").
//
// Capability flags:
//   heat_pump → cap_air_source_heat_pump = true (the dominant tech
//               for residential BUS-eligible installs)
//   solar     → cap_solar_pv = true
//
// BUS-registered filter applies for heat-pump queries — required for
// grant eligibility, and the homeowner journey only makes sense with
// a BUS-registered installer for the heat-pump case.

import { createAdminClient } from "@/lib/supabase/admin";

export interface InstallerCardData {
  id: number;
  certification_number: string;
  company_name: string;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  bus_registered: boolean;
  cap_air_source_heat_pump: boolean;
  cap_solar_pv: boolean;
  cap_ground_source_heat_pump: boolean;
  cap_battery_storage: boolean;
  years_in_business: number | null;
  // Reviews state — populated from DB cache. Client-side refresh
  // hydrates fresh values on render.
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_captured_at: string | null;
  google_status: string | null;
  checkatrade_score: number | null;
  checkatrade_review_count: number | null;
  checkatrade_url: string | null;
  checkatrade_fetched_at: string | null;
  checkatrade_status: string | null;
  /** Computed distance in km from the area centroid. */
  distance_km: number;
}

export type InstallerCapability = "heat_pump" | "solar";

interface SelectInput {
  /** Area centroid for distance-based ranking. */
  lat: number;
  lng: number;
  /** Tech the user is researching. */
  capability: InstallerCapability;
  /** Cap on returned installers. The brief example used 14 per page. */
  limit?: number;
  /** Maximum search radius in km. Soft cap — we'll widen automatically
   *  if fewer than 5 installers are found. */
  radiusKm?: number;
}

/**
 * Haversine distance in km between two lat/lng pairs.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Bounding-box pre-filter to keep the Supabase query small. The full
 * distance calc happens in-app afterwards. We over-fetch a bit (the
 * bounding box is rectangular, not circular) and then filter.
 */
function boundingBox(
  lat: number,
  lng: number,
  radiusKm: number,
): { latMin: number; latMax: number; lngMin: number; lngMax: number } {
  // 1° latitude ≈ 111 km. 1° longitude scales by cos(lat).
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lngMin: lng - lngDelta,
    lngMax: lng + lngDelta,
  };
}

/**
 * Query Supabase for installers within the bounding box + capability
 * filter, then sort by haversine distance and return the nearest N.
 *
 * The Supabase query uses the service-role admin client because
 * installers are public reference data and we're filtering on lat/lng
 * which isn't covered by row-level RLS policies anyway.
 */
export async function selectInstallersByArea(
  input: SelectInput,
): Promise<InstallerCardData[]> {
  const { lat, lng, capability, limit = 14 } = input;
  let radiusKm = input.radiusKm ?? 25;
  const admin = createAdminClient();

  const capabilityColumn =
    capability === "solar" ? "cap_solar_pv" : "cap_air_source_heat_pump";

  // Two-pass widening: start at 25km, if we have <5 results widen to
  // 50, then 100, then 200km. Rural postcodes have low installer
  // density; without widening they'd render empty installer sections.
  const tryRadii = [radiusKm, radiusKm * 2, radiusKm * 4, radiusKm * 8];

  for (const rk of tryRadii) {
    radiusKm = rk;
    const bbox = boundingBox(lat, lng, radiusKm);

    let query = (admin as unknown as { from: (t: string) => { select: (s: string) => unknown } })
      .from("installers")
      .select(
        "id, certification_number, company_name, postcode, latitude, longitude, bus_registered, cap_air_source_heat_pump, cap_solar_pv, cap_ground_source_heat_pump, cap_battery_storage, years_in_business, google_place_id, google_rating, google_review_count, google_captured_at, google_status, checkatrade_score, checkatrade_review_count, checkatrade_url, checkatrade_fetched_at, checkatrade_status",
      ) as {
      eq: (c: string, v: unknown) => typeof query;
      gte: (c: string, v: unknown) => typeof query;
      lte: (c: string, v: unknown) => typeof query;
      not: (c: string, op: string, v: unknown) => typeof query;
      limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };

    query = query
      .eq(capabilityColumn, true)
      .gte("latitude", bbox.latMin)
      .lte("latitude", bbox.latMax)
      .gte("longitude", bbox.lngMin)
      .lte("longitude", bbox.lngMax);

    // BUS-registered filter only for heat-pump capability (required
    // for grant); not relevant for solar (no equivalent grant).
    if (capability === "heat_pump") {
      query = query.eq("bus_registered", true);
    }

    const { data, error } = await query.limit(500);
    if (error) {
      console.error("[installers/by-area] query failed", error);
      return [];
    }

    type Row = Omit<InstallerCardData, "distance_km">;
    const rows = (data ?? []) as Row[];

    const ranked: InstallerCardData[] = rows
      .map((r) => {
        if (r.latitude == null || r.longitude == null) return null;
        const d = haversineKm(lat, lng, r.latitude, r.longitude);
        if (d > radiusKm) return null;
        return { ...r, distance_km: d };
      })
      .filter((r): r is InstallerCardData => r !== null)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);

    // Found enough — return.
    if (ranked.length >= 5 || radiusKm >= tryRadii[tryRadii.length - 1]) {
      return ranked;
    }
    // Otherwise loop with a wider radius.
  }

  return [];
}
