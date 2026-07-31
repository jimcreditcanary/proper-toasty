-- Social-agent post log. Every post the daily social agent
-- publishes (or attempts to publish) lands here, so we can:
--   1. Prevent duplicate posts of the same blog on the same
--      platform inside a rolling window.
--   2. Feed a simple admin dashboard showing cadence + drop rate.
--   3. Correlate with Vercel Analytics journey_started events
--      via the UTM stamped on each link.
--
-- No RLS — table is admin-only, only /api/cron/social-agent and
-- future admin routes touch it (both use the service-role client).

begin;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),

  -- Which social channel. Keep the enum tight so the Buffer
  -- client + prompts + guardrail all speak the same vocabulary.
  platform text not null
    check (platform in ('linkedin', 'twitter', 'facebook', 'instagram')),

  -- Pillar rotation source of truth. 'blog' covers the Sunday
  -- variety slot where we lift straight from a new post without
  -- forcing a pillar theme.
  pillar text not null
    check (pillar in ('heat_pump', 'solar', 'plug_in_solar', 'blog')),

  -- Optional back-reference to the /blog post the copy was
  -- distilled from. Kept as slug (text) rather than FK so a
  -- retired blog post doesn't cascade-delete the audit trail.
  blog_post_slug text,

  -- What actually got posted. Never mutate — this is the audit
  -- record of what went out.
  content text not null,

  -- Landing URL (with UTMs). Not-null so an entry is always
  -- funnel-attributable.
  link_url text not null,

  -- Buffer's own update id. Populated on success, null on
  -- failure. Useful for reading engagement stats back later.
  buffer_update_id text,

  -- LLM factual-guardrail verdict. false = the skeptic pass
  -- rejected the draft; the row is kept as a rejection record
  -- but nothing was posted (buffer_update_id stays null).
  factual_check_passed boolean not null default true,

  -- On error / rejection, the reason. Useful for tuning prompts
  -- and for the runbook when a run misfires.
  error text,

  posted_at timestamptz not null default now()
);

-- Query pattern: "posts for platform X in the last N days" —
-- used by the duplicate check + the cadence view.
create index if not exists social_posts_platform_posted_idx
  on public.social_posts (platform, posted_at desc);

-- Query pattern: "have we already posted about blog X on
-- platform Y in the last 14 days?" — prevents the same blog
-- getting spammed across a fortnight.
create index if not exists social_posts_slug_platform_idx
  on public.social_posts (blog_post_slug, platform, posted_at desc)
  where blog_post_slug is not null;

comment on table public.social_posts is
  'Audit log of every post attempted by the daily social agent (cron /api/cron/social-agent). Includes rejections so the guardrail miss rate is observable.';

commit;
