-- Open Banking payments via OBConnect
create table if not exists public.ob_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references public.users(id) on delete cascade not null,
  verification_id uuid references public.verifications(id) on delete set null,
  obconnect_payment_id text,
  amount numeric not null,
  currency text not null default 'GBP',
  payee_name text not null,
  sort_code text not null,
  account_number text not null,
  reference text not null,
  status text not null default 'PENDING', -- PENDING | AUTHORISED | COMPLETED | FAILED | CANCELLED
  auth_url text,
  reason text,
  completed_at timestamptz
);

create index if not exists ob_payments_user_id_idx on public.ob_payments(user_id);
create index if not exists ob_payments_verification_id_idx on public.ob_payments(verification_id);

alter table public.ob_payments enable row level security;

create policy "Users can view own OB payments"
  on public.ob_payments for select
  using (auth.uid() = user_id);

create policy "Service role can insert OB payments"
  on public.ob_payments for insert
  with check (true);

create policy "Service role can update OB payments"
  on public.ob_payments for update
  using (true);
