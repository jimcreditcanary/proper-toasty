-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  credits integer not null default 0,
  api_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Users can only read/update their own row
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Scans table
create table public.scans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  file_url text not null,
  file_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  extracted_data jsonb,
  company_name text,
  vat_number text,
  company_number text,
  sort_code text,
  account_number text,
  companies_house_result jsonb,
  hmrc_vat_result jsonb,
  bank_verify_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scans enable row level security;

create policy "Users can view own scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scans"
  on public.scans for update
  using (auth.uid() = user_id);

-- Payments table
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  amount integer not null, -- in pence
  credits_purchased integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Function to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to deduct credits atomically
create or replace function public.deduct_credit(p_user_id uuid)
returns boolean as $$
declare
  current_credits integer;
begin
  update public.users
  set credits = credits - 1, updated_at = now()
  where id = p_user_id and credits > 0
  returning credits into current_credits;

  return found;
end;
$$ language plpgsql security definer;

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on public.users
  for each row execute procedure public.update_updated_at();

create trigger update_scans_updated_at
  before update on public.scans
  for each row execute procedure public.update_updated_at();

-- Storage bucket for invoice uploads
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false);

create policy "Users can upload invoices"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view own invoices"
  on storage.objects for select
  using (
    bucket_id = 'invoices'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
