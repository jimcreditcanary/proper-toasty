-- Installer booking foundations.
--
-- Adds two tables to support a real "pick a slot" booking flow:
--
--   installer_availability
--     Recurring weekly blocks per installer. The installer-portal
--     (deferred PR) will let installers edit these. Until then every
--     installer is seeded with Mon–Fri 09:00–17:00 Europe/London so
--     the booking flow is live for the whole directory on day one.
--     Multiple rows per (installer, day_of_week) are allowed so
--     installers can express e.g. "Mon 09:00–12:00 + 14:00–17:00".
--
--   installer_meetings
--     Booked slots. One row per confirmed booking. `scheduled_at` is
--     the absolute UTC instant the meeting starts; the slot generator
--     and UI work in Europe/London but the DB stores UTC so DST
--     transitions don't bite. `travel_buffer_min` is informational —
--     the slot generator subtracts it either side of `scheduled_at`
--     when computing conflict windows so two bookings can't end up
--     30min apart. Google Calendar event IDs land here once the
--     calendar integration ships (B.4).
--
-- The slot generator (src/lib/booking/slots.ts) is the single source
-- of truth for "what slots are bookable" — the DB just stores the raw
-- inputs and the booked outputs.

-- ─── installer_availability ────────────────────────────────────────────

create table public.installer_availability (
  id uuid primary key default gen_random_uuid(),
  installer_id bigint not null references public.installers(id) on delete cascade,

  -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Matches JS Date.getDay()
  -- so the slot generator can index without a translation table.
  day_of_week smallint not null check (day_of_week between 0 and 6),

  -- Wall-clock times in Europe/London. Stored as `time` (no date) so
  -- the DB row says "every Monday 9am" — the slot generator combines
  -- with a calendar date to produce a UTC instant.
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index installer_availability_installer_idx
  on public.installer_availability (installer_id);

comment on table public.installer_availability is
  'Recurring weekly availability blocks per installer. All times Europe/London wall clock.';

-- ─── installer_meetings ────────────────────────────────────────────────

create table public.installer_meetings (
  id uuid primary key default gen_random_uuid(),
  installer_id bigint not null references public.installers(id) on delete restrict,

  -- Optional links to the lead row (booking flow context) and the
  -- homeowner who placed it. Both nullable so deleting either doesn't
  -- nuke historical meetings.
  installer_lead_id uuid references public.installer_leads(id) on delete set null,
  homeowner_lead_id uuid references public.homeowner_leads(id) on delete set null,

  -- Absolute UTC start. The UI shows Europe/London via Intl on render.
  scheduled_at timestamptz not null,
  duration_min integer not null default 60 check (duration_min > 0),

  -- Buffer for the installer's commute. Slot generator uses
  -- (scheduled_at - buffer) .. (scheduled_at + duration + buffer) as
  -- the "blocked" window when deciding what other slots are bookable.
  travel_buffer_min integer not null default 30 check (travel_buffer_min >= 0),

  -- Contact details captured during booking. Denormalised for the
  -- installer's convenience — they shouldn't have to traverse three
  -- tables to know who they're meeting.
  contact_name  text not null,
  contact_email text not null,
  contact_phone text not null,
  notes text,

  -- Google Calendar tracking — populated by B.4 once the integration
  -- ships. Nullable until then so B.1/B.2/B.3 can land independently.
  google_event_id    text,
  google_calendar_id text,
  invite_sent_at     timestamptz,

  -- Lifecycle. 'booked' is the default — the only state the homeowner
  -- can produce on creation. Cancellation / completion / no-show are
  -- handled later via the installer portal or admin tooling.
  status text not null default 'booked'
    check (status in ('booked', 'cancelled', 'completed', 'no_show')),
  cancelled_at timestamptz,
  cancellation_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The hot path: "what active meetings does installer X have between
-- date A and date B?". Partial index limits storage to the only status
-- the slot generator cares about for conflict checks.
create index installer_meetings_installer_scheduled_idx
  on public.installer_meetings (installer_id, scheduled_at)
  where status = 'booked';

-- "Show me everything I've booked" — used by the homeowner-facing
-- "already contacted" section once meetings replace plain leads.
create index installer_meetings_homeowner_idx
  on public.installer_meetings (homeowner_lead_id)
  where homeowner_lead_id is not null;

comment on table public.installer_meetings is
  'Confirmed installer site-survey bookings. scheduled_at is UTC; slot generator + UI translate to Europe/London on display.';

-- ─── Seed default Mon–Fri 09:00–17:00 for every installer ──────────────
-- Bootstraps the booking flow for the whole directory before the
-- installer portal ships. Once an installer logs in and edits their
-- availability, these defaults stay or get replaced — no special-case
-- logic needed.

insert into public.installer_availability (installer_id, day_of_week, start_time, end_time)
select i.id, dow, '09:00'::time, '17:00'::time
from public.installers i
cross join (values (1), (2), (3), (4), (5)) as days(dow)
where not exists (
  select 1 from public.installer_availability a
  where a.installer_id = i.id and a.day_of_week = dow
);

-- ─── PostgREST schema reload ───────────────────────────────────────────
notify pgrst, 'reload schema';
