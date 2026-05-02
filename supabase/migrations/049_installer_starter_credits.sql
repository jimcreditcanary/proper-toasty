-- Free starter credits for new installers.
--
-- Every installer-bound user gets a one-time +30 credit grant on
-- their first claim — enough to genuinely try the product (30 pre-
-- survey sends OR 6 leads accepted OR a mix) without breaking
-- the unit-economics math.
--
-- Track-and-grant pattern:
--   1. New column `installer_starter_credits_granted_at` on users
--      doubles as both a flag (NULL = not granted) and an audit
--      timestamp (when they got it).
--   2. The /lib/installer-claim/complete-claim helper grants on
--      first claim using a CAS update (... WHERE column IS NULL)
--      so re-claims after a disconnect don't double-grant.
--   3. This migration backfills every existing installer-bound
--      user that hasn't already been granted, in one shot. Safe
--      to re-run.

alter table public.users
  add column if not exists installer_starter_credits_granted_at timestamptz;

comment on column public.users.installer_starter_credits_granted_at is
  'I-onboarding: when the one-time installer starter-credit bonus was granted. NULL = not granted yet. Gates the grant CAS so re-claims never double-fire.';

-- Backfill: every installer-bound user without a grant timestamp
-- gets the bonus now. The EXISTS clause limits this to people who
-- are actually an installer (not every user in the table).
update public.users u
set credits = credits + 30,
    installer_starter_credits_granted_at = now()
where u.installer_starter_credits_granted_at is null
  and exists (
    select 1 from public.installers i where i.user_id = u.id
  );

notify pgrst, 'reload schema';
