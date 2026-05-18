// GET /api/cron/outreach/follow-up
//
// Daily 07:00 UTC. Walks each active campaign's recipients, checks
// whether they qualify for the next step in the sequence, and re-
// queues them when they do.
//
// "Qualify" = (a) enough time has elapsed since last_sent_at to
// match the step's delay_days_after_previous AND (b) the step's
// condition holds (e.g. not_opened, opened_not_clicked).
//
// We do NOT send here — we set next_action_at + current_step. The
// send-queue cron picks them up on its next tick. Keeps the send-
// time logic in one place.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CampaignRow = Database["public"]["Tables"]["outreach_campaigns"]["Row"];
type RecipientRow = Database["public"]["Tables"]["outreach_recipients"]["Row"];
type SequenceRow =
  Database["public"]["Tables"]["outreach_email_sequence"]["Row"];

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

function conditionHolds(condition: string, r: RecipientRow): boolean {
  switch (condition) {
    case "always":
      return true;
    case "not_opened":
      return r.last_opened_at == null;
    case "opened_not_clicked":
      return r.last_opened_at != null && r.last_clicked_at == null;
    case "clicked_not_signed_up":
      return r.last_clicked_at != null && r.signed_up_at == null;
    case "not_signed_up":
      return r.signed_up_at == null;
    default:
      return false;
  }
}

export async function GET(req: Request) {
  const authFail = requireCronAuth(req);
  if (authFail) return authFail;

  const admin = createAdminClient();
  const now = new Date();

  // ── Active campaigns ──
  const { data: campaigns } = await admin
    .from("outreach_campaigns")
    .select("*")
    .eq("status", "active");
  const activeCampaigns = (campaigns ?? []) as CampaignRow[];
  if (activeCampaigns.length === 0) {
    return NextResponse.json({ skipped: "no_active_campaigns" });
  }

  let evaluated = 0;
  let advanced = 0;
  let completed = 0;
  let spotCounterQueued = 0;
  let lowEngagementSuppressed = 0;

  for (const campaign of activeCampaigns) {
    // ── Spot-counter side-channel ──
    // Fires 2 days after a click without a signup, regardless of
    // where the recipient is in the main sequence. Independent of
    // current_step — goes through next_send_template_alias so the
    // send-queue uses the spot-counter template AND doesn't touch
    // state / advance step.
    const spotCutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      .toISOString();
    const { data: spotCandidates } = await admin
      .from("outreach_recipients")
      .select("id, last_clicked_at")
      .eq("campaign_id", campaign.id)
      .is("signed_up_at", null)
      .is("spot_counter_sent_at", null)
      .not("last_clicked_at", "is", null)
      .lte("last_clicked_at", spotCutoff)
      .in("state", ["clicked", "opened", "delivered", "sent"]);
    for (const c of spotCandidates ?? []) {
      await admin
        .from("outreach_recipients")
        .update({
          next_send_template_alias: "outreach-spot-counter",
          next_action_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", c.id);
      await admin.from("outreach_events").insert({
        recipient_id: c.id,
        event_type: "queued",
        metadata: {
          template: "outreach-spot-counter",
          side_channel: true,
          clicked_at: c.last_clicked_at,
        },
      });
      spotCounterQueued++;
    }

    // Sequence ordered by step_number.
    const { data: sequenceRows } = await admin
      .from("outreach_email_sequence")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("step_number", { ascending: true });
    const sequence = (sequenceRows ?? []) as SequenceRow[];
    if (sequence.length === 0) continue;
    const maxStep = sequence[sequence.length - 1].step_number;

    // Recipients in the post-send phase (i.e. state IN
    // ('sent','delivered','opened','clicked')) that haven't yet
    // signed up. Bounced / unsubscribed / complained / replied
    // exit the sequence regardless.
    const { data: recipients } = await admin
      .from("outreach_recipients")
      .select("*")
      .eq("campaign_id", campaign.id)
      .in("state", ["sent", "delivered", "opened", "clicked"])
      .is("signed_up_at", null);

    for (const r of (recipients ?? []) as RecipientRow[]) {
      evaluated++;

      // Past the last step? Mark completed + low-engagement check.
      if (r.current_step >= maxStep) {
        await admin
          .from("outreach_recipients")
          .update({ state: "completed", updated_at: now.toISOString() })
          .eq("id", r.id);
        completed++;

        // Low-engagement cohort: zero opens across the full
        // sequence → suppress their email so they're excluded
        // from future campaigns. Defends against repeat-blasting
        // people who clearly aren't interested. We DON'T suppress
        // anyone who opened at any point — they engaged, just
        // didn't convert.
        if (r.last_opened_at == null) {
          const suppressed = await suppressLowEngagement(admin, r.installer_id);
          if (suppressed) lowEngagementSuppressed++;
        }
        continue;
      }

      const nextStep = sequence.find(
        (s) => s.step_number === r.current_step + 1,
      );
      if (!nextStep) continue;

      // Time gate.
      const lastSent = r.last_sent_at
        ? new Date(r.last_sent_at).getTime()
        : 0;
      const due = lastSent + nextStep.delay_days_after_previous * 24 * 3600 * 1000;
      if (now.getTime() < due) continue;

      // Condition gate.
      if (!conditionHolds(nextStep.condition, r)) {
        // Condition failed at this point — skip this step (e.g.
        // "not_opened" but they DID open: no need to chase them
        // with the resend). Bump current_step so the next eval
        // considers the step after.
        await admin
          .from("outreach_recipients")
          .update({
            current_step: nextStep.step_number,
            updated_at: now.toISOString(),
          })
          .eq("id", r.id);
        continue;
      }

      // Queue the next step. State flips back to 'queued'; send-queue
      // picks it up on its next tick (subject to window).
      await admin
        .from("outreach_recipients")
        .update({
          state: "queued",
          current_step: nextStep.step_number,
          next_action_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", r.id);
      await admin.from("outreach_events").insert({
        recipient_id: r.id,
        event_type: "queued",
        metadata: {
          step: nextStep.step_number,
          condition: nextStep.condition,
          template: nextStep.template_id,
        },
      });
      advanced++;
    }
  }

  const summary = {
    campaigns: activeCampaigns.length,
    evaluated,
    advanced,
    completed,
    spotCounterQueued,
    lowEngagementSuppressed,
  };
  console.log("[outreach/follow-up] done", summary);
  return NextResponse.json(summary);
}

/**
 * Add the installer's email to the suppression list with reason
 * 'low_engagement'. Best-effort — returns true when we actually
 * added a row (false on missing email / already suppressed).
 */
async function suppressLowEngagement(
  admin: ReturnType<typeof createAdminClient>,
  installerId: number,
): Promise<boolean> {
  const { data: installer } = await admin
    .from("installers")
    .select("email")
    .eq("id", installerId)
    .maybeSingle<{ email: string | null }>();
  if (!installer?.email) return false;
  const email = installer.email.toLowerCase().trim();

  const { error } = await admin
    .from("outreach_suppression")
    .upsert(
      {
        email,
        reason: "low_engagement",
        source: "follow_up_completion_zero_opens",
      },
      { onConflict: "email", ignoreDuplicates: true },
    );
  if (error) {
    console.warn("[outreach/follow-up] low-engagement suppress failed", {
      installer_id: installerId,
      err: error.message,
    });
    return false;
  }
  return true;
}
