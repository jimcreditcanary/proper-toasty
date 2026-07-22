-- 079_blog_posts_sources.sql
--
-- Adds a `sources` JSONB column to public.blog_posts so blog posts
-- can carry the same visible citation list guides + comparisons
-- already do (via AEOPage + SourcesList).
--
-- The 17 Jul SEO audit called this out as item 21:
--
--   "Add a Sources section component to blog posts (guides and
--    comparisons already have them; blog posts cite nothing)."
--
-- Shape: array of SourceEntry rows matching src/lib/seo/validators.ts:
--
--   [
--     { "name": "GOV.UK — Boiler Upgrade Scheme",
--       "url":  "https://www.gov.uk/apply-boiler-upgrade-scheme",
--       "accessedDate": "May 2026" },
--     ...
--   ]
--
-- Nullable. When null the blog [slug] page skips the SourcesList
-- entirely rather than rendering an empty section — so we can ship
-- the plumbing now and backfill citations gradually.
--
-- Idempotent.

alter table public.blog_posts
  add column if not exists sources jsonb;

comment on column public.blog_posts.sources is
  'Visible citation list rendered by SourcesList at the foot of the post. Shape: array of { name, url, accessedDate? } — matches SourceEntry in src/lib/seo/validators.ts. NULL = no sources block rendered (safe default; backfill gradually).';

notify pgrst, 'reload schema';
