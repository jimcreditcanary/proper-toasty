-- Installer business confirmation at claim time.
--
-- Addresses propertoasty#217. When an installer claims their directory
-- listing today, they inherit whatever Companies House match the MCS
-- scraper guessed at import time — and they never confirm it. We've
-- already shipped one real case (installer #1590, "Solar City") where
-- the scrape matched the wrong CH entity and the installer flagged it.
--
-- This migration adds:
--   1. legal_structure — some installers are sole traders / partnerships
--      and should never have a CH match attached at all.
--   2. business_details_confirmed_at / _by — audit of who signed off on
--      the attached company at claim time.
--   3. mcs_scraped_snapshot — a one-time JSONB freeze of the MCS-scraped
--      fields (address, telephone, CH match) captured on the first
--      confirm. Preserves the audit trail when the installer overwrites
--      those values with their own trading details.
--
-- All columns are nullable: pre-migration rows stay valid, and we gate
-- the new onboarding step on business_details_confirmed_at being null.

alter table public.installers
  add column if not exists legal_structure text
    check (legal_structure is null or legal_structure in (
      'limited_company', 'sole_trader', 'partnership', 'llp'
    )),
  add column if not exists business_details_confirmed_at timestamptz,
  add column if not exists business_details_confirmed_by uuid
    references auth.users(id) on delete set null,
  add column if not exists mcs_scraped_snapshot jsonb;

create index if not exists installers_unconfirmed_claims_idx
  on public.installers (claimed_at)
  where claimed_at is not null
    and business_details_confirmed_at is null;

comment on column public.installers.legal_structure is
  'How the installer is legally constituted. Sole traders and partnerships should have null company_number / ch_matched_*.';
comment on column public.installers.business_details_confirmed_at is
  'Set when the installer confirms (or corrects) the attached Companies House match and trading details at onboarding.';
comment on column public.installers.mcs_scraped_snapshot is
  'One-time snapshot of the MCS-scraped fields captured on the first business-details confirmation, for audit when the installer overrides the originals.';

notify pgrst, 'reload schema';
