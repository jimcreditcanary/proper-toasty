-- MCS-certified installer directory + the bridge table that captures
-- when a homeowner books a site visit with one of them.
--
-- Source data: scraped from mcscertified.com on 2026-04-21 (5,630 rows).
-- Importer: scripts/import-installers.ts — one-shot, idempotent on
-- (id) so re-running an updated scrape just upserts.
--
-- Reviews ranking is intentionally a placeholder. We default everyone to
-- 0 (= no reviews yet) and order the directory by distance only for
-- launch. The 0–5 score is wired up so the future "reviews" build can
-- backfill without a schema change.
--
-- installer_leads is the Stripe-billable event table. Future PR adds the
-- installer login/portal + per-lead charging when the homeowner clicks
-- "Book a meeting".

-- ─── installers ─────────────────────────────────────────────────────────────

create table public.installers (
  -- Primary key from MCS — stable across rescrapes so the importer
  -- can upsert by id without invalidating downstream installer_leads.
  id bigint primary key,
  certification_number text not null,
  certification_body text not null,

  -- Identity
  company_name text not null,
  email text,
  telephone text,
  website text,

  -- Address
  address_line_1 text,
  address_line_2 text,
  address_line_3 text,
  county text,
  postcode text,
  country text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),

  -- BUS-registered: required for the heat-pump grant to pay out.
  -- The directory MUST filter on this when the user wants a heat pump.
  bus_registered boolean not null default false,

  -- Capability flags. Boolean columns rather than a tags array because
  -- the AND-of-N filtering ("does ASHP AND solar PV") is much cheaper
  -- this way and the cardinality is fixed.
  cap_air_source_heat_pump boolean not null default false,
  cap_battery_storage boolean not null default false,
  cap_biomass boolean not null default false,
  cap_exhaust_air_heat_pump boolean not null default false,
  cap_gas_absorption_heat_pump boolean not null default false,
  cap_ground_source_heat_pump boolean not null default false,
  cap_water_source_heat_pump boolean not null default false,
  cap_hydro boolean not null default false,
  cap_micro_chp boolean not null default false,
  cap_solar_assisted_heat_pump boolean not null default false,
  cap_solar_pv boolean not null default false,
  cap_solar_thermal boolean not null default false,
  cap_wind_turbine boolean not null default false,

  -- Region coverage — 12 GB regions, mirrors the MCS filter UI.
  region_east_midlands boolean not null default false,
  region_eastern boolean not null default false,
  region_london boolean not null default false,
  region_north_east boolean not null default false,
  region_north_west boolean not null default false,
  region_northern_ireland boolean not null default false,
  region_scotland boolean not null default false,
  region_south_east boolean not null default false,
  region_south_west boolean not null default false,
  region_wales boolean not null default false,
  region_west_midlands boolean not null default false,
  region_yorkshire_humberside boolean not null default false,

  -- Companies House cross-reference (informational; not used for ranking yet)
  company_number text,
  ch_matched_name text,
  ch_matched_address text,
  ch_match_source text,
  ch_match_confidence text
    check (ch_match_confidence is null or ch_match_confidence in (
      'high', 'medium', 'low', 'uncertain'
    )),

  -- Reviews — placeholder for the future build. 0 = no reviews yet.
  -- Distance-only ordering for launch; review_score becomes a weighting
  -- once we have data flowing in.
  reviews_score numeric(2, 1) not null default 0
    check (reviews_score >= 0 and reviews_score <= 5),
  reviews_count integer not null default 0
    check (reviews_count >= 0),

  -- Audit / housekeeping
  source text not null default 'mcs_scraped',
  scraped_at timestamptz not null default now(),
  technology_sub_type text,
  raw_regions_covered text,
  raw_technologies text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for the directory queries.
create index installers_postcode_idx on public.installers (postcode)
  where postcode is not null;

-- Coarse geo filter — narrow by lat/lng box before doing Haversine.
-- For 5,630 rows this is plenty; PostGIS would only matter at 10×.
create index installers_latlng_idx on public.installers (latitude, longitude)
  where latitude is not null and longitude is not null;

-- Capability filters — partial indexes keep them tiny.
create index installers_cap_solar_pv_idx on public.installers (id)
  where cap_solar_pv = true;
create index installers_cap_battery_idx on public.installers (id)
  where cap_battery_storage = true;
create index installers_cap_ashp_idx on public.installers (id)
  where cap_air_source_heat_pump = true;
create index installers_cap_gshp_idx on public.installers (id)
  where cap_ground_source_heat_pump = true;
create index installers_bus_registered_idx on public.installers (id)
  where bus_registered = true;

-- Future ranking by reviews
create index installers_reviews_score_idx on public.installers (reviews_score desc)
  where reviews_score > 0;

-- Auto-update updated_at on any row change
create or replace function public.installers_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger installers_updated_at_trigger
before update on public.installers
for each row execute function public.installers_set_updated_at();

-- RLS — the directory is public information (it's already on
-- mcscertified.com). Anyone can read; only the service role writes.
alter table public.installers enable row level security;

create policy installers_public_read on public.installers
  for select using (true);

comment on table public.installers is
  'MCS-certified installer directory. Source: mcscertified.com (scraped 2026-04-21). 5,630 rows.';
comment on column public.installers.bus_registered is
  'Required filter for heat-pump leads — the BUS grant only pays out via BUS-registered installers.';
comment on column public.installers.reviews_score is
  '0.0 to 5.0; 0 = no reviews yet. Placeholder for the future reviews build — directory is distance-ordered for launch.';

-- ─── installer_leads ────────────────────────────────────────────────────────

-- Bridges homeowner_leads → installers when a homeowner books a site visit.
-- This is the Stripe-billable event table for the future installer pay-
-- per-lead model.

create table public.installer_leads (
  id uuid primary key default gen_random_uuid(),

  -- Who's booking
  homeowner_lead_id uuid references public.homeowner_leads(id) on delete set null,
  contact_email text not null,
  contact_name text,
  contact_phone text,
  preferred_contact_method text
    check (preferred_contact_method is null or preferred_contact_method in (
      'email', 'phone', 'whatsapp', 'any'
    )),
  preferred_contact_window text, -- free text e.g. "weekdays after 6pm"
  notes text,

  -- Which installer
  installer_id bigint not null references public.installers(id),

  -- What technologies they're interested in
  wants_heat_pump boolean not null default false,
  wants_solar boolean not null default false,
  wants_battery boolean not null default false,

  -- Property snapshot at booking time so the installer has context
  property_address text,
  property_postcode text,
  property_uprn text,
  property_latitude numeric(10, 7),
  property_longitude numeric(10, 7),
  -- Verbatim AnalyseResponse so the installer can see EPC, recommendations,
  -- etc. without us having to re-run the pipeline. Same shape as the one
  -- on homeowner_leads.analysis_snapshot.
  analysis_snapshot jsonb,

  -- Lifecycle
  status text not null default 'new'
    check (status in (
      'new',
      'sent_to_installer',
      'installer_acknowledged',
      'visit_booked',
      'visit_completed',
      'closed_won',
      'closed_lost',
      'cancelled'
    )),
  installer_notified_at timestamptz,
  installer_acknowledged_at timestamptz,
  visit_booked_for timestamptz,

  -- Future: Stripe charge for this lead (PR 4 wires this up)
  stripe_charge_id text,
  charge_amount_pence integer check (charge_amount_pence is null or charge_amount_pence >= 0),
  charged_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index installer_leads_installer_id_idx on public.installer_leads (installer_id);
create index installer_leads_homeowner_id_idx on public.installer_leads (homeowner_lead_id)
  where homeowner_lead_id is not null;
create index installer_leads_status_idx on public.installer_leads (status);
create index installer_leads_created_at_idx on public.installer_leads (created_at desc);
create index installer_leads_email_idx on public.installer_leads (lower(contact_email));

create trigger installer_leads_updated_at_trigger
before update on public.installer_leads
for each row execute function public.installers_set_updated_at();

-- RLS — no public access. Service role writes via /api/installer-leads/create.
-- Read access for the installer portal lands in PR 4 with proper auth.
alter table public.installer_leads enable row level security;

comment on table public.installer_leads is
  'Bridge table: homeowner books a site visit with an installer. Stripe-billable event.';
comment on column public.installer_leads.status is
  'Lifecycle: new → sent_to_installer → installer_acknowledged → visit_booked → visit_completed → closed_won/lost. Or cancelled.';
