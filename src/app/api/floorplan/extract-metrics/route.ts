// POST /api/floorplan/extract-metrics
//
// Reads structured data off the labels printed on a floorplan image:
// per-room dimensions, total area (m² + sq ft), floor count.
//
// Fires automatically when the wizard's Step 4 floorplan upload
// succeeds. Failure modes are silent on the wizard — we still let
// the user proceed even if Claude couldn't parse anything; the
// report just won't have the labelled-rooms section populated.
//
// No auth gate: this endpoint is reachable from anonymous wizard
// sessions. The objectKey is enough — only floorplans we issued
// a signed URL for can be read.

import { NextResponse } from "next/server";
import { z } from "zod";
import { extractFloorplanMetrics } from "@/lib/services/floorplan-metrics";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  objectKey: z.string().min(1).max(500),
});

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

  const result = await extractFloorplanMetrics(parsed.data.objectKey);

  if (!result.ok || !result.metrics) {
    // Non-fatal — return 200 with ok=false so the wizard knows
    // extraction failed without crashing the upload flow.
    return NextResponse.json({
      ok: false,
      error: result.error ?? "Extraction failed",
      metrics: null,
    });
  }

  return NextResponse.json({
    ok: true,
    metrics: result.metrics,
  });
}
