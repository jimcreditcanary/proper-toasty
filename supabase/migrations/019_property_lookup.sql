-- Property address lookup (Postcoder).
--
-- verifications gains a flat set of property fields for quick queries,
-- plus property_data (jsonb) with the full Postcoder response for the
-- selected address so nothing is lost.
--
-- property_lookups mirrors vehicle_lookups — one row per successful
-- postcode search, with the raw response.

alter table public.verifications
  add column if not exists property_postcode text,
  add column if not exists property_address text,
  add column if not exists property_uprn text,
  add column if not exists property_udprn text,
  add column if not exists property_data jsonb;

create table if not exists public.property_lookups (
  id uuid default gen_random_uuid() primary key,
  verification_id uuid references public.verifications(id) on delete set null,
  postcode text not null,
  address_summary text,
  uprn text,
  udprn text,
  raw_response jsonb not null,
  created_at timestamptz default now()
);

create index if not exists property_lookups_verification_id_idx
  on public.property_lookups(verification_id);
create index if not exists property_lookups_postcode_idx
  on public.property_lookups(postcode);

alter table public.property_lookups enable row level security;

create policy "Service role can manage property_lookups"
  on public.property_lookups for all using (true) with check (true);

create policy "Users can view own property_lookups"
  on public.property_lookups for select
  using (
    verification_id is not null
    and exists (
      select 1 from public.verifications v
      where v.id = property_lookups.verification_id
      and v.user_id = auth.uid()
    )
  );

-- ── Wizard-session cost tracking ─────────────────────────────────────
-- Mirrors extraction_cost / marketplace_cost on lead_impressions so we
-- can attribute the Postcoder spend to the journey that triggered it.
alter table public.lead_impressions
  add column if not exists property_lookup_cost numeric(10,4) default 0;

-- ── Admin-configurable unit price ────────────────────────────────────
-- Default set here so the Settings page shows a sensible value out of
-- the box; the admin can edit it and that edit wins.
insert into public.admin_settings (key, value) values ('address_lookup_cost', 0.07)
on conflict (key) do nothing;
