-- F3 — Installer signup request queue.
--
-- When an installer can't find their company on /installer-signup
-- (because our mcscertified.com scrape missed them, or they were
-- certified after the last scrape) we capture the details into this
-- table for an admin to review and approve.
--
-- On approval the admin spawns a real public.installers row from the
-- request payload, the request status flips to 'approved', and the
-- requester gets an email with a /installer-signup?id=<new_id> link
-- to claim it via the F2 flow.
--
-- IDs for admin-created installers start at 10_000_000 to stay
-- comfortably above any plausible MCS id from the scrape (largest
-- observed is well under 100_000), so future scrapes can't collide.

create table if not exists public.installer_signup_requests (
  id uuid primary key default gen_random_uuid(),

  -- Lifecycle
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  -- Companies House — the form starts with this and prefills name +
  -- address + incorporation date. Optional because some sole traders
  -- aren't registered.
  company_number text,
  company_name text not null,
  ch_address text,                 -- formatted free-text address from CH
  ch_incorporation_date date,

  -- Contact
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,

  -- BUS + capabilities the user ticks on the form
  bus_registered boolean not null default false,
  cap_heat_pump boolean not null default false,
  cap_solar_pv boolean not null default false,
  cap_battery_storage boolean not null default false,

  -- MCS certification
  certification_body text,         -- 'MCS' / 'NAPIT' / 'NICEIC' / etc.
  certification_number text,       -- nullable if user ticked "pending"
  certification_pending boolean not null default false,

  -- Free-form notes from the requester (optional)
  notes text,

  -- Anti-spam — requester IP + UA at submit time. Hashed at the
  -- application layer so we can throttle without storing PII raw.
  request_ip_hash text,
  request_user_agent text,

  -- Admin review
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_notes text,

  -- When approved, store the resulting installers.id so we can link
  -- the request straight to the directory entry it created.
  approved_installer_id bigint references public.installers(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists installer_signup_requests_status_idx
  on public.installer_signup_requests (status, created_at desc);
create index if not exists installer_signup_requests_email_idx
  on public.installer_signup_requests (lower(contact_email));
create index if not exists installer_signup_requests_ip_hash_idx
  on public.installer_signup_requests (request_ip_hash, created_at desc)
  where request_ip_hash is not null;

-- updated_at trigger reuses the helper from migration 028.
drop trigger if exists installer_signup_requests_updated_at_trigger
  on public.installer_signup_requests;
create trigger installer_signup_requests_updated_at_trigger
before update on public.installer_signup_requests
for each row execute function public.installers_set_updated_at();

-- RLS — service role only. The user-facing flow inserts via an API
-- route (admin client); admins read via /admin (admin client).
alter table public.installer_signup_requests enable row level security;

comment on table public.installer_signup_requests is
  'F3: pending installer signup requests for the admin review queue. One row per "I can''t find my company" submission.';
comment on column public.installer_signup_requests.status is
  'pending → approved (creates an installers row) | rejected (no row created, requester gets a polite no email).';
comment on column public.installer_signup_requests.approved_installer_id is
  'F3: id of the installers row created on approval. NULL for pending/rejected requests.';

-- ─── Reload PostgREST schema ────────────────────────────────────────
notify pgrst, 'reload schema';
