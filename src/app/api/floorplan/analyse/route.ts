import { NextResponse } from "next/server";
import { z } from "zod";
import { analyseFloorplan } from "@/lib/services/claude-floorplan";
import { detectOutdoorSpace } from "@/lib/services/satellite-outdoor";
import { FloorplanAnalysisSchema, type FloorplanAnalysis } from "@/lib/schemas/floorplan";

// POST /api/floorplan/analyse
//
// Triggered from Step 4 immediately after the floorplan upload completes.
// Fans out two Claude calls in parallel:
//   1. floorplan vision pass — extracts room geometry, areas, HP candidates
//   2. satellite imagery pass — verdicts on whether outdoor space is visible
//
// Returns the merged analysis (satellite verdict folded into outdoorSpace).
// On total failure returns { degraded: true, reason } so the editor can
// fall back to a plain "tell us about your radiators" form.

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  objectKey: z.string().min(1),
  // EPC context — same as the existing /api/analyse pipeline.
  epcContext: z
    .object({
      epcFloorAreaM2: z.number().nullable(),
      epcPropertyType: z.string().nullable(),
      epcAgeBand: z.string().nullable(),
    })
    .nullable(),
  // For the satellite check.
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export interface FloorplanAnalyseResponse {
  analysis: FloorplanAnalysis | null;
  degraded: boolean;
  reason?: string;
  satellite: {
    verdict: "yes" | "no" | "unsure" | null;
    notes: string | null;
    degraded: boolean;
  };
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { objectKey, epcContext, lat, lng } = parsed.data;

  // Fan out — neither call depends on the other.
  const [floorplanResult, satelliteResult] = await Promise.all([
    analyseFloorplan({
      objectKey,
      context: {
        epcFloorAreaM2: epcContext?.epcFloorAreaM2 ?? null,
        epcPropertyType: epcContext?.epcPropertyType ?? null,
        epcAgeBand: epcContext?.epcAgeBand ?? null,
      },
    }),
    lat != null && lng != null
      ? detectOutdoorSpace(lat, lng)
      : Promise.resolve({
          verdict: null,
          degraded: true as const,
          reason: "No coordinates available for satellite check",
        }),
  ]);

  // Floorplan call failed — return degraded so the UI can fall back.
  if (!floorplanResult.analysis) {
    const response: FloorplanAnalyseResponse = {
      analysis: null,
      degraded: true,
      reason: floorplanResult.reason ?? "Floorplan analysis failed",
      satellite: {
        verdict: satelliteResult.verdict?.verdict ?? null,
        notes: satelliteResult.verdict?.notes ?? null,
        degraded: satelliteResult.degraded,
      },
    };
    return NextResponse.json(response);
  }

  // Merge satellite verdict into outdoorSpace.
  const merged: FloorplanAnalysis = {
    ...floorplanResult.analysis,
    outdoorSpace: {
      ...floorplanResult.analysis.outdoorSpace,
      satelliteVerdict: satelliteResult.verdict?.verdict ?? null,
      satelliteNotes: satelliteResult.verdict?.notes ?? null,
    },
  };

  // Re-validate to catch any merge-time inconsistency early.
  const validated = FloorplanAnalysisSchema.safeParse(merged);
  if (!validated.success) {
    const fail: FloorplanAnalyseResponse = {
      analysis: null,
      degraded: true,
      reason: "Merged analysis failed schema validation",
      satellite: {
        verdict: satelliteResult.verdict?.verdict ?? null,
        notes: satelliteResult.verdict?.notes ?? null,
        degraded: satelliteResult.degraded,
      },
    };
    return NextResponse.json(fail);
  }

  const response: FloorplanAnalyseResponse = {
    analysis: validated.data,
    degraded: false,
    satellite: {
      verdict: satelliteResult.verdict?.verdict ?? null,
      notes: satelliteResult.verdict?.notes ?? null,
      degraded: satelliteResult.degraded,
    },
  };

  return NextResponse.json(response);
}
