-- 073: surface first_name on the outreach_eligibility view
--
-- Migration 072 added installers.first_name. PRs #77 / #80 / #81
-- enriched 5,193 / 5,634 rows (92%). The remaining 441 stay NULL
-- until we hand-enrich or pull from LinkedIn — they are still
-- eligible for outreach, just without name personalisation.
--
-- During warmup we want named installers to flow first so the
-- subject "Quick question, James" beats the unnamed fallback
-- "Quick question" while volumes are small. select-batch reads
-- first_name from this view to do that ordering.
--
-- first_name is appended at the END of the projection. CREATE OR
-- REPLACE VIEW only allows new columns to be added at the tail —
-- inserting in the middle reads as a rename and Postgres refuses
-- (42P16: "cannot change name of view column ..."). Column order
-- doesn't matter to the consumer (named .select() in the route).

create or replace view public.outreach_eligibility as
  select
    i.id as installer_id,
    i.email,
    i.company_name,
    i.postcode,
    coalesce(i.checkatrade_score, i.google_rating, 0)
      * ln(coalesce(i.checkatrade_review_count, 0)
           + coalesce(i.google_review_count, 0) + 1) as quality_score,
    i.first_name
  from public.installers i
 where i.email is not null
   and i.email <> ''
   and i.user_id is null
   and lower(i.email) !~ '^(postmaster|abuse|noreply|no-reply|spamtrap|webmaster|hostmaster)@'
   and not exists (
     select 1 from public.outreach_suppression s
      where lower(s.email) = lower(i.email)
   )
   and not exists (
     select 1
       from public.outreach_recipients r
       join public.outreach_campaigns c on c.id = r.campaign_id
      where r.installer_id = i.id
        and c.status in ('draft', 'active', 'paused')
   );

comment on view public.outreach_eligibility is
  'Installers eligible for fresh outreach. Filters: has email, not yet a user, not suppressed, not already enrolled in any non-complete campaign. Now exposes first_name so select-batch can prefer named installers during warmup.';

notify pgrst, 'reload schema';
