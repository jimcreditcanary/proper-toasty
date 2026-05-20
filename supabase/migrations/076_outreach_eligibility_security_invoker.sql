-- Switch public.outreach_eligibility (m065) to SECURITY INVOKER.
--
-- Postgres views default to SECURITY DEFINER semantics: the view
-- executes with the privileges of its owner (here: postgres /
-- service_role on Supabase), which means any role that can SELECT
-- the view bypasses RLS on the underlying tables.
--
-- Today we only query this view via the admin client (cron's
-- select-batch route), so the SECURITY DEFINER default is harmless
-- in practice. But the Supabase security advisor flags it because
-- if anyone ever grants SELECT to anon / authenticated, those roles
-- would silently inherit service-role read access to installers +
-- outreach_suppression + outreach_recipients + outreach_campaigns.
--
-- SECURITY INVOKER closes that footgun: the view always runs with
-- the caller's privileges. The admin client still bypasses RLS on
-- the underlying tables (service_role does that regardless of view
-- mode), so the existing cron flow is unaffected.

alter view public.outreach_eligibility set (security_invoker = on);

notify pgrst, 'reload schema';
