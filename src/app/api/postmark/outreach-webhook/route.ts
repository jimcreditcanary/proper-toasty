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
import type { Database } from "@/types/database";

type Json = Database["public"]["Tables"]["outreach_events"]["Insert"]["metadata"];

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
      // Hard bounce → immediate suppression. Soft bounce → tolerate
      // for now (a later pass can count consecutive soft bounces).
      const isHardBounce =
        event.Type === "HardBounce" ||
        event.Type === "Blocked" ||
        event.Type === "BadEmailAddress" ||
        event.Inactive === true;

      await admin
        .from("outreach_recipients")
        .update({ state: "bounced", updated_at: now })
        .eq("id", recipientId);

      if (isHardBounce && recipientEmail) {
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
