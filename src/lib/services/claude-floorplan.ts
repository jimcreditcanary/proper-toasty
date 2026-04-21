import { anthropic } from "@/lib/anthropic";
import {
  FLOORPLAN_SYSTEM,
  floorplanUserPrompt,
  type FloorplanContext,
} from "@/lib/prompts/floorplan-analysis";
import { FloorplanAnalysisSchema, type FloorplanAnalysis } from "@/lib/schemas/floorplan";
import { signedReadUrl } from "@/lib/services/floorplan";

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 2048;

interface AnalyseInput {
  objectKey: string;
  context: FloorplanContext;
}

export interface FloorplanAnalysisResult {
  analysis: FloorplanAnalysis | null;
  degraded: boolean;
  reason?: string;
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Floorplan fetch failed: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  const data = buffer.toString("base64");
  const mediaType = contentType.split(";")[0].trim();
  return { data, mediaType };
}

function extractJson(text: string): unknown {
  // Claude sometimes wraps JSON in markdown fences despite the system prompt.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  return JSON.parse(candidate.trim());
}

async function callClaude(
  image: { data: string; mediaType: string },
  context: FloorplanContext,
  extraGuidance?: string
): Promise<string> {
  const userText = extraGuidance
    ? `${floorplanUserPrompt(context)}\n\n${extraGuidance}`
    : floorplanUserPrompt(context);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: FLOORPLAN_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType as "image/jpeg" | "image/png",
              data: image.data,
            },
          },
          { type: "text", text: userText },
        ],
      },
    ],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude returned no text");
  return block.text;
}

export async function analyseFloorplan(
  input: AnalyseInput
): Promise<FloorplanAnalysisResult> {
  let image: { data: string; mediaType: string };
  try {
    const url = await signedReadUrl(input.objectKey, 300);
    image = await fetchImageAsBase64(url);
  } catch (err) {
    return {
      analysis: null,
      degraded: true,
      reason: err instanceof Error ? err.message : "Could not read floorplan",
    };
  }

  // First attempt.
  let raw: string;
  try {
    raw = await callClaude(image, input.context);
  } catch (err) {
    return {
      analysis: null,
      degraded: true,
      reason: err instanceof Error ? err.message : "Claude call failed",
    };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    parsed = null;
  }

  let validated = parsed ? FloorplanAnalysisSchema.safeParse(parsed) : null;

  if (!validated || !validated.success) {
    // Retry once with a nudge.
    const retryGuidance = `Your previous response did not match the schema. Return ONLY a single JSON object matching the schema exactly. Do not include prose, explanations, or markdown fences.`;
    try {
      raw = await callClaude(image, input.context, retryGuidance);
      parsed = extractJson(raw);
      validated = FloorplanAnalysisSchema.safeParse(parsed);
    } catch {
      // fall through
    }
  }

  if (!validated || !validated.success) {
    console.warn(
      "Claude floorplan analysis failed schema validation twice",
      validated?.error?.flatten()
    );
    return {
      analysis: null,
      degraded: true,
      reason: "We couldn't read your floorplan reliably — your installer will assess this on their site visit.",
    };
  }

  return { analysis: validated.data, degraded: false };
}
