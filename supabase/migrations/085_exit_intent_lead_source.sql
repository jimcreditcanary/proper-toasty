-- Add 'exit_intent' to the lead_source enum.
--
-- The homepage's exit-intent modal (mouse-out top-of-viewport OR
-- mobile scroll-up + tab-blur) captures email + postcode from users
-- about to bounce without engaging with the hero wizard. Those
-- inserts need a distinct source so they don't get double-counted as
-- completed check-flow conversions in admin metrics.
--
-- Ordering matters for enum values in Postgres — appended at the end
-- so ordinal positions of the existing values don't shift.

alter type public.lead_source add value if not exists 'exit_intent';
