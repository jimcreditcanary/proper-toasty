-- Admin credit adjustments — audit log + atomic adjust function.
--
-- Why an audit table: credits are real money. We need to be able to
-- answer "why does this user have 50 credits, who gave them out?"
-- months after the fact. A simple `update users set credits = ...`
-- from the admin UI leaves no trail.
--
-- Why an RPC instead of two separate writes: applying the delta and
-- inserting the audit row must be atomic — otherwise a crash between
-- them leaves us with either silent gifts (delta applied, no audit)
-- or phantom audit rows (audit written, delta lost). Wrapping both
-- in a SECURITY DEFINER function gives us a single transaction the
-- application can't accidentally split.
--
-- Negative deltas are allowed (clawback). The function rejects any
-- adjustment that would push credits below zero — admins can set to
-- exactly zero by passing -current_balance.

-- ─── Audit table ────────────────────────────────────────────────────
create table if not exists public.admin_credit_adjustments (
  id uuid primary key default gen_random_uuid(),

  -- The user whose balance changed.
  user_id uuid not null references public.users(id) on delete cascade,

  -- The admin who performed the adjustment. on delete restrict so
  -- we can't lose accountability if the admin is removed.
  admin_id uuid not null references public.users(id) on delete restrict,

  -- Signed delta. Positive = grant, negative = clawback.
  delta integer not null check (delta <> 0),

  -- Snapshots so we don't lose context if balance is mutated by other
  -- paths (purchases / consumption) after this adjustment.
  balance_before integer not null check (balance_before >= 0),
  balance_after integer not null check (balance_after >= 0),

  -- Free-text reason. Required by the API layer; the column is
  -- nullable in case we need to backfill or import historical data.
  reason text,

  created_at timestamptz not null default now()
);

create index if not exists admin_credit_adjustments_user_id_idx
  on public.admin_credit_adjustments (user_id, created_at desc);

create index if not exists admin_credit_adjustments_admin_id_idx
  on public.admin_credit_adjustments (admin_id, created_at desc);

-- RLS — service role only. Admin UI uses the admin client so RLS
-- doesn't touch this; explicitly enable so a misconfigured anon key
-- can't read the log.
alter table public.admin_credit_adjustments enable row level security;

comment on table public.admin_credit_adjustments is
  'Audit log of every admin-driven credit adjustment. Append-only — never edit or delete rows.';

-- ─── Atomic adjust function ─────────────────────────────────────────
-- Applies delta to public.users.credits, captures before/after, and
-- inserts the audit row. Returns the new balance. Errors out (and
-- rolls back) if the resulting balance would go below zero.
create or replace function public.admin_adjust_credits(
  p_user_id uuid,
  p_admin_id uuid,
  p_delta integer,
  p_reason text
)
returns integer
language plpgsql
security definer
as $$
declare
  v_balance_before integer;
  v_balance_after integer;
begin
  if p_delta = 0 then
    raise exception 'delta must be non-zero';
  end if;
  if p_admin_id is null then
    raise exception 'admin_id required';
  end if;

  -- Lock the user row for the duration of the txn so concurrent
  -- adjustments can't race. SELECT ... FOR UPDATE is enough; the
  -- credits column is small and the lock is held briefly.
  select credits into v_balance_before
    from public.users
   where id = p_user_id
   for update;

  if v_balance_before is null then
    raise exception 'user % not found', p_user_id;
  end if;

  v_balance_after := v_balance_before + p_delta;
  if v_balance_after < 0 then
    raise exception 'adjustment would push credits below zero (current %, delta %)',
      v_balance_before, p_delta;
  end if;

  update public.users
     set credits = v_balance_after,
         updated_at = now()
   where id = p_user_id;

  insert into public.admin_credit_adjustments
    (user_id, admin_id, delta, balance_before, balance_after, reason)
  values
    (p_user_id, p_admin_id, p_delta, v_balance_before, v_balance_after, p_reason);

  return v_balance_after;
end;
$$;

comment on function public.admin_adjust_credits is
  'Atomically adjust a user''s credits and write an audit row. Rejects deltas that would result in a negative balance. Used only by /api/admin/users/[id]/credits.';

-- ─── Reload PostgREST schema ────────────────────────────────────────
notify pgrst, 'reload schema';
