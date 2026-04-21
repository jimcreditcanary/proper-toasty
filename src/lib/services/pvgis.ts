import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import {
  PvgisPvcalcSchema,
  type PvgisResult,
} from "@/lib/schemas/pvgis";

const PVGIS_BASE = "https://re.jrc.ec.europa.eu/api/v5_3";
const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days — climate inputs are long-term averages

/**
 * Convert a Google Solar API azimuth (compass bearing from North, clockwise,
 * 0°=N, 90°=E, 180°=S, 270°=W) to a PVGIS aspect value (0=S, -90=E, +90=W).
 *
 * google 0 (N)   → -180 (== 180 in PVGIS)
 * google 90 (E)  → -90
 * google 180 (S) → 0
 * google 270 (W) → 90
 */
export function googleAzimuthToPvgisAspect(azimuthDegrees: number): number {
  let a = ((azimuthDegrees - 180) % 360 + 540) % 360 - 180;
  // normalise to [-180, 180]
  if (a <= -180) a += 360;
  return Math.round(a * 10) / 10;
}

interface PvgisInput {
  lat: number;
  lng: number;
  peakPowerKwp: number;
  anglePitchDegrees: number;
  googleAzimuthDegrees: number;
  lossPct?: number;
}

function cacheKey(i: PvgisInput): string {
  const round = (n: number, d: number) => n.toFixed(d);
  return [
    round(i.lat, 5),
    round(i.lng, 5),
    round(i.peakPowerKwp, 2),
    round(i.anglePitchDegrees, 1),
    round(googleAzimuthToPvgisAspect(i.googleAzimuthDegrees), 1),
    round(i.lossPct ?? 14, 1),
  ].join(":");
}

export async function getPvgisYield(input: PvgisInput): Promise<PvgisResult> {
  const lossPct = input.lossPct ?? 14;
  const aspect = googleAzimuthToPvgisAspect(input.googleAzimuthDegrees);
  const key = cacheKey(input);

  const cached = await cacheGet<PvgisResult>("pvgis:pvcalc", key);
  if (cached) return cached;

  const url = new URL(`${PVGIS_BASE}/PVcalc`);
  url.searchParams.set("lat", String(input.lat));
  url.searchParams.set("lon", String(input.lng));
  url.searchParams.set("peakpower", String(input.peakPowerKwp));
  url.searchParams.set("loss", String(lossPct));
  url.searchParams.set("angle", String(input.anglePitchDegrees));
  url.searchParams.set("aspect", String(aspect));
  url.searchParams.set("mountingplace", "building");
  url.searchParams.set("outputformat", "json");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PVGIS failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const parsed = PvgisPvcalcSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("PVGIS returned unexpected shape");

  const monthly = parsed.data.outputs.monthly?.fixed ?? [];
  const monthlyKwh = Array.from({ length: 12 }, (_, i) => {
    const match = monthly.find((m) => m.month === i + 1);
    return match?.E_m ?? 0;
  });

  const out: PvgisResult = {
    annualKwh: parsed.data.outputs.totals.fixed.E_y,
    monthlyKwh,
    inputs: {
      peakPowerKwp: input.peakPowerKwp,
      anglePitchDegrees: input.anglePitchDegrees,
      aspectPvgis: aspect,
      googleAzimuthDegrees: input.googleAzimuthDegrees,
      systemLossPct: lossPct,
    },
  };

  await cacheSet("pvgis:pvcalc", key, out, TTL_SECONDS);
  return out;
}
