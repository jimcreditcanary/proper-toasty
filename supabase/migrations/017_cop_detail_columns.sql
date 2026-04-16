-- Extra denormalised columns for the PayPoint CoP response.
-- The full raw response is already stored as JSONB in `bank_verify_result`,
-- but having these as top-level columns makes the admin / results queries
-- simpler.
--
-- returnedCustomerName  — the name the bank actually has, when we got a
--                         close (non-exact) match
-- reasonCode            — PayPoint's machine reason code, e.g. "MBAM"
-- accountTypeResult     — boolean: did the requested Personal/Business
--                         match the account type on file

alter table public.verifications
  add column if not exists cop_returned_name text,
  add column if not exists cop_reason_code text,
  add column if not exists cop_account_type_match boolean;
