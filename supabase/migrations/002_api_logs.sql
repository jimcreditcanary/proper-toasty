-- API usage logs
create table if not exists public.api_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  endpoint text not null,
  method text not null default 'POST',
  status_code integer not null default 200,
  credits_used integer not null default 0,
  duration_ms integer,
  request_summary jsonb,
  response_summary jsonb,
  created_at timestamptz default now()
);

-- Index for fast user lookups
create index if not exists api_logs_user_id_idx on public.api_logs(user_id);
create index if not exists api_logs_created_at_idx on public.api_logs(created_at desc);

-- RLS
alter table public.api_logs enable row level security;

create policy "Users can view their own API logs"
  on public.api_logs for select
  using (auth.uid() = user_id);

-- Service role can insert (from API routes)
create policy "Service role can insert API logs"
  on public.api_logs for insert
  with check (true);
