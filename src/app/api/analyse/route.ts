import { NextResponse } from "next/server";
import { getBuildingInsights } from "@/lib/services/solar";
import { getEpcByAddress } from "@/lib/services/epc";
import { getPvgisYield } from "@/lib/services/pvgis";
import { analyseFloorplan } from "@/lib/services/claude-floorplan";
import { AnalyseRequestSchema, type AnalyseResponse } from "@/lib/schemas/analyse";
import type { BuildingInsightsResponse, RoofSegment } from "@/lib/schemas/solar";
import type { EpcByAddressResponse } from "@/lib/schemas/epc";

export const runtime = "nodejs";
export const maxDuration = 60;

function pickBestRoofSegment(segments: RoofSegment[]): RoofSegment | null {
  if (!segments.length) return null;
  // Prefer largest area; tie-break by pitch nearest to 35° (optimal-ish in UK).
  const scored = segments
    .map((s) => ({
      s,
      area: s.stats?.areaMeters2 ?? 0,
      pitchDelta: Math.abs((s.pitchDegrees ?? 35) - 35),
    }))
    .sort((a, b) => {
      if (b.area !== a.area) return b.area - a.area;
      return a.pitchDelta - b.pitchDelta;
    });
  return scored[0]?.s ?? null;
}

function parseFloorAreaM2(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AnalyseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { address, floorplanObjectKey } = parsed.data;

  // Kick off the two lookups that don't depend on each other immediately.
  const solarPromise: Promise<BuildingInsightsResponse> = getBuildingInsights(
    address.latitude,
    address.longitude
  );
  const epcPromise: Promise<EpcByAddressResponse> = address.postcode
    ? getEpcByAddress(address.postcode, address.line1).catch((err) => {
        console.warn("EPC failed during analyse:", err);
        return { found: false, reason: "EPC lookup failed." } as EpcByAddressResponse;
      })
    : Promise.resolve<EpcByAddressResponse>({ found: false, reason: "No postcode." });

  // Settle both so we can feed EPC context into Claude.
  const [solar, epc] = await Promise.all([
    solarPromise.catch((err) => {
      console.warn("Solar failed during analyse:", err);
      return {
        coverage: false as const,
        reason: "Solar lookup failed.",
      } satisfies BuildingInsightsResponse;
    }),
    epcPromise,
  ]);

  const epcFloorAreaM2 =
    epc.found ? parseFloorAreaM2(epc.certificate["total-floor-area"]) : null;
  const epcPropertyType = epc.found ? epc.certificate["property-type"] || null : null;
  const epcAgeBand = epc.found ? epc.certificate["construction-age-band"] || null : null;

  // Now fan out Claude + PVGIS in parallel. Neither depends on the other.
  const floorplanPromise = analyseFloorplan({
    objectKey: floorplanObjectKey,
    context: { epcFloorAreaM2, epcPropertyType, epcAgeBand },
  }).catch((err) => {
    console.warn("Claude floorplan failed:", err);
    return {
      analysis: null,
      degraded: true,
      reason: err instanceof Error ? err.message : "Floorplan analysis failed",
    };
  });

  let pvgisPromise: Promise<AnalyseResponse["pvgis"]> = Promise.resolve(null);
  if (solar.coverage) {
    const segments = solar.data.solarPotential.roofSegmentStats ?? [];
    const best = pickBestRoofSegment(segments);
    const configs = solar.data.solarPotential.solarPanelConfigs ?? [];
    // Use the largest config (max panels that fit) for a v1 sizing estimate.
    const maxConfig = configs.length ? configs[configs.length - 1] : null;
    if (best && maxConfig && typeof best.pitchDegrees === "number" && typeof best.azimuthDegrees === "number") {
      const peakPowerKwp = (maxConfig.panelsCount * 400) / 1000;
      pvgisPromise = getPvgisYield({
        lat: address.latitude,
        lng: address.longitude,
        peakPowerKwp,
        anglePitchDegrees: best.pitchDegrees,
        googleAzimuthDegrees: best.azimuthDegrees,
      }).catch((err) => {
        console.warn("PVGIS failed during analyse:", err);
        return null;
      });
    }
  }

  const [floorplan, pvgis] = await Promise.all([floorplanPromise, pvgisPromise]);

  const out: AnalyseResponse = { solar, epc, pvgis, floorplan };
  return NextResponse.json(out);
}
