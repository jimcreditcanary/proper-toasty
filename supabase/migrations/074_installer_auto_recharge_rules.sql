-- F (Installer auto-recharge rules — user-controlled, Twilio pattern)
--
-- Extends migration 042's auto top-up infrastructure with:
--
--   1. auto_recharge_enabled (boolean) — an explicit on/off flag.
--      Migration 042 used "auto_recharge_pack_id IS NULL" to mean
--      "off"; this conflates state ("user picked manual top-up only")
--      with absence ("user hasn't configured anything"). The new
--      flag separates the two so we can render the right copy in
--      the settings page (off but configured vs never configured).
--
--   2. auto_recharge_threshold_credits (integer) — per-installer
--      threshold rather than the hard-coded 10 in
--      src/lib/billing/auto-recharge.ts. Defaults remain 5/10/25/50
--      in the UI; this column accepts any positive integer the
--      installer picks.
--
--   3. stripe_default_payment_method_id (text) — convenience cache
--      of the saved card id so the auto-recharge trigger doesn't
--      have to round-trip Stripe to discover it on every debit.
--      Still validated against the Customer at charge time so a
--      removed/expired card doesn't silently 500.
--
-- All three columns live on public.users alongside the existing
-- auto_recharge_* state (migration 042). The spec called them out
-- as "installers" columns; we keep them on users because the
-- existing trigger code (src/lib/billing/auto-recharge.ts) is
-- keyed by user_id, and splitting the state across two tables
-- would require a join on every credit debit (= a needless
-- correctness footgun). The installers row is reachable by
-- WHERE installers.user_id = users.id for any UI that needs both.
--
-- stripe_customer_id is already present (migration 042) — we no-op
-- with `add column if not exists` to keep the migration idempotent.

-- ─── public.users — new auto-recharge state ────────────────────────

alter table public.users
  add column if not exists auto_recharge_enabled boolean not null default false;

alter table public.users
  add column if not exists auto_recharge_threshold_credits integer;

-- Threshold has to be positive when set. NULL means "use the default"
-- (10) — matches the legacy behaviour from migration 042.
alter table public.users
  drop constraint if exists users_auto_recharge_threshold_check;
alter table public.users
  add constraint users_auto_recharge_threshold_check
  check (
    auto_recharge_threshold_credits is null
    or auto_recharge_threshold_credits > 0
  );

alter table public.users
  add column if not exists stripe_default_payment_method_id text;

-- stripe_customer_id is already on users from migration 042; no-op
-- here for idempotency.
alter table public.users
  add column if not exists stripe_customer_id text;

-- ─── Backfill enabled flag from legacy state ──────────────────────
-- Anyone who had a pack_id set (migration 042 semantics) is now
-- explicitly enabled. We don't backfill threshold because their
-- semantics matched the hard-coded 10 — null on the new column
-- continues to mean "use the default" until they pick one.
update public.users
  set auto_recharge_enabled = true
  where auto_recharge_pack_id is not null
    and auto_recharge_enabled = false;

-- ─── Comments ──────────────────────────────────────────────────────

comment on column public.users.auto_recharge_enabled is
  'F (Installer auto-recharge rules): explicit on/off. False = manual top-up only or no card saved. True = auto-recharge will fire when balance drops below threshold and stripe_customer_id + auto_recharge_pack_id are set.';
comment on column public.users.auto_recharge_threshold_credits is
  'F: balance threshold for auto-recharge. NULL = use default (10). UI defaults: 5/10/25/50.';
comment on column public.users.stripe_default_payment_method_id is
  'F: cached id of the default PaymentMethod saved on the Stripe Customer. Refreshed by the SetupIntent confirm + auto-recharge settings endpoints. Re-validated against Stripe at charge time so a removed/expired card doesn''t silently 500.';

-- ─── Reload PostgREST schema ───────────────────────────────────────
notify pgrst, 'reload schema';
