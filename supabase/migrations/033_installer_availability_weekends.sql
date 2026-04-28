-- Backfill weekend availability for every installer.
--
-- Migration 032 only seeded Mon–Fri 09:00–17:00. In practice many UK
-- home-improvement trades do work weekends — homeowners are often at
-- work Mon–Fri so Saturday morning is the popular slot.
--
-- Defaults applied:
--   Saturday (6): 09:00–17:00 (same as weekdays)
--   Sunday   (0): 10:00–16:00 (slightly shorter — fewer trades operate
--                              full Sunday hours)
--
-- The installer portal (PR C, deferred) will let installers turn
-- weekends off if they don't want bookings on those days. Until then,
-- a homeowner who books an unwanted weekend slot can be redirected via
-- the installer-contact-info we surface in the booking confirmation
-- email (PR B.3).
--
-- Idempotent: WHERE NOT EXISTS prevents double-insert if any installer
-- already has a row for that day (e.g. seeded manually).

insert into public.installer_availability (installer_id, day_of_week, start_time, end_time)
select i.id, 6, '09:00'::time, '17:00'::time
from public.installers i
where not exists (
  select 1 from public.installer_availability a
  where a.installer_id = i.id and a.day_of_week = 6
);

insert into public.installer_availability (installer_id, day_of_week, start_time, end_time)
select i.id, 0, '10:00'::time, '16:00'::time
from public.installers i
where not exists (
  select 1 from public.installer_availability a
  where a.installer_id = i.id and a.day_of_week = 0
);

notify pgrst, 'reload schema';
