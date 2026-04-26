// Installer directory service.
//
// findNearby() filters the installers table by capability, narrows by
// lat/lng bounding box (cheap), then computes Haversine distance for the
// ~hundreds of rows that survive the box filter and orders/paginates.
//
// At 5,630 installer rows this brute-force approach is fine — a 0.5°
// bounding box (~55km radius at UK latitudes) cuts the result set down
// to a few hundred rows in milliseconds. PostGIS would only matter at
// 10× this scale.

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type {
  InstallerCard,
  NearbyInstallersRequest,
} from "@/lib/schemas/installers";

const EARTH_RADIUS_KM = 6371;

// Haversine distance between two lat/lng points, in kilometres.
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// Convert km → degrees (rough approximation; fine for bounding boxes).
// 1° lat ≈ 111km globally; 1° lng ≈ 111km × cos(lat) at the latitude.
function kmToLatDelta(km: number): number {
  return km / 111;
}
function kmToLngDelta(km: number, atLat: number): number {
  return km / (111 * Math.cos((atLat * Math.PI) / 180));
}

export interface NearbyResult {
  installers: InstallerCard[];
  totalCount: number;
}

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

function rowToCard(row: InstallerRow, distanceKm: number | null): InstallerCard {
  const addrParts = [
    row.address_line_1,
    row.address_line_2,
    row.address_line_3,
    row.county,
  ].filter((s): s is string => s != null && s.trim().length > 0);
  const addressSummary = addrParts.length > 0 ? addrParts.join(", ") : null;

  const capHeatPump =
    row.cap_air_source_heat_pump ||
    row.cap_ground_source_heat_pump ||
    row.cap_water_source_heat_pump ||
    row.cap_exhaust_air_heat_pump ||
    row.cap_solar_assisted_heat_pump ||
    row.cap_gas_absorption_heat_pump;

  return {
    id: row.id,
    companyName: row.company_name,
    certificationBody: row.certification_body,
    certificationNumber: row.certification_number,
    email: row.email,
    telephone: row.telephone,
    website: row.website,
    postcode: row.postcode,
    county: row.county,
    addressSummary,
    busRegistered: row.bus_registered,
    capHeatPump,
    capSolarPv: row.cap_solar_pv,
    capBatteryStorage: row.cap_battery_storage,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    reviewsScore: Number(row.reviews_score) || 0,
    reviewsCount: row.reviews_count,
  };
}

export async function findNearby(
  req: NearbyInstallersRequest,
): Promise<NearbyResult> {
  const admin = createAdminClient();

  // Capability filter: build the SQL WHERE conditions. At least one of
  // wantsHeatPump / wantsSolar / wantsBattery must be true (the API
  // route validates this).
  //
  // If the user wants a heat pump we also enforce bus_registered = true,
  // because the BUS grant only pays out via BUS-registered installers.

  // Bounding box first — cheap geometric prefilter.
  const latDelta = kmToLatDelta(req.maxDistanceKm);
  const lngDelta = kmToLngDelta(req.maxDistanceKm, req.latitude);
  const minLat = req.latitude - latDelta;
  const maxLat = req.latitude + latDelta;
  const minLng = req.longitude - lngDelta;
  const maxLng = req.longitude + lngDelta;

  let query = admin
    .from("installers")
    .select("*", { count: "exact" })
    .gte("latitude", minLat)
    .lte("latitude", maxLat)
    .gte("longitude", minLng)
    .lte("longitude", maxLng);

  // Capability filters — all must match (AND).
  if (req.wantsHeatPump) {
    // ASHP is the dominant flavour in the UK; we accept any HP type
    // since the form is "I want a heat pump" not "I want ASHP specifically".
    query = query
      .or(
        [
          "cap_air_source_heat_pump.eq.true",
          "cap_ground_source_heat_pump.eq.true",
          "cap_water_source_heat_pump.eq.true",
          "cap_exhaust_air_heat_pump.eq.true",
        ].join(","),
      )
      .eq("bus_registered", true);
  }
  if (req.wantsSolar) {
    query = query.eq("cap_solar_pv", true);
  }
  if (req.wantsBattery) {
    query = query.eq("cap_battery_storage", true);
  }

  // Pull a generous page so we have enough to sort + paginate post-Haversine.
  // 500 is enough that we never run out for any UK postcode at 80km.
  const { data, error } = await query.limit(500);

  if (error) {
    throw new Error(`installers query failed: ${error.message}`);
  }

  const rowsWithDistance = (data ?? [])
    .map((r) => {
      if (r.latitude == null || r.longitude == null) return null;
      const d = haversineKm(
        req.latitude,
        req.longitude,
        Number(r.latitude),
        Number(r.longitude),
      );
      if (d > req.maxDistanceKm) return null;
      return { row: r, distanceKm: d };
    })
    .filter((x): x is { row: InstallerRow; distanceKm: number } => x != null)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const totalCount = rowsWithDistance.length;
  const start = (req.page - 1) * req.pageSize;
  const end = start + req.pageSize;
  const page = rowsWithDistance.slice(start, end);

  return {
    installers: page.map(({ row, distanceKm }) => rowToCard(row, distanceKm)),
    totalCount,
  };
}
