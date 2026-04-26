-- Denormalise tariff supplier + key rates onto homeowner_leads so we can
-- run analytics ("supplier mix", "TOU adoption", "avg unit rate by region")
-- without parsing the analysis_snapshot jsonb every time. The full tariff
-- blob still lives in analysis_snapshot — these are derived columns, kept
-- in sync by /api/leads/capture.
--
-- All columns nullable: pre-existing rows + leads captured before tariff
-- entry (shouldn't happen, but defensively) won't break.

alter table public.homeowner_leads
  add column if not exists electricity_supplier text,
  add column if not exists gas_supplier text,
  add column if not exists electricity_unit_rate_p_per_kwh numeric(6, 2),
  add column if not exists gas_unit_rate_p_per_kwh numeric(6, 2),
  add column if not exists electricity_standing_charge_p_per_day numeric(6, 2),
  add column if not exists gas_standing_charge_p_per_day numeric(6, 2),
  add column if not exists annual_electricity_kwh integer,
  add column if not exists annual_gas_kwh integer,
  add column if not exists tariff_source text
    check (tariff_source is null or tariff_source in (
      'bill_upload', 'manual_known', 'manual_estimate'
    )),
  add column if not exists is_time_of_use_tariff boolean;

create index if not exists homeowner_leads_electricity_supplier_idx
  on public.homeowner_leads (electricity_supplier)
  where electricity_supplier is not null;

create index if not exists homeowner_leads_tariff_source_idx
  on public.homeowner_leads (tariff_source)
  where tariff_source is not null;

create index if not exists homeowner_leads_is_tou_idx
  on public.homeowner_leads (is_time_of_use_tariff)
  where is_time_of_use_tariff is not null;

comment on column public.homeowner_leads.electricity_supplier is
  'Supplier brand selected in Step 3 (e.g. "Octopus Energy"). Sourced from FuelTariff.provider, denormalised for analytics.';
comment on column public.homeowner_leads.is_time_of_use_tariff is
  'True if user confirmed they''re on a TOU tariff (Octopus Go / Cosy / Agile / EDF GoElectric / OVO Charge Anytime etc.). Drives off_peak_elec_price in the savings calc.';
comment on column public.homeowner_leads.tariff_source is
  'How we got the tariff: bill_upload (Claude OCR), manual_known (user typed exact rates), manual_estimate (user picked usage band → supplier-aware default).';
