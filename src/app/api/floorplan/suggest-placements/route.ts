import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DoorSchema,
  OutdoorZoneSchema,
  RadiatorSchema,
  UserStairsSchema,
  WallPathSchema,
} from "@/lib/schemas/floorplan";
import {
  suggestPlacements,
  type SuggestPlacementsResult,
} from "@/lib/services/claude-placements";

// POST /api/floorplan/suggest-placements
//
// Fires when the user presses "Find heat pump & cylinder" in the Step 4
// editor. Takes the uploaded floorplan + the user's annotations + the
// satellite verdict and asks Claude to drop 1-2 HP pins and 1 cylinder pin.

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  objectKey: z.string().min(1),
  satelliteVerdict: z.enum(["yes", "no", "unsure"]).nullable(),
  satelliteNotes: z.string().nullable(),
  annotations: z.object({
    walls: z.array(WallPathSchema),
    doors: z.array(DoorSchema),
    outdoorZones: z.array(OutdoorZoneSchema),
    userStairs: z.array(UserStairsSchema),
    radiators: z.array(RadiatorSchema),
  }),
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

  const result: SuggestPlacementsResult = await suggestPlacements(parsed.data);
  return NextResponse.json(result);
}
