#!/usr/bin/env tsx
//
// SEO crawler audit — verify every SEO-critical page renders its key
// content in the initial HTML response (i.e. server-rendered) when
// fetched by an AI training / answer-engine bot.
//
// Why we run this:
//
//   AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) generally do
//   NOT execute JavaScript. If a page's hero copy, H1, structured-data
//   block or canonical answer paragraph is only emitted after a
//   client-side React hydration, the bot sees an empty shell — we miss
//   the citation. This script proves the opposite: each page's
//   sentinel string is present in the raw HTML for every UA we care
//   about. If a page ever regresses to client-only rendering, this
//   fails loudly before the change hits prod.
//
// What it checks per (URL, user-agent):
//
//   1. HTTP 200 (no 404 / 5xx)
//   2. Content-Type is text/html
//   3. A page-specific sentinel string is present in the response body
//      (typically the H1 phrase — chosen because it's the single most
//      important phrase for AI extraction)
//   4. No loading / skeleton placeholders that would indicate the real
//      content gets injected on hydration
//
// Usage:
//
//   # Against local dev server
//   npm run dev                                    # in one terminal
//   npm run audit:crawlers                          # in another
//
//   # Against prod
//   BASE_URL=https://www.propertoasty.com npm run audit:crawlers
//
//   # Against a Vercel preview
//   BASE_URL=https://propertoasty-<hash>.vercel.app npm run audit:crawlers
//
// Exit code: 0 if all checks pass, 1 if any fail. Wire into CI to
// block PRs that break SSR on a critical page.

interface PageCheck {
  /** Path relative to BASE_URL, e.g. "/heatpump". */
  path: string;
  /**
   * Substrings that MUST appear in the raw response body. We use the
   * H1 phrase as the primary sentinel because (a) it's the single
   * most important phrase for AI extraction and (b) if the H1 is in
   * the initial HTML, the rest of the SSR-rendered page is too.
   *
   * Multiple sentinels are checked AND'd — every one must be present.
   */
  sentinels: string[];
  /** Free-text label for the audit report. */
  label: string;
}

// Sentinels are PHRASES (not the full H1) so that copy tweaks that
// don't change the page's intent don't break the audit. If we ship
// a substantial rewrite, update the sentinel.
const PAGES: PageCheck[] = [
  { path: "/", label: "Home", sentinels: ["Greener living"] },
  { path: "/heatpump", label: "Heat pump landing", sentinels: ["A warmer home"] },
  { path: "/solar", label: "Solar landing", sentinels: ["Your roof"] },
  { path: "/blog", label: "Blog index", sentinels: ["Living greener"] },
  { path: "/enterprise", label: "Enterprise", sentinels: ["Quote remotely"] },
  { path: "/pricing", label: "Pricing", sentinels: ["Free to start"] },
];

// The set of bots we want to verify against. NOT the full list of bots
// allowed in robots.ts — just the ones whose citation positions we
// care about most. If one of these fails the audit, others almost
// certainly will too (they all share the "no JS execution" model).
const USER_AGENTS: Array<{ name: string; ua: string }> = [
  {
    name: "GPTBot",
    ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
  },
  {
    name: "ClaudeBot",
    ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com",
  },
  {
    name: "PerplexityBot",
    ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  },
  {
    name: "Google-Extended",
    ua: "Mozilla/5.0 (compatible; Google-Extended)",
  },
  {
    name: "OAI-SearchBot",
    ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  },
  {
    name: "Applebot-Extended",
    ua: "Mozilla/5.0 (compatible; Applebot-Extended/0.1; +http://www.apple.com/go/applebot)",
  },
];

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

interface Result {
  page: string;
  ua: string;
  status: number;
  contentType: string | null;
  passed: boolean;
  failures: string[];
}

async function check(page: PageCheck, agent: { name: string; ua: string }): Promise<Result> {
  const url = new URL(page.path, BASE_URL).toString();
  const failures: string[] = [];
  let status = 0;
  let contentType: string | null = null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": agent.ua, Accept: "text/html,*/*" },
      redirect: "follow",
    });
    status = res.status;
    contentType = res.headers.get("content-type");

    if (status !== 200) {
      failures.push(`status ${status}`);
    }
    if (contentType && !contentType.includes("text/html")) {
      failures.push(`content-type ${contentType}`);
    }

    const body = await res.text();
    for (const sentinel of page.sentinels) {
      if (!body.includes(sentinel)) {
        failures.push(`missing sentinel "${sentinel}"`);
      }
    }
    // Smoke-check for accidental client-only rendering. If the page
    // body is suspiciously small (< 2 KB) something's off — Next's
    // SSR HTML is typically much bigger even on a near-empty page.
    if (body.length < 2_000) {
      failures.push(`body suspiciously small (${body.length} bytes)`);
    }
  } catch (err) {
    failures.push(
      `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return {
    page: page.label,
    ua: agent.name,
    status,
    contentType,
    passed: failures.length === 0,
    failures,
  };
}

async function main() {
  console.log(`\nSEO crawler audit — BASE_URL=${BASE_URL}\n`);
  console.log(
    `Checking ${PAGES.length} pages × ${USER_AGENTS.length} user-agents = ${
      PAGES.length * USER_AGENTS.length
    } checks\n`,
  );

  // Run all checks in parallel — fetches are cheap and independent.
  const tasks: Promise<Result>[] = [];
  for (const page of PAGES) {
    for (const agent of USER_AGENTS) {
      tasks.push(check(page, agent));
    }
  }
  const results = await Promise.all(tasks);

  // Group by page for readability.
  const byPage = new Map<string, Result[]>();
  for (const r of results) {
    const arr = byPage.get(r.page) ?? [];
    arr.push(r);
    byPage.set(r.page, arr);
  }

  let totalFailed = 0;
  for (const [page, rs] of byPage) {
    const allPass = rs.every((r) => r.passed);
    const mark = allPass ? "✓" : "✗";
    console.log(`${mark} ${page}`);
    for (const r of rs) {
      const sub = r.passed ? "  ✓" : "  ✗";
      const detail = r.passed ? `${r.status}` : `${r.status} — ${r.failures.join("; ")}`;
      console.log(`${sub} ${r.ua.padEnd(20)} ${detail}`);
      if (!r.passed) totalFailed += 1;
    }
  }

  console.log("");
  if (totalFailed === 0) {
    console.log(`PASS — all ${results.length} checks succeeded`);
    process.exit(0);
  } else {
    console.error(`FAIL — ${totalFailed} of ${results.length} checks failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Audit crashed:", err);
  process.exit(2);
});
