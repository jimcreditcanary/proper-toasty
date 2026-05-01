-- C2 — Auto top-up. Off-session credit pack purchases when an
-- installer's balance drops to 10 or below.
--
-- The user opts in from /installer/credits once they've made at
-- least one normal purchase (which saved their card on the Stripe
-- Customer). After opt-in, every credit debit checks the new
-- balance and — if it's at or below the threshold — fires an
-- off-session PaymentIntent against the saved card.
--
-- Three columns on public.users + a small audit table for
-- failures:
--
--   stripe_customer_id        — set the first time we run a
--                                Checkout against this user. The
--                                Customer object is what makes
--                                cards reusable across purchases.
--   auto_recharge_pack_id     — null when disabled; one of our
--                                pack ids ('starter'|'growth'|'scale'
--                                |'volume') when enabled.
--   auto_recharge_failed_at   — timestamp of the most recent failed
--                                off-session attempt. Drives the
--                                dashboard banner. NULL = healthy.
--
-- Failures get logged to installer_auto_recharge_attempts so we can
-- inspect why a card was declined / 3DS-required without trawling
-- Stripe logs. Successes go through the existing
-- installer_credit_purchases path (the recharge fires a webhook
-- like any other purchase).

-- ─── public.users columns ──────────────────────────────────────────

alter table public.users
  add column if not exists stripe_customer_id text;

-- One Customer per user; if the linkage ever ends up wrong, support
-- has to manually correct it rather than letting the system silently
-- attach a second Customer.
create unique index if not exists users_stripe_customer_id_unique
  on public.users (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.users
  add column if not exists auto_recharge_pack_id text;

-- Mirror the pack id check from billing/credit-packs.ts. Update this
-- if pack ids ever change.
alter table public.users
  drop constraint if exists users_auto_recharge_pack_id_check;
alter table public.users
  add constraint users_auto_recharge_pack_id_check
  check (
    auto_recharge_pack_id is null
    or auto_recharge_pack_id in ('starter', 'growth', 'scale', 'volume')
  );

alter table public.users
  add column if not exists auto_recharge_failed_at timestamptz;

alter table public.users
  add column if not exists auto_recharge_failure_reason text;

-- ─── installer_auto_recharge_attempts ──────────────────────────────

create table if not exists public.installer_auto_recharge_attempts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.users(id) on delete set null,
  installer_id bigint references public.installers(id) on delete set null,

  pack_id text not null,
  pack_credits integer not null check (pack_credits > 0),
  price_pence integer not null check (price_pence >= 0),

  -- Outcome
  --   'succeeded'        — Stripe charged the card off-session.
  --                        Credits flow through the regular webhook,
  --                        which inserts a row in installer_credit_purchases.
  --   'requires_action'  — Card needed 3DS or extra auth. We treat
  --                        this as a soft failure — user must come
  --                        back and pay manually.
  --   'failed'           — Card declined / Stripe error / unknown.
  status text not null
    check (status in ('succeeded', 'requires_action', 'failed')),

  stripe_payment_intent_id text,
  failure_code text,
  failure_message text,

  -- The user's balance at the moment we fired the recharge — handy
  -- for debugging (e.g. "fired at 9 credits, weird").
  balance_at_trigger integer,

  created_at timestamptz not null default now()
);

create index if not exists installer_auto_recharge_attempts_user_idx
  on public.installer_auto_recharge_attempts (user_id, created_at desc)
  where user_id is not null;
create index if not exists installer_auto_recharge_attempts_status_idx
  on public.installer_auto_recharge_attempts (status, created_at desc);

-- RLS — service role only (no portal-side reads, admin-only).
alter table public.installer_auto_recharge_attempts enable row level security;

comment on column public.users.stripe_customer_id is
  'C2: Stripe Customer object id. Set on first Checkout (with setup_future_usage=off_session) so cards are reusable.';
comment on column public.users.auto_recharge_pack_id is
  'C2: which pack to auto-buy when balance drops to <=10. NULL = auto top-up disabled.';
comment on column public.users.auto_recharge_failed_at is
  'C2: timestamp of the last failed off-session recharge attempt. Drives the "we tried but it didn''t work" dashboard banner. Cleared on next successful purchase.';
comment on table public.installer_auto_recharge_attempts is
  'C2: audit trail for off-session recharge attempts (both successes and failures). Successful recharges also create a row in installer_credit_purchases via the webhook.';

-- ─── installer_credit_purchases adjustments ───────────────────────
-- Off-session recharges (C2) don't go through Stripe Checkout, so
-- there's no Checkout Session id to record. Make stripe_session_id
-- nullable + add a unique index on stripe_payment_intent_id as the
-- alternative idempotency key. Migration 041's unique index on
-- stripe_session_id stays — Postgres treats NULL as distinct in
-- unique indexes by default, so multiple auto-recharge rows with
-- session_id IS NULL are fine.

alter table public.installer_credit_purchases
  alter column stripe_session_id drop not null;

create unique index if not exists installer_credit_purchases_payment_intent_unique
  on public.installer_credit_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ─── Reload PostgREST schema ───────────────────────────────────────
notify pgrst, 'reload schema';
