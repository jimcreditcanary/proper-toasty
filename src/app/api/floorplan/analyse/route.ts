import { NextResponse } from "next/server";
import { z } from "zod";
import { detectOutdoorSpace } from "@/lib/services/satellite-outdoor";

// POST /api/floorplan/analyse
//
// v3: this now ONLY runs the satellite outdoor-space check. The old Claude
// floorplan-vision extraction pass was removed — we moved to a user-drawn
// annotation model (see FloorplanEditor) and suggest HP/cylinder placements
// separately via /api/floorplan/suggest-placements.
//
// Fires on Step 4 upload completion so we get the satellite verdict before
// the user starts drawing.

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export interface FloorplanAnalyseResponse {
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
  const { lat, lng } = parsed.data;

  const satelliteResult =
    lat != null && lng != null
      ? await detectOutdoorSpace(lat, lng)
      : {
          verdict: null,
          degraded: true as const,
          reason: "No coordinates available for satellite check",
        };

  const response: FloorplanAnalyseResponse = {
    satellite: {
      verdict: satelliteResult.verdict?.verdict ?? null,
      notes: satelliteResult.verdict?.notes ?? null,
      degraded: satelliteResult.degraded,
    },
  };

  return NextResponse.json(response);
}
