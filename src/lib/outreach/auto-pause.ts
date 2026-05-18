// Rolling-24h bounce-rate + complaint-rate computation, with
// auto-pause when either threshold is exceeded.
//
// Called from the outbound webhook handler after every bounce or
// spam_complaint event. Cheap — three count queries against
// outreach_events with an indexed (event_type, occurred_at) filter.
//
// Why rolling 24h instead of since-campaign-start: a campaign that
// runs for weeks would dilute a fresh spike with old clean
// history. 24h matches Gmail + Microsoft's own throttle windows;
// if we wait until lifetime rates hit the threshold we've already
// burned reputation for a day.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface AutoPauseResult {
  /** True when the rates triggered a pause. */
  paused: boolean;
  reason?: "bounce_rate" | "complaint_rate";
  metrics: {
    sentLast24h: number;
    bouncesLast24h: number;
    complaintsLast24h: number;
    bounceRate: number;
    complaintRate: number;
    bounceThreshold: number;
    complaintThreshold: number;
  };
}

/**
 * Check the rolling-24h rates for the active campaign and pause
 * it if either threshold is exceeded. Idempotent — calling on an
 * already-paused campaign no-ops.
 *
 * Returns the metrics regardless of whether a pause fired, so the
 * webhook can include them in the audit row.
 */
export async function checkAutoPauseThresholds(
  admin: AdminClient,
): Promise<AutoPauseResult | null> {
  const { data: campaigns } = await admin
    .from("outreach_campaigns")
    .select("*")
    .eq("status", "active")
    .limit(1);
  const campaign = campaigns?.[0];
  if (!campaign) return null; // No active campaign — nothing to pause.

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Three parallel count queries. outreach_events has an index on
  // (event_type, occurred_at desc) from m065 so each is a fast
  // index-only scan.
  const [sentRes, bounceRes, complaintRes] = await Promise.all([
    admin
      .from("outreach_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "sent")
      .gte("occurred_at", since),
    admin
      .from("outreach_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "bounce")
      .gte("occurred_at", since),
    admin
      .from("outreach_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "spam_complaint")
      .gte("occurred_at", since),
  ]);

  const sent = sentRes.count ?? 0;
  const bounces = bounceRes.count ?? 0;
  const complaints = complaintRes.count ?? 0;
  const bounceRate = sent > 0 ? bounces / sent : 0;
  const complaintRate = sent > 0 ? complaints / sent : 0;

  const metrics = {
    sentLast24h: sent,
    bouncesLast24h: bounces,
    complaintsLast24h: complaints,
    bounceRate,
    complaintRate,
    bounceThreshold: campaign.bounce_rate_pause_threshold,
    complaintThreshold: campaign.complaint_rate_pause_threshold,
  };

  // Don't pause on a tiny sample — a single bounce when sent=5
  // gives bounce rate 20% which is statistically meaningless.
  // Require at least 20 sends in the window before the threshold
  // gate is active. Empirical: the noise-floor for Postmark's
  // open-rate is around 20 events; below that we're in random-
  // walk territory.
  if (sent < 20) {
    return { paused: false, metrics };
  }

  let reason: AutoPauseResult["reason"] | undefined;
  if (complaintRate >= campaign.complaint_rate_pause_threshold) {
    reason = "complaint_rate";
  } else if (bounceRate >= campaign.bounce_rate_pause_threshold) {
    reason = "bounce_rate";
  }
  if (!reason) {
    return { paused: false, metrics };
  }

  // Pause the campaign. Loud server log so Sentry picks it up.
  await admin
    .from("outreach_campaigns")
    .update({
      status: "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  console.error("[outreach/auto-pause] CAMPAIGN AUTO-PAUSED", {
    campaign_id: campaign.id,
    reason,
    metrics,
  });

  return { paused: true, reason, metrics };
}
