-- I5 follow-up: capture whether a site visit is already booked when
-- the installer sends a pre-survey link.
--
-- The homeowner's report rendering branches on this:
--   meeting_status = 'booked'      → hide the Book-a-site-visit tab
--                                    entirely; surface the date/time
--                                    in a banner on the report
--   meeting_status = 'not_booked'  → show the focused single-installer
--                                    booking card (already in place)
--
-- Default is 'not_booked' so existing rows + new sends without a
-- meeting answer behave like the current flow.

alter table public.installer_pre_survey_requests
  add column if not exists meeting_status text
    not null
    default 'not_booked'
    check (meeting_status in ('not_booked', 'booked')),
  add column if not exists meeting_at timestamptz;

-- Sanity: when meeting_status = 'booked' there should be a meeting_at
-- (and vice versa — when meeting_at is set, status must be 'booked').
-- Enforced as a CHECK so the report code can trust the pair.
alter table public.installer_pre_survey_requests
  add constraint pre_survey_meeting_at_consistency
  check (
    (meeting_status = 'booked' and meeting_at is not null)
    or
    (meeting_status = 'not_booked' and meeting_at is null)
  );

comment on column public.installer_pre_survey_requests.meeting_status is
  'I5: whether a site visit is already booked at send-time. Drives Book tab visibility on the homeowner report.';
comment on column public.installer_pre_survey_requests.meeting_at is
  'I5: when the meeting is, if booked. Constrained by pre_survey_meeting_at_consistency to be non-null iff meeting_status = booked.';

notify pgrst, 'reload schema';
