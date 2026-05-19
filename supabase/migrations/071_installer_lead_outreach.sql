-- ─── installer_lead_outreach ────────────────────────────────────────
--
-- Backs the "no slots → email installer" side-channel. When a
-- homeowner opens the booking modal for an installer whose diary is
-- empty for the next 28 days, we still want the installer to know
-- there's a warm lead waiting. This table records:
--
--   1. that we've emailed the installer about the lead (idempotently,
--      so opening the modal repeatedly doesn't spam them), and
--   2. whether the installer subsequently confirmed they reached out
--      to the homeowner off-platform.
--
-- The (installer_id, lead_id) UNIQUE constraint is the load-bearing
-- bit: ON CONFLICT DO NOTHING in the API route turns "did we already
-- email this combo?" into a single roundtrip with no race window.
--
-- `lead_id` references public.homeowner_leads — the lead exists at
-- the moment the homeowner finishes their check (well before any
-- installer-side `installer_leads` row would be created via a
-- successful booking). Linking to homeowner_leads keeps the schema
-- semantically honest: this table is "installer → homeowner lead"
-- not "installer → installer-side booking record".

create table public.installer_lead_outreach (
  id uuid primary key default gen_random_uuid(),

  -- Which installer we emailed about which lead. Both required —
  -- there's no scenario where one is meaningful without the other.
  installer_id integer not null references public.installers(id) on delete cascade,
  lead_id uuid not null references public.homeowner_leads(id) on delete cascade,

  -- Stamped when the row is inserted by the API route — i.e. the
  -- moment the email goes out (or, defensively, the moment we
  -- decided to send it; the send is fire-and-forget).
  email_sent_at timestamptz not null default now(),

  -- Stamped when the installer clicks "Reach out to homeowner" on
  -- the lead detail page. NULL means actionable (still in the
  -- dashboard "Missed because no slots — reachable now" section).
  contacted_at timestamptz,

  -- Channel the installer picked. Captured at the same time as
  -- contacted_at. Keep the enum small and queryable rather than
  -- accept free text (PostHog cohorting + simple filters).
  contact_method text check (contact_method in ('email', 'phone')),

  created_at timestamptz not null default now()
);

-- Idempotency guard. The route uses upsert + ON CONFLICT DO NOTHING
-- against this constraint so re-opening the booking modal can never
-- email the same installer about the same lead twice.
create unique index installer_lead_outreach_installer_lead_unique
  on public.installer_lead_outreach (installer_id, lead_id);

-- Dashboard "Missed because no slots — reachable now" query — filter
-- by installer_id and order by whether the installer has acted on it
-- yet. Partial-index-like behaviour via (installer_id, contacted_at)
-- gives us a clean NULLS FIRST sort.
create index installer_lead_outreach_installer_contacted_at_idx
  on public.installer_lead_outreach (installer_id, contacted_at);

comment on table public.installer_lead_outreach is
  'One row per (installer, homeowner-lead) pair where we emailed the installer about a warm lead they would otherwise have missed because their booking diary was empty for the next 28 days.';

comment on column public.installer_lead_outreach.lead_id is
  'References public.homeowner_leads(id) — the homeowner-side lead from the completed check. Not an installer_leads row because no booking has happened yet.';

comment on column public.installer_lead_outreach.contacted_at is
  'Stamped when the installer marks the lead as "I''ve reached out". NULL = still actionable.';

-- RLS: nobody outside the server reads/writes this table directly.
-- All reads + writes go through server-side API routes that use the
-- service-role admin client. Closed RLS keeps the table off the
-- PostgREST surface entirely.
alter table public.installer_lead_outreach enable row level security;

notify pgrst, 'reload schema';
