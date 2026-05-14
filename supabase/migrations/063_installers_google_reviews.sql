-- 063: Google reviews data for installer cards.
--
-- Adds the on-demand Google Places API cache fields to the installers
-- table. Pattern mirrors m031 (Checkatrade) — value + count + URL
-- equivalent (place_id) + fetched_at + status. The on-demand refresh
-- endpoint reads the cached row and only re-fetches when captured_at
-- is older than the TTL (30 days per Google ToS).
--
-- google_place_id is the stable Google Places handle; resolved ONCE
-- via Places API "Text Search" by company_name + postcode, then
-- cached forever (place_id is stable across business lifecycle changes;
-- only Google's own merge/split actions invalidate it).
--
-- google_status carries the last attempt's outcome ('ok' / 'not_found' /
-- 'quota_exceeded' / 'error: <msg>') matching the Checkatrade pattern.
-- The UI treats anything except 'ok' as "hide the Google rating row"
-- — no scary "0 stars" displays for installers we couldn't match.

alter table public.installers
  add column if not exists google_place_id text,
  add column if not exists google_rating numeric(2,1)
    check (google_rating is null or (google_rating >= 0 and google_rating <= 5)),
  add column if not exists google_review_count integer
    check (google_review_count is null or google_review_count >= 0),
  add column if not exists google_captured_at timestamptz,
  add column if not exists google_status text;

-- Sort installers by Google rating on town pages where rating is
-- known. NULLS LAST so unrated installers still appear in the list,
-- just not at the top.
create index if not exists installers_google_rating_idx
  on public.installers (google_rating desc)
  where google_rating is not null;

-- The on-demand refresh job uses this to find installers whose Google
-- data has gone stale (captured_at is null OR < cutoff). Plain index
-- because Postgres won't accept now()-based predicates on partial
-- indexes (STABLE, not IMMUTABLE).
create index if not exists installers_google_captured_at_idx
  on public.installers (google_captured_at);

-- Allow lookup by place_id (e.g. if we need to find an installer when
-- Google sends us a webhook keyed on place_id, or for admin
-- de-duplication tooling). Non-unique because two MCS-certified
-- installers occasionally map to the same Google Business listing
-- (parent company + trading-as variations).
create index if not exists installers_google_place_id_idx
  on public.installers (google_place_id)
  where google_place_id is not null;

comment on column public.installers.google_place_id is
  'Stable Google Places API handle. Resolved once via Text Search by company_name + postcode, then cached indefinitely. NULL = not yet resolved OR no Google Business listing matched.';
comment on column public.installers.google_rating is
  'Latest Google rating (0–5) from Places API Place Details. Refreshed on-demand when an installer card is rendered with stale data. NULL = not fetched yet OR business has no rating yet.';
comment on column public.installers.google_review_count is
  'Latest Google user rating count. NULL semantics same as google_rating.';
comment on column public.installers.google_captured_at is
  'When the rating + review count were last successfully fetched. Drives the on-demand staleness check. TTL: 30 days.';
comment on column public.installers.google_status is
  'Outcome of the last fetch attempt: ''ok'' | ''not_found'' | ''quota_exceeded'' | ''error: <msg>''. UI hides the rating row when status != ''ok''.';
