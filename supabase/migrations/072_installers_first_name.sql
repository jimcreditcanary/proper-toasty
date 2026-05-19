-- 071: first-name enrichment for outreach personalisation
--
-- PR #76 added a Mustachio-style `{{#first_name}}…{{/first_name}}`
-- conditional in subject_variants so missing names produce a clean
-- "Quick question" rather than "Quick question, ". What's still
-- missing is the actual `first_name` data — `bestEffortFirstName`
-- in src/lib/outreach/merge-vars.ts currently extracts from the
-- company name, which produces awkward results ("Ealing" for
-- "Ealing Solar Co.") and never returns null, so the conditional
-- always fires.
--
-- This migration adds two columns:
--
--   first_name           — the enriched first name (nullable).
--                          Title-cased. Bounded to 30 chars by the
--                          enrichment script's sanity rules.
--   first_name_source    — provenance, one of:
--                            'email_local_part' — split on . _ -
--                              and matched the personal-name pattern,
--                              optionally LLM-confirmed
--                            'companies_house_director' — single
--                              active director or most-recently-
--                              appointed
--                            'manual' — set via admin tooling, do
--                              not overwrite on re-enrichment
--                            NULL — no first_name yet
--
-- The enrichment script at scripts/outreach/enrich-installer-names.ts
-- is idempotent: it skips rows that already have first_name unless
-- `--force` is passed, and it ALWAYS skips first_name_source='manual'
-- regardless of --force.

alter table public.installers
  add column if not exists first_name text,
  add column if not exists first_name_source text
    check (first_name_source is null or first_name_source in (
      'email_local_part',
      'companies_house_director',
      'manual'
    ));

comment on column public.installers.first_name is
  'Best-effort personal first name for outreach personalisation. NULL when no confident source is available. Title-cased, max 30 chars. Populated by scripts/outreach/enrich-installer-names.ts.';
comment on column public.installers.first_name_source is
  'Provenance of first_name: email_local_part | companies_house_director | manual. Manual rows are never auto-overwritten.';

-- Partial index — only used by audit queries that filter on the
-- presence of an enriched name. Keeps the index tiny relative to
-- the full table.
create index if not exists installers_first_name_idx
  on public.installers (first_name)
  where first_name is not null;

notify pgrst, 'reload schema';
