-- AI-generated extras on the results page:
--
-- vehicle_tips            — make/model-specific things to check before buying
--                           (e.g. "known DPF issues on 2017 diesel models")
-- marketplace_plate_match — reg plate extracted from the marketplace
--                           screenshot + whether it matches the DVLA lookup.
--                           Catches stolen listing photos — if the buyer says
--                           they're buying AB12 CDE but the ad shows CD34 EFG,
--                           that's a very strong fraud signal.
--
-- Both live on the verification row as JSONB.

alter table public.verifications
  add column if not exists vehicle_tips jsonb,
  add column if not exists marketplace_plate_match jsonb,
  add column if not exists vehicle_mileage integer;

-- vehicle_mileage is buyer-reported at step 3 (optional). When present it
-- tightens the AI valuation range and bumps the confidence level.
