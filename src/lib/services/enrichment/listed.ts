import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import { ListedResponseSchema, type ListedResponse } from "@/lib/schemas/enrichments";

const LISTED_URL =
  "https://services-eu1.arcgis.com/ZOdPfBS3aqqDYPUQ/arcgis/rest/services/Listed_Buildings/FeatureServer/0/query";

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — listing status rarely changes

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)}:${lng.toFixed(5)}`;
}

// Rough metres-per-degree at UK latitudes. Good enough for a ±50 m envelope.
const METRES_PER_DEG_LAT = 111_320;
function metresPerDegLng(lat: number): number {
  return METRES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function haversineMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function getListedBuildings(
  lat: number,
  lng: number,
  radiusMetres = 50
): Promise<ListedResponse> {
  const key = cacheKey(lat, lng);
  const cached = await cacheGet<ListedResponse>("enrich:listed", key);
  if (cached) return cached;

  const dLat = radiusMetres / METRES_PER_DEG_LAT;
  const dLng = radiusMetres / metresPerDegLng(lat);
  const xmin = lng - dLng;
  const ymin = lat - dLat;
  const xmax = lng + dLng;
  const ymax = lat + dLat;

  const url = new URL(LISTED_URL);
  url.searchParams.set("geometry", `${xmin},${ymin},${xmax},${ymax}`);
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "ListEntry,Name,Grade");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("f", "json");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Listed Buildings API failed: ${res.status}`);

  const raw = (await res.json()) as {
    features?: Array<{
      attributes?: { ListEntry?: string | number; Name?: string; Grade?: string };
      geometry?: { x?: number; y?: number };
    }>;
  };

  const matches = (raw.features ?? []).map((f) => {
    const x = f.geometry?.x;
    const y = f.geometry?.y;
    const d =
      typeof x === "number" && typeof y === "number"
        ? haversineMetres({ lat, lng }, { lat: y, lng: x })
        : null;
    return {
      listEntryNumber:
        f.attributes?.ListEntry != null ? String(f.attributes.ListEntry) : null,
      name: f.attributes?.Name ?? null,
      grade: f.attributes?.Grade ?? null,
      distanceMeters: d == null ? null : Math.round(d),
    };
  });

  const parsed = ListedResponseSchema.safeParse({ matches });
  if (!parsed.success) throw new Error("Listed Buildings API returned unexpected shape");

  await cacheSet("enrich:listed", key, parsed.data, TTL_SECONDS);
  return parsed.data;
}
