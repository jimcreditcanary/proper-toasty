-- Many users → one installer binding.
--
-- Before this migration, the only user ↔ installer link was
-- public.installers.user_id — a single-owner FK pointing at the one
-- user who had "claimed" that installer directory row. If a second
-- staff member at the same installer wanted their own login (David
-- at Solar City Group was the first real case), there was no way to
-- let them access the installer portal.
--
-- Fix: a new users.installer_id nullable FK. Any number of users can
-- share the same installer_id, so a whole company's staff can log in
-- against the same installer directory row. installers.user_id stays
-- as the "primary contact" (used for notifications + the one email on
-- the directory record), but authorisation and portal routing now key
-- off users.installer_id instead.
--
-- Backfill rule: for every installer that already has a user_id, set
-- that user's installer_id to the installer's id. Keeps every existing
-- bound owner working unchanged after this migration lands.

alter table public.users
  add column if not exists installer_id bigint
    references public.installers(id) on delete set null;

create index if not exists users_installer_id_idx
  on public.users (installer_id)
  where installer_id is not null;

update public.users u
   set installer_id = i.id
  from public.installers i
 where i.user_id = u.id
   and u.installer_id is null;

comment on column public.users.installer_id is
  'The installer this user is bound to for portal access. Many users can share one installer. Set by the admin "Bind to installer" flow or by backfill from installers.user_id.';

notify pgrst, 'reload schema';
