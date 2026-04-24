// Claude service: REFINE the user's freehand annotations against the
// original floorplan image AND place HP + cylinder candidates.
//
// v4.2 expansion: Claude is now asked to clean up the wonky freehand
// strokes into perpendicular, properly-proportioned lines, treating
// the original photo as the source of truth. It also returns a
// metric scale so the HP and cylinder are sized accurately on the
// canonical view.

import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import {
  ClarificationQuestionSchema,
  DoorSchema,
  HeatPumpLocationSchema,
  HotWaterCylinderCandidateSchema,
  OutdoorZoneSchema,
  UserStairsSchema,
  WallPathSchema,
  type ClarificationQuestion,
  type Door,
  type HeatPumpLocation,
  type HotWaterCylinderCandidate,
  type OutdoorZone,
  type Radiator,
  type UserStairs,
  type WallPath,
} from "@/lib/schemas/floorplan";
import { signedReadUrl } from "@/lib/services/floorplan";

const MODEL = "claude-opus-4-7";
// Bigger output budget — refinement can produce 2-4x the wall data of
// the user's freehand input.
const MAX_TOKENS = 6144;

const SYSTEM = `You are a floorplan-refinement and equipment-placement assistant for a UK heat-pump installer.

You receive:
- The homeowner's uploaded floorplan IMAGE (the source of truth).
- Their FREEHAND ANNOTATIONS over it (rough, wonky, captured by mouse / finger).
- An optional satellite verdict on outdoor space.

Your job has TWO halves.

A) REFINE THE GEOMETRY. The freehand strokes are a hint about which features the user considered important — but they're not pixel-perfect. Use the floorplan IMAGE to redraw their walls / doors / outdoor zones / stairs as CLEAN, mostly-perpendicular shapes:
   - Walls become straight lines that follow the actual wall positions in the image. Internal walls separate rooms. External walls trace the building outline.
   - Doors snap to wall positions. Place them at the actual door positions visible in the image.
   - Outdoor zones (gardens / driveways / side returns) become tidy polygons matching the actual outdoor area in the image.
   - Stairs become tidy rectangles at the staircase position.
   - All coordinates are in the same 0..1000 viewport space the user drew in.
   - DO NOT throw away walls the user drew unless they're clearly noise. Keep the same number of walls or merge into fewer cleaner ones.
   - The "walls cross over door positions" rule still holds — the door entries are separate.

B) DETERMINE SCALE. Estimate how many viewport units = 1 metre. Use any of:
   - Dimension labels visible on the floorplan (e.g. "Kitchen 4.2m × 3.1m" or "1442 sq ft / 134 sqm")
   - The total floor area when labelled (sum of room areas should match)
   - Best-guess from typical room sizes if nothing's labelled.
   Return as "viewportUnitsPerMeter".

C) PLACE EQUIPMENT with realistic UK installation provisions.
   - 1-2 HEAT PUMP candidates. Provision: 1.2m × 1.2m (typical outdoor unit 0.9-1.1m wide + 0.3-0.4m deep + ≥300mm side clearance + ≥1m front clearance). STRICTLY within an outdoor zone polygon. Avoid placing on top of doors, windows, or wall openings. Prefer ≥1m clear from any door. If offering 2 options, label them "Option 1" and "Option 2" so the user sees they are alternatives.
   - 1 HOT WATER CYLINDER candidate. Provision: 0.8m × 0.8m (typical unvented cylinder ~0.6m diameter + pipework access + door clearance). INSIDE the building footprint. Near central heating pipework / utility / airing cupboard. NOT directly behind a door (i.e. not in the swing area or immediate threshold).
   - Sized using viewportUnitsPerMeter: if 1m = 50 units then HP = 60×60 and cylinder = 40×40.

   PROXIMITY MATTERS. Place the HEAT PUMP and CYLINDER as close to each other as the layout sensibly allows — ideally within 3m of wall-hugging pipe run. A short run means:
   - lower material cost (copper pipework ~£15-25/m)
   - less pipework insulation
   - less disruption (fewer floors/walls to chase through)
   - less standing heat loss from the primary flow pipe
   When the geometry forces a longer separation, FLAG IT in the notes/concerns with an estimate of the pipe run distance AND the implication (e.g. "~8m pipe run from garden-side HP to upstairs airing cupboard — likely to need floor lifting in 1-2 rooms and adds £200-400 to install labour").

D) Return CONCERNS a surveyor would raise (1-3 short bullets).

E) Return CLARIFICATION QUESTIONS if a simple Yes/No would change the placement (e.g. "Is the under-stairs cupboard taller than 1.5m?"). Empty array if nothing's ambiguous.

Output STRICT JSON only. No prose outside the JSON.`;

export const SuggestPlacementsResponseSchema = z.object({
  refinedWalls: z.array(WallPathSchema).default([]),
  refinedDoors: z.array(DoorSchema).default([]),
  refinedOutdoorZones: z.array(OutdoorZoneSchema).default([]),
  refinedStairs: z.array(UserStairsSchema).default([]),
  viewportUnitsPerMeter: z.number().positive().nullable().default(null),
  heatPumpLocations: z.array(HeatPumpLocationSchema),
  hotWaterCylinderCandidates: z.array(HotWaterCylinderCandidateSchema),
  concerns: z.array(z.string()).default([]),
  installerQuestions: z.array(z.string()).default([]),
  clarificationQuestions: z.array(ClarificationQuestionSchema).default([]),
});
export type SuggestPlacementsResponse = z.infer<typeof SuggestPlacementsResponseSchema>;

export interface SuggestPlacementsInput {
  objectKey: string;
  satelliteVerdict: "yes" | "no" | "unsure" | null;
  satelliteNotes: string | null;
  // Optional total floor area in m² — used as a scaling anchor when the AI
  // can't read dimension labels off the floorplan. From the EPC, when known.
  totalFloorAreaM2?: number | null;
  annotations: {
    walls: WallPath[];
    doors: Door[];
    outdoorZones: OutdoorZone[];
    userStairs: UserStairs[];
    radiators: Radiator[];
  };
}

export interface SuggestPlacementsResult {
  ok: boolean;
  data: {
    refinedWalls: WallPath[];
    refinedDoors: Door[];
    refinedOutdoorZones: OutdoorZone[];
    refinedStairs: UserStairs[];
    viewportUnitsPerMeter: number | null;
    heatPumpLocations: HeatPumpLocation[];
    hotWaterCylinderCandidates: HotWaterCylinderCandidate[];
    concerns: string[];
    installerQuestions: string[];
    clarificationQuestions: ClarificationQuestion[];
  } | null;
  error?: string;
}

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Floorplan fetch failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString("base64"), mediaType };
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  return JSON.parse(candidate.trim());
}

function buildUserPrompt(input: SuggestPlacementsInput): string {
  const { satelliteVerdict, satelliteNotes, annotations, totalFloorAreaM2 } = input;

  const summary = [
    `Walls (freehand): ${annotations.walls.length} path(s)`,
    `Doors: ${annotations.doors.length}`,
    `Outdoor zones (freehand): ${annotations.outdoorZones.length} (${annotations.outdoorZones.map((z) => z.label).join(", ") || "none"})`,
    `Stairs: ${annotations.userStairs.length}`,
    `Radiators: ${annotations.radiators.length}`,
  ].join("\n");

  const satLine =
    satelliteVerdict != null
      ? `Satellite verdict on outdoor space: ${satelliteVerdict}${satelliteNotes ? ` — ${satelliteNotes}` : ""}`
      : "Satellite verdict on outdoor space: unavailable";

  const areaLine =
    totalFloorAreaM2 != null
      ? `Known total floor area (from EPC): ${totalFloorAreaM2} m². Use this as a scaling constraint when computing viewportUnitsPerMeter.`
      : "Total floor area: unknown — read dimension labels off the floorplan if you can.";

  return `Here's the user's floorplan (attached image) and their freehand annotations.

${satLine}
${areaLine}

User annotations summary:
${summary}

Exact user-drawn data (JSON, all coords in 0..1000 viewport space):
${JSON.stringify(annotations, null, 2)}

Now refine + place. Return JSON with this shape (NO prose):
{
  "refinedWalls": [
    {
      "id": "rw1",
      "points": [
        { "x": 100, "y": 200 },
        { "x": 600, "y": 200 }
      ]
    }
  ],
  "refinedDoors": [
    { "id": "rd1", "x": 350, "y": 200, "wallPathId": "rw1" }
  ],
  "refinedOutdoorZones": [
    {
      "id": "rz1",
      "label": "Rear garden",
      "type": "garden",
      "points": [
        { "x": 50, "y": 50 },
        { "x": 350, "y": 50 },
        { "x": 350, "y": 200 },
        { "x": 50, "y": 200 }
      ],
      "notes": ""
    }
  ],
  "refinedStairs": [
    {
      "id": "rs1",
      "x": 700, "y": 350,
      "vWidth": 80, "vHeight": 200,
      "direction": "up"
    }
  ],
  "viewportUnitsPerMeter": 50,

  "heatPumpLocations": [
    {
      "id": "hp1",
      "label": "Option 1 — Rear garden, SW corner",
      "x": 80, "y": 130,
      "vWidth": 60, "vHeight": 60,
      "notes": "Within outdoor zone, ~3m to kitchen wall, clear of doors. ~4m pipe run to proposed cylinder location — short internal route via utility room.",
      "source": "ai_suggested"
    }
  ],
  "hotWaterCylinderCandidates": [
    {
      "id": "hwc1",
      "label": "Utility room — against NE wall",
      "x": 500, "y": 400,
      "vWidth": 40, "vHeight": 40,
      "notes": "Adjacent to existing boiler pipework; ~4m from Option 1 HP — minimal pipe chase.",
      "source": "ai_suggested"
    }
  ],
  "concerns": [
    "One short bullet per real installer concern."
  ],
  "installerQuestions": [
    "One question an installer would want the homeowner to confirm."
  ],
  "clarificationQuestions": [
    {
      "id": "q1",
      "question": "Is the space under your stairs taller than 1.5m?",
      "options": ["Yes", "No", "Not sure"],
      "context": "Determines whether it can host a hot-water cylinder."
    }
  ]
}`;
}

export async function suggestPlacements(
  input: SuggestPlacementsInput,
): Promise<SuggestPlacementsResult> {
  let image: { data: string; mediaType: "image/jpeg" | "image/png" };
  try {
    const url = await signedReadUrl(input.objectKey, 300);
    image = await fetchImageAsBase64(url);
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: err instanceof Error ? err.message : "Could not fetch floorplan image",
    };
  }

  let raw: string;
  let stopReason: string | null = null;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data,
              },
            },
            { type: "text", text: buildUserPrompt(input) },
          ],
        },
      ],
    });
    stopReason = response.stop_reason ?? null;
    console.log(
      `[placements] stop=${stopReason} in=${response.usage?.input_tokens ?? 0} out=${response.usage?.output_tokens ?? 0}`,
    );
    if (stopReason === "max_tokens") {
      console.warn(
        "[placements] hit max_tokens — refinement may be truncated. Bump MAX_TOKENS.",
      );
    }
    const block = response.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") throw new Error("No text block in response");
    raw = block.text;
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: err instanceof Error ? err.message : "Claude call failed",
    };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    console.warn("[placements] JSON parse failed; first 300:", raw.slice(0, 300));
    return { ok: false, data: null, error: "Could not parse Claude JSON" };
  }
  const validated = SuggestPlacementsResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.warn(
      "[placements] schema validation failed:",
      JSON.stringify(validated.error.flatten()),
    );
    return { ok: false, data: null, error: "Schema validation failed" };
  }

  return { ok: true, data: validated.data };
}
