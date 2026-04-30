-- public.users foundation — consolidated migration.
--
-- The original 001 migration carried tonnes of parent-app cruft
-- (scans, verifications, ob_payments, api_logs) that Propertoasty
-- doesn't use. It was apparently never run on this Supabase project,
-- so we're missing public.users entirely — which means F1 (auth +
-- roles), the calendar debug endpoint, and everything credit-flavoured
-- has nothing to look up.
--
-- This migration creates JUST the bits Propertoasty needs:
--   - public.users table (id linked to auth.users, plus credits, role,
--     blocked, api_key, timestamps)
--   - Trigger that auto-creates public.users when an auth.users row
--     appears (signup) — and backfill for any auth.users rows that
--     already exist
--   - RLS policies (users see own row; service role bypasses)
--   - Role check constraint already including 'installer' (combines
--     007 + 035 in one go)
--
-- Idempotent: every CREATE / ALTER is `IF NOT EXISTS` or guarded so
-- re-running does nothing. The Stripe payments table + credit
-- deduction functions are NOT created here — they belong with C1
-- (Credits + Stripe purchase) when that PR ships.

-- ─── Table ──────────────────────────────────────────────────────────────

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  credits integer not null default 0,
  api_key text unique,
  role text not null default 'user',
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add columns defensively in case the table existed in an older shape.
alter table public.users add column if not exists email text;
alter table public.users add column if not exists credits integer not null default 0;
alter table public.users add column if not exists api_key text unique;
alter table public.users add column if not exists role text not null default 'user';
alter table public.users add column if not exists blocked boolean not null default false;
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

-- Role check — drop existing then re-add with the full enum so we don't
-- get blocked by an older version of the constraint with fewer values.
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'user', 'installer'));

-- ─── RLS ────────────────────────────────────────────────────────────────

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- ─── Auto-populate trigger ──────────────────────────────────────────────
-- When Supabase Auth creates a new user, mirror it into public.users so
-- the role / credits / api_key columns have somewhere to live.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Backfill any pre-existing auth.users ───────────────────────────────
-- If accounts have been created via /auth/login before this migration
-- runs, they exist in auth.users but not in public.users. Insert a row
-- for each so login + role gating actually works.

insert into public.users (id, email)
select au.id, coalesce(au.email, '')
from auth.users au
where not exists (
  select 1 from public.users u where u.id = au.id
);

-- ─── PostgREST schema reload ────────────────────────────────────────────
notify pgrst, 'reload schema';
