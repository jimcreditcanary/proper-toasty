-- Audit log for the weekly blog auto-generator
-- (/api/cron/blog-generator).
--
-- Every run — successful publish OR rejected draft OR error — lands
-- here so we can see:
--   1. How often the guardrail rejects (tune the prompt if high)
--   2. Which pillars have thinnest topic coverage (feed back into
--      the topic picker's exclusion list)
--   3. What blog_post_slug each successful run produced (audit vs
--      what's live on the site)

begin;

create table if not exists public.blog_gen_runs (
  id uuid primary key default gen_random_uuid(),

  -- Pillar rotation source of truth. Matches the social agent's
  -- pillar taxonomy so metrics stitch across the two systems.
  pillar text not null
    check (pillar in ('heat_pump', 'solar', 'plug_in_solar', 'boiler_vs_hp')),

  -- The topic the picker landed on. Human-readable ("Do heat
  -- pumps handle a UK cold snap?") — never a slug, never a URL.
  topic text not null,

  -- On success: the slug of the row inserted into blog_posts.
  -- On rejection / error: null.
  blog_post_slug text,

  -- One of: 'published' | 'rejected' | 'error'
  status text not null
    check (status in ('published', 'rejected', 'error')),

  -- Guardrail rejection reason OR error message. Null on success.
  error text,

  -- Word count of the drafted content (post-HTML-strip). Helps
  -- track whether drafts trend to the target 1200-2000 word range.
  word_count integer,

  created_at timestamptz not null default now()
);

create index if not exists blog_gen_runs_created_idx
  on public.blog_gen_runs (created_at desc);

create index if not exists blog_gen_runs_pillar_idx
  on public.blog_gen_runs (pillar, created_at desc);

comment on table public.blog_gen_runs is
  'Audit log of every weekly blog-generator run — published, rejected, or errored. Feeds the topic picker (avoid recent slugs) and the guardrail-tuning dashboard.';

commit;
