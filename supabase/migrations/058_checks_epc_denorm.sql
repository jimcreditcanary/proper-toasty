-- EPC certificate persistence + denormalisation.
--
-- Until now we'd pull a full EPC cert from GOV.UK during /api/analyse,
-- show it in the wizard, and drop it on the floor unless the user
-- captured a lead (in which case it survived inside
-- homeowner_leads.analysis_snapshot as JSONB).
--
-- Two problems with that:
--   1. A homeowner who runs the analyse step but bounces before lead
--      capture leaves no EPC trace in the DB at all. We have the data
--      from the wizard's state but never write it.
--   2. Admin queries like "how many G-rated houses ran a check this
--      month" require JSONB path expressions over analysis_snapshot —
--      slow, requires a join, and the data isn't there at all for
--      the bounce-before-capture cohort.
--
-- This migration:
--   - Adds nine denormalised EPC columns to public.checks for the
--     fields that drive admin queries + BUS eligibility rules.
--   - Indexes the highest-cardinality ones (band, property_type,
--     certificate_number).
--
-- The full cert continues to land in check_results.epc_raw (existing
-- JSONB column from migration 022) so we keep every field for
-- future surfacing without a schema change.

alter table public.checks
  add column if not exists epc_certificate_number text,
  add column if not exists epc_band               text,   -- A-G current rating
  add column if not exists epc_band_potential     text,   -- A-G after recommended works
  add column if not exists epc_property_type      text,   -- "House" / "Flat" / "Bungalow" / "Maisonette" / "Park home"
  add column if not exists epc_built_form         text,   -- "Detached" / "Semi-Detached" / "Mid-Terrace" / etc.
  add column if not exists epc_construction_age_band text, -- "England and Wales: 1900-1929" etc.
  add column if not exists epc_main_fuel          text,   -- raw upstream string ("mains gas (not community)" / "electricity (not community)" / ...)
  add column if not exists epc_total_floor_area_m2 numeric(7, 2),
  add column if not exists epc_registration_date  date;

-- Cardinality-light columns get straight btree indexes — admin
-- dashboards filter heavily by band + property_type.
create index if not exists checks_epc_band_idx
  on public.checks (epc_band)
  where epc_band is not null;

create index if not exists checks_epc_property_type_idx
  on public.checks (epc_property_type)
  where epc_property_type is not null;

-- Cert number is unique per row but useful for joining back to
-- check_results.epc_raw or cross-checking duplicate-cert situations.
create index if not exists checks_epc_certificate_number_idx
  on public.checks (epc_certificate_number)
  where epc_certificate_number is not null;

comment on column public.checks.epc_certificate_number is
  'Denormalised from check_results.epc_raw. Migration 058. Updated via /api/checks/upsert when the wizard sends an analyse result.';
