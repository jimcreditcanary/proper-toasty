-- I5: Installer-initiated pre-survey requests.
--
-- Lets an installer enter a customer's name + email + postcode and
-- send them a personalised link to the /check flow. When the
-- customer completes the check, the resulting lead is auto-routed
-- to the requesting installer with no booking dance — they're
-- already known to each other.
--
-- One credit per send. Resends allowed after a 72-hour cooling
-- period (so a busy installer doesn't accidentally double-charge
-- themselves) and each one bumps `sends_count` and re-stamps
-- `last_sent_at`. Token expiry is fixed at 30 days from first send.
--
-- Lifecycle:
--   pending    request created, email out, awaiting click
--   clicked    customer landed on /check?presurvey=<token>
--   completed  customer finished the check + lead auto-created
--   expired    30d passed without completion (set lazily at read time)
--
-- The result columns (`result_homeowner_lead_id`,
-- `result_installer_lead_id`) get stamped at completion so the
-- installer-side list can deep-link straight to the inbox card +
-- the report viewer.

-- ─── Table ──────────────────────────────────────────────────────────

create table public.installer_pre_survey_requests (
  id uuid primary key default gen_random_uuid(),

  -- Ownership
  installer_id bigint not null references public.installers(id),

  -- Customer context (what the installer types in)
  contact_name text not null,
  contact_email text not null,
  contact_postcode text,

  -- Lifecycle
  status text not null default 'pending'
    check (status in ('pending', 'clicked', 'completed', 'expired')),

  -- HMAC-signed prefill token. URL-safe form (compactUuid.hex), minted
  -- at create time. Stable for the life of the request — resends use
  -- the same link.
  homeowner_token text not null unique,

  -- Resend bookkeeping. Each send (initial + resends) is one credit.
  -- The 72-hour cooling-off is enforced in the resend route, not the
  -- DB, so it stays editable without a migration.
  sends_count integer not null default 1
    check (sends_count >= 1),
  last_sent_at timestamptz not null default now(),
  total_credits_charged integer not null default 1
    check (total_credits_charged >= 0),

  -- Click + completion tracking
  clicked_at timestamptz,
  completed_at timestamptz,

  -- Wired up at completion so the installer can deep-link into both
  -- sides of the resulting lead.
  result_homeowner_lead_id uuid references public.homeowner_leads(id) on delete set null,
  result_installer_lead_id uuid references public.installer_leads(id) on delete set null,

  -- Hard expiry — 30 days from first send. Stamped at create time so
  -- a single column query covers it; we don't need a cron to flip
  -- status on its own (the installer's list page does it lazily).
  expires_at timestamptz not null default now() + interval '30 days',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index installer_pre_survey_requests_installer_id_idx
  on public.installer_pre_survey_requests (installer_id);

create index installer_pre_survey_requests_status_idx
  on public.installer_pre_survey_requests (status);

create index installer_pre_survey_requests_email_idx
  on public.installer_pre_survey_requests (lower(contact_email));

create index installer_pre_survey_requests_created_at_idx
  on public.installer_pre_survey_requests (created_at desc);

create trigger installer_pre_survey_requests_updated_at_trigger
before update on public.installer_pre_survey_requests
for each row execute function public.installers_set_updated_at();

alter table public.installer_pre_survey_requests enable row level security;

comment on table public.installer_pre_survey_requests is
  'I5: installer-initiated pre-survey link sends. 1 credit/send, 30d token, lead auto-routes to requester on completion.';
comment on column public.installer_pre_survey_requests.homeowner_token is
  'URL-safe HMAC token consumed by /check?presurvey=<token>. Reused across resends.';
comment on column public.installer_pre_survey_requests.sends_count is
  'Includes the initial send. Resends after 72h add 1 each + charge another credit.';

-- ─── installer_leads attribution ───────────────────────────────────
--
-- Bridge column: when an installer-requested check completes, we
-- create the installer_leads row with this set. Lets the inbox
-- distinguish directory-discovered ("homeowner picked us") from
-- installer-requested ("we asked them to do the check") and skip
-- the credit charge + booking dance for the latter.

alter table public.installer_leads
  add column if not exists pre_survey_request_id uuid
    references public.installer_pre_survey_requests(id) on delete set null;

create index if not exists installer_leads_pre_survey_request_id_idx
  on public.installer_leads (pre_survey_request_id)
  where pre_survey_request_id is not null;

comment on column public.installer_leads.pre_survey_request_id is
  'I5: set when this lead came from an installer-initiated pre-survey send. Null for organic directory leads.';

notify pgrst, 'reload schema';
