import { anthropic } from "@/lib/anthropic";
import { BILL_SYSTEM, BILL_USER } from "@/lib/prompts/bill-analysis";
import { BillAnalysisSchema, type BillAnalysis } from "@/lib/schemas/bill";

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 800;

interface ParseInput {
  data: string; // base64
  mediaType: "image/jpeg" | "image/png";
}

export interface BillParseResult {
  analysis: BillAnalysis | null;
  reason?: string;
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  return JSON.parse(candidate.trim());
}

async function callClaude(image: ParseInput, nudge?: string): Promise<string> {
  const userText = nudge ? `${BILL_USER}\n\n${nudge}` : BILL_USER;
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: BILL_SYSTEM,
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
          { type: "text", text: userText },
        ],
      },
    ],
  });
  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude returned no text");
  return block.text;
}

export async function parseBill(image: ParseInput): Promise<BillParseResult> {
  let raw: string;
  try {
    raw = await callClaude(image);
  } catch (err) {
    return {
      analysis: null,
      reason: err instanceof Error ? err.message : "Claude call failed",
    };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    parsed = null;
  }

  let validated = parsed ? BillAnalysisSchema.safeParse(parsed) : null;

  if (!validated || !validated.success) {
    const nudge =
      "Your previous response did not match the schema. Return ONLY a single JSON object matching the schema exactly. No prose, no markdown fences.";
    try {
      raw = await callClaude(image, nudge);
      parsed = extractJson(raw);
      validated = BillAnalysisSchema.safeParse(parsed);
    } catch {
      // fall through
    }
  }

  if (!validated || !validated.success) {
    return {
      analysis: null,
      reason: "We couldn't read the bill reliably — you can still type the figures in by hand.",
    };
  }

  return { analysis: validated.data };
}
