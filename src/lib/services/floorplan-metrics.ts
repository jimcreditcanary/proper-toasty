// Claude vision pass: extract structured metrics from a floorplan image.
//
// Different concern from claude-placements.ts:
//   - claude-placements REFINES user annotations + places equipment.
//     It runs on demand when the user clicks "find HP & cylinder".
//   - THIS service READS the labels printed on the floorplan (room
//     names + dimensions + total area + floor headings) and returns
//     plain structured data. Runs automatically on every upload so
//     we have these metrics in wizard state regardless of whether
//     the user later clicks the AI assist.
//
// Why a separate call rather than piggybacking on placements:
//   1. Triggered at different times — extraction on upload, placement
//      on user click.
//   2. Different output shapes — placements returns coordinates,
//      this returns labelled rooms.
//   3. Many users won't touch the AI placement flow but will still
//      benefit from the metrics being captured (system sizing,
//      installer prep, lead routing).
//
// The model is Claude Opus 4.7 (same as placements). MAX_TOKENS is
// modest because the response is mostly numbers + short strings.

import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { signedReadUrl } from "@/lib/services/floorplan";
import {
  ExtractedRoomSchema,
  FloorplanMetricsSchema,
  type FloorplanMetrics,
} from "@/lib/schemas/floorplan";

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 2048;

const SYSTEM = `You read UK residential floorplans and return STRUCTURED JSON describing what's labelled on the image.

Rules:
- Only include rooms that have a TEXT LABEL on the floorplan. Don't infer rooms from shapes alone.
- Room names: keep them verbatim from the label. "Kitchen / Diner", "Master Bedroom", "WC", "En-Suite", "Utility" — copy what's printed.
- Dimensions: read the labelled size and convert as needed.
  - "4.20m × 3.10m" → sizeM2 = 13.02, sizeSqFt = 140
  - "13'9 × 10'2" → sizeSqFt = 140, sizeM2 ≈ 13.0
  - "Approx 14m²" → sizeM2 = 14, sizeSqFt = 151
  - dimensionsRaw is the verbatim label like "4.2m × 3.1m"
  - Use 1 m² = 10.7639 sq ft for conversion. Round to 1 decimal place for m², integer for sq ft.
- Floor: if the floorplan shows multiple floors with headings ("Ground floor", "First floor", "Second floor", "Lower ground"), tag each room with its floor as a lowercase short word ("ground", "first", "second", "lower-ground", "loft"). null if there's no floor heading or the floorplan only has one floor.
- floorsCount: count distinct floors visible on the image (1 for a single-storey flat, 2 for typical UK semi/terrace, 3 for townhouses, etc).
- totalAreaM2 / totalAreaSqFt: if there's a labelled total ("Total: 92m²" / "1442 sq ft / 134 sqm"), use that. Otherwise, sum the room sizes you've extracted IF you've captured the major rooms — but be honest: if you've only labelled 3 of 8 rooms, leave totals null.
- confidence:
  - "high" — every room labelled, total area printed, dimensions clear
  - "medium" — most rooms labelled with some dimensions
  - "low" — sketch with no labels, only outline visible, illegible text

Output STRICT JSON only matching this shape (no prose, no commentary):

{
  "rooms": [
    { "name": "Kitchen", "floor": "ground", "sizeM2": 13.0, "sizeSqFt": 140, "dimensionsRaw": "4.2m × 3.1m" }
  ],
  "totalAreaM2": 92.5,
  "totalAreaSqFt": 996,
  "floorsCount": 2,
  "confidence": "high"
}

If the image isn't a floorplan (e.g. user uploaded a photo by mistake), return:
{ "rooms": [], "totalAreaM2": null, "totalAreaSqFt": null, "floorsCount": null, "confidence": "low" }`;

const ResponseSchema = z.object({
  rooms: z.array(ExtractedRoomSchema).default([]),
  totalAreaM2: z.number().positive().nullable().default(null),
  totalAreaSqFt: z.number().positive().nullable().default(null),
  floorsCount: z.number().int().positive().nullable().default(null),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

function extractJson(text: string): unknown {
  // Tolerate Claude wrapping the JSON in ```json fences even though
  // the system prompt asks for raw output. Same defensive parser as
  // claude-placements.ts.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  return JSON.parse(candidate.trim());
}

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Floorplan fetch failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const mediaType = contentType.includes("png") ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString("base64"), mediaType };
}

export interface ExtractFloorplanMetricsResult {
  ok: boolean;
  metrics: FloorplanMetrics | null;
  error?: string;
}

export async function extractFloorplanMetrics(
  objectKey: string,
): Promise<ExtractFloorplanMetricsResult> {
  let imageData: { data: string; mediaType: "image/jpeg" | "image/png" };
  try {
    const url = await signedReadUrl(objectKey, 300);
    imageData = await fetchImageAsBase64(url);
  } catch (err) {
    console.error("[floorplan-metrics] image fetch failed", err);
    return {
      ok: false,
      metrics: null,
      error: err instanceof Error ? err.message : "Image fetch failed",
    };
  }

  let response;
  try {
    response = await anthropic.messages.create({
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
                media_type: imageData.mediaType,
                data: imageData.data,
              },
            },
            {
              type: "text",
              text: "Extract the structured metrics from this floorplan as JSON.",
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("[floorplan-metrics] anthropic call failed", err);
    return {
      ok: false,
      metrics: null,
      error: err instanceof Error ? err.message : "Anthropic call failed",
    };
  }

  // Claude returns content as an array of blocks; we want the first text block.
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return {
      ok: false,
      metrics: null,
      error: "Empty Claude response",
    };
  }

  let raw: unknown;
  try {
    raw = extractJson(textBlock.text);
  } catch (err) {
    console.error("[floorplan-metrics] JSON parse failed", err, textBlock.text.slice(0, 500));
    return {
      ok: false,
      metrics: null,
      error: "Could not parse Claude response",
    };
  }

  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "[floorplan-metrics] response schema mismatch",
      parsed.error.flatten(),
    );
    return {
      ok: false,
      metrics: null,
      error: "Response schema mismatch",
    };
  }

  // Wrap in the canonical FloorplanMetrics shape with timestamp.
  const metrics = FloorplanMetricsSchema.parse({
    ...parsed.data,
    extractedAt: new Date().toISOString(),
  });

  return { ok: true, metrics };
}
