-- Per-user auto top-up threshold. Until now the trigger threshold
-- was a single hard-coded constant (10) in
-- src/lib/billing/auto-recharge.ts. Adding a column on public.users
-- so installers can pick when to recharge (e.g. 5 / 10 / 25 / 50
-- credits) from the new settings UI.
--
--   auto_recharge_threshold_credits — credits-at-or-below value that
--                                     fires an off-session recharge.
--                                     NULL means "use the system
--                                     default" (still 10) so existing
--                                     users keep current behaviour
--                                     without a backfill.
--
-- Constraint: a positive value when set. We don't lock it to a
-- specific enum (5/10/25/50) at the DB layer — the UI dropdown
-- limits the choices, and keeping the column open means we can
-- broaden the picker later without another migration.

alter table public.users
  add column if not exists auto_recharge_threshold_credits integer;

alter table public.users
  drop constraint if exists users_auto_recharge_threshold_credits_check;
alter table public.users
  add constraint users_auto_recharge_threshold_credits_check
  check (
    auto_recharge_threshold_credits is null
    or auto_recharge_threshold_credits > 0
  );

comment on column public.users.auto_recharge_threshold_credits is
  'Per-user auto top-up trigger. Fires an off-session recharge when credits balance is <= this value. NULL means use the system default (10).';

notify pgrst, 'reload schema';
