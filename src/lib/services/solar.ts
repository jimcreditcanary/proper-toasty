import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import {
  BuildingInsightsSchema,
  type BuildingInsights,
  type BuildingInsightsResponse,
} from "@/lib/schemas/solar";

const SOLAR_BASE = "https://solar.googleapis.com/v1";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const QUALITY_FALLBACK = ["HIGH", "MEDIUM", "LOW"] as const;
type Quality = (typeof QUALITY_FALLBACK)[number];

function requireKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_SERVER_KEY not set");
  return key;
}

function round5(n: number): string {
  return n.toFixed(5);
}

function cacheKey(lat: number, lng: number): string {
  return `${round5(lat)}:${round5(lng)}`;
}

async function fetchBuildingInsights(
  lat: number,
  lng: number,
  quality: Quality
): Promise<BuildingInsights | null> {
  // Note: Google's buildingInsights:findClosest accepts only
  // location.latitude, location.longitude, requiredQuality, and
  // exactQualityRequired. Earlier code sent panelCapacityWatts=400 which the
  // API now rejects with a 400 ("Unknown name"). We still size the array at
  // 400 W panels downstream — we just divide Google's maxArrayPanelsCount
  // × 0.4 kWp ourselves when feeding PVGIS.
  const url = new URL(`${SOLAR_BASE}/buildingInsights:findClosest`);
  url.searchParams.set("location.latitude", String(lat));
  url.searchParams.set("location.longitude", String(lng));
  url.searchParams.set("requiredQuality", quality);
  url.searchParams.set("key", requireKey());

  const res = await fetch(url.toString());
  if (res.status === 404) return null; // no coverage at this quality
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Solar API ${quality} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const parsed = BuildingInsightsSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Solar API returned unexpected shape");
  return parsed.data;
}

export async function getBuildingInsights(
  lat: number,
  lng: number
): Promise<BuildingInsightsResponse> {
  const key = cacheKey(lat, lng);

  const cached = await cacheGet<BuildingInsightsResponse>("solar:building", key);
  if (cached) return cached;

  for (const quality of QUALITY_FALLBACK) {
    try {
      const data = await fetchBuildingInsights(lat, lng, quality);
      if (data) {
        const out: BuildingInsightsResponse = { coverage: true, quality, data };
        await cacheSet("solar:building", key, out, TTL_SECONDS);
        return out;
      }
    } catch (err) {
      // Coverage might exist at a lower quality — keep trying. If this was a
      // non-404 error (auth, rate limit), the loop will surface it only if no
      // quality works; otherwise we prefer a graceful low-quality hit.
      if (quality === "LOW") throw err;
    }
  }

  const out: BuildingInsightsResponse = {
    coverage: false,
    reason: "No rooftop data at this address (Solar API coverage missing).",
  };
  // Shorter TTL on misses — Google extends coverage over time, so don't pin
  // a miss for too long.
  await cacheSet("solar:building", key, out, 7 * 24 * 60 * 60);
  return out;
}
