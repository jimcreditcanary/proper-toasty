-- Allow guest (unauthenticated) checks.
--
-- Migration 022 created public.checks with user_id NOT NULL — back
-- when running a check required signup. The product has moved to a
-- guest-first flow since (hero mini-wizard → aerial preview →
-- questions → lead capture), so every real user hitting /check today
-- is anonymous at check-write time. The NOT NULL constraint was
-- rejecting every one of those inserts with SQLSTATE 23502
-- ("null value in column user_id of relation checks"), silently:
--   - /api/checks/upsert returns 500 → the wizard's fire-and-forget
--     call at step-5-analysis fails with no visible error
--   - the fallback stub-insert in /api/leads/capture (added Aug 9
--     by PR #197) ALSO passes user_id=null, so it fails the same way
--
-- Net effect: 4 real users completed the flow in the last 30 days,
-- 0 have a checks row, they were invisible in /admin/reports (see
-- scripts/dev/diagnose-report-requests.ts output). Jim's own tests
-- always worked because he was signed in.
--
-- Fix: drop the NOT NULL. FK to auth.users(id) is kept so an
-- authenticated user's checks stay attributable. Guest checks land
-- with user_id=null and are tracked by client_session_id +
-- homeowner_lead_id (both indexed).

alter table public.checks
  alter column user_id drop not null;

-- RLS policies from migration 022 already gate "own checks" reads on
-- auth.uid() = user_id — those still work for authenticated users.
-- Guest reads happen server-side via the admin client (bypasses RLS)
-- + the /r/[token] share-link path, so no policy change is needed.
