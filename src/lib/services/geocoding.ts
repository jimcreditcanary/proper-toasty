import { z } from "zod";
import { cacheGet, cacheSet } from "@/lib/services/api-cache";

/**
 * Google Geocoding API wrapper.
 *
 * Postcoder returns per-postcode addresses but not always per-property
 * latitude/longitude (depends on the plan's addtags). To make sure the
 * satellite tile and the Solar API buildingInsights call are centred on the
 * exact property the user picked, we geocode the selected address separately
 * via Google.
 *
 * Cached for 90 days by (line1 + postcode) — buildings don't move.
 *
 * Reference:
 * https://developers.google.com/maps/documentation/geocoding/requests-geocoding
 */

const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
const TTL_SECONDS = 90 * 24 * 60 * 60;

function requireKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_SERVER_KEY not set");
  return key;
}

const GeocodeResponseSchema = z
  .object({
    status: z.string(),
    error_message: z.string().optional(),
    results: z
      .array(
        z
          .object({
            formatted_address: z.string().optional(),
            geometry: z
              .object({
                location: z.object({
                  lat: z.number(),
                  lng: z.number(),
                }),
                location_type: z.string().optional(),
              })
              .passthrough(),
            place_id: z.string().optional(),
            types: z.array(z.string()).optional(),
          })
          .passthrough()
      )
      .default([]),
  })
  .passthrough();

export interface GeocodedAddress {
  latitude: number;
  longitude: number;
  formattedAddress: string | null;
  precision:
    | "ROOFTOP"
    | "RANGE_INTERPOLATED"
    | "GEOMETRIC_CENTER"
    | "APPROXIMATE"
    | "UNKNOWN";
  placeId: string | null;
}

function cacheKey(line1: string, postcode: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  return `${norm(line1)}|${norm(postcode)}`;
}

export async function geocodeAddress(
  line1: string,
  postcode: string
): Promise<GeocodedAddress | null> {
  const key = cacheKey(line1, postcode);
  const cached = await cacheGet<GeocodedAddress>("geocode", key);
  if (cached) return cached;

  const url = new URL(GEOCODE_BASE);
  url.searchParams.set("address", `${line1}, ${postcode}, UK`);
  url.searchParams.set("region", "gb");
  url.searchParams.set("components", `country:GB|postal_code:${postcode}`);
  url.searchParams.set("key", requireKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Geocoding failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const parsed = GeocodeResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Geocoding returned unexpected shape");

  const { status, error_message, results } = parsed.data;
  if (status === "ZERO_RESULTS" || results.length === 0) return null;
  if (status !== "OK") {
    throw new Error(`Geocoding status ${status}: ${error_message ?? "unknown"}`);
  }

  const best = results[0];
  const locType = best.geometry.location_type ?? "UNKNOWN";
  const out: GeocodedAddress = {
    latitude: best.geometry.location.lat,
    longitude: best.geometry.location.lng,
    formattedAddress: best.formatted_address ?? null,
    precision: locType as GeocodedAddress["precision"],
    placeId: best.place_id ?? null,
  };

  await cacheSet("geocode", key, out, TTL_SECONDS);
  return out;
}
