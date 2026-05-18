// Generate an installer-bylined blog post from the 6-question
// interview answers. Single Claude call, returns markdown.
//
// The prompt is deliberately voicey + opinionated — we want the
// post to read like the installer wrote it, not like marketing copy.
// Each question's answer becomes load-bearing content; the model
// is instructed to weave them into a flowing piece rather than a
// Q&A transcript.
//
// Cost: ~$0.02 per draft at current Sonnet pricing (~1500 input,
// ~1200 output tokens). Once per installer, so negligible.

import Anthropic from "@anthropic-ai/sdk";

export type Tech =
  | "heat_pump"
  | "solar_pv"
  | "battery_storage"
  | "solar_thermal";

export interface BlogDraftInput {
  companyName: string;
  installerFirstName?: string | null;
  region: string;
  techDisplay: string;
  yearsInBusiness?: number | null;
  bio?: string | null;
  /** 6 ordered answers from the interview. Empty strings get
   *  filtered out before prompting. */
  answers: string[];
  /** Set of the 6 questions that were asked, in the same order
   *  as `answers`. Lets the prompt show the model what was asked
   *  alongside each answer. */
  questions: string[];
}

export interface BlogDraftResult {
  /** Suggested post title (~70 chars). */
  title: string;
  /** Markdown body, ~800 words. */
  markdown: string;
  /** Suggested URL slug — kebab-case, no leading/trailing dashes. */
  slug: string;
  /** Suggested 1-line excerpt for the blog index. */
  excerpt: string;
}

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You write installer-bylined blog posts for Propertoasty (a UK pre-survey + lead-routing platform for heat pump + solar PV installers).

Voice + style rules — non-negotiable:

- First-person, conversational. The installer is talking.
- UK English. Pounds (£), kWh, kWp, kW.
- 700-900 words.
- No marketing fluff. No "in today's fast-paced world". No "in conclusion".
- Lead with a strong opinion or contrarian take from their answers — not "hello and welcome".
- Cite concrete numbers + examples from their answers wherever you can.
- Address the homeowner reader directly ("if you're getting heat pump quotes…").
- No mention of Propertoasty in the body. The byline + sidebar does that work.
- Pass the "would this installer's mate read it and think 'yeah that sounds like them'" test.

Output format — EXACTLY this JSON shape, no other text:

{
  "title": "post title — ~70 chars",
  "slug": "kebab-case-url-slug",
  "excerpt": "1-line summary for the blog index, ~140 chars",
  "markdown": "the post body in markdown, with proper paragraph breaks"
}`;

function userPromptForDraft(input: BlogDraftInput): string {
  const lines: string[] = [];
  lines.push(`Installer: ${input.companyName}`);
  if (input.installerFirstName) lines.push(`Author first name: ${input.installerFirstName}`);
  lines.push(`Region: ${input.region}`);
  lines.push(`Primary technology: ${input.techDisplay}`);
  if (input.yearsInBusiness) lines.push(`Years in business: ${input.yearsInBusiness}`);
  if (input.bio) lines.push(`About-us bio:\n${input.bio}`);
  lines.push("");
  lines.push("Interview answers (the installer answered these questions):");
  for (let i = 0; i < input.questions.length; i++) {
    const q = input.questions[i];
    const a = (input.answers[i] ?? "").trim();
    if (!a) continue;
    lines.push("");
    lines.push(`Q${i + 1}. ${q}`);
    lines.push(`A: ${a}`);
  }
  lines.push("");
  lines.push(
    "Write the post per the rules. Output ONLY the JSON object, no prose around it.",
  );
  return lines.join("\n");
}

/** Parse Claude's JSON response defensively — it sometimes wraps
 *  the JSON in a markdown code fence even when told not to. */
function tryParseJson(text: string): unknown {
  // Strip ```json … ``` fencing if present.
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    return null;
  }
}

/** Lightweight slug builder — fallback when the model returns a
 *  malformed slug. */
function buildFallbackSlug(title: string, companyName: string): string {
  const base = (title || companyName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `installer-${Date.now().toString(36)}`;
}

export async function draftInstallerBlog(
  input: BlogDraftInput,
): Promise<BlogDraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const nonEmpty = input.answers.filter((a) => a.trim().length > 0);
  if (nonEmpty.length < 3) {
    throw new Error("Need at least 3 substantive answers to draft a post");
  }

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPromptForDraft(input) }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  const parsed = tryParseJson(textBlock.text);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).title !== "string" ||
    typeof (parsed as Record<string, unknown>).markdown !== "string"
  ) {
    throw new Error(
      "Claude returned an unparseable response — re-roll the draft",
    );
  }
  const obj = parsed as {
    title: string;
    slug?: string;
    excerpt?: string;
    markdown: string;
  };
  const slug =
    obj.slug && /^[a-z0-9-]+$/.test(obj.slug)
      ? obj.slug
      : buildFallbackSlug(obj.title, input.companyName);
  return {
    title: obj.title.trim(),
    slug,
    excerpt:
      (obj.excerpt ?? "").trim().slice(0, 200) ||
      `${input.companyName} on ${input.techDisplay} in ${input.region}.`,
    markdown: obj.markdown.trim(),
  };
}

/** The 6 questions used for the interview. Single source of truth —
 *  the questions page renders these + the draft prompt uses them
 *  to give Claude context per answer. */
export const INTERVIEW_QUESTIONS: readonly string[] = [
  "What's the most common misconception your customers have about your primary technology?",
  "What's a recent install you're particularly proud of, and why?",
  "What's the single biggest mistake you see other installers making?",
  "What should a homeowner know before getting quotes that nobody tells them?",
  "How has your region's market changed in the last 2 years?",
  "If you could change one thing about how the industry sells your primary technology, what would it be?",
];
