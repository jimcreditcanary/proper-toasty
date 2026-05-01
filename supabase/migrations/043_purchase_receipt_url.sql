-- Add stripe_receipt_url to installer_credit_purchases so the
-- credits portal can render a "Download receipt" button next to
-- every purchase row. Stripe hosts these receipts itself; we
-- just store the URL Stripe gives us when the charge completes.
--
-- We pull the URL inside the webhook handler when crediting the
-- account: receipt_url lives on the underlying Charge (one per
-- successful PaymentIntent). The webhook does the extra Stripe
-- API call once and writes the URL alongside the audit row, so
-- the portal page only does a fast DB read.

alter table public.installer_credit_purchases
  add column if not exists stripe_receipt_url text;

comment on column public.installer_credit_purchases.stripe_receipt_url is
  'Stripe-hosted receipt URL for the underlying Charge. Populated by the webhook on credit add. Surfaced as the "Download receipt" link in /installer/credits.';

-- Reload PostgREST so the new column appears in the API immediately.
notify pgrst, 'reload schema';
