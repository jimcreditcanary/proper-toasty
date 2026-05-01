-- C4 — 24h auto-release of pending installer leads + 12h reminder.
--
-- Two new timestamp columns on installer_leads, both used by the
-- cron at /api/cron/release-stale-leads as idempotency guards:
--
--   installer_reminder_sent_at  — set when we've fired the
--                                 "12 hours left to accept" email.
--                                 Stops the cron sending it twice.
--
--   auto_released_at            — set when we've cancelled the lead
--                                 because the installer didn't
--                                 respond within 24h. Lets us
--                                 distinguish auto-cancellations
--                                 from manual declines in reporting,
--                                 and prevents the cron re-running
--                                 the release path on the same row.
--
-- We also drop in two partial indexes so the hourly cron query is
-- cheap regardless of how many historical leads have piled up.

alter table public.installer_leads
  add column if not exists installer_reminder_sent_at timestamptz;

alter table public.installer_leads
  add column if not exists auto_released_at timestamptz;

-- Cron query 1: pending leads needing reminders. Filter on:
--   status in ('new', 'sent_to_installer')
--   AND installer_reminder_sent_at is null
--   AND installer_notified_at < now() - 12h
--
-- Partial index keeps it tight — once a row gets a reminder timestamp
-- it falls out of the index forever.
create index if not exists installer_leads_reminder_due_idx
  on public.installer_leads (installer_notified_at)
  where installer_reminder_sent_at is null
    and status in ('new', 'sent_to_installer')
    and installer_notified_at is not null;

-- Cron query 2: pending leads needing auto-release. Filter on:
--   status in ('new', 'sent_to_installer')
--   AND auto_released_at is null
--   AND installer_notified_at < now() - 24h
create index if not exists installer_leads_release_due_idx
  on public.installer_leads (installer_notified_at)
  where auto_released_at is null
    and status in ('new', 'sent_to_installer')
    and installer_notified_at is not null;

comment on column public.installer_leads.installer_reminder_sent_at is
  'C4: timestamp the 12h "still pending" reminder email fired. NULL = not yet reminded.';
comment on column public.installer_leads.auto_released_at is
  'C4: timestamp the cron auto-released this lead because the installer didn''t respond in 24h. NULL = either still pending, or actioned manually.';

-- Reload PostgREST schema.
notify pgrst, 'reload schema';
