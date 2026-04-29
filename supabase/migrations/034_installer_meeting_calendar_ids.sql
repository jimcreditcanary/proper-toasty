-- Add installer-side Google Calendar event ID to installer_meetings.
--
-- Migration 032 added a single `google_event_id` column. The PR B.4
-- design uses TWO calendar events per booking:
--   - Homeowner event: 1 hour, homeowner attendee, "Site survey with
--     {company}" copy with prep tips.
--   - Installer event: 2 hours (30 min travel + 1 hr meeting + 30 min
--     travel), installer attendee, full homeowner contact details +
--     report context in the description.
--
-- Storing both IDs lets the cancellation flow (deferred PR) revoke
-- both events from the booking calendar in one go.

alter table public.installer_meetings
  add column if not exists google_installer_event_id text;

comment on column public.installer_meetings.google_event_id is
  'Google Calendar event ID for the homeowner-facing 1hr invite.';
comment on column public.installer_meetings.google_installer_event_id is
  'Google Calendar event ID for the installer-facing 2hr invite (incl. 30min travel buffers).';

notify pgrst, 'reload schema';
