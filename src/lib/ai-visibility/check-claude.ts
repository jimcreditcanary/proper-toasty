// Anthropic Claude + web_search caller for AI visibility tracking.
//
// Runs a single user-style query through Claude with the web_search
// tool enabled, captures every cited URL, and reports whether our
// domain shows up among them.
//
// Pricing notes (May 2026):
//   - claude-sonnet-4-5: $3 / 1M input tokens, $15 / 1M output
//   - web_search: $10 / 1000 searches, hard-capped per call by max_uses
// At 50 queries × max_uses=3 = 150 searches per run = $1.50 + a few
// pence of tokens. Trivial. Weekly cron = ~£30/year.

import Anthropic from "@anthropic-ai/sdk";

export interface ClaudeCitation {
  url: string;
  title: string | null;
  snippet: string;
}

export interface ClaudeCheckResult {
  query: string;
  /** Every cited URL Claude surfaced, in order of first appearance. */
  citations: ClaudeCitation[];
  /** Whether any citation URL contains our domain. */
  citedUs: boolean;
  /** 1-based position in `citations` when citedUs; null otherwise. */
  citedPosition: number | null;
  /** First snippet that cites us, when citedUs; null otherwise. */
  citedSnippet: string | null;
  /** Final assembled text the model emitted (sans tool_use blocks). */
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  /** Count of web_search tool calls actually used. */
  webSearchesUsed: number;
}

/** Domains that count as "us". Hostname must match exactly OR end with
 *  `.${domain}` so subdomains count. */
const OUR_DOMAINS = ["propertoasty.com"];

function isUsUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return OUR_DOMAINS.some(
      (d) => host === d || host.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

/**
 * Build the Anthropic client. Reads ANTHROPIC_API_KEY from env.
 * Throws if missing.
 */
function makeClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Add to .env.local from Vercel env (same key already in prod).",
    );
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Query Claude with web search enabled. Returns the parsed citation
 * shape + our-domain hit detection.
 *
 * Failures (network, rate-limit, invalid key) propagate as thrown
 * errors; the orchestrator catches per-query so a single failure
 * doesn't kill the whole run.
 */
export async function checkClaude(query: string): Promise<ClaudeCheckResult> {
  const client = makeClient();

  const resp = await client.messages.create({
    // Sonnet is cheap + plenty smart for citation extraction. If
    // we ever want to track Opus-class citations separately, mint
    // a parallel runner under a new engine slug.
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [
      {
        // 20260209 is the current major version of the web_search tool
        // (Feb 2026 release). 20250305 also exists for back-compat;
        // we use the newer one for better citation fidelity.
        type: "web_search_20260209" as never,
        name: "web_search",
        // Cap per-query search count to keep cost predictable. 3 is
        // enough for the LLM to triangulate most answers; more becomes
        // diminishing returns.
        max_uses: 3,
      } as never,
    ],
    messages: [
      {
        role: "user",
        // Frame the prompt naturally so Claude treats it as a real
        // user question + cites organically — NOT as "list the top
        // sources for X" which would bias toward listicle-style
        // citation behaviour.
        content: query,
      },
    ],
  });

  // Walk the response content blocks. Two sources of URLs:
  //
  //   1. `web_search_tool_result` blocks contain the raw search
  //      results Claude looked at (~10 URLs per search). The MODEL
  //      doesn't always cite these inline (sometimes it gets
  //      distracted trying to run code_execution against them and
  //      ends up writing prose without citation markers). But these
  //      ARE the URLs Claude considered authoritative enough to
  //      surface.
  //
  //   2. `citations` arrays on text blocks — inline citation
  //      markers when the model DID structure its answer with them.
  //      These count for higher salience.
  //
  // We extract both, dedupe by URL, preserve first-appearance order
  // (search results first, then any inline-cited URLs not already
  // seen). Whichever path our domain shows up on counts as "cited"
  // for visibility tracking — both are signals Claude considered us
  // relevant to the query.

  const citations: ClaudeCitation[] = [];
  const seenUrls = new Set<string>();
  let responseText = "";
  let webSearchesUsed = 0;

  function pushCitation(url: string, title: string | null, snippet: string) {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    citations.push({ url, title, snippet });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const block of resp.content as any[]) {
    if (block.type === "text") {
      responseText += block.text ?? "";
      const cites = block.citations as
        | Array<{
            type: string;
            url?: string;
            title?: string | null;
            cited_text?: string;
          }>
        | undefined;
      if (cites) {
        for (const c of cites) {
          if (c.type !== "web_search_result_location") continue;
          pushCitation(c.url ?? "", c.title ?? null, c.cited_text ?? "");
        }
      }
    } else if (block.type === "server_tool_use" || block.type === "tool_use") {
      if (block.name === "web_search") webSearchesUsed += 1;
    } else if (block.type === "web_search_tool_result") {
      // Pull URLs straight from the search-result list. Each entry
      // is { type: "web_search_result", title, url, encrypted_content }.
      // We treat appearing-in-search-results as a "cite" because:
      //   - It's the prerequisite for inline citation
      //   - For visibility tracking it's the meaningful signal
      //   - Inline citations also point at these same URLs when
      //     present; dedup keeps the count honest.
      const content = block.content;
      if (Array.isArray(content)) {
        for (const r of content) {
          if (r?.type === "web_search_result" && r.url) {
            pushCitation(
              r.url,
              r.title ?? null,
              "", // search results don't carry a quoted snippet;
              // inline citations might add one for the same URL later.
            );
          }
        }
      }
    }
  }

  // Find our position in the cited list.
  const usIdx = citations.findIndex((c) => isUsUrl(c.url));
  const citedUs = usIdx >= 0;

  return {
    query,
    citations,
    citedUs,
    citedPosition: citedUs ? usIdx + 1 : null,
    citedSnippet: citedUs ? citations[usIdx].snippet : null,
    responseText,
    inputTokens: resp.usage?.input_tokens ?? 0,
    outputTokens: resp.usage?.output_tokens ?? 0,
    webSearchesUsed,
  };
}
