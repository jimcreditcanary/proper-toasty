// GET /api/cron/outreach/send-queue
//
// Every 5 minutes during the campaign's send window. Processes up
// to N queued recipients per run (default 3) so sends smooth across
// the window rather than firing in a single burst.
//
// Per recipient: loads installer + live founder_claims, computes
// tier preview, picks the right template alias from the sequence,
// builds merge vars + claim URL, sends via Postmark, flips state to
// 'sent' on success.
//
// Failures: Postmark 422 = mark `failed` (caller config issue,
// retry won't help). 5xx / network = leave state='queued' so the
// next tick retries naturally (idempotency comes from the state
// transition; we only flip to 'sent' on success).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOutreachEmail } from "@/lib/outreach/email";
import { isInsideWindow } from "@/lib/outreach/schedule";
import {
  primaryRegion,
  primaryTechBucket,
  previewTier,
} from "@/lib/outreach/tier-preview";
import { buildMergeVars } from "@/lib/outreach/merge-vars";
import { renderSubjectVars } from "@/lib/outreach/render-subject";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type CampaignRow = Database["public"]["Tables"]["outreach_campaigns"]["Row"];
type RecipientRow = Database["public"]["Tables"]["outreach_recipients"]["Row"];
type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];
type ClaimsRow = Database["public"]["Tables"]["outreach_founder_claims"]["Row"];
type SequenceRow =
  Database["public"]["Tables"]["outreach_email_sequence"]["Row"];

// Per-run send cap. 3 sends every 5 minutes = ~36/hour cap, plenty
// of headroom for 50/day spread across an 8h window.
const PER_RUN_CAP = 3;

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

function appBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  return base.replace(/\/+$/, "");
}

/** Initial-step template selection by tier. After step 0 the
 *  sequence row's template_id wins regardless of tier. */
function templateForInitialStep(tier: string): string {
  switch (tier) {
    case "founder":
      return "outreach-initial-founder";
    case "early_access":
      return "outreach-initial-early-access";
    default:
      return "outreach-initial-standard";
  }
}

/** Pick a subject from the sequence row's variants. We rotate by
 *  recipient_id hash so the same recipient on a resend gets a
 *  different subject (mild A/B), but a re-tick of the same row gets
 *  the same subject (deterministic). */
/**
 * Subject for a side-channel send (e.g. spot-counter). Uses a tiny
 * built-in variant set per template since the sequence row's
 * subject_variants doesn't apply here.
 */
function sideChannelSubjectFor(
  templateAlias: string,
  recipientId: string,
): string {
  const variants: Record<string, string[]> = {
    "outreach-spot-counter": [
      "{{first_name}} — quick check-in",
      "Re: {{company_name}}",
      "Following up on our note",
    ],
  };
  const v = variants[templateAlias] ?? ["Following up"];
  return pickSubject(v, recipientId);
}

function pickSubject(variants: string[], recipientId: string): string {
  if (variants.length === 0) return "";
  // Sum char codes — cheap deterministic hash.
  let h = 0;
  for (let i = 0; i < recipientId.length; i++) h = (h + recipientId.charCodeAt(i)) | 0;
  return variants[Math.abs(h) % variants.length];
}

export async function GET(req: Request) {
  const authFail = requireCronAuth(req);
  if (authFail) return authFail;

  const admin = createAdminClient();
  const now = new Date();
  const baseUrl = appBaseUrl(req);

  // ── Active campaign + window gate ──
  const { data: campaigns } = await admin
    .from("outreach_campaigns")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);
  const campaign: CampaignRow | undefined = campaigns?.[0];
  if (!campaign) {
    return NextResponse.json({ skipped: "no_active_campaign" });
  }
  const insideWindow = isInsideWindow(now, {
    timezone: campaign.send_window_timezone,
    startHour: campaign.daily_send_window_start_hour_local,
    endHour: campaign.daily_send_window_end_hour_local,
    peakHours: campaign.peak_hours_local,
    weekdaysOnly: campaign.weekdays_only,
  });
  if (!insideWindow) {
    return NextResponse.json({ skipped: "outside_window" });
  }

  // ── Due recipients ──
  const { data: due, error: dueErr } = await admin
    .from("outreach_recipients")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("state", "queued")
    .lte("next_action_at", now.toISOString())
    .order("next_action_at", { ascending: true })
    .limit(PER_RUN_CAP);
  if (dueErr) {
    console.error("[outreach/send-queue] due query failed", dueErr);
    return NextResponse.json({ error: dueErr.message }, { status: 500 });
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0, due: 0 });
  }

  // Sequence rows for this campaign (cache once per run).
  const { data: sequenceRows } = await admin
    .from("outreach_email_sequence")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("step_number", { ascending: true });
  const sequence = (sequenceRows ?? []) as SequenceRow[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const r of due as RecipientRow[]) {
    // ── Load installer ──
    const { data: installer } = await admin
      .from("installers")
      .select("*")
      .eq("id", r.installer_id)
      .maybeSingle<InstallerRow>();
    if (!installer || !installer.email) {
      console.warn("[outreach/send-queue] installer missing/no-email", {
        recipient_id: r.id,
        installer_id: r.installer_id,
      });
      await admin
        .from("outreach_recipients")
        .update({ state: "failed", updated_at: now.toISOString() })
        .eq("id", r.id);
      failed++;
      continue;
    }

    // ── Region + tech + tier preview ──
    const region = primaryRegion(installer);
    const bucket = primaryTechBucket(installer);
    if (!region || !bucket) {
      console.warn("[outreach/send-queue] installer not eligible (no region/tech)", {
        recipient_id: r.id,
      });
      await admin
        .from("outreach_recipients")
        .update({ state: "failed", updated_at: now.toISOString() })
        .eq("id", r.id);
      failed++;
      continue;
    }

    const { data: claims } = await admin
      .from("outreach_founder_claims")
      .select("*")
      .eq("region", region)
      .eq("tech_bucket", bucket)
      .maybeSingle<ClaimsRow>();
    const tier = previewTier(claims ?? null);
    const founderSpotsRemaining = claims
      ? Math.max(0, 5 - claims.tier_2_claimed_count)
      : 5;

    // ── Pick template + subject ──
    // next_send_template_alias is the side-channel override (set
    // by the follow-up scheduler when it queues a spot-counter or
    // other one-off). When present, we skip the sequence lookup
    // entirely AND treat the send as state-preserving (don't reset
    // 'clicked'/'opened' back to 'sent', don't advance current_step).
    const isSideChannel = r.next_send_template_alias != null;
    const step = sequence.find((s) => s.step_number === r.current_step);

    let templateAlias: string;
    let subject: string;
    if (isSideChannel) {
      templateAlias = r.next_send_template_alias!;
      // Side-channel sends use a generic subject — no per-step
      // A/B variants available. The template's subject is rendered
      // via the {{subject}} merge variable so we still need to pass
      // something sensible.
      subject = sideChannelSubjectFor(templateAlias, r.id);
    } else {
      if (!step) {
        console.warn("[outreach/send-queue] no sequence row for step", {
          recipient_id: r.id,
          step: r.current_step,
        });
        skipped++;
        continue;
      }
      templateAlias =
        r.current_step === 0 ? templateForInitialStep(tier) : step.template_id;
      subject = pickSubject(step.subject_variants, r.id);
    }

    // ── Build URLs ──
    const claimUrl = `${baseUrl}/installer-signup?id=${installer.id}&outreach=${encodeURIComponent(
      r.claim_token,
    )}`;
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(
      r.claim_token,
    )}`;

    const mergeVars = buildMergeVars({
      installer,
      tier,
      founderSpotsRemaining,
      claimUrl,
      unsubscribeUrl,
    });

    // Postmark only renders placeholders that exist in the template
    // body — it does NOT recursively render placeholders that arrive
    // INSIDE a substituted value. The Postmark template's subject is
    // `{{subject}}` and the value we pass is e.g.
    //   "Quick question, {{first_name}}"
    // … which would emit literally with `{{first_name}}` visible to
    // the recipient. Render the subject's own merge variables here
    // so Postmark receives a fully-rendered string.
    const renderedSubject = renderSubjectVars(subject, mergeVars);

    // ── Send ──
    const send = await sendOutreachEmail({
      to: installer.email,
      templateAlias,
      templateModel: mergeVars,
      subject: renderedSubject,
      recipientId: r.id,
      campaignId: campaign.id,
      unsubscribeUrl,
    });

    if (send.ok) {
      const sentAt = new Date().toISOString();
      // Side-channel sends don't reset state (a recipient who clicked
      // earlier shouldn't have their state downgraded back to 'sent'
      // because a spot-counter just fired). Clear the template
      // override so the next regular tick uses the sequence row again.
      // Also stamp spot_counter_sent_at when this WAS the spot-counter
      // so the follow-up scheduler doesn't re-queue.
      const sideChannelUpdate = isSideChannel
        ? {
            next_send_template_alias: null,
            last_sent_at: sentAt,
            updated_at: sentAt,
            ...(templateAlias === "outreach-spot-counter"
              ? { spot_counter_sent_at: sentAt }
              : {}),
          }
        : null;
      await admin
        .from("outreach_recipients")
        .update(sideChannelUpdate ?? {
          state: "sent",
          assigned_tier: r.assigned_tier ?? tier,
          last_sent_at: sentAt,
          updated_at: sentAt,
        })
        .eq("id", r.id);
      await admin.from("outreach_events").insert({
        recipient_id: r.id,
        event_type: "sent",
        metadata: {
          template: templateAlias,
          subject,
          message_id: send.messageId,
          step: r.current_step,
          tier_preview: tier,
        },
      });
      sent++;
    } else if (send.skipped) {
      console.warn("[outreach/send-queue] send skipped", {
        recipient_id: r.id,
        reason: send.reason,
      });
      skipped++;
    } else {
      // Hard error. 422 / config = mark failed. Network/5xx = leave
      // queued so next tick retries.
      const isConfigError =
        (send.postmarkErrorCode != null && send.postmarkErrorCode >= 400 && send.postmarkErrorCode < 500);
      if (isConfigError) {
        await admin
          .from("outreach_recipients")
          .update({ state: "failed", updated_at: now.toISOString() })
          .eq("id", r.id);
      }
      await admin.from("outreach_events").insert({
        recipient_id: r.id,
        event_type: "sent",
        metadata: {
          ok: false,
          error: send.error,
          postmark_error_code: send.postmarkErrorCode ?? null,
        },
      });
      failed++;
    }
  }

  const summary = { processed: due.length, sent, failed, skipped };
  console.log("[outreach/send-queue] done", summary);
  return NextResponse.json(summary);
}
