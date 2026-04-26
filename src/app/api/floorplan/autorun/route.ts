import { NextResponse } from "next/server";
import { z } from "zod";
import {
  autorunPlacements,
  type SuggestPlacementsResult,
} from "@/lib/services/claude-placements";

// POST /api/floorplan/autorun
//
// Fires when the user clicks "Let AI do it for me" on the Step 4 welcome
// screen instead of drawing the annotations themselves. Asks Claude to
// detect the geometry from the image AND place the heat pump + cylinder
// in a single pass — same response shape as /suggest-placements so the
// editor can apply it via the existing applyAiPlacements util.
//
// The result is gated behind a "your installer will verify on site"
// banner in the editor (FloorplanAnalysis.aiAutorun=true), so the user
// understands the geometry is AI-inferred rather than hand-drawn.

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  objectKey: z.string().min(1),
  satelliteVerdict: z.enum(["yes", "no", "unsure"]).nullable(),
  satelliteNotes: z.string().nullable(),
  totalFloorAreaM2: z.number().positive().nullable().optional(),
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

  const result: SuggestPlacementsResult = await autorunPlacements(parsed.data);
  return NextResponse.json(result);
}
