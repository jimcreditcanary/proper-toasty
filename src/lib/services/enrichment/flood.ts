import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import { FloodResponseSchema, type FloodResponse } from "@/lib/schemas/enrichments";

const BASE = "https://environment.data.gov.uk/flood-monitoring";
const TTL_SECONDS = 24 * 60 * 60; // 1 day — warnings change fast

const SEVERITY_LABELS: Record<number, string> = {
  1: "Severe flood warning",
  2: "Flood warning",
  3: "Flood alert",
  4: "Warning no longer in force",
};

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)}:${lng.toFixed(4)}`;
}

export async function getFloodWarnings(lat: number, lng: number): Promise<FloodResponse> {
  const key = cacheKey(lat, lng);
  const cached = await cacheGet<FloodResponse>("enrich:flood", key);
  if (cached) return cached;

  const url = new URL(`${BASE}/id/floods`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("long", String(lng));
  url.searchParams.set("dist", "5"); // 5 km

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Flood API failed: ${res.status}`);

  const raw = (await res.json()) as {
    items?: Array<{
      severityLevel?: number;
      severity?: string;
      description?: string;
      floodArea?: { county?: string; riverOrSea?: string; polygon?: string };
      floodAreaID?: string;
      timeRaised?: string;
    }>;
  };

  const warnings = (raw.items ?? []).map((w) => ({
    severityLevel: w.severityLevel ?? 4,
    severity: w.severity ?? SEVERITY_LABELS[w.severityLevel ?? 4] ?? "Unknown",
    description: w.description ?? "",
    areaName: w.floodArea?.riverOrSea ?? w.floodArea?.county ?? null,
    timeRaised: w.timeRaised ?? null,
  }));

  const parsed = FloodResponseSchema.safeParse({ activeWarnings: warnings });
  if (!parsed.success) throw new Error("Flood API returned unexpected shape");

  await cacheSet("enrich:flood", key, parsed.data, TTL_SECONDS);
  return parsed.data;
}
