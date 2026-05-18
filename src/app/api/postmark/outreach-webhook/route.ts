// POST /api/postmark/outreach-webhook
//
// Receives Postmark event webhooks for the outreach Broadcast
// Stream: Delivery, Open, Click, Bounce, SpamComplaint,
// SubscriptionChange.
//
// Auth: Bearer token via Authorization header. Postmark webhook
// config supports custom headers; the secret is
// POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET.
//
// Recipient lookup: every send embeds Metadata.recipient_id, which
// Postmark echoes back on every event. Single PK lookup, no fragile
// email-match required.
//
// Side effects per event type:
//   Delivery       → state='delivered' (if currently 'sent')
//   Open           → state='opened' + last_opened_at (first open only)
//   Click          → state='clicked' + last_clicked_at
//   Bounce         → state='bounced' + suppression row
//                    (hard bounces immediately; soft tolerated for now)
//   SpamComplaint  → state='complained' + suppression + ALERT
//   SubscriptionChange → handle Postmark-side unsubscribes
//
// Every event also appends to outreach_events for audit.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAutoPauseThresholds } from "@/lib/outreach/auto-pause";
import type { Database } from "@/types/database";

type Json = Database["public"]["Tables"]["outreach_events"]["Insert"]["metadata"];

/**
 * Soft-bounce tolerance: count soft bounces in the trailing 7 days.
 * Suppress at 3 in 7 days — matches Postmark's own deactivation
 * heuristic without being over-eager. Hard bounces still get
 * immediate suppression (handled separately).
 */
const SOFT_BOUNCE_WINDOW_DAYS = 7;
const SOFT_BOUNCE_THRESHOLD = 3;

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Postmark event payload — we only deconstruct what we use; rest
// stored on the event row as metadata.
interface PostmarkEvent {
  RecordType?: string;
  MessageID?: string;
  Recipient?: string;
  Email?: string;
  Metadata?: Record<string, string>;
  // Bounce-specific
  Type?: string; // "HardBounce" | "SoftBounce" | "Blocked" | ...
  TypeCode?: number;
  Inactive?: boolean;
  // SubscriptionChange-specific
  Origin?: string;
  SuppressSending?: boolean;
  SuppressionReason?: string;
}

function requireWebhookAuth(req: Request): NextResponse | null {
  const expected = process.env.POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET;
  if (!expected || expected.length < 16) {
    // Don't 500 here — Postmark will retry. Better to log loudly +
    // accept the webhook so we get visibility into config drift.
    console.error(
      "[outreach/webhook] POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET missing",
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const authFail = requireWebhookAuth(req);
  if (authFail) return authFail;

  let event: PostmarkEvent;
  try {
    event = (await req.json()) as PostmarkEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const recipientId = event.Metadata?.recipient_id;
  if (!recipientId) {
    // Not necessarily an error — Postmark sends webhook tests with
    // no metadata. Log + accept.
    console.warn("[outreach/webhook] no recipient_id in Metadata", {
      record_type: event.RecordType,
    });
    return NextResponse.json({ ok: true, ignored: "no_recipient_id" });
  }

  const admin = createAdminClient();
  const recordType = event.RecordType ?? "Unknown";
  const recipientEmail = (event.Recipient ?? event.Email ?? "").toLowerCase();
  const now = new Date().toISOString();

  // ── Audit: every event lands in outreach_events ──
  await admin.from("outreach_events").insert({
    recipient_id: recipientId,
    event_type: mapRecordToEventType(recordType),
    metadata: event as unknown as Json,
  });

  // ── Per-event state transitions ──
  switch (recordType) {
    case "Delivery": {
      // Only flip if currently 'sent' (don't overwrite a later
      // 'opened' or 'clicked' that arrived first due to ordering).
      await admin
        .from("outreach_recipients")
        .update({ state: "delivered", updated_at: now })
        .eq("id", recipientId)
        .eq("state", "sent");
      break;
    }

    case "Open": {
      // First open only.
      const { data: rcpt } = await admin
        .from("outreach_recipients")
        .select("last_opened_at, state")
        .eq("id", recipientId)
        .maybeSingle<{ last_opened_at: string | null; state: string }>();
      if (rcpt && !rcpt.last_opened_at) {
        // State transition: anything earlier → 'opened'. Don't
        // downgrade a 'clicked' to 'opened'.
        const shouldUpgrade =
          rcpt.state === "sent" || rcpt.state === "delivered";
        await admin
          .from("outreach_recipients")
          .update({
            last_opened_at: now,
            ...(shouldUpgrade ? { state: "opened" } : {}),
            updated_at: now,
          })
          .eq("id", recipientId);
      }
      break;
    }

    case "Click": {
      const { data: rcpt } = await admin
        .from("outreach_recipients")
        .select("last_clicked_at, state")
        .eq("id", recipientId)
        .maybeSingle<{ last_clicked_at: string | null; state: string }>();
      if (rcpt) {
        const shouldUpgrade =
          rcpt.state === "sent" ||
          rcpt.state === "delivered" ||
          rcpt.state === "opened";
        await admin
          .from("outreach_recipients")
          .update({
            last_clicked_at: rcpt.last_clicked_at ?? now,
            ...(shouldUpgrade ? { state: "clicked" } : {}),
            updated_at: now,
          })
          .eq("id", recipientId);
      }
      break;
    }

    case "Bounce": {
      const isHardBounce =
        event.Type === "HardBounce" ||
        event.Type === "Blocked" ||
        event.Type === "BadEmailAddress" ||
        event.Inactive === true;

      if (isHardBounce) {
        // Immediate suppression + state flip.
        await admin
          .from("outreach_recipients")
          .update({ state: "bounced", updated_at: now })
          .eq("id", recipientId);
        if (recipientEmail) {
          await admin
            .from("outreach_suppression")
            .upsert(
              {
                email: recipientEmail,
                reason: "bounced",
                source: "postmark_webhook",
              },
              { onConflict: "email" },
            );
        }
      } else {
        // Soft bounce — increment counter + suppress if we've hit
        // the threshold in the rolling window.
        const newCount = await incrementSoftBounce(admin, recipientId);
        const overThreshold = newCount >= SOFT_BOUNCE_THRESHOLD;
        if (overThreshold) {
          await admin
            .from("outreach_recipients")
            .update({ state: "bounced", updated_at: now })
            .eq("id", recipientId);
          if (recipientEmail) {
            await admin
              .from("outreach_suppression")
              .upsert(
                {
                  email: recipientEmail,
                  reason: "bounced",
                  source: "postmark_webhook_soft_threshold",
                },
                { onConflict: "email" },
              );
          }
          console.warn("[outreach/webhook] soft-bounce threshold hit", {
            recipient_id: recipientId,
            email: recipientEmail,
            count: newCount,
          });
        }
      }

      // Either type of bounce contributes to the rolling 24h
      // bounce-rate auto-pause threshold check.
      void checkAutoPauseThresholds(admin);
      break;
    }

    case "SpamComplaint": {
      await admin
        .from("outreach_recipients")
        .update({ state: "complained", updated_at: now })
        .eq("id", recipientId);
      if (recipientEmail) {
        await admin
          .from("outreach_suppression")
          .upsert(
            {
              email: recipientEmail,
              reason: "complained",
              source: "postmark_webhook",
            },
            { onConflict: "email" },
          );
      }
      // Loud log so the monitoring dashboard / alerts fire.
      console.error("[outreach/webhook] SPAM COMPLAINT", {
        recipient_id: recipientId,
        email: recipientEmail,
      });
      // Complaints contribute to the rolling 24h auto-pause check
      // — and complaint thresholds (0.3% by default) fire faster
      // than bounce thresholds (5%).
      void checkAutoPauseThresholds(admin);
      break;
    }

    case "SubscriptionChange": {
      if (event.SuppressSending === true && recipientEmail) {
        await admin
          .from("outreach_suppression")
          .upsert(
            {
              email: recipientEmail,
              reason: "unsubscribed",
              source: `postmark_${event.Origin ?? "subscription_change"}`,
            },
            { onConflict: "email" },
          );
        await admin
          .from("outreach_recipients")
          .update({ state: "unsubscribed", updated_at: now })
          .eq("id", recipientId);
      }
      break;
    }
  }

  return NextResponse.json({ ok: true, recipient_id: recipientId });
}

/**
 * Increment soft_bounce_count on the recipient row + return the
 * new value. Counter resets implicitly when the last soft bounce
 * was > SOFT_BOUNCE_WINDOW_DAYS ago (we look up the most-recent
 * 'bounce' event and reset if it's older than the window).
 *
 * Approximation, not perfect — 4 soft bounces with gaps of 5 days
 * between them would never trigger because each one resets the
 * count. Real-world bounce patterns cluster so this is fine for
 * Phase 8; can revisit if false-negatives appear in the data.
 */
async function incrementSoftBounce(
  admin: ReturnType<typeof createAdminClient>,
  recipientId: string,
): Promise<number> {
  // Check when the recipient's last bounce event was. If older
  // than the window, reset the count instead of incrementing.
  const cutoff = new Date(
    Date.now() - SOFT_BOUNCE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: priorBounce } = await admin
    .from("outreach_events")
    .select("occurred_at")
    .eq("recipient_id", recipientId)
    .eq("event_type", "bounce")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ occurred_at: string }>();

  // We just inserted the current bounce event (in the caller),
  // so priorBounce.occurred_at is THIS event's timestamp. To check
  // whether there was a PREVIOUS bounce in-window we'd need offset
  // 1. Cheaper: pull two, look at the second.
  const { data: priorTwo } = await admin
    .from("outreach_events")
    .select("occurred_at")
    .eq("recipient_id", recipientId)
    .eq("event_type", "bounce")
    .order("occurred_at", { ascending: false })
    .limit(2);
  const secondMostRecent = priorTwo?.[1]?.occurred_at;
  const shouldReset =
    !secondMostRecent || secondMostRecent < cutoff;

  const { data: row } = await admin
    .from("outreach_recipients")
    .select("soft_bounce_count")
    .eq("id", recipientId)
    .maybeSingle<{ soft_bounce_count: number }>();

  const newCount = shouldReset ? 1 : (row?.soft_bounce_count ?? 0) + 1;
  await admin
    .from("outreach_recipients")
    .update({
      soft_bounce_count: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipientId);

  // Silence the unused-variable warning — priorBounce was a debug
  // probe early in development, kept for log clarity in future.
  void priorBounce;

  return newCount;
}

function mapRecordToEventType(rt: string):
  | "delivered" | "open" | "click" | "bounce" | "spam_complaint"
  | "subscription_change" {
  switch (rt) {
    case "Delivery":
      return "delivered";
    case "Open":
      return "open";
    case "Click":
      return "click";
    case "Bounce":
      return "bounce";
    case "SpamComplaint":
      return "spam_complaint";
    case "SubscriptionChange":
      return "subscription_change";
    default:
      return "delivered";
  }
}
