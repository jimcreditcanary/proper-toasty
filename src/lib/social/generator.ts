// Orchestrates the two-pass content pipeline:
//   1. Sonnet 5 generates + grounds posts via web_search
//   2. Haiku 4.5 skeptic-reviews each draft
//
// Returns everything the cron route needs to persist + post,
// including the guardrail verdicts so rejected drafts still
// get logged (visibility on why the agent dropped a post).

import { anthropic } from "@/lib/anthropic";
import type { Pillar } from "./pillars";
import {
  buildContentPrompt,
  buildGuardrailPrompt,
  tripwireHits,
  type DraftPost,
  type GenerationContext,
  type GuardrailVerdict,
  type Persona,
  type Platform,
} from "./prompts";

// Sonnet 5 is the workhorse — big enough to write four
// platform-tailored posts + call web_search, cheap enough to run
// daily. Haiku 4.5 handles the guardrail (short input, one JSON
// output — no need for a bigger model).
const CONTENT_MODEL = "claude-sonnet-5";
const GUARDRAIL_MODEL = "claude-haiku-4-5-20251001";

export interface ReviewedPost {
  platform: Platform;
  text: string;
  link_url: string;
  verdict: GuardrailVerdict;
  tripwires: string[];
}

export interface GenerationResult {
  posts: ReviewedPost[];
  citations: Array<{ url: string; publisher: string }>;
}

interface RawContentJson {
  citations?: Array<{ url?: string; publisher?: string }>;
  posts?: Array<{ platform?: string; text?: string }>;
}

const VALID_PLATFORMS: Platform[] = [
  "linkedin",
  "twitter",
  "facebook",
  "instagram",
];

/**
 * Extract JSON from a model response that may include the JSON
 * inside a code fence or wrapped in prose. Anthropic's models are
 * usually clean when instructed to return JSON only, but we defend
 * against a stray backtick block anyway.
 */
function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body) as T;
}

/**
 * Coerce the model's raw output into typed DraftPost[] + citations.
 * Anything malformed is dropped rather than throwing — the caller
 * can log the drop reason.
 */
function normaliseContent(
  raw: RawContentJson,
  link_url: string,
): { drafts: DraftPost[]; citations: Array<{ url: string; publisher: string }> } {
  const drafts: DraftPost[] = [];
  for (const p of raw.posts ?? []) {
    if (!p.platform || !p.text) continue;
    const platform = p.platform.toLowerCase() as Platform;
    if (!VALID_PLATFORMS.includes(platform)) continue;
    drafts.push({ platform, text: p.text.trim(), link_url });
  }
  const citations = (raw.citations ?? [])
    .filter((c): c is { url: string; publisher: string } =>
      typeof c.url === "string" && typeof c.publisher === "string",
    )
    .map((c) => ({ url: c.url, publisher: c.publisher }));
  return { drafts, citations };
}

/**
 * Run the writer. Enables Anthropic's web_search server tool so
 * the model can cite live UK sources. Retries once on parse
 * failure — the failure mode we've seen is a stray closing backtick.
 */
async function runWriter(
  ctx: GenerationContext,
  persona: Persona,
): Promise<{
  drafts: DraftPost[];
  citations: Array<{ url: string; publisher: string }>;
}> {
  const { system, user } = buildContentPrompt(ctx, persona);

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic.messages.create({
      model: CONTENT_MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 4,
        },
      ],
    });
    // Concatenate every text block — the model may split its
    // answer across multiple text blocks around web_search calls.
    // Empty answer = flag it with context so the runbook can act.
    const allText = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    if (!allText.trim()) {
      const shape = res.content.map((b) => b.type).join(",");
      console.error("[social-agent] writer produced no text", {
        stop_reason: res.stop_reason,
        content_blocks: shape,
        attempt,
      });
      if (attempt === 1) {
        throw new Error(
          `Writer returned no text (stop_reason=${res.stop_reason}, blocks=${shape})`,
        );
      }
      continue; // retry
    }
    try {
      const parsed = parseJson<RawContentJson>(allText);
      return normaliseContent(parsed, ctx.primary_cta_url);
    } catch (err) {
      if (attempt === 1) {
        throw new Error(
          `Writer JSON parse failed after retry: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
      // fall through to retry
    }
  }
  throw new Error("Unreachable");
}

/**
 * Run the guardrail on a single draft. Returns a passed/reason
 * verdict. The guardrail is instructed to default to reject on
 * uncertainty, so a rejection isn't the model being harsh — it's
 * doing its job.
 */
async function runGuardrail(
  draft: DraftPost,
  blogExcerpt: string,
  citations: Array<{ url: string; publisher: string }>,
): Promise<GuardrailVerdict> {
  const { system, user } = buildGuardrailPrompt({
    post_text: draft.text,
    platform: draft.platform,
    blog_excerpt: blogExcerpt,
    citations,
  });
  const res = await anthropic.messages.create({
    model: GUARDRAIL_MODEL,
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: user }],
  });
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { passed: false, reason: "guardrail returned no text" };
  }
  try {
    const parsed = parseJson<{ passed?: unknown; reason?: unknown }>(
      textBlock.text,
    );
    return {
      passed: parsed.passed === true,
      reason:
        typeof parsed.reason === "string"
          ? parsed.reason
          : "no reason supplied",
    };
  } catch {
    return { passed: false, reason: "guardrail returned invalid JSON" };
  }
}

/**
 * End-to-end: generate drafts, run the guardrail on each, return
 * everything (approved + rejected) so the caller can log rejections.
 */
export async function generateReviewedPosts(
  ctx: GenerationContext,
  blogExcerpt: string,
  persona: Persona,
): Promise<GenerationResult> {
  const { drafts, citations } = await runWriter(ctx, persona);

  const reviewed = await Promise.all(
    drafts.map(async (d) => {
      const tripwires = tripwireHits(d.text);
      const verdict = await runGuardrail(d, blogExcerpt, citations);
      return { ...d, tripwires, verdict };
    }),
  );

  return { posts: reviewed, citations };
}

/**
 * Given a pillar, return the CTA the post should link to.
 * Kept in one place so the cron route + tests don't drift.
 */
export function pillarCtaUrl(pillar: Pillar, base: string): string {
  const utm = "utm_source=social&utm_medium=organic&utm_campaign=agent";
  const b = base.replace(/\/+$/, "");
  switch (pillar) {
    case "heat_pump":
      return `${b}/check/heatpump?${utm}&utm_content=heatpump`;
    case "solar":
      return `${b}/check/solar?${utm}&utm_content=solar`;
    case "plug_in_solar":
      return `${b}/plug-in-solar?${utm}&utm_content=plug_in_solar#calculator`;
    case "blog":
      // Sunday variety slot — send to the homepage; the picker
      // section (#pick-your-calculator) does the routing.
      return `${b}/?${utm}&utm_content=blog#pick-your-calculator`;
  }
}
