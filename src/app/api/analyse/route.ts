import { NextResponse } from "next/server";
import { getBuildingInsights } from "@/lib/services/solar";
import { getEpc } from "@/lib/services/epc";
import { getPvgisYield } from "@/lib/services/pvgis";
import { analyseFloorplan } from "@/lib/services/claude-floorplan";
import { getFloodWarnings } from "@/lib/services/enrichment/flood";
import { getListedBuildings } from "@/lib/services/enrichment/listed";
import { getPlanningFlags } from "@/lib/services/enrichment/planning";
import { buildEligibility } from "@/lib/services/eligibility";
import { AnalyseRequestSchema, type AnalyseResponse } from "@/lib/schemas/analyse";
import type { BuildingInsightsResponse, RoofSegment } from "@/lib/schemas/solar";
import type { EpcByAddressResponse } from "@/lib/schemas/epc";

export const runtime = "nodejs";
export const maxDuration = 60;

function pickBestRoofSegment(segments: RoofSegment[]): RoofSegment | null {
  if (!segments.length) return null;
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
  const request = parsed.data;
  const { address, floorplanObjectKey, precomputedFloorplan } = request;

  // Fan out solar, EPC, and the three enrichments immediately — none depend on
  // each other, and the enrichments are free public APIs.
  const [solar, epc, flood, listed, planning] = await Promise.all([
    getBuildingInsights(address.latitude, address.longitude).catch((err) => {
      console.warn("Solar failed during analyse:", err);
      return { coverage: false as const, reason: "Solar lookup failed." } satisfies BuildingInsightsResponse;
    }),
    address.uprn || (address.postcode && address.line1)
      ? getEpc({
          uprn: address.uprn,
          postcode: address.postcode ?? undefined,
          addressLine1: address.line1,
        }).catch((err) => {
          console.warn("EPC failed during analyse:", err);
          return { found: false, reason: "EPC lookup failed." } as EpcByAddressResponse;
        })
      : Promise.resolve<EpcByAddressResponse>({ found: false, reason: "No identifier for EPC lookup." }),
    getFloodWarnings(address.latitude, address.longitude).catch((err) => {
      console.warn("Flood enrichment failed:", err);
      return null;
    }),
    getListedBuildings(address.latitude, address.longitude).catch((err) => {
      console.warn("Listed enrichment failed:", err);
      return null;
    }),
    getPlanningFlags(address.latitude, address.longitude).catch((err) => {
      console.warn("Planning enrichment failed:", err);
      return null;
    }),
  ]);

  // Claude needs EPC context; PVGIS needs Solar's best segment. Run in parallel.
  const epcFloorAreaM2 = epc.found ? epc.certificate.totalFloorAreaM2 : null;
  const epcPropertyType = epc.found ? epc.certificate.propertyType : null;
  const epcAgeBand = epc.found ? epc.certificate.constructionAgeBand : null;

  // If Step 4 already ran the floorplan analysis (via /api/floorplan/analyse)
  // and the user reviewed the diagram, use that. Otherwise call Claude here
  // — preserves the old "upload + skip editor" flow during dev.
  const floorplanPromise: Promise<AnalyseResponse["floorplan"]> = precomputedFloorplan
    ? Promise.resolve({
        analysis: precomputedFloorplan.analysis,
        degraded: precomputedFloorplan.degraded,
        reason: precomputedFloorplan.reason,
      })
    : analyseFloorplan({
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
  let pvgisPeakKwp: number | null = null;
  if (solar.coverage) {
    const segments = solar.data.solarPotential.roofSegmentStats ?? [];
    const best = pickBestRoofSegment(segments);
    const configs = solar.data.solarPotential.solarPanelConfigs ?? [];
    const maxConfig = configs.length ? configs[configs.length - 1] : null;
    if (best && maxConfig && typeof best.pitchDegrees === "number" && typeof best.azimuthDegrees === "number") {
      const peakPowerKwp = (maxConfig.panelsCount * 400) / 1000;
      pvgisPeakKwp = peakPowerKwp;
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

  const { eligibility, finance } = buildEligibility({
    request,
    solar,
    epc,
    pvgisAnnualKwh: pvgis?.annualKwh ?? null,
    pvgisPeakKwp,
  });

  const out: AnalyseResponse = {
    solar,
    epc,
    pvgis,
    floorplan,
    enrichments: { flood, listed, planning },
    eligibility,
    finance,
  };
  return NextResponse.json(out);
}
