// POST /api/postmark/outreach-inbound
//
// Receives inbound emails (replies to outreach) from Postmark's
// Inbound stream. The MS365 forwarding rule (Phase 2D) duplicates
// any reply to Jim's inbox AND to Postmark's inbound address, so
// this endpoint handles classification while Jim sees the reply
// natively in Outlook.
//
// Auth: Bearer token via Authorization header. Secret is
// POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET.
//
// Recipient lookup: by FromFull.Email match against installers.email
// (via the most-recent recipient row for that installer). Replies
// from addresses we don't recognise are logged + ignored.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyReply } from "@/lib/outreach/classify-reply";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface InboundPayload {
  FromFull?: { Email?: string; Name?: string };
  From?: string;
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  MessageID?: string;
  OriginalRecipient?: string;
}

function requireWebhookAuth(req: Request): NextResponse | null {
  const expected = process.env.POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET;
  if (!expected || expected.length < 16) {
    console.error(
      "[outreach/inbound] POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET missing",
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  // Accept the secret via either the Authorization header OR a
  // ?secret= query param. Postmark's inbound webhook UI doesn't
  // expose a custom-headers section (outbound webhooks do, inbound
  // doesn't) so we fall back to query-param auth — slightly less
  // hygienic (query strings can show up in some logs) but the
  // alternative is no auth at all on a webhook receiving raw email.
  // HTTPS keeps the secret off-the-wire either way.
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return null;

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  if (querySecret === expected) return null;

  return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
}

export async function POST(req: Request) {
  const authFail = requireWebhookAuth(req);
  if (authFail) return authFail;

  let payload: InboundPayload;
  try {
    payload = (await req.json()) as InboundPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const senderEmail = (
    payload.FromFull?.Email ??
    payload.From ??
    ""
  ).toLowerCase().trim();
  if (!senderEmail) {
    return NextResponse.json({ ignored: "no_sender_email" });
  }

  const admin = createAdminClient();

  // ── Find the most-recent recipient row whose installer.email
  // matches the sender. Multi-recipient installers (rare —
  // shouldn't happen given UNIQUE constraint) get the most-recent
  // row, which is the right one to attribute the reply to. ──
  const { data: installerRows } = await admin
    .from("installers")
    .select("id, email")
    .ilike("email", senderEmail)
    .limit(1);
  const installer = installerRows?.[0];
  if (!installer) {
    console.warn("[outreach/inbound] sender not in installers", {
      sender: senderEmail,
      subject: payload.Subject,
    });
    return NextResponse.json({ ignored: "sender_unknown", sender: senderEmail });
  }

  const { data: recipient } = await admin
    .from("outreach_recipients")
    .select("id, campaign_id, state")
    .eq("installer_id", installer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; campaign_id: string; state: string }>();
  if (!recipient) {
    console.warn(
      "[outreach/inbound] installer matched but no recipient row",
      { installer_id: installer.id, sender: senderEmail },
    );
    return NextResponse.json({ ignored: "no_recipient_row" });
  }

  // ── Classify ──
  const text = payload.TextBody ?? stripHtml(payload.HtmlBody ?? "");
  const classification = await classifyReply({
    text,
    subject: payload.Subject ?? null,
  });

  const now = new Date().toISOString();

  // ── Audit ──
  await admin.from("outreach_events").insert({
    recipient_id: recipient.id,
    event_type: "inbound_reply",
    metadata: {
      sender: senderEmail,
      subject: payload.Subject,
      message_id: payload.MessageID,
      intent: classification.intent,
      confidence: classification.confidence,
      // Truncated body for context — full text not stored to keep
      // PII surface area small.
      excerpt: text.slice(0, 500),
    },
  });

  // ── Side effects per intent ──
  switch (classification.intent) {
    case "unsubscribe": {
      await admin
        .from("outreach_suppression")
        .upsert(
          {
            email: senderEmail,
            reason: "unsubscribed",
            source: "inbound_reply",
          },
          { onConflict: "email" },
        );
      await admin
        .from("outreach_recipients")
        .update({
          state: "unsubscribed",
          last_replied_at: now,
          updated_at: now,
        })
        .eq("id", recipient.id);
      break;
    }
    case "complaint": {
      // Treat as opt-out + flag urgently. Don't pause the campaign
      // automatically — that's a webhook-level call (5% bounce rate
      // threshold etc.). Loud log so monitoring/email-on-log picks
      // it up.
      await admin
        .from("outreach_suppression")
        .upsert(
          {
            email: senderEmail,
            reason: "complained",
            source: "inbound_reply",
          },
          { onConflict: "email" },
        );
      await admin
        .from("outreach_recipients")
        .update({
          state: "complained",
          last_replied_at: now,
          updated_at: now,
        })
        .eq("id", recipient.id);
      console.error("[outreach/inbound] COMPLAINT reply", {
        recipient_id: recipient.id,
        sender: senderEmail,
        subject: payload.Subject,
      });
      break;
    }
    case "out_of_office": {
      // Don't suppress; just push the next-action 14 days out so
      // we don't ping them while they're away.
      const fortnightFromNow = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString();
      await admin
        .from("outreach_recipients")
        .update({
          next_action_at: fortnightFromNow,
          last_replied_at: now,
          updated_at: now,
        })
        .eq("id", recipient.id);
      break;
    }
    case "interested":
    case "question": {
      // Stop the sequence — Jim will reply manually in Outlook.
      // State='replied' is a terminal state for the automation;
      // doesn't unsubscribe.
      await admin
        .from("outreach_recipients")
        .update({
          state: "replied",
          last_replied_at: now,
          updated_at: now,
        })
        .eq("id", recipient.id);
      break;
    }
    case "unknown": {
      // Be conservative — still mark as replied so we stop the
      // sequence (we'd rather under-send than nag someone who's
      // already engaged). Jim sees the reply in Outlook and
      // decides.
      await admin
        .from("outreach_recipients")
        .update({
          state: "replied",
          last_replied_at: now,
          updated_at: now,
        })
        .eq("id", recipient.id);
      break;
    }
  }

  return NextResponse.json({
    ok: true,
    recipient_id: recipient.id,
    intent: classification.intent,
    confidence: classification.confidence,
  });
}

/** Minimal HTML→text fallback when Postmark doesn't supply TextBody. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
