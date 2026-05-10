// extractFloorplan — model call + schema validation for the v2 flow.
//
// One-shot: take the post-resize image bytes, call Sonnet with the
// vision content block + extraction prompt, parse + validate the
// JSON output. On parse failure, retry exactly once with the error
// message attached so the model can self-correct. After the second
// failure we surface the error rather than silently fall back.
//
// Returns:
//   { ok: true, extract, usage }  on success
//   { ok: false, error, attempts } on parse + retry failure
//
// Caller (POST /api/upload/floorplan) writes the result back to
// public.floorplan_uploads — including failure rows so admin triage
// can correlate via image_hash.

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import {
  FloorplanExtractSchema,
  type FloorplanExtract,
} from "@/lib/schemas/floorplan-extract";
import {
  FLOORPLAN_EXTRACT_PROMPT,
  FLOORPLAN_SCHEMA_HINT,
} from "./extract-prompt";

// Sonnet is the right tier here — vision-capable, ~3× cheaper than
// Opus, and the extraction is a structured-output task that doesn't
// stretch model reasoning. If you bump this, also bump the model
// constant in tests/fixtures + cost-rates.ts.
const MODEL = "claude-sonnet-4-7";

/** Hard ceiling on output tokens. The schema is dense (~150 fields,
 *  prose explanations, recommendations array). Generous bound, but
 *  bounded — runaway responses get cut off + fail validation, which
 *  surfaces as a retry on the next attempt. */
const MAX_TOKENS = 8000;

export interface ExtractSuccess {
  ok: true;
  extract: FloorplanExtract;
  attempts: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ExtractFailure {
  ok: false;
  error: string;
  attempts: number;
  /** The raw JSON-ish text from the last attempt — written to the
   *  failure_reason column so admin triage can see what came back. */
  lastRawOutput?: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export type ExtractResult = ExtractSuccess | ExtractFailure;

export interface ExtractInput {
  /** Raw post-resize bytes. */
  imageBytes: Uint8Array;
  /** image/png OR image/jpeg. PDF support deferred to v2. */
  mimeType: "image/png" | "image/jpeg";
}

export async function extractFloorplan(
  input: ExtractInput,
): Promise<ExtractResult> {
  const imageBlock: Anthropic.ContentBlockParam = {
    type: "image",
    source: {
      type: "base64",
      media_type: input.mimeType,
      data: Buffer.from(input.imageBytes).toString("base64"),
    },
  };

  // First attempt — image + prompt + schema hint.
  const initial = await callOnce({
    messages: [
      {
        role: "user",
        content: [
          imageBlock,
          {
            type: "text",
            text: `${FLOORPLAN_EXTRACT_PROMPT}\n\n${FLOORPLAN_SCHEMA_HINT}`,
          },
        ],
      },
    ],
  });

  const firstParse = tryParseValidated(initial.text);
  if (firstParse.ok) {
    return {
      ok: true,
      extract: firstParse.extract,
      attempts: 1,
      inputTokens: initial.inputTokens,
      outputTokens: initial.outputTokens,
      model: MODEL,
    };
  }

  // Retry once — feed the model the validation error so it can
  // self-correct. Per spec: "Your previous output failed validation.
  // Here is the error: {error}. Return ONLY corrected JSON."
  const retry = await callOnce({
    messages: [
      {
        role: "user",
        content: [
          imageBlock,
          {
            type: "text",
            text: `${FLOORPLAN_EXTRACT_PROMPT}\n\n${FLOORPLAN_SCHEMA_HINT}`,
          },
        ],
      },
      { role: "assistant", content: initial.text },
      {
        role: "user",
        content: `Your previous output failed validation. Here is the error:\n\n${firstParse.error}\n\nReturn ONLY corrected JSON. No prose.`,
      },
    ],
  });

  const retryParse = tryParseValidated(retry.text);
  if (retryParse.ok) {
    return {
      ok: true,
      extract: retryParse.extract,
      attempts: 2,
      inputTokens: initial.inputTokens + retry.inputTokens,
      outputTokens: initial.outputTokens + retry.outputTokens,
      model: MODEL,
    };
  }

  return {
    ok: false,
    error: retryParse.error,
    attempts: 2,
    lastRawOutput: retry.text.slice(0, 4000),
    inputTokens: initial.inputTokens + retry.inputTokens,
    outputTokens: initial.outputTokens + retry.outputTokens,
    model: MODEL,
  };
}

// ─── internals ───────────────────────────────────────────────────────

interface CallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function callOnce(args: {
  messages: Anthropic.MessageParam[];
}): Promise<CallResult> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0,
    messages: args.messages,
  });
  // Concatenate any text blocks. Sonnet typically returns a single
  // text block but we don't assume.
  const text = res.content
    .filter(
      (b): b is Anthropic.TextBlock =>
        (b as Anthropic.ContentBlock).type === "text",
    )
    .map((b) => b.text)
    .join("");
  return {
    text,
    inputTokens: res.usage?.input_tokens ?? 0,
    outputTokens: res.usage?.output_tokens ?? 0,
  };
}

interface ParseSuccess {
  ok: true;
  extract: FloorplanExtract;
}
interface ParseFailure {
  ok: false;
  error: string;
}

/** Strip optional ```json fences (rule 8 of the prompt forbids them
 *  but models still slip them in occasionally). */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\n?([\s\S]*?)\n?```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function tryParseValidated(text: string): ParseSuccess | ParseFailure {
  const cleaned = stripCodeFences(text);
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch (e) {
    return {
      ok: false,
      error: `JSON parse failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  const parsed = FloorplanExtractSchema.safeParse(json);
  if (!parsed.success) {
    // Issue list is verbose; take the first 5 to keep the retry
    // prompt + the failure_reason column compact.
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Schema validation failed: ${issues}` };
  }
  return { ok: true, extract: parsed.data };
}
