-- Track when someone starts the free verification wizard
create table public.lead_impressions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  created_at timestamptz default now()
);

-- No RLS needed — only inserted via admin client
alter table public.lead_impressions enable row level security;

-- Allow inserts from the API (service role handles this)
