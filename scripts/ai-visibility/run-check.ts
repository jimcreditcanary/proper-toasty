#!/usr/bin/env tsx
//
// AI visibility check runner. For each TARGET_QUERY, calls Claude
// (web search enabled), extracts citations, logs to
// public.ai_visibility_checks.
//
// Usage:
//
//   # Full run (~50 queries × ~5s each + throttle = ~5 min)
//   npx tsx scripts/ai-visibility/run-check.ts
//
//   # Single query for debugging
//   npx tsx scripts/ai-visibility/run-check.ts --query "Heat pump vs gas boiler"
//
//   # Limit to first N queries (for fast iteration)
//   npx tsx scripts/ai-visibility/run-check.ts --limit 5
//
// Env vars (ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY) are loaded from .env.local via the
// in-script loader at the top — no `--env-file` flag needed.
//
// COST: ~£0.30 per full run (50 queries × 3 web_searches × $0.01 +
// token cost). Weekly cron = ~£15/year. Trivial.
//
// FUTURE: when paid Perplexity / OpenAI / Gemini keys land, add a
// per-engine runner here. Each engine writes a row per (query, engine,
// ran_at) so trends stay separable.

import "../../src/lib/dev/load-env";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { TARGET_QUERIES, type TargetQuery } from "../../src/lib/ai-visibility/queries";
import { checkClaude } from "../../src/lib/ai-visibility/check-claude";

interface CliOpts {
  query: string | null;
  limit: number | null;
}

function parseArgs(): CliOpts {
  const args = process.argv.slice(2);
  let query: string | null = null;
  let limit: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--query") {
      query = args[i + 1] ?? null;
      i++;
    } else if (args[i] === "--limit") {
      limit = parseInt(args[i + 1] ?? "0", 10);
      i++;
    }
  }
  return { query, limit };
}

// ~2 second gap between queries — well below Anthropic's per-tier
// rate limits, and gives the web_search backend a moment between
// hits.
const MIN_GAP_MS = 2000;
let lastAt = 0;
async function throttle(): Promise<void> {
  const wait = MIN_GAP_MS - (Date.now() - lastAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastAt = Date.now();
}

async function runOne(target: TargetQuery): Promise<{
  ok: boolean;
  citedUs: boolean;
  position: number | null;
}> {
  await throttle();
  const startedAt = Date.now();
  try {
    const result = await checkClaude(target.query);
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from("ai_visibility_checks").insert({
      query: target.query,
      engine: "claude-web-search",
      cited_urls: result.citations,
      cited_us: result.citedUs,
      cited_position: result.citedPosition,
      cited_snippet: result.citedSnippet,
      response_text: result.responseText,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      web_searches_used: result.webSearchesUsed,
    });
    if (error) {
      console.error(`  ! db insert failed: ${error.message}`);
      return { ok: false, citedUs: false, position: null };
    }
    const ms = Date.now() - startedAt;
    const mark = result.citedUs ? "✓ CITED" : "  ";
    const pos = result.citedPosition != null ? ` (#${result.citedPosition})` : "";
    console.log(
      `  ${mark}${pos.padEnd(7)}  ${target.query.slice(0, 65).padEnd(65)}  ${result.citations.length} cited, ${ms}ms`,
    );
    return {
      ok: true,
      citedUs: result.citedUs,
      position: result.citedPosition,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${target.query.slice(0, 65)}  → ${msg.slice(0, 100)}`);
    // Log the failure so the dashboard shows attempted-but-failed
    // distinctly from "we got cited at position 0".
    try {
      const admin = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("ai_visibility_checks").insert({
        query: target.query,
        engine: "claude-web-search",
        cited_urls: [],
        cited_us: false,
        error_message: msg.slice(0, 500),
      });
    } catch (logErr) {
      console.error("  ! couldn't log failure", logErr);
    }
    return { ok: false, citedUs: false, position: null };
  }
}

async function main() {
  const opts = parseArgs();

  let list: TargetQuery[] = TARGET_QUERIES;
  if (opts.query) {
    list = [{ query: opts.query, category: "tech" }];
  } else if (opts.limit) {
    list = TARGET_QUERIES.slice(0, opts.limit);
  }

  console.log(
    `\nAI visibility run — Claude web_search · ${list.length} queries\n`,
  );

  let cited = 0;
  let ok = 0;
  let fail = 0;
  const positions: number[] = [];

  for (const target of list) {
    const res = await runOne(target);
    if (res.ok) ok += 1;
    else fail += 1;
    if (res.citedUs) {
      cited += 1;
      if (res.position != null) positions.push(res.position);
    }
  }

  console.log("\n──── summary ────");
  console.log(`  Queries attempted:  ${list.length}`);
  console.log(`  Succeeded:          ${ok}`);
  console.log(`  Failed:             ${fail}`);
  console.log(
    `  Cited propertoasty: ${cited} (${list.length > 0 ? ((cited / list.length) * 100).toFixed(0) : 0}%)`,
  );
  if (positions.length > 0) {
    const avg = positions.reduce((a, b) => a + b, 0) / positions.length;
    console.log(`  Avg cited position: ${avg.toFixed(1)}`);
  }
  console.log("");
  console.log(
    "  Open /admin/ai-visibility on the deployed site to browse results.",
  );
  console.log("");
}

main().catch((err) => {
  console.error("Crashed:", err);
  process.exit(2);
});
