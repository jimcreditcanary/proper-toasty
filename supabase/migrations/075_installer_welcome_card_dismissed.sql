-- Welcome-card dismissal flag — second iteration.
--
-- m056 added users.installer_onboarding_dismissed_at, set when an
-- installer manually closed the card OR when every checklist step
-- was complete. That worked for the original "step 1 → 4 in order"
-- design where the card was implicitly tied to first-time setup.
--
-- The card has since drifted toward a permanent "what's next?"
-- surface — see PR #82 (hide completed rows, +N done pill) and this
-- PR (unordered CTAs + explicit dismiss). The dismiss state more
-- naturally belongs on the installer row itself: it's an installer
-- preference about an installer-facing surface, and it lets us
-- re-show the card when we add new tasks to the checklist (by
-- comparing task_added_at constants against this timestamp in the
-- dashboard query). The users-table column carried no such per-task
-- granularity.
--
-- Migration strategy: ADD a new column rather than rename. The old
-- users.installer_onboarding_dismissed_at column stays in place for
-- backfill — once this ships, the dashboard reads exclusively from
-- the new column, and we can drop the old one in a future cleanup
-- migration once we're confident nothing else references it.
-- Backfilling existing dismissals is a courtesy so installers who
-- already X'd the card don't see it pop back up.

alter table public.installers
  add column if not exists welcome_card_dismissed_at timestamptz;

comment on column public.installers.welcome_card_dismissed_at is
  'When the installer dismissed the welcome / onboarding card on /installer. Null = show. Timestamp = hide. Compared against per-task task_added_at constants in src/lib/installer-onboarding/checklist.ts — if any task was added after this timestamp, the card re-shows so the new task is visible. Toggled via /api/installer/onboarding/dismiss.';

-- Backfill: copy existing dismissals over from users so installers
-- who already dismissed the previous version of the card don't see
-- it reappear after deploy. Joined via installers.user_id.
update public.installers i
  set welcome_card_dismissed_at = u.installer_onboarding_dismissed_at
from public.users u
where i.user_id = u.id
  and u.installer_onboarding_dismissed_at is not null
  and i.welcome_card_dismissed_at is null;

notify pgrst, 'reload schema';
