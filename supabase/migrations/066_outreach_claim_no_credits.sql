-- Reshape outreach_claim_founder_offer so it ONLY assigns the tier.
-- Credit grants move to the existing complete-claim starter (+30 for
-- everyone) plus per-onboarding-step grants in Phase 5.
--
-- Why this is a fix not a feature change:
--
-- The original m065 RPC granted the full tier amount (300/100/30) at
-- claim time AND short-circuited the starter grant. Phase 4 / 5 of
-- the original brief, on closer reading, expected:
--
--   - Signup itself grants 30 credits (matches what every other new
--     installer-claimer gets via the existing starter)
--   - Each of the four onboarding asks grants tier-dependent
--     additional credits, totalling 300 / 100 / 30 across the four
--
-- This shape:
--   - lets the existing complete-claim path stay untouched
--   - keeps the credits-as-carrot mechanic (no carrot to complete
--     onboarding if all credits are granted upfront)
--   - aligns tier=standard with the existing self-claim experience
--     (they get the same +30, just routed through an outreach link)
--
-- The new RPC just:
--   1. Resolves region + tech_bucket
--   2. Locks the founder_claims row
--   3. Decides + records the tier
--   4. Stamps signed_up_at on the recipient row
--   5. Returns the assigned tier
--
-- No credit grant, no starter-grant short-circuit. Phase 5 handlers
-- grant per-step using the existing outreach_grant_credits RPC.

-- Drop first — the return signature has changed since m065 (we
-- removed credits_granted from the OUT params), and Postgres won't
-- let CREATE OR REPLACE alter the row-type of a returns-table
-- function. DROP IF EXISTS keeps this idempotent on fresh DBs
-- where m065 might not have run.
drop function if exists public.outreach_claim_founder_offer(uuid, uuid);

create or replace function public.outreach_claim_founder_offer(
  p_recipient_id uuid,
  p_user_id uuid
)
returns table (
  tier text,
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

  -- Primary region (priority order per Phase 0 decision 2).
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

  -- Primary tech_bucket (HP > solar PV > battery > solar thermal;
  -- HP covers ASHP/GSHP/WSHP/ExhaustAir per Phase 0 decision 1).
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

  -- Lock the founder-claims row to serialize concurrent claimers.
  select * into v_claims_row
    from public.outreach_founder_claims
   where region = v_region and tech_bucket = v_tech_bucket
   for update;
  if v_claims_row.region is null then
    raise exception 'founder_claims row missing for (%, %)', v_region, v_tech_bucket;
  end if;

  -- Decide tier + record on the counter.
  if not v_claims_row.tier_1_filled then
    v_tier := 'founder';
    update public.outreach_founder_claims
       set tier_1_filled = true,
           tier_1_claimed_by_installer_id = v_installer.id,
           tier_1_claimed_at = now(),
           updated_at = now()
     where region = v_region and tech_bucket = v_tech_bucket;
  elsif v_claims_row.tier_2_claimed_count < 5 then
    v_tier := 'early_access';
    update public.outreach_founder_claims
       set tier_2_claimed_count = tier_2_claimed_count + 1,
           updated_at = now()
     where region = v_region and tech_bucket = v_tech_bucket;
  else
    v_tier := 'standard';
  end if;

  -- Stamp the recipient row. NB: we DON'T stamp
  -- installer_starter_credits_granted_at here (m065 did). The
  -- existing complete-claim path's +30 starter is now the canonical
  -- signup grant for outreach claimants too.
  update public.outreach_recipients
     set signed_up_at = now(),
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
      'tech_bucket', v_tech_bucket
    )),
    (p_recipient_id, 'signed_up', jsonb_build_object(
      'user_id', p_user_id,
      'installer_id', v_installer.id
    ));

  return query select v_tier, v_region, v_tech_bucket;
end;
$$;

comment on function public.outreach_claim_founder_offer is
  'Atomic tier assignment for outreach claimants. Row-locks the founder_claims row to serialize concurrent founder clicks. Credit-grant-free as of m066 — signup credits flow through the existing starter (+30 in complete-claim), per-step credits flow through onboarding handlers.';

notify pgrst, 'reload schema';
