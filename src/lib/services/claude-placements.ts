// Claude service: given a floorplan image + the user's annotations (walls,
// doors, stairs, outdoor zones, radiators), suggest 1-2 heat-pump candidate
// locations and 1 hot-water cylinder candidate location.
//
// This replaces the old "extract everything from the floorplan" Claude pass.
// The user has done the ground-truth bit; Claude just does placement.

import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import {
  ClarificationQuestionSchema,
  HeatPumpLocationSchema,
  HotWaterCylinderCandidateSchema,
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
const MAX_TOKENS = 2048; // Small output — 2 HPs, 1 cylinder, a few notes

const SYSTEM = `You are a UK heat-pump installer's assistant suggesting candidate positions for equipment on a floorplan the homeowner has annotated.

The user has already drawn:
- WALLS: where the exterior and internal walls run.
- DOORS: where the doors are.
- STAIRS: where stairs sit.
- OUTDOOR ZONES: closed polygons showing garden / side return / driveway / patio.
- RADIATORS: existing radiator positions.

Your job:
1. Place 1-2 HEAT PUMP candidates (1m × 1m footprint each). Prefer OUTDOOR — within the outdoor zone polygons the user drew. Away from doors and windows ideally. Last-resort indoor (utility room) is fine if no outdoor zone exists.
2. Place 1 HOT WATER CYLINDER candidate (0.6m × 0.6m footprint). INDOOR — inside the building footprint (the area enclosed by the walls). Near any visible radiator or an airing cupboard / utility area.
3. Surface any installation CONCERNS a surveyor would raise (e.g. "HP candidate is within 2m of a neighbour's window — check acoustic limits", "No clear internal route for pipework").
4. If you're unsure about a placement and a simple question would help, ask CLARIFICATION QUESTIONS. Examples: "Is the space under your stairs taller than 1.5m?" (affects whether it can host a cylinder), "Is there already a boiler in the utility room?" (affects cylinder pipework). Keep questions short and answerable with Yes / No / Not sure. Return an empty array if nothing is ambiguous.

Return STRICT JSON only. No prose. All coordinates are in the 0..1000 viewport space the user drew in.`;

export const SuggestPlacementsResponseSchema = z.object({
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
  const { satelliteVerdict, satelliteNotes, annotations } = input;

  const summary = [
    `Walls: ${annotations.walls.length} path(s)`,
    `Doors: ${annotations.doors.length}`,
    `Outdoor zones: ${annotations.outdoorZones.length} (${annotations.outdoorZones.map((z) => z.label).join(", ") || "none"})`,
    `Stairs: ${annotations.userStairs.length}`,
    `Radiators: ${annotations.radiators.length}`,
  ].join("\n");

  const satLine =
    satelliteVerdict != null
      ? `Satellite verdict on outdoor space: ${satelliteVerdict}${satelliteNotes ? ` — ${satelliteNotes}` : ""}`
      : "Satellite verdict on outdoor space: unavailable";

  return `Here's the user's floorplan (attached image) and their annotations.

${satLine}

User annotations summary:
${summary}

Exact annotation data (JSON, all coords in 0..1000 viewport space):
${JSON.stringify(annotations, null, 2)}

Now return JSON with this shape:
{
  "heatPumpLocations": [
    {
      "id": "hp1",
      "label": "Rear garden (SW corner)",
      "x": 150, "y": 800,
      "vWidth": 50, "vHeight": 50,
      "notes": "Within user-drawn garden polygon; ~4m from kitchen wall.",
      "source": "ai_suggested"
    }
  ],
  "hotWaterCylinderCandidates": [
    {
      "id": "hwc1",
      "label": "Airing cupboard off upstairs landing",
      "x": 500, "y": 400,
      "vWidth": 30, "vHeight": 30,
      "notes": "Adjacent to existing radiator — short pipe run.",
      "source": "ai_suggested"
    }
  ],
  "concerns": [
    "Short example of an install concern an MCS surveyor would raise."
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
    console.log(
      `[placements] stop=${response.stop_reason} in=${response.usage?.input_tokens ?? 0} out=${response.usage?.output_tokens ?? 0}`,
    );
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
