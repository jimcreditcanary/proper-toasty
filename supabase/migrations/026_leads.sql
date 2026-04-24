-- Leads table — email + context captured between the analysis step and
-- the report. Also seeds the data model for the three-user-type world
-- Propertoasty is headed toward (homeowner / installer / admin).
--
-- For v1: only homeowners write rows here, via the check-flow lead-capture
-- screen. No auth yet — service role writes, nothing is exposed to the
-- public. When Supabase Auth lands, homeowners become auth.users with a
-- user_type == 'homeowner' profile row, and this table's email gets joined
-- on signup.

create type public.lead_user_type as enum (
  'homeowner',
  'installer',
  'admin'
);

create type public.lead_source as enum (
  'check_flow',        -- completed the /check wizard
  'installer_signup',  -- future: MCS installer onboarding
  'waitlist',          -- future: pre-launch capture
  'other'
);

create table public.homeowner_leads (
  id uuid primary key default gen_random_uuid(),
  -- identity
  email text not null,
  name text,
  phone text,
  -- property context snapshot (for homeowners — null for installers/admins)
  address text,
  postcode text,
  uprn text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  -- consent
  consent_marketing boolean not null default false,
  consent_installer_matching boolean not null default false,
  -- the full analysis blob at capture time, so we can surface their
  -- report later without re-running the pipeline. Shape: AnalyseResponse
  -- + the edited floorplan annotations.
  analysis_snapshot jsonb,
  -- classification
  user_type public.lead_user_type not null default 'homeowner',
  source public.lead_source not null default 'check_flow',
  -- when the user eventually creates a full account, this links to them
  user_id uuid references auth.users(id) on delete set null,
  -- housekeeping
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index homeowner_leads_email_idx on public.homeowner_leads (lower(email));
create index homeowner_leads_postcode_idx on public.homeowner_leads (postcode) where postcode is not null;
create index homeowner_leads_user_type_idx on public.homeowner_leads (user_type);
create index homeowner_leads_created_at_idx on public.homeowner_leads (created_at desc);

-- updated_at trigger — auto-bump on any row change.
create or replace function public.homeowner_leads_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger homeowner_leads_updated_at_trigger
before update on public.homeowner_leads
for each row execute function public.homeowner_leads_set_updated_at();

-- RLS: service role writes everything. No public reads yet.
alter table public.homeowner_leads enable row level security;
