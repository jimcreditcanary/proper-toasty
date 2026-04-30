-- Installer visit settings + meeting `pending` status.
--
-- Two things bundled because they're both needed for the C3 booking
-- refactor (defer calendar invites until installer accepts):
--
-- 1. installers.meeting_duration_min + installers.travel_buffer_min
--    Lets each installer decide how long their site visits are and
--    how much travel buffer they want. Slot generator + calendar
--    events both read from these. Defaults: 60min visit + 30min
--    buffer either side (the global defaults we shipped in B.1).
--    The installer-portal availability editor (PR I2) lets them
--    edit; until then everyone uses the defaults.
--
-- 2. installer_meetings.status now allows 'pending'
--    The default flips from 'booked' → 'pending' so a new booking
--    holds the slot but doesn't trigger calendar invites until the
--    installer clicks accept. Slot generator must count both
--    pending + booked as taken (the API handles that filter).
--    Existing rows are left at 'booked' — only new bookings start
--    pending.

-- ─── Installer visit settings ───────────────────────────────────────────

alter table public.installers
  add column if not exists meeting_duration_min integer not null default 60;

alter table public.installers
  add column if not exists travel_buffer_min integer not null default 30;

alter table public.installers
  drop constraint if exists installers_meeting_duration_min_check;
alter table public.installers
  add constraint installers_meeting_duration_min_check
  check (meeting_duration_min > 0 and meeting_duration_min <= 480);

alter table public.installers
  drop constraint if exists installers_travel_buffer_min_check;
alter table public.installers
  add constraint installers_travel_buffer_min_check
  check (travel_buffer_min >= 0 and travel_buffer_min <= 240);

comment on column public.installers.meeting_duration_min is
  'Default site-visit length in minutes. Editable in the installer portal availability page (PR I2).';
comment on column public.installers.travel_buffer_min is
  'Travel buffer applied either side of every booking, in minutes. Stops back-to-back slots being offered when the installer needs to drive between them.';

-- ─── Meeting status: pending ────────────────────────────────────────────

alter table public.installer_meetings
  drop constraint if exists installer_meetings_status_check;

alter table public.installer_meetings
  add constraint installer_meetings_status_check
  check (status in ('pending', 'booked', 'cancelled', 'completed', 'no_show'));

alter table public.installer_meetings
  alter column status set default 'pending';

comment on column public.installer_meetings.status is
  'Lifecycle: pending (homeowner booked, installer not yet accepted) → booked (installer accepted, calendar invites sent) → completed / cancelled / no_show. Slot generator treats pending + booked as taken so the slot is held while waiting for accept.';

notify pgrst, 'reload schema';
