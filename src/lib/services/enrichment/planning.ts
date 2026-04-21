import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import { PlanningResponseSchema, type PlanningResponse } from "@/lib/schemas/enrichments";

const BASE = "https://www.planning.data.gov.uk/entity.json";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

type Dataset = "conservation-area" | "area-of-outstanding-natural-beauty" | "national-park";

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)}:${lng.toFixed(5)}`;
}

async function queryDataset(
  lat: number,
  lng: number,
  dataset: Dataset
): Promise<Array<{ dataset: string; name: string | null; entity: number | null }>> {
  const url = new URL(BASE);
  url.searchParams.set("dataset", dataset);
  url.searchParams.set("geometry_relation", "intersects");
  url.searchParams.set("geometry", `POINT(${lng} ${lat})`);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`planning.data.gov.uk (${dataset}) failed: ${res.status}`);

  const raw = (await res.json()) as {
    entities?: Array<{
      name?: string;
      dataset?: string;
      entity?: number;
    }>;
  };

  return (raw.entities ?? []).map((e) => ({
    dataset: e.dataset ?? dataset,
    name: e.name ?? null,
    entity: e.entity ?? null,
  }));
}

export async function getPlanningFlags(lat: number, lng: number): Promise<PlanningResponse> {
  const key = cacheKey(lat, lng);
  const cached = await cacheGet<PlanningResponse>("enrich:planning", key);
  if (cached) return cached;

  const [conservationAreas, aonb, nationalParks] = await Promise.all([
    queryDataset(lat, lng, "conservation-area"),
    queryDataset(lat, lng, "area-of-outstanding-natural-beauty"),
    queryDataset(lat, lng, "national-park"),
  ]);

  const parsed = PlanningResponseSchema.safeParse({
    conservationAreas,
    aonb,
    nationalParks,
  });
  if (!parsed.success) throw new Error("planning.data.gov.uk returned unexpected shape");

  await cacheSet("enrich:planning", key, parsed.data, TTL_SECONDS);
  return parsed.data;
}
