-- Local energy statistics from gov.uk publications, joined into
-- programmatic PCD/LA pages so each place page can render real
-- local install counts + regional MCS pricing instead of hardcoded
-- UK averages.
--
-- Two tables reflect the two data granularities gov.uk publishes:
--
--   la_energy_stats     — per-LA (England & Wales) BUS-funded heat
--                          pump installations from DESNZ Boiler
--                          Upgrade Scheme statistics Table A1.7.
--                          One row per LA GSS code.
--
--   region_solar_stats  — per-UK-region (11 Government Office
--                          Regions) MCS solar PV installation
--                          counts + mean cost/kW by size band,
--                          from DESNZ Solar PV Cost Data (Regional
--                          costs sheet). One row per region per
--                          financial year.
--
-- No MCS per-LA data exists publicly (MCS Data Dashboard is
-- interactive-only, no CSV export). So solar copy on PCD/LA pages
-- pulls regional stats via an LA→region lookup embedded in the
-- import script.
--
-- Both tables refresh from the import script — safe to truncate
-- and reload on every run. Sources cited in every row for AEO.

begin;

create table if not exists public.la_energy_stats (
  la_gss_code text primary key,
  la_slug text not null,
  la_name text not null,
  region_gor_code text,
  region_name text,
  -- BUS heat pump redemptions by financial year (DESNZ BUS A1.7).
  -- Nullable so suppressed cells ([c1]/[c2]) survive the round-trip
  -- as null rather than being coerced to 0 (misleading).
  bus_hp_installs_2022_23 int,
  bus_hp_installs_2023_24 int,
  bus_hp_installs_2024_25 int,
  bus_hp_installs_total int,
  source text not null default 'DESNZ Boiler Upgrade Scheme statistics',
  source_url text not null default 'https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics',
  data_period text not null default '2022/23 to 2024/25',
  updated_at timestamptz not null default now()
);

comment on table public.la_energy_stats is
  'Per-LA heat pump install counts from BUS statistics. Joined to '
  'epc_area_aggregates via la_slug (matches scope_key for '
  'scope=local_authority rows). Regional data denormalised for '
  'the LA→region solar lookup used by /solar-panels/[slug].';

create index if not exists la_energy_stats_slug_idx
  on public.la_energy_stats (la_slug);

create index if not exists la_energy_stats_region_idx
  on public.la_energy_stats (region_gor_code);


create table if not exists public.region_solar_stats (
  region_gor_code text not null,
  region_name text not null,
  financial_year text not null,
  -- Mean £/kW by system size band, MCS-sourced (DESNZ Solar PV Cost
  -- Data, Regional costs (DNC) sheet).
  mean_cost_per_kw_0_4kw_gbp numeric(10, 2),
  mean_cost_per_kw_4_10kw_gbp numeric(10, 2),
  mean_cost_per_kw_10_50kw_gbp numeric(10, 2),
  -- Installation counts by size band per year.
  installations_0_4kw int,
  installations_4_10kw int,
  installations_10_50kw int,
  installations_total int,
  source text not null default 'DESNZ Solar PV Cost Data',
  source_url text not null default 'https://www.gov.uk/government/statistics/solar-pv-cost-data',
  updated_at timestamptz not null default now(),
  primary key (region_gor_code, financial_year)
);

comment on table public.region_solar_stats is
  'Per-UK-region solar PV mean cost/kW + install counts by year. '
  'Fed by /solar-panels/[slug] via the la_energy_stats.region_gor_code '
  'foreign key (informal — no PK constraint since region rows outlive '
  'LA rows).';

commit;
