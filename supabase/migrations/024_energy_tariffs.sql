-- Per-fuel tariff records captured in Step 3.
-- Shape (per fuel) matches FuelTariffSchema in src/lib/schemas/bill.ts:
-- {
--   provider, tariffName, productType, paymentMethod,
--   unitRatePencePerKWh, standingChargePencePerDay,
--   priceGuaranteedUntil, earlyExitFee, estimatedAnnualUsageKWh,
--   source: 'bill_upload' | 'manual_known' | 'manual_estimate',
--   usageBand: 'low' | 'medium' | 'high' | 'exact' | null
-- }
-- Stored as jsonb for the same reason check_results.* are jsonb — the upstream
-- shape evolves and we want columns to stay stable.

alter table public.checks
  add column if not exists electricity_tariff jsonb,
  add column if not exists gas_tariff jsonb;

-- Helpful for the future cost-savings API to filter by provider when running
-- comparison batches.
create index if not exists checks_electricity_provider_idx
  on public.checks ((electricity_tariff ->> 'provider'))
  where electricity_tariff is not null;
create index if not exists checks_gas_provider_idx
  on public.checks ((gas_tariff ->> 'provider'))
  where gas_tariff is not null;
