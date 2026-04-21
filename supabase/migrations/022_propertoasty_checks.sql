-- Propertoasty check tables + API cache + floorplans bucket
-- See CLAUDE.md for the 6-step wizard and report shape this supports.

-- ─── checks ──────────────────────────────────────────────────────────────────
create type public.check_status as enum ('draft', 'running', 'complete', 'failed');
create type public.check_country as enum ('England', 'Wales', 'Scotland', 'Northern Ireland');
create type public.check_tenure as enum ('owner', 'landlord', 'tenant', 'social');
create type public.check_fuel as enum ('gas', 'oil', 'lpg', 'electric', 'heat_pump', 'biomass', 'other');
create type public.yes_no_unsure as enum ('yes', 'no', 'unsure');
create type public.hybrid_preference as enum ('replace', 'hybrid', 'undecided');

create table public.checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Note: FK is on auth.users because this Supabase project does not carry
  -- the whoamipaying base schema's public.users wrapper. When we wire credits
  -- (Phase 3) we'll add a minimal public.users table + a matching FK swap.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status public.check_status not null default 'draft',

  -- address
  address_formatted text,
  address_line1 text,
  postcode text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  country public.check_country,
  google_place_id text,

  -- user-provided context (step 3)
  tenure public.check_tenure,
  current_heating_fuel public.check_fuel,
  hot_water_tank_present public.yes_no_unsure,
  outdoor_space_for_ashp public.yes_no_unsure,
  hybrid_preference public.hybrid_preference,

  -- floorplan
  floorplan_object_key text,                 -- bucket path, NOT a public URL
  floorplan_uploaded_at timestamptz,

  -- sharing
  share_token text unique,
  share_expires_at timestamptz,

  -- billing
  credits_spent int not null default 0
);

create index checks_user_id_idx on public.checks(user_id);
create index checks_status_idx on public.checks(status);
create index checks_share_token_idx on public.checks(share_token) where share_token is not null;

alter table public.checks enable row level security;

create policy "Users read own checks" on public.checks
  for select using (auth.uid() = user_id);

create policy "Users insert own checks" on public.checks
  for insert with check (auth.uid() = user_id);

create policy "Users update own checks" on public.checks
  for update using (auth.uid() = user_id);

-- ─── check_results ───────────────────────────────────────────────────────────
create table public.check_results (
  check_id uuid primary key references public.checks(id) on delete cascade,
  epc_raw jsonb,
  epc_recommendations_raw jsonb,
  solar_raw jsonb,
  pvgis_raw jsonb,
  flood_raw jsonb,
  listed_raw jsonb,
  planning_raw jsonb,
  floorplan_analysis jsonb,
  eligibility jsonb,
  finance jsonb,
  generated_at timestamptz not null default now()
);

alter table public.check_results enable row level security;

create policy "Users read own check_results" on public.check_results
  for select using (
    exists (select 1 from public.checks c where c.id = check_id and c.user_id = auth.uid())
  );

-- ─── api_cache (shared, opaque key/value with TTL) ───────────────────────────
-- Used by Solar API (30d), PVGIS (90d), EPC (30d), Postcodes.io (30d).
-- Namespace keeps providers isolated so cache invalidation per-provider is easy.
create table public.api_cache (
  namespace text not null,
  key text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (namespace, key)
);

create index api_cache_expires_at_idx on public.api_cache(expires_at);

-- Service role bypasses RLS, but belt-and-braces:
alter table public.api_cache enable row level security;

-- ─── floorplans storage bucket ───────────────────────────────────────────────
-- Private. Path convention: {user_id}/{check_id}/{timestamp}-{original}.ext
insert into storage.buckets (id, name, public)
values ('floorplans', 'floorplans', false)
on conflict (id) do nothing;

create policy "Users read own floorplans" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'floorplans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users upload own floorplans" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'floorplans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own floorplans" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'floorplans'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
