-- 062_ai_visibility_checks.sql
--
-- AI search visibility tracking. One row per (query, engine, ran_at)
-- triple. Populated by scripts/ai-visibility/run-check.ts which calls
-- the Anthropic API (web search enabled) for each of our top target
-- queries, parses the citations, and logs whether propertoasty.com
-- appears among the cited sources.
--
-- Engines we track:
--   - 'claude-web-search'  (Anthropic web_search tool — works today)
--   - 'perplexity-api'     (Perplexity API — when paid key is added)
--   - 'openai-search'      (OpenAI search-enabled responses)
--   - 'gemini'             (Google Gemini API with search grounding)
--
-- Read path: admin dashboard at /admin/ai-visibility queries this
-- table for recent runs + the cited-us trend over time.
--
-- WIPE PROTECTION: not strictly needed — losing this data costs us
-- one rerun of the script (~£0.30 of API spend). But sensible to
-- preserve historical trend, so add to wipe-script keep-list when
-- next touching it.

create table if not exists public.ai_visibility_checks (
  id bigserial primary key,
  ran_at timestamptz not null default now(),

  -- The exact query string we sent to the engine.
  query text not null,

  -- One of the engine slugs listed in the file header.
  engine text not null,

  -- Array of cited URLs the engine surfaced in its response.
  -- Each entry: { url, title, snippet }. JSONB so we can query
  -- across runs (e.g. "which competitor domains rank most often?").
  cited_urls jsonb not null default '[]',

  -- True if any cited URL contained our domain. Pulled out of
  -- cited_urls for fast aggregation queries.
  cited_us boolean not null default false,

  -- 1-based position in cited_urls when cited_us = true, else null.
  cited_position int,

  -- Quoted snippet around the citation (~150 chars) for human
  -- review of what the AI actually said about us.
  cited_snippet text,

  -- Full text the engine returned (for analysis + auditing).
  -- May be long; not indexed.
  response_text text,

  -- Token + cost accounting from the engine.
  input_tokens int,
  output_tokens int,
  /** Number of web searches the engine performed. */
  web_searches_used int,

  -- Set when the API call errored — engine returns null cited_urls,
  -- cited_us=false. Lets the dashboard surface "we failed to check"
  -- distinctly from "we checked and weren't cited".
  error_message text
);

-- Fast lookup for the dashboard's "latest run per query" query.
create index if not exists ai_visibility_checks_query_idx
  on public.ai_visibility_checks (query, ran_at desc);

-- "Recent runs per engine" — engine-level overview chart.
create index if not exists ai_visibility_checks_engine_idx
  on public.ai_visibility_checks (engine, ran_at desc);

-- "When did we get cited?" — sparse index; only stores cited rows.
create index if not exists ai_visibility_checks_cited_idx
  on public.ai_visibility_checks (ran_at desc)
  where cited_us = true;

comment on table public.ai_visibility_checks is
  'AI search-visibility tracking. One row per (query, engine, ran_at). Read by /admin/ai-visibility dashboard.';
