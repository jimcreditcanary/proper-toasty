import { anthropic } from "@/lib/anthropic";
import {
  FLOORPLAN_SYSTEM,
  floorplanUserPrompt,
  type FloorplanContext,
} from "@/lib/prompts/floorplan-analysis";
import { FloorplanAnalysisSchema, type FloorplanAnalysis } from "@/lib/schemas/floorplan";
import { signedReadUrl } from "@/lib/services/floorplan";

const MODEL = "claude-opus-4-7";
// Bumped from 2048 — the new prompt asks for full room geometry + radiators
// + heat-pump candidate locations. A typical 3-floor home (12+ rooms) needs
// ~4-6k tokens to express. 2048 was silently truncating responses, which
// then failed schema validation and surfaced as "couldn't read your floorplan".
const MAX_TOKENS = 8192;

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
): Promise<{ text: string; stopReason: string | null; usage: { input: number; output: number } }> {
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
  return {
    text: block.text,
    stopReason: response.stop_reason ?? null,
    usage: {
      input: response.usage?.input_tokens ?? 0,
      output: response.usage?.output_tokens ?? 0,
    },
  };
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
  let claudeResult: { text: string; stopReason: string | null; usage: { input: number; output: number } };
  try {
    claudeResult = await callClaude(image, input.context);
  } catch (err) {
    console.error("[floorplan] Claude call failed", err);
    return {
      analysis: null,
      degraded: true,
      reason: err instanceof Error ? err.message : "Claude call failed",
    };
  }

  // Diagnostic visibility — these end up in Vercel function logs.
  console.log(
    `[floorplan] attempt=1 stop=${claudeResult.stopReason} in=${claudeResult.usage.input} out=${claudeResult.usage.output} text_len=${claudeResult.text.length}`
  );
  if (claudeResult.stopReason === "max_tokens") {
    console.warn(
      "[floorplan] Claude hit max_tokens limit — response was truncated. Bump MAX_TOKENS."
    );
  }

  let parsed: unknown;
  let parseError: unknown = null;
  try {
    parsed = extractJson(claudeResult.text);
  } catch (e) {
    parseError = e;
    parsed = null;
  }

  let validated = parsed ? FloorplanAnalysisSchema.safeParse(parsed) : null;

  if (!validated || !validated.success) {
    if (parseError) {
      console.warn(
        "[floorplan] JSON parse failed on attempt 1:",
        parseError instanceof Error ? parseError.message : String(parseError),
        "first 400 chars:",
        claudeResult.text.slice(0, 400),
        "last 200 chars:",
        claudeResult.text.slice(-200)
      );
    } else if (validated && !validated.success) {
      console.warn(
        "[floorplan] Schema validation failed on attempt 1:",
        JSON.stringify(validated.error.flatten())
      );
    }

    // Retry once with a nudge.
    const retryGuidance = `Your previous response did not match the schema. Return ONLY a single JSON object matching the schema exactly. Do not include prose, explanations, or markdown fences.`;
    try {
      claudeResult = await callClaude(image, input.context, retryGuidance);
      console.log(
        `[floorplan] attempt=2 stop=${claudeResult.stopReason} in=${claudeResult.usage.input} out=${claudeResult.usage.output} text_len=${claudeResult.text.length}`
      );
      try {
        parsed = extractJson(claudeResult.text);
      } catch (e) {
        console.warn(
          "[floorplan] JSON parse failed on attempt 2:",
          e instanceof Error ? e.message : String(e)
        );
        parsed = null;
      }
      validated = parsed ? FloorplanAnalysisSchema.safeParse(parsed) : null;
      if (validated && !validated.success) {
        console.warn(
          "[floorplan] Schema validation failed on attempt 2:",
          JSON.stringify(validated.error.flatten())
        );
      }
    } catch (err) {
      console.error("[floorplan] Claude retry call threw", err);
    }
  }

  if (!validated || !validated.success) {
    return {
      analysis: null,
      degraded: true,
      reason:
        claudeResult.stopReason === "max_tokens"
          ? "Floorplan was too complex to fit in our analysis budget — please retry."
          : "We couldn't read your floorplan reliably — your installer will assess this on their site visit.",
    };
  }

  console.log(
    `[floorplan] success rooms=${validated.data.rooms.length} radiators=${validated.data.radiators.length} hp=${validated.data.heatPumpLocations.length}`
  );
  return { analysis: validated.data, degraded: false };
}
