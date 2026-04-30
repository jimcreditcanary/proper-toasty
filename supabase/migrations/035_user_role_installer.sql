-- Add 'installer' to the user role enum.
--
-- Migration 007 introduced `role text check (role in ('admin','user'))`.
-- Postgres can't extend a check constraint in place, so drop + re-add.
-- Existing rows ('admin' or 'user') aren't touched.
--
-- Future migrations may add more roles (e.g. 'pending_installer' for
-- the F3 review queue) — same pattern.

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'user', 'installer'));

notify pgrst, 'reload schema';
