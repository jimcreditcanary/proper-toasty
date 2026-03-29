-- Add Google reviews columns to verifications table
alter table public.verifications add column if not exists google_reviews_rating numeric;
alter table public.verifications add column if not exists google_reviews_count integer;
alter table public.verifications add column if not exists google_reviews_summary text;
