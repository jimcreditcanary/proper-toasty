-- Persist the Octopus calculator request + response on the check result.
-- We capture both so the future installer report can show exactly which
-- assumptions produced the savings figures the user saw.
--
-- Stored together as a single jsonb blob for the same reason check_results
-- columns are jsonb — the upstream API shape evolves and we don't want
-- schema migrations every time a field appears.
--
-- Shape:
-- {
--   "request":  { ...SavingsCalculatorRequestSchema },
--   "response": { ...SavingsCalculatorResponseSchema (passthrough) },
--   "calculated_at": "2026-04-23T..."
-- }

alter table public.check_results
  add column if not exists savings_raw jsonb;
