-- Notification + acknowledge-token tracking on installer_leads.
--
-- When a homeowner books a site visit, we send two emails (one to the
-- installer, one to the homeowner) and update notification_status. The
-- installer's email contains a magic link with an acknowledge_token —
-- when they click it we update status → 'installer_acknowledged' and
-- record acknowledge_clicked_at. No installer auth required for the
-- ack — the token itself is HMAC-signed and unforgeable.
--
-- notification_status separated from the lifecycle `status` column
-- because the latter tracks the SALES funnel ("acknowledged → visit
-- booked → won/lost") and the former tracks DELIVERY ("did the email
-- send?"). They're independent concerns.

alter table public.installer_leads
  add column if not exists notification_status text not null default 'pending'
    check (notification_status in (
      'pending',           -- not yet attempted (still 'new' lifecycle)
      'sent',              -- both installer + homeowner emails sent
      'installer_only',    -- installer sent, homeowner failed (rare)
      'homeowner_only',    -- homeowner sent, installer failed (most common)
      'failed',            -- both failed (Resend down, no API key, etc.)
      'skipped'            -- email provider not configured — manual relay
    )),
  add column if not exists notification_error text,
  add column if not exists notification_attempted_at timestamptz,
  add column if not exists installer_email_id text,        -- Resend message id
  add column if not exists homeowner_email_id text,        -- Resend message id

  -- Acknowledge token — HMAC-SHA256 over the lead id, signed with
  -- INSTALLER_LEAD_ACK_SECRET env var. Stateless (we don't store the
  -- secret per-row), but we DO store the token so we can rotate the
  -- secret without invalidating outstanding links if ever needed.
  add column if not exists acknowledge_token text,
  add column if not exists acknowledge_clicked_at timestamptz;

create index if not exists installer_leads_notification_status_idx
  on public.installer_leads (notification_status)
  where notification_status in ('pending', 'failed', 'installer_only', 'homeowner_only');

comment on column public.installer_leads.notification_status is
  'Email delivery status — independent of lifecycle status. pending = not yet attempted; sent = both went; failed = both failed; installer_only/homeowner_only = partial; skipped = no provider configured.';
comment on column public.installer_leads.acknowledge_token is
  'Magic-link token sent in the installer''s email. Verifying it transitions status to installer_acknowledged. Stateless HMAC-SHA256 over the lead id.';
