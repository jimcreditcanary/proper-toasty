-- Per-search credit accounting. Tells the admin dashboard exactly how
-- much each verification cost the user (1 = Essential, 2 = + Valuation,
-- 3 = + Reputation). Without this column, profitability calcs were
-- assuming 1 credit per search regardless of tier.

alter table public.verifications
  add column if not exists credits_used integer default 1;
