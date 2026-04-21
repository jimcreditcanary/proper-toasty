-- Capture the full Postcoder address record on each check so we can match
-- the EPC exactly (via UPRN) and persist the lat/lng + town for reports.
-- Drops the now-unused google_place_id column from the Google Places era.

alter table public.checks
  add column if not exists uprn text,
  add column if not exists udprn text,
  add column if not exists address_line2 text,
  add column if not exists post_town text;

alter table public.checks drop column if exists google_place_id;

create index if not exists checks_uprn_idx on public.checks(uprn) where uprn is not null;

-- Update the base SQL migration (022) going forward so fresh Supabase projects
-- don't need both 022 + 023 applied — but 023 is the canonical delta for
-- anyone whose DB already ran 022.
