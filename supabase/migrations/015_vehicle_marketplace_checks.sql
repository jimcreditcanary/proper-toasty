-- New wizard flow: vehicle registration lookups, marketplace source + screenshot,
-- DVLA data and AI vehicle valuation stored per verification.

-- ── Vehicle lookups table ─────────────────────────────────────────────
create table if not exists public.vehicle_lookups (
  id uuid default gen_random_uuid() primary key,
  verification_id uuid references public.verifications(id) on delete set null,
  registration_number text not null,
  make text,
  colour text,
  fuel_type text,
  engine_capacity integer,
  year_of_manufacture integer,
  month_of_first_registration text,
  tax_status text,
  tax_due_date text,
  mot_status text,
  mot_expiry_date text,
  co2_emissions integer,
  marked_for_export boolean,
  type_approval text,
  wheelplan text,
  revenue_weight integer,
  euro_status text,
  date_of_last_v5c_issued text,
  raw_response jsonb not null,
  created_at timestamptz default now()
);

create index if not exists vehicle_lookups_verification_id_idx on public.vehicle_lookups(verification_id);
create index if not exists vehicle_lookups_reg_idx on public.vehicle_lookups(registration_number);

alter table public.vehicle_lookups enable row level security;

-- Service role can write; users can read lookups attached to their own verifications.
create policy "Service role can manage vehicle_lookups"
  on public.vehicle_lookups for all using (true) with check (true);

create policy "Users can view own vehicle_lookups"
  on public.vehicle_lookups for select
  using (
    verification_id is not null
    and exists (
      select 1 from public.verifications v
      where v.id = vehicle_lookups.verification_id
      and v.user_id = auth.uid()
    )
  );

-- ── Extend verifications with new wizard fields ───────────────────────
alter table public.verifications add column if not exists marketplace_source text;
alter table public.verifications add column if not exists marketplace_other text;
alter table public.verifications add column if not exists marketplace_screenshot_url text;
alter table public.verifications add column if not exists vehicle_reg text;
alter table public.verifications add column if not exists dvla_data jsonb;
alter table public.verifications add column if not exists vehicle_valuation jsonb;
alter table public.verifications add column if not exists selected_checks text[];

-- ── Marketplace screenshots storage bucket ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('marketplace-screenshots', 'marketplace-screenshots', false)
on conflict (id) do nothing;

create policy "Service role can upload marketplace screenshots"
  on storage.objects for insert
  with check (bucket_id = 'marketplace-screenshots');

create policy "Service role can read marketplace screenshots"
  on storage.objects for select
  using (bucket_id = 'marketplace-screenshots');
