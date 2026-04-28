-- Report tokens — 30-day shareable links to a saved report.
--
-- Two flows:
--   1. Email me my report (Step 5b lead capture or report footer):
--      we generate a token tied to the homeowner's lead, email it to
--      them. Clicking the link loads the report from /r/<token>.
--
--   2. Forward to a partner (report footer "Share this report"):
--      we generate a SECOND token (own row) for the same lead so the
--      original user's link doesn't expire when the partner's does.
--      The partner's row stores their email + the original sender for
--      audit.
--
-- Snapshot semantics — the token row stores a frozen analysis_snapshot
-- at creation time. Future edits in the wizard don't affect already-
-- shared links. Recipient can interact (toggle scenarios, change battery
-- size, etc.) — those changes are local to their session, not saved
-- back to the snapshot.
--
-- Tokens are HMAC-signed UUIDs (not just random) so we can verify
-- without a DB lookup if needed (rate-limit, cache misses).

create table public.report_tokens (
  id uuid primary key default gen_random_uuid(),

  -- The token string sent in the link. We expose this URL-safely;
  -- HMAC signature lets us reject tampered tokens fast.
  token text not null unique,

  -- Origin
  homeowner_lead_id uuid references public.homeowner_leads(id) on delete set null,
  -- Email the link was sent to (homeowner email for "email me my report",
  -- partner email for forwards). Lower-cased on insert.
  recipient_email text not null,
  -- For forwards: who sent it. Null if it's the homeowner emailing themselves.
  forwarded_by_email text,
  -- "self" (email me my report) | "forward" (sent to a partner)
  kind text not null check (kind in ('self', 'forward')),

  -- The report itself, frozen at creation time. Same shape as
  -- homeowner_leads.analysis_snapshot.
  analysis_snapshot jsonb not null,
  -- Address etc. for the recipient's report header.
  property_address text,
  property_postcode text,
  property_uprn text,
  property_latitude numeric(10, 7),
  property_longitude numeric(10, 7),

  -- Lifecycle
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- Engagement tracking
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  -- Postmark message id of the email that delivered the link
  email_message_id text
);

create index report_tokens_token_idx on public.report_tokens (token);
create index report_tokens_recipient_email_idx on public.report_tokens (lower(recipient_email));
create index report_tokens_homeowner_lead_id_idx on public.report_tokens (homeowner_lead_id) where homeowner_lead_id is not null;
create index report_tokens_expires_at_idx on public.report_tokens (expires_at);

comment on table public.report_tokens is
  '30-day shareable report links. Two kinds: self (email me my report) and forward (sent to partner). analysis_snapshot is frozen at creation — recipient interactions are session-only.';
comment on column public.report_tokens.token is
  'HMAC-signed token in the magic link. Verifiable without a DB lookup.';

-- RLS — service role only for writes. Token-based reads happen via the
-- /api/reports/<token>/load endpoint (server-side, also service role).
alter table public.report_tokens enable row level security;
