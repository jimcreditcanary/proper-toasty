// GET /api/cron/outreach/select-batch
//
// Daily 08:00 UTC. Picks today's batch of recipients for the active
// campaign, ensuring:
//   - never blast >5 from the same postcode outcode in one day
//   - peak-hour weighted distribution across the send window
//   - quality-ordered selection (Bayesian rating × ln(reviews))
//   - named installers (first_name not null) flow first, unnamed
//     fill the tail (warmup heuristic — the personalised subject
//     opens better than the bare "Quick question" fallback)
//
// Hard idempotent — running twice on the same day enqueues at most
// `daily_send_limit` recipients (the UNIQUE constraint +
// "already-enqueued today" check both prevent double-enqueue).
//
// Skips on weekends + when no active campaign exists.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mintClaimToken } from "@/lib/outreach/claim-token";
import { pickBatch, type PickInput } from "@/lib/outreach/pick-batch";
import {
  distributeSendTimes,
  isWeekdayInTimezone,
} from "@/lib/outreach/schedule";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CampaignRow = Database["public"]["Tables"]["outreach_campaigns"]["Row"];

type EligibilityRow = PickInput;

function requireCronAuth(req: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const authFail = requireCronAuth(req);
  if (authFail) return authFail;

  const admin = createAdminClient();
  const now = new Date();

  // ── 1. Active campaign ──
  const { data: campaigns, error: campaignErr } = await admin
    .from("outreach_campaigns")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);
  if (campaignErr) {
    console.error("[outreach/select-batch] campaign lookup failed", campaignErr);
    return NextResponse.json({ error: campaignErr.message }, { status: 500 });
  }
  const campaign: CampaignRow | undefined = campaigns?.[0];
  if (!campaign) {
    return NextResponse.json({ skipped: "no_active_campaign" });
  }

  // ── 2. Weekend skip ──
  if (
    campaign.weekdays_only &&
    !isWeekdayInTimezone(now, campaign.send_window_timezone)
  ) {
    return NextResponse.json({
      skipped: "weekend",
      campaign: campaign.id,
    });
  }

  // ── 3. Today's send count vs daily limit ──
  // "Today" = midnight UTC for simplicity (the window-local "today"
  // straddles UTC midnight in winter, but the limit is a daily-rate
  // ceiling not a window-local accounting; rough UTC is fine).
  const startOfTodayUtc = new Date(now);
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  const { count: alreadyEnqueued } = await admin
    .from("outreach_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .gte("created_at", startOfTodayUtc.toISOString());

  const enqueuedSoFar = alreadyEnqueued ?? 0;
  const remaining = campaign.daily_send_limit - enqueuedSoFar;
  if (remaining <= 0) {
    return NextResponse.json({
      skipped: "daily_limit_reached",
      campaign: campaign.id,
      enqueued_so_far: enqueuedSoFar,
      daily_limit: campaign.daily_send_limit,
    });
  }

  // ── 4. Pull eligibility ordered by quality, with headroom ──
  // Over-fetch ×4 so the geo-distribution filter has room to pick
  // a balanced set even when one outcode dominates the top quality
  // rankings. We fetch named + unnamed together (one query) and let
  // pickBatch partition by first_name; cheaper than two round-trips.
  const overFetch = remaining * 4;
  const { data: eligible, error: eligErr } = await admin
    .from("outreach_eligibility")
    .select(
      "installer_id, email, company_name, postcode, first_name, quality_score",
    )
    .order("quality_score", { ascending: false })
    .limit(overFetch);
  if (eligErr) {
    console.error("[outreach/select-batch] eligibility query failed", eligErr);
    return NextResponse.json({ error: eligErr.message }, { status: 500 });
  }

  // ── 5. Pick the batch: named-first, with a per-outcode cap of 5.
  const picked = pickBatch(
    (eligible ?? []) as unknown as EligibilityRow[],
    remaining,
  );

  if (picked.length === 0) {
    return NextResponse.json({
      skipped: "no_eligible_installers",
      campaign: campaign.id,
    });
  }

  // ── 6. Schedule the picks across the window ──
  const sendTimes = distributeSendTimes({
    now,
    window: {
      timezone: campaign.send_window_timezone,
      startHour: campaign.daily_send_window_start_hour_local,
      endHour: campaign.daily_send_window_end_hour_local,
      peakHours: campaign.peak_hours_local,
      weekdaysOnly: campaign.weekdays_only,
    },
    count: picked.length,
  });
  if (sendTimes.length !== picked.length) {
    return NextResponse.json(
      {
        error: "schedule_returned_no_slots",
        campaign: campaign.id,
        picked: picked.length,
        slots: sendTimes.length,
      },
      { status: 500 },
    );
  }

  // ── 7. Insert recipients. UNIQUE (campaign_id, installer_id)
  // catches re-enqueue attempts; we treat 23505 (unique_violation)
  // as a no-op + continue.
  let inserted = 0;
  let conflicts = 0;
  for (let i = 0; i < picked.length; i++) {
    const row = picked[i];
    const sendAt = sendTimes[i];

    // First insert WITHOUT a token to get the recipient ID, then
    // mint the token from that ID + update the row. (Mostly: token
    // depends on the row's UUID and we don't want to gen UUIDs
    // client-side then trust them.)
    const { data: created, error: insertErr } = await admin
      .from("outreach_recipients")
      .insert({
        campaign_id: campaign.id,
        installer_id: row.installer_id,
        state: "queued",
        current_step: 0,
        next_action_at: sendAt.toISOString(),
        // Placeholder — overwritten immediately below.
        claim_token: `pending-${crypto.randomUUID()}`,
      })
      .select("id")
      .maybeSingle<{ id: string }>();
    if (insertErr) {
      if (insertErr.code === "23505") {
        conflicts++;
        continue;
      }
      console.error("[outreach/select-batch] insert failed", {
        installer_id: row.installer_id,
        err: insertErr.message,
      });
      continue;
    }
    if (!created) continue;

    const token = mintClaimToken(created.id);
    const { error: updateErr } = await admin
      .from("outreach_recipients")
      .update({ claim_token: token })
      .eq("id", created.id);
    if (updateErr) {
      console.error("[outreach/select-batch] token update failed", {
        recipient_id: created.id,
        err: updateErr.message,
      });
      continue;
    }

    await admin.from("outreach_events").insert({
      recipient_id: created.id,
      event_type: "queued",
      metadata: {
        installer_id: row.installer_id,
        scheduled_at: sendAt.toISOString(),
        quality_score: row.quality_score,
      },
    });

    inserted++;
  }

  const summary = {
    campaign: campaign.id,
    enqueued_so_far_before: enqueuedSoFar,
    daily_limit: campaign.daily_send_limit,
    eligible_pool: eligible?.length ?? 0,
    picked: picked.length,
    inserted,
    conflicts,
    first_send_at: sendTimes[0]?.toISOString(),
    last_send_at: sendTimes[sendTimes.length - 1]?.toISOString(),
  };
  console.log("[outreach/select-batch] done", summary);
  return NextResponse.json(summary);
}
