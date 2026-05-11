-- Batch 2 — installer-chosen scope on the pre-survey request.
--
-- An installer sending a pre-survey link can now declare what tech
-- they want the homeowner to see assessed: heat pump, solar+battery,
-- or both. The flags propagate two places when the homeowner finishes
-- their check:
--
--   1. /check page reads them at prefill time and seeds the wizard
--      `focus` so a heat-pump-only installer's customer doesn't get
--      asked solar questions or shown solar tabs on the report.
--
--   2. /api/leads/capture writes them straight onto the resulting
--      installer_leads row — replacing the previous hardcoded
--      "wants HP=true, wants solar=true, wants battery=false"
--      defaults that ignored what the installer actually does.
--
-- Defaults match the previous hardcoded behaviour so existing rows
-- (the ones from before this migration) still produce the same lead.
-- New rows get whatever the form submits.
--
-- CHECK: at least one of (heat pump, solar) must be true — the
-- homeowner's check has nothing to assess if the installer sends a
-- request with both scopes unchecked. Battery alone is allowed only
-- alongside solar (battery without solar is not a product we cover
-- in /check), so we don't allow it as a sole scope either.

alter table public.installer_pre_survey_requests
  add column if not exists wants_heat_pump boolean not null default true,
  add column if not exists wants_solar     boolean not null default true,
  add column if not exists wants_battery   boolean not null default false;

alter table public.installer_pre_survey_requests
  drop constraint if exists pre_survey_request_scope_at_least_one;

alter table public.installer_pre_survey_requests
  add constraint pre_survey_request_scope_at_least_one
  check (wants_heat_pump or wants_solar);

comment on column public.installer_pre_survey_requests.wants_heat_pump is
  'Batch 2: installer wants this customer assessed for heat pump (BUS). Drives wizard focus + installer_leads.wants_heat_pump on completion.';
comment on column public.installer_pre_survey_requests.wants_solar is
  'Batch 2: installer wants this customer assessed for rooftop solar. Drives wizard focus + installer_leads.wants_solar on completion.';
comment on column public.installer_pre_survey_requests.wants_battery is
  'Batch 2: installer wants this customer assessed for battery storage. Implies wants_solar (battery without solar is not a /check product).';

notify pgrst, 'reload schema';
