-- Wipe every meeting from the database — used to reset booking
-- state during testing without going row-by-row in the dashboard.
--
-- Paste this whole block into the Supabase SQL editor and run it.
-- Wrapped in a transaction so the four steps land atomically — if
-- any one fails, the whole thing rolls back rather than leaving
-- the booking state half-cleared.
--
-- What gets deleted / reset:
--
--   1. `installer_meetings` rows — fully truncated (every row).
--      This is the canonical meetings table; everything else is
--      denormalised state that points back to it.
--
--   2. `installer_leads.visit_booked_for` — cleared. This is the
--      denormalised meeting timestamp on the lead row; the
--      "Taken — booked for …" badge reads from here. Without this
--      reset, leads would keep showing as booked even after the
--      underlying meeting row disappears.
--
--   3. `installer_leads.status` — leads currently at `visit_booked`
--      rewind to `installer_acknowledged` (the previous state in
--      the lead lifecycle: `new → sent_to_installer →
--      installer_acknowledged → visit_booked → visit_completed →
--      closed_*`). Leads at any other status are untouched.
--
--   4. `installer_pre_survey_requests.meeting_status` /
--      `meeting_at` — pre-survey requests where the installer
--      pre-booked a meeting at send-time reset to ('not_booked',
--      null). Both fields together so the
--      `pre_survey_meeting_at_consistency` CHECK constraint stays
--      happy (it requires `meeting_status = 'booked'` iff
--      `meeting_at is not null`).
--
-- What's NOT touched:
--   - `homeowner_leads` / wizard state — pre-survey leads survive,
--     they just lose their booking. The homeowner-side report will
--     re-render with the "book a site visit" tab visible again.
--   - `installer_availability` rules — working hours + caps survive.
--   - Calendar invites already emailed — we can't recall those.
--     Anyone who received an .ics is on their own.
--
-- Safety:
--   - Wrapped in BEGIN/COMMIT so all four steps land or none do.
--   - The `RAISE NOTICE` lines print row counts so you can sanity-
--     check before committing. If the numbers look wrong, run
--     `ROLLBACK;` in the same editor session before the COMMIT
--     line fires (Supabase SQL editor commits at end-of-statement
--     unless you wrap explicitly).

begin;

-- 1. Truncate installer_meetings. RESTART IDENTITY isn't needed
--    (PK is uuid, no sequence to reset). CASCADE isn't needed
--    either — nothing else FKs to installer_meetings.id.
do $$
declare
  meetings_deleted int;
begin
  delete from public.installer_meetings;
  get diagnostics meetings_deleted = row_count;
  raise notice '✓ installer_meetings: % row(s) deleted', meetings_deleted;
end $$;

-- 2 + 3. Revert booked leads. Two-step:
--    (a) leads at status='visit_booked' lose the status flag AND
--        their denorm timestamp,
--    (b) belt-and-braces — clear visit_booked_for on any lead
--        that still has one set (rare; happens when a meeting was
--        cancelled without rewinding the status).
do $$
declare
  lead_status_reset int;
  visit_for_orphans int;
begin
  update public.installer_leads
     set status = 'installer_acknowledged',
         visit_booked_for = null
   where status = 'visit_booked';
  get diagnostics lead_status_reset = row_count;
  raise notice
    '✓ installer_leads: % row(s) reverted from visit_booked → installer_acknowledged',
    lead_status_reset;

  update public.installer_leads
     set visit_booked_for = null
   where visit_booked_for is not null;
  get diagnostics visit_for_orphans = row_count;
  raise notice
    '✓ installer_leads: % orphan visit_booked_for value(s) cleared',
    visit_for_orphans;
end $$;

-- 4. Reset pre-survey-request meetings. Both columns together —
--    the CHECK constraint pre_survey_meeting_at_consistency
--    requires (meeting_status = 'booked' AND meeting_at IS NOT NULL)
--    OR (meeting_status = 'not_booked' AND meeting_at IS NULL),
--    so we can't update one without the other.
do $$
declare
  presurvey_reset int;
begin
  update public.installer_pre_survey_requests
     set meeting_status = 'not_booked',
         meeting_at = null
   where meeting_status = 'booked';
  get diagnostics presurvey_reset = row_count;
  raise notice
    '✓ installer_pre_survey_requests: % row(s) reset to meeting_status=not_booked',
    presurvey_reset;
end $$;

commit;

-- After the COMMIT lands, the Realtime + PostgREST schema is
-- already in sync (we didn't change any DDL, just data) so no
-- `notify pgrst, 'reload schema'` needed.
