// /robots.txt — Next.js App Router robots convention.
//
// Two-tier rules:
//
//   1. Default `*` block — marketing crawlable, every auth-gated / private
//      / API route disallowed. Same policy as before.
//
//   2. Explicit per-bot ALLOW blocks for AI training / answer-engine
//      crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.).
//      We WANT these to ingest the public surface — that's the whole
//      point of the AI-first SEO push. Naming each one removes any
//      ambiguity (a few interpret "no explicit rule" as "stay clear")
//      and lets us throttle individuals later without touching the
//      catch-all.
//
// robots.txt rules are independent per user-agent — a bot matched by
// a specific block ignores the `*` block entirely. So each AI block
// re-states the SHARED_DISALLOW list; otherwise GPTBot would happily
// crawl /admin, /installer, /dashboard etc.
//
// Path scoping notes:
//   - "/check" intentionally allowed (the entry-point landing is
//     public + fine to index); the parameterised variants
//     (/check?presurvey=…, /check?step=…) get noindex'd at the page
//     level when they exist. Disallow here would block crawlers
//     from following sitemap nav.
//   - "/api/" disallow stops crawlers wasting budget on JSON
//     endpoints — important because we have several public ones
//     (epc lookup, places autocomplete) that would otherwise look
//     like indexable URLs.
//
// Authority for each AI user-agent token:
//   - GPTBot              https://platform.openai.com/docs/gptbot
//   - OAI-SearchBot       OpenAI's search-index crawler (distinct from GPTBot)
//   - ChatGPT-User        Fired on-demand when a user asks ChatGPT
//                         to fetch a URL — NOT a background crawler;
//                         still listed so the policy is unambiguous.
//   - ClaudeBot           https://www.anthropic.com/news/web-crawler
//   - anthropic-ai        Legacy Anthropic UA; kept for safety.
//   - PerplexityBot       https://docs.perplexity.ai/guides/bots
//   - Perplexity-User     On-demand fetch from a Perplexity user query.
//   - Google-Extended     https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers#google-extended
//                         (controls training + AI Overview use; distinct
//                         from Googlebot which handles core search.)
//   - Applebot-Extended   Apple's AI training crawler (Apple Intelligence /
//                         Siri summaries opt-in.)
//   - CCBot               CommonCrawl, the substrate most open LLMs train on.
//   - DuckAssistBot       DuckDuckGo's AI assistant crawler.
//   - Bytespider          ByteDance's training crawler.
//   - Amazonbot           Amazon's AI / Alexa crawler.
//   - Meta-ExternalAgent  Meta's training crawler.
//
// To verify: curl https://www.propertoasty.com/robots.txt
// To verify per-bot rendering: npm run audit:crawlers

import type { MetadataRoute } from "next";

const SITE_URL = "https://www.propertoasty.com";

// Single source of truth for routes we never want ingested by anyone —
// auth flows, private portals, share-link tokens, API surface. Each
// per-bot block reuses this list so we never accidentally widen access
// for one crawler.
const SHARED_DISALLOW = [
  "/api/",
  "/auth/",
  "/admin/",
  "/installer/",
  "/dashboard/",
  "/r/",
  "/lead/",
  "/p/",
  // Trailing-slash variants for crawlers that strip them.
  "/admin",
  "/installer",
  "/dashboard",
];

// AI training / answer-engine crawler user-agents we explicitly invite.
// Order is irrelevant for robots.txt itself — kept rough provider-grouped
// for readability.
const AI_USER_AGENTS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google (training-specific; Googlebot continues to crawl under `*`)
  "Google-Extended",
  // Apple
  "Applebot-Extended",
  // CommonCrawl (substrate for most open LLM training sets)
  "CCBot",
  // DuckDuckGo
  "DuckAssistBot",
  // ByteDance
  "Bytespider",
  // Amazon
  "Amazonbot",
  // Meta
  "Meta-ExternalAgent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default catch-all — existing site-wide policy.
      {
        userAgent: "*",
        allow: ["/"],
        disallow: SHARED_DISALLOW,
      },
      // Explicit allow per AI crawler, with the same private-route
      // disallows. Restating SHARED_DISALLOW is intentional — see the
      // top-of-file note on per-UA rule independence.
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: ["/"],
        disallow: SHARED_DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
