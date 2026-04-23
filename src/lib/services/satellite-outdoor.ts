// Satellite outdoor-space detector.
//
// We fetch the Google Static Maps satellite tile for the property's lat/lng,
// hand it to Claude vision, and ask: "Is there clearly visible outdoor
// ground-level space at this property where a 1m × 1m air-source heat pump
// could sit?"
//
// Output: { verdict: 'yes' | 'no' | 'unsure', notes: string }
//
// Used to gate the "do you have a garden?" question in the editor — we only
// ask the user when the satellite check comes back unsure.

import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { buildStaticMapUrl } from "@/lib/services/staticmaps";

const MODEL = "claude-opus-4-7";

export const SatelliteOutdoorVerdictSchema = z.object({
  verdict: z.enum(["yes", "no", "unsure"]),
  notes: z.string(),
});
export type SatelliteOutdoorVerdict = z.infer<typeof SatelliteOutdoorVerdictSchema>;

const SYSTEM = `You are reviewing a satellite photo of a UK residential property to determine whether there is visible outdoor space at ground level — garden, side return, paved patio, driveway, or anywhere a 1m × 1m air-source heat pump could be installed.

The image is centred on the target property. Ignore neighbouring properties.

Return STRICT JSON. No prose outside the JSON.

Valid verdicts:
- "yes"     — clear outdoor ground-level space visible (garden, side return, driveway, etc.)
- "no"      — no visible outdoor space at this property (mid-terrace with no rear access, top-floor flat, etc.)
- "unsure"  — image is too obscured by tree cover, shadows, or unclear property boundary

JSON shape:
{
  "verdict": "yes" | "no" | "unsure",
  "notes": "short one-sentence explanation"
}`;

const USER = `Look at this satellite image of a UK residential property. Determine whether there is visible outdoor ground-level space at this property where a heat pump could be sited. Reply with the JSON object only.`;

async function fetchTileAsBase64(
  lat: number,
  lng: number,
): Promise<{ data: string; mediaType: "image/png" }> {
  // Static Maps returns PNG by default. Zoom 20, 640×640, scale 2 keeps
  // detail high while staying within Anthropic's image size limits.
  const url = buildStaticMapUrl({ lat, lng, zoom: 20, width: 640, height: 640, scale: 2 });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Static map upstream ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString("base64"), mediaType: "image/png" };
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  return JSON.parse(candidate.trim());
}

export interface SatelliteOutdoorResult {
  verdict: SatelliteOutdoorVerdict | null;
  degraded: boolean;
  reason?: string;
}

export async function detectOutdoorSpace(
  lat: number,
  lng: number,
): Promise<SatelliteOutdoorResult> {
  let image: { data: string; mediaType: "image/png" };
  try {
    image = await fetchTileAsBase64(lat, lng);
  } catch (err) {
    return {
      verdict: null,
      degraded: true,
      reason: err instanceof Error ? err.message : "Could not fetch satellite tile",
    };
  }

  let raw: string;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.data },
            },
            { type: "text", text: USER },
          ],
        },
      ],
    });
    const block = response.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") throw new Error("No text in Claude response");
    raw = block.text;
  } catch (err) {
    return {
      verdict: null,
      degraded: true,
      reason: err instanceof Error ? err.message : "Claude call failed",
    };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    return { verdict: null, degraded: true, reason: "Could not parse Claude JSON" };
  }
  const validated = SatelliteOutdoorVerdictSchema.safeParse(parsed);
  if (!validated.success) {
    return { verdict: null, degraded: true, reason: "Schema validation failed" };
  }
  return { verdict: validated.data, degraded: false };
}
