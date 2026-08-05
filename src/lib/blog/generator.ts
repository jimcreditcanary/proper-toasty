// Orchestrates the weekly blog auto-generator.
//   1. Writer  — Sonnet 5 + web_search drafts full JSON.
//   2. Guardrail — Haiku 4.5 skeptic pass.
// Also validates the draft shape (title/slug/excerpt/HTML sanity)
// before it can be persisted.

import { anthropic } from "@/lib/anthropic";
import type { BlogPillar, ExistingPost } from "./pillars";
import {
  buildGuardrailPrompt,
  buildWriterPrompt,
  type BlogDraft,
  type GuardrailVerdict,
} from "./prompts";

const CONTENT_MODEL = "claude-sonnet-5";
const GUARDRAIL_MODEL = "claude-haiku-4-5-20251001";

// Bounds on generated output. Enforced BEFORE the guardrail so
// obvious shape failures don't waste a guardrail call.
const MIN_WORDS = 900;
const MAX_WORDS = 2400;
const MIN_SOURCES = 3;
const MAX_EXCERPT_CHARS = 200;
const MIN_H2_COUNT = 4;
const MAX_H2_COUNT = 8;

export interface GenerationResult {
  draft: BlogDraft;
  verdict: GuardrailVerdict;
  wordCount: number;
  /** Non-null when the draft failed a shape check BEFORE reaching
   *  the guardrail. Rare — the writer prompt is strict — but we
   *  surface a specific reason for observability. */
  shapeError: string | null;
}

// ─── JSON extraction ──────────────────────────────────────────────

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body) as T;
}

interface RawWriterJson {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  category?: unknown;
  sources?: unknown;
}

function coerceDraft(raw: RawWriterJson): BlogDraft | null {
  if (
    typeof raw.title !== "string" ||
    typeof raw.slug !== "string" ||
    typeof raw.excerpt !== "string" ||
    typeof raw.content !== "string"
  ) {
    return null;
  }
  const category =
    typeof raw.category === "string" && raw.category.trim().length > 0
      ? raw.category.trim()
      : "Guides";
  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .filter(
          (s): s is Record<string, unknown> =>
            typeof s === "object" && s !== null,
        )
        .filter(
          (s) => typeof s.name === "string" && typeof s.url === "string",
        )
        .map((s) => ({
          name: s.name as string,
          url: s.url as string,
          accessedDate:
            typeof s.accessedDate === "string" ? s.accessedDate : undefined,
        }))
    : [];
  return {
    title: raw.title.trim(),
    slug: raw.slug.trim().toLowerCase(),
    excerpt: raw.excerpt.trim(),
    content: raw.content.trim(),
    category,
    sources,
  };
}

// ─── Shape validation ────────────────────────────────────────────

export function countWords(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

function countH2s(html: string): number {
  const matches = html.match(/<h2[\s>]/gi);
  return matches ? matches.length : 0;
}

function isSlugValid(slug: string): boolean {
  // kebab-case, ASCII, 3-8 words joined by hyphens.
  if (!/^[a-z0-9]+(-[a-z0-9]+){2,7}$/.test(slug)) return false;
  return true;
}

/**
 * Enforce the shape rules the writer prompt promises. Returns null
 * when the draft passes; a specific reason string when it fails.
 */
export function shapeCheck(draft: BlogDraft): string | null {
  if (!isSlugValid(draft.slug)) {
    return `slug fails kebab-case shape (${draft.slug})`;
  }
  if (draft.excerpt.length > MAX_EXCERPT_CHARS) {
    return `excerpt too long (${draft.excerpt.length} > ${MAX_EXCERPT_CHARS} chars)`;
  }
  if (draft.sources.length < MIN_SOURCES) {
    return `too few sources (${draft.sources.length} < ${MIN_SOURCES})`;
  }
  const words = countWords(draft.content);
  if (words < MIN_WORDS || words > MAX_WORDS) {
    return `word count ${words} outside range [${MIN_WORDS}, ${MAX_WORDS}]`;
  }
  const h2s = countH2s(draft.content);
  if (h2s < MIN_H2_COUNT || h2s > MAX_H2_COUNT) {
    return `H2 count ${h2s} outside range [${MIN_H2_COUNT}, ${MAX_H2_COUNT}]`;
  }
  if (/floorplan/i.test(draft.content)) {
    return "content references floorplan (retired feature)";
  }
  return null;
}

// ─── Writer pass ─────────────────────────────────────────────────

async function runWriter(args: {
  pillar: BlogPillar;
  existingPosts: ExistingPost[];
  recentGeneratedTopics: string[];
}): Promise<BlogDraft> {
  const { system, user } = buildWriterPrompt(args);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic.messages.create({
      model: CONTENT_MODEL,
      // Full blog + citations + tool-use round-trips comfortably.
      // Empirically fits within Sonnet 5's 8k output limit for
      // 1500-word posts.
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 6,
        },
      ],
    });
    // Sonnet 5 with server tools sometimes splits the reply across
    // multiple text blocks around tool_use blocks — concatenate all.
    const combined = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    if (!combined.trim()) {
      if (attempt === 1) {
        throw new Error(
          `writer returned no text (stop_reason=${res.stop_reason})`,
        );
      }
      continue;
    }
    try {
      const parsed = parseJson<RawWriterJson>(combined);
      const draft = coerceDraft(parsed);
      if (!draft) {
        if (attempt === 1) {
          throw new Error("writer JSON missing required fields");
        }
        continue;
      }
      return draft;
    } catch (err) {
      if (attempt === 1) {
        throw new Error(
          `writer JSON parse failed after retry: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }
  throw new Error("unreachable");
}

// ─── Guardrail pass ───────────────────────────────────────────────

async function runGuardrail(draft: BlogDraft): Promise<GuardrailVerdict> {
  const { system, user } = buildGuardrailPrompt(draft);
  const res = await anthropic.messages.create({
    model: GUARDRAIL_MODEL,
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    return { passed: false, reason: "guardrail returned no text" };
  }
  try {
    const parsed = parseJson<{ passed?: unknown; reason?: unknown }>(
      block.text,
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

// ─── End-to-end ───────────────────────────────────────────────────

export async function generateBlogPost(args: {
  pillar: BlogPillar;
  existingPosts: ExistingPost[];
  recentGeneratedTopics: string[];
}): Promise<GenerationResult> {
  const draft = await runWriter(args);
  const wordCount = countWords(draft.content);
  const shapeError = shapeCheck(draft);
  if (shapeError) {
    return {
      draft,
      wordCount,
      shapeError,
      // Skip the guardrail — the shape's already wrong.
      verdict: { passed: false, reason: `shape check: ${shapeError}` },
    };
  }
  const verdict = await runGuardrail(draft);
  return { draft, wordCount, shapeError: null, verdict };
}
