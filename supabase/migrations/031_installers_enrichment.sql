-- 031: Companies House years-in-business + Checkatrade reviews enrichment
--
-- Two new data sources for the installer directory:
--   1. Companies House — pulls incorporation_date for installers we've
--      matched to a Companies House record (company_number column).
--      One-shot enrichment via scripts/enrich-installers-companies-house.ts.
--      Refresh annually (years_in_business drifts as time passes).
--
--   2. Checkatrade — best-effort scrape of the public search results.
--      Cached 90 days per installer. NULL = no match found OR scrape
--      failed. UI treats NULL as "no reviews yet" — no scary "0/5" star
--      display.
--
-- companies_house_status / checkatrade_status carry the last attempt's
-- outcome ("ok" / "not_found" / "rate_limited" / "error: <msg>") so the
-- enrichment scripts can be re-run idempotently and the dashboard can
-- show coverage stats.

alter table public.installers
  add column if not exists incorporation_date date,
  add column if not exists years_in_business smallint,
  add column if not exists companies_house_fetched_at timestamptz,
  add column if not exists companies_house_status text,
  add column if not exists checkatrade_score numeric(2,1)
    check (checkatrade_score is null or (checkatrade_score >= 0 and checkatrade_score <= 5)),
  add column if not exists checkatrade_review_count integer
    check (checkatrade_review_count is null or checkatrade_review_count >= 0),
  add column if not exists checkatrade_url text,
  add column if not exists checkatrade_fetched_at timestamptz,
  add column if not exists checkatrade_status text;

create index if not exists installers_years_in_business_idx
  on public.installers (years_in_business desc)
  where years_in_business is not null;

create index if not exists installers_checkatrade_score_idx
  on public.installers (checkatrade_score desc)
  where checkatrade_score is not null;

-- Plain index on checkatrade_fetched_at — Postgres rejects predicates
-- using now() (it's STABLE, not IMMUTABLE), so we can't pre-filter to
-- "stale only" at index time. The planner still uses this index for
-- "where checkatrade_fetched_at is null or < <ts>" queries.
create index if not exists installers_checkatrade_fetched_at_idx
  on public.installers (checkatrade_fetched_at);

comment on column public.installers.years_in_business is
  'Computed from Companies House date_of_creation at enrichment time. Refreshed annually via the enrichment script.';
comment on column public.installers.checkatrade_score is
  'Best-effort scrape from checkatrade.com search. Cached 90 days. NULL = no match found, or scrape failed. Treat NULL as "no reviews yet" in the UI.';
