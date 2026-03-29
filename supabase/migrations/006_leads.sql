-- Leads table for unauthenticated users
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  verification_id uuid references public.verifications(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists leads_email_idx on public.leads(email);
create index if not exists leads_verification_id_idx on public.leads(verification_id);
alter table public.leads enable row level security;

create policy "Service role can manage leads" on public.leads for all using (true) with check (true);

-- Allow verifications without a user (for leads)
alter table public.verifications alter column user_id drop not null;
