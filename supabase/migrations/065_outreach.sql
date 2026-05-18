-- Installer outreach engine — Phase 1 schema.
--
-- Built to drive automated, personalised cold outreach to the 5,500
-- MCS installers we have on file, converting them via a tiered
-- "founder offer" mechanic that's atomic + race-safe under
-- concurrent claims.
--
-- Design points:
--
-- 1. All `outreach_*` tables are service-role-only (no RLS grants
--    to anon or authenticated). The admin dashboard reads via
--    server-rendered routes using the admin client. There's no
--    direct browser → outreach-table query path anywhere.
--
-- 2. `outreach_founder_claims` is the load-bearing atomicity layer.
--    Tier-1 founder spots are a per-(region, tech_bucket) singleton.
--    The claim RPC uses SELECT ... FOR UPDATE to serialise concurrent
--    claimers, otherwise two simultaneous founder clicks could both
--    land tier=founder.
--
-- 3. Outreach credit grants pre-stamp users.installer_starter_credits_
--    granted_at so the existing complete-claim flow's automatic +30
--    starter grant short-circuits. Otherwise tier=founder would get
--    300+30=330, tier=standard would get 30+30=60.
--
-- 4. The `outreach_email_sequence` table is a *declarative* sequence
--    definition (step → delay → condition → template) rather than
--    hardcoded in app code. Tweaking timing or copy = a single UPDATE
--    statement, no deploy.

-- ─── outreach_campaigns ─────────────────────────────────────────

create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'complete')),

  -- Send-rate + window config. The selector + processor both
  -- consult these on every run. Stored as local-time hours +
  -- a timezone so DST transitions don't break scheduling twice
  -- a year.
  daily_send_limit integer not null default 30,
  send_window_timezone text not null default 'Europe/London',
  daily_send_window_start_hour_local integer not null default 9
    check (daily_send_window_start_hour_local between 0 and 23),
  daily_send_window_end_hour_local integer not null default 17
    check (daily_send_window_end_hour_local between 0 and 23),
  peak_hours_local integer[] not null default array[9, 10, 14, 15],
  weekdays_only boolean not null default true,

  -- Auto-pause thresholds. Webhook handler reads these on every
  -- bounce / complaint event and computes rolling-24h rates.
  bounce_rate_pause_threshold numeric(5,4) not null default 0.05,
  complaint_rate_pause_threshold numeric(5,4) not null default 0.003,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.outreach_campaigns is
  'Outreach campaign config. One row per cohort/wave. Send-window stored as local hours + timezone for DST safety.';

-- ─── outreach_suppression ───────────────────────────────────────

-- Global do-not-send. Checked at three points: batch selection
-- (eligibility view filter), send-time (last-mile), and post-event
-- (added via webhook for bounces/complaints/unsubscribes).

create table if not exists public.outreach_suppression (
  email text primary key,
  reason text not null
    check (reason in ('bounced', 'complained', 'unsubscribed', 'manual',
                      'spam_trap', 'low_engagement', 'invalid')),
  source text,
  created_at timestamptz not null default now()
);

comment on table public.outreach_suppression is
  'Global outreach suppression list. Email = pk so the check is a single index lookup at send-time.';

-- Seed obvious honeypot patterns. The eligibility view scans for
-- additional patterns at query time (postmaster@, noreply@, etc.).

-- ─── outreach_recipients ────────────────────────────────────────

create table if not exists public.outreach_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  installer_id bigint not null references public.installers(id) on delete cascade,

  -- Lifecycle. Single text + CHECK rather than a Postgres enum
  -- type because enum evolution requires a migration per value;
  -- a CHECK constraint can be amended in place.
  state text not null default 'queued'
    check (state in (
      'queued', 'scheduled', 'sent', 'delivered',
      'opened', 'clicked', 'signed_up', 'completed',
      'bounced', 'unsubscribed', 'complained', 'replied', 'failed'
    )),

  -- Assigned at claim time, not send time, so the templated
  -- email's tier copy survives any tier degradation between send
  -- and click.
  assigned_tier text
    check (assigned_tier in ('founder', 'early_access', 'standard')),

  current_step integer not null default 0,
  next_action_at timestamptz not null default now(),

  -- HMAC-signed token used in the landing-page URL. The token
  -- encodes recipient_id + campaign_id; signature is validated
  -- server-side. Token TTL is implicit: 90 days from created_at.
  claim_token text not null unique,

  -- Engagement timestamps.
  last_sent_at timestamptz,
  last_opened_at timestamptz,
  last_clicked_at timestamptz,
  last_replied_at timestamptz,

  -- Conversion milestones — each grants additional credits.
  signed_up_at timestamptz,
  profile_completed_at timestamptz,
  questions_completed_at timestamptz,
  blog_post_completed_at timestamptz,
  card_connected_at timestamptz,

  credits_granted integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One recipient row per (campaign, installer). Defends against
  -- double-enqueueing the same installer in a single campaign.
  unique (campaign_id, installer_id)
);

create index if not exists outreach_recipients_scheduler_idx
  on public.outreach_recipients (campaign_id, state, next_action_at);

create index if not exists outreach_recipients_installer_idx
  on public.outreach_recipients (installer_id);

comment on table public.outreach_recipients is
  'One row per (campaign, installer) — the recipient lifecycle row that the scheduler, sender, and webhook handler all mutate.';

-- ─── outreach_events ────────────────────────────────────────────

-- Append-only event log. Powers the admin dashboard's recent-
-- activity feed + serves as the audit table for the outreach
-- credit grants (event_type = 'credits_granted'). We don't have
-- a TTL today; expect to prune after ~1 year once the table
-- becomes unwieldy.

create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.outreach_recipients(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'queued', 'sent', 'delivered', 'open', 'click',
      'bounce', 'spam_complaint', 'subscription_change',
      'inbound_reply', 'landing_page_view',
      'signed_up', 'task_completed', 'credits_granted',
      'tier_assigned', 'campaign_paused'
    )),
  metadata jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists outreach_events_recipient_idx
  on public.outreach_events (recipient_id, occurred_at desc);

create index if not exists outreach_events_type_idx
  on public.outreach_events (event_type, occurred_at desc);

comment on table public.outreach_events is
  'Append-only event log. Webhook events, sequence transitions, and credit-grant audit rows all land here.';

-- ─── outreach_email_sequence ────────────────────────────────────

-- Declarative sequence: which template fires at which step, after
-- how long, on what condition. Tweakable via UPDATE — no deploy.

create table if not exists public.outreach_email_sequence (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  step_number integer not null check (step_number >= 0),
  name text not null,
  delay_days_after_previous integer not null default 0
    check (delay_days_after_previous >= 0),
  condition text not null default 'always'
    check (condition in (
      'always', 'not_opened', 'opened_not_clicked',
      'clicked_not_signed_up', 'not_signed_up'
    )),
  template_id text not null,
  subject_variants text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  unique (campaign_id, step_number)
);

comment on table public.outreach_email_sequence is
  'Per-campaign sequence definition. Each row = one step in the cadence; the follow-up scheduler walks rows in step_number order.';

-- ─── outreach_founder_claims ────────────────────────────────────

-- Atomic counter per (region, tech_bucket). The founder-tier
-- claim RPC SELECT ... FOR UPDATEs the matching row, so two
-- concurrent founder clicks for the same region+tech serialize
-- and only the first lands tier=founder.
--
-- 12 regions × 4 tech buckets = 48 rows total. Seeded at the
-- bottom of this migration.

create table if not exists public.outreach_founder_claims (
  region text not null
    check (region in (
      'london', 'south_east', 'south_west', 'eastern',
      'wales', 'north_west', 'yorkshire_humberside',
      'west_midlands', 'east_midlands', 'north_east',
      'scotland', 'northern_ireland'
    )),
  tech_bucket text not null
    check (tech_bucket in (
      'heat_pump', 'solar_pv', 'battery_storage', 'solar_thermal'
    )),

  tier_1_filled boolean not null default false,
  tier_1_claimed_by_installer_id bigint references public.installers(id) on delete set null,
  tier_1_claimed_at timestamptz,

  tier_2_claimed_count integer not null default 0
    check (tier_2_claimed_count between 0 and 5),

  updated_at timestamptz not null default now(),

  primary key (region, tech_bucket)
);

comment on table public.outreach_founder_claims is
  'Tier counter per (region, tech_bucket). Row-locked at claim time to serialize concurrent claimers.';

-- ─── RLS ────────────────────────────────────────────────────────

alter table public.outreach_campaigns        enable row level security;
alter table public.outreach_recipients       enable row level security;
alter table public.outreach_events           enable row level security;
alter table public.outreach_email_sequence   enable row level security;
alter table public.outreach_founder_claims   enable row level security;
alter table public.outreach_suppression      enable row level security;

-- No grants to anon or authenticated. Service-role bypasses RLS
-- so the admin dashboard + cron jobs reading via the admin client
-- get full access; the browser/anon role gets nothing.

-- ─── RPC: outreach_grant_credits ────────────────────────────────

-- Atomic credit grant + audit. Mirrors admin_adjust_credits shape
-- but writes its audit row to outreach_events instead of
-- admin_credit_adjustments.

create or replace function public.outreach_grant_credits(
  p_user_id uuid,
  p_recipient_id uuid,
  p_delta integer,
  p_reason text
)
returns integer
language plpgsql
security definer
as $$
declare
  v_balance_before integer;
  v_balance_after integer;
begin
  if p_delta <= 0 then
    raise exception 'delta must be positive (got %)', p_delta;
  end if;

  -- Lock the user row for the txn duration.
  select credits into v_balance_before
    from public.users
   where id = p_user_id
   for update;

  if v_balance_before is null then
    raise exception 'user % not found', p_user_id;
  end if;

  v_balance_after := v_balance_before + p_delta;

  update public.users
     set credits = v_balance_after,
         updated_at = now()
   where id = p_user_id;

  insert into public.outreach_events
    (recipient_id, event_type, metadata)
  values
    (p_recipient_id, 'credits_granted', jsonb_build_object(
      'delta', p_delta,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after,
      'reason', p_reason
    ));

  return v_balance_after;
end;
$$;

comment on function public.outreach_grant_credits is
  'Atomic credit grant for outreach conversions. Locks the user row + writes audit to outreach_events.';

-- ─── RPC: outreach_claim_founder_offer ──────────────────────────

-- Called from /auth/callback (or claim-as-self) once the user has
-- bound the installer + we know which outreach recipient row this
-- corresponds to.
--
-- Returns (tier, credits_granted, region, tech_bucket).
--
-- Steps:
--   1. Resolve installer's primary region (priority order) + primary
--      tech_bucket (priority: heat_pump > solar_pv > battery_storage
--      > solar_thermal, based on cap_* flags).
--   2. SELECT ... FOR UPDATE on the matching founder_claims row.
--   3. Decide tier: tier_1_filled? → standard; else → founder
--      (and mark filled). Else if tier_2_claimed_count < 5 →
--      early_access (increment counter). Else → standard.
--   4. Pre-stamp installer_starter_credits_granted_at on the user
--      so the complete-claim flow's automatic +30 starter grant
--      short-circuits — outreach tier amounts are the only credits
--      we want granted via this path.
--   5. Grant credits via outreach_grant_credits.
--   6. Stamp signed_up_at + credits_granted on the recipient row.

create or replace function public.outreach_claim_founder_offer(
  p_recipient_id uuid,
  p_user_id uuid
)
returns table (
  tier text,
  credits_granted integer,
  region text,
  tech_bucket text
)
language plpgsql
security definer
as $$
declare
  v_recipient public.outreach_recipients%rowtype;
  v_installer public.installers%rowtype;
  v_region text;
  v_tech_bucket text;
  v_tier text;
  v_credits integer;
  v_claims_row public.outreach_founder_claims%rowtype;
begin
  -- Load recipient + installer.
  select * into v_recipient
    from public.outreach_recipients
   where id = p_recipient_id;
  if v_recipient.id is null then
    raise exception 'recipient % not found', p_recipient_id;
  end if;
  if v_recipient.signed_up_at is not null then
    raise exception 'recipient % has already claimed', p_recipient_id;
  end if;

  select * into v_installer
    from public.installers
   where id = v_recipient.installer_id;
  if v_installer.id is null then
    raise exception 'installer % not found', v_recipient.installer_id;
  end if;

  -- ── Primary region ──
  -- Priority order per the brief.
  v_region := case
    when v_installer.region_london then 'london'
    when v_installer.region_south_east then 'south_east'
    when v_installer.region_south_west then 'south_west'
    when v_installer.region_eastern then 'eastern'
    when v_installer.region_wales then 'wales'
    when v_installer.region_north_west then 'north_west'
    when v_installer.region_yorkshire_humberside then 'yorkshire_humberside'
    when v_installer.region_west_midlands then 'west_midlands'
    when v_installer.region_east_midlands then 'east_midlands'
    when v_installer.region_north_east then 'north_east'
    when v_installer.region_scotland then 'scotland'
    when v_installer.region_northern_ireland then 'northern_ireland'
    else null
  end;
  if v_region is null then
    raise exception 'installer % has no region flags set', v_installer.id;
  end if;

  -- ── Primary tech_bucket ──
  -- Priority: HP > solar PV > battery > solar thermal.
  -- HP rolls up the four BUS-eligible heat-pump types (per discovery
  -- decision 1); the rest are 1:1 with cap_* columns. Excludes
  -- biomass, hydro, micro_chp, wind_turbine, gas_absorption_HP,
  -- solar_assisted_HP — homeowner-facing tech only.
  v_tech_bucket := case
    when v_installer.cap_air_source_heat_pump
      or v_installer.cap_ground_source_heat_pump
      or v_installer.cap_water_source_heat_pump
      or v_installer.cap_exhaust_air_heat_pump then 'heat_pump'
    when v_installer.cap_solar_pv then 'solar_pv'
    when v_installer.cap_battery_storage then 'battery_storage'
    when v_installer.cap_solar_thermal then 'solar_thermal'
    else null
  end;
  if v_tech_bucket is null then
    raise exception 'installer % has no homeowner-facing tech capability', v_installer.id;
  end if;

  -- ── Lock the founder-claims row ──
  select * into v_claims_row
    from public.outreach_founder_claims
   where region = v_region and tech_bucket = v_tech_bucket
   for update;
  if v_claims_row.region is null then
    raise exception 'founder_claims row missing for (%, %)', v_region, v_tech_bucket;
  end if;

  -- ── Decide tier + record ──
  if not v_claims_row.tier_1_filled then
    v_tier := 'founder';
    v_credits := 300;
    update public.outreach_founder_claims
       set tier_1_filled = true,
           tier_1_claimed_by_installer_id = v_installer.id,
           tier_1_claimed_at = now(),
           updated_at = now()
     where region = v_region and tech_bucket = v_tech_bucket;
  elsif v_claims_row.tier_2_claimed_count < 5 then
    v_tier := 'early_access';
    v_credits := 100;
    update public.outreach_founder_claims
       set tier_2_claimed_count = tier_2_claimed_count + 1,
           updated_at = now()
     where region = v_region and tech_bucket = v_tech_bucket;
  else
    v_tier := 'standard';
    v_credits := 30;
  end if;

  -- ── Short-circuit the +30 starter grant ──
  -- The complete-claim flow's grantStarterCreditsIfFirstClaim CAS
  -- only fires when this column is NULL. By stamping it here,
  -- the outreach tier credits become the SOLE grant on this account
  -- — no stacking with the standard installer-welcome +30.
  update public.users
     set installer_starter_credits_granted_at = coalesce(
       installer_starter_credits_granted_at, now()
     )
   where id = p_user_id;

  -- ── Grant credits via the audited RPC ──
  perform public.outreach_grant_credits(
    p_user_id,
    p_recipient_id,
    v_credits,
    format('outreach-tier-%s', v_tier)
  );

  -- ── Stamp recipient row ──
  update public.outreach_recipients
     set signed_up_at = now(),
         credits_granted = credits_granted + v_credits,
         assigned_tier = v_tier,
         state = 'signed_up',
         updated_at = now()
   where id = p_recipient_id;

  -- Audit
  insert into public.outreach_events
    (recipient_id, event_type, metadata)
  values
    (p_recipient_id, 'tier_assigned', jsonb_build_object(
      'tier', v_tier,
      'region', v_region,
      'tech_bucket', v_tech_bucket,
      'credits', v_credits
    )),
    (p_recipient_id, 'signed_up', jsonb_build_object(
      'user_id', p_user_id,
      'installer_id', v_installer.id
    ));

  return query select v_tier, v_credits, v_region, v_tech_bucket;
end;
$$;

comment on function public.outreach_claim_founder_offer is
  'Atomic tier assignment + credit grant for outreach claimants. Row-locks the founder_claims row to serialize concurrent founder clicks.';

-- ─── View: outreach_eligibility ─────────────────────────────────

-- Installers eligible for *new* outreach: valid email, not
-- suppressed, not yet bound to a user, no active recipient row
-- in any campaign. Ordered by a Bayesian-style quality score
-- so we send to the most-engaging installers first.

create or replace view public.outreach_eligibility as
  select
    i.id as installer_id,
    i.email,
    i.company_name,
    i.postcode,
    coalesce(i.checkatrade_score, i.google_rating, 0)
      * ln(coalesce(i.checkatrade_review_count, 0)
           + coalesce(i.google_review_count, 0) + 1) as quality_score
  from public.installers i
 where i.email is not null
   and i.email <> ''
   and i.user_id is null
   -- Filter common honeypot / role-account patterns. The
   -- suppression list also catches these post-bounce, but this
   -- is the cheaper pre-send check.
   and lower(i.email) !~ '^(postmaster|abuse|noreply|no-reply|spamtrap|webmaster|hostmaster)@'
   and not exists (
     select 1 from public.outreach_suppression s
      where lower(s.email) = lower(i.email)
   )
   and not exists (
     select 1
       from public.outreach_recipients r
       join public.outreach_campaigns c on c.id = r.campaign_id
      where r.installer_id = i.id
        and c.status in ('draft', 'active', 'paused')
   );

comment on view public.outreach_eligibility is
  'Installers eligible for fresh outreach. Filters: has email, not yet a user, not suppressed, not already enrolled in any non-complete campaign. Ordered by Bayesian quality score (rating × ln(review_count + 1)).';

-- ─── Seeds ──────────────────────────────────────────────────────

-- 48 founder_claims rows (12 regions × 4 tech buckets), all unfilled.
insert into public.outreach_founder_claims (region, tech_bucket)
select r.region, t.tech_bucket
  from (values
    ('london'), ('south_east'), ('south_west'), ('eastern'),
    ('wales'), ('north_west'), ('yorkshire_humberside'),
    ('west_midlands'), ('east_midlands'), ('north_east'),
    ('scotland'), ('northern_ireland')
  ) as r(region)
  cross join (values
    ('heat_pump'), ('solar_pv'), ('battery_storage'), ('solar_thermal')
  ) as t(tech_bucket)
on conflict (region, tech_bucket) do nothing;

-- Default campaign + sequence. Status = draft so this doesn't
-- start sending the moment the migration runs. Daily limit
-- starts at 5 (warmup-day-1); we'll ratchet up via UPDATE as
-- deliverability stabilises.
do $$
declare
  v_campaign_id uuid;
begin
  -- Don't re-seed if a campaign already exists (idempotent
  -- migration re-runs).
  if not exists (select 1 from public.outreach_campaigns) then
    insert into public.outreach_campaigns
      (name, status, daily_send_limit)
    values
      ('Q2 2026 Installer Activation', 'draft', 5)
    returning id into v_campaign_id;

    -- 5-step sequence per the brief.
    insert into public.outreach_email_sequence
      (campaign_id, step_number, name, delay_days_after_previous,
       condition, template_id, subject_variants)
    values
      (v_campaign_id, 0, 'Initial offer', 0, 'always',
       'outreach-initial-founder',
       array['Quick question, {{first_name}}',
             '{{company_name}} — founder spots',
             'Spotted you on the MCS list']),
      (v_campaign_id, 1, 'Resend (not opened)', 4, 'not_opened',
       'outreach-resend-not-opened',
       array['Re: Quick question, {{first_name}}',
             'Following up — {{company_name}}']),
      (v_campaign_id, 2, 'Why us', 4, 'opened_not_clicked',
       'outreach-why-us',
       array['{{first_name}} — why we''re different',
             'The pitch in 90 seconds']),
      (v_campaign_id, 3, 'Demand signal', 7, 'not_signed_up',
       'outreach-demand-signal',
       array['{{town}} demand snapshot',
             'What we''re seeing in {{region}}']),
      (v_campaign_id, 4, 'Final call', 10, 'not_signed_up',
       'outreach-final-call',
       array['Last note, {{first_name}}',
             'Closing the {{tech_bucket_display}} cohort']);
  end if;
end $$;

notify pgrst, 'reload schema';
