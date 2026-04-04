-- Add role column to users table
alter table public.users
  add column role text not null default 'user'
  check (role in ('admin', 'user'));

-- Add blocked column to users table
alter table public.users
  add column blocked boolean not null default false;

-- Set james.a.fell@gmail.com as admin
update public.users set role = 'admin' where email = 'james.a.fell@gmail.com';

-- Admin settings table
create table public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value numeric not null,
  updated_at timestamptz default now()
);

alter table public.admin_settings enable row level security;

-- Only admins can read admin_settings
create policy "Admins can read admin_settings"
  on public.admin_settings for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can insert admin_settings
create policy "Admins can insert admin_settings"
  on public.admin_settings for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can update admin_settings
create policy "Admins can update admin_settings"
  on public.admin_settings for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only admins can delete admin_settings
create policy "Admins can delete admin_settings"
  on public.admin_settings for delete
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can view all users
create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Insert default settings
insert into public.admin_settings (key, value) values
  ('cop_cost_per_check', 0.15),
  ('monthly_hosting_cost', 0),
  ('anthropic_cost_per_1k_tokens', 0.003);

-- Add anthropic_tokens_used to verifications table
alter table public.verifications
  add column anthropic_tokens_used integer default null;

-- Updated_at trigger for admin_settings
create trigger update_admin_settings_updated_at
  before update on public.admin_settings
  for each row execute procedure public.update_updated_at();
