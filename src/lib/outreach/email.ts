// Outreach-only Postmark client. DELIBERATELY isolated from the
// transactional sendEmail() in src/lib/email/client.ts — they hit
// different Postmark servers with different reputations, and we
// never want a bug in the outreach path to nuke transactional
// deliverability (or vice versa).
//
// Required env vars:
//   POSTMARK_OUTREACH_SERVER_TOKEN     — the outreach server's token,
//                                        NOT the transactional one
//   POSTMARK_OUTREACH_SENDER_EMAIL     — From address, must be a
//                                        verified domain in Postmark
//   POSTMARK_OUTREACH_SENDER_NAME      — From display name
//   POSTMARK_OUTREACH_REPLY_TO         — Reply-To (typically Jim's
//                                        primary inbox; replies are
//                                        forwarded to the Postmark
//                                        inbound webhook via an MS365
//                                        rule, see Phase 2D)
//
// Optional:
//   POSTMARK_OUTREACH_MESSAGE_STREAM   — Postmark Broadcast Message
//                                        Stream ID. Defaults to
//                                        "broadcast" (Postmark's
//                                        auto-created broadcast
//                                        stream name).
//
// Hard refusal: if POSTMARK_OUTREACH_SERVER_TOKEN equals the value
// of POSTMARK_SERVER_TOKEN (the transactional token), we throw at
// init time. This catches the obvious copy-paste mistake of pointing
// outreach at the transactional server.

import { ServerClient } from "postmark";

// Postmark's LinkTrackingOptions enum isn't always exported across
// SDK versions; the wire format is the string. Cast at the call
// site keeps us version-agnostic.
const LINK_TRACKING_HTML_AND_TEXT = "HtmlAndText" as never;

export interface OutreachSendInput {
  to: string;
  templateAlias: string;
  templateModel: Record<string, string | number | null>;
  /** Override subject (passed via merge var since template subject is `{{subject}}`). */
  subject: string;
  /** Recipient row UUID — written into Metadata so webhooks can map
   *  the event back to our row without a sender-email lookup. */
  recipientId: string;
  /** Campaign UUID — also written to Metadata for filtering. */
  campaignId: string;
  /** One-click unsubscribe URL. We always set both List-Unsubscribe
   *  AND List-Unsubscribe-Post headers (RFC 8058 — required by
   *  Gmail/Yahoo bulk-sender rules). */
  unsubscribeUrl: string;
}

export type OutreachSendResult =
  | { ok: true; messageId: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string; postmarkErrorCode?: number };

const MESSAGE_STREAM =
  process.env.POSTMARK_OUTREACH_MESSAGE_STREAM ?? "broadcast";

let cachedClient: ServerClient | null = null;

function getClient(): ServerClient | null {
  if (cachedClient) return cachedClient;
  const token = process.env.POSTMARK_OUTREACH_SERVER_TOKEN;
  if (!token) return null;

  // Hard refusal — outreach token must NOT equal the transactional
  // token. Catches the most common config mistake before it sends
  // 5,500 emails from the wrong server.
  const transactionalToken = process.env.POSTMARK_SERVER_TOKEN;
  if (transactionalToken && transactionalToken === token) {
    throw new Error(
      "[outreach/email] POSTMARK_OUTREACH_SERVER_TOKEN is identical to POSTMARK_SERVER_TOKEN — refusing to init. Outreach must use a separate Postmark server.",
    );
  }

  cachedClient = new ServerClient(token);
  return cachedClient;
}

function formatFrom(): string {
  const addr =
    process.env.POSTMARK_OUTREACH_SENDER_EMAIL ?? "jim@mail.propertoasty.com";
  const name =
    process.env.POSTMARK_OUTREACH_SENDER_NAME ?? "Jim @ Propertoasty";
  return `${name} <${addr}>`;
}

/**
 * Send a templated outreach email. Returns ok/skipped/error.
 * Never throws — caller can decide retry policy from the result.
 */
export async function sendOutreachEmail(
  input: OutreachSendInput,
): Promise<OutreachSendResult> {
  let client: ServerClient | null;
  try {
    client = getClient();
  } catch (e) {
    // Config error — surface to caller, do not retry.
    return {
      ok: false,
      skipped: false,
      error: e instanceof Error ? e.message : "init failed",
    };
  }

  if (!client) {
    console.warn(
      "[outreach/email] POSTMARK_OUTREACH_SERVER_TOKEN not set — would have sent template",
      input.templateAlias,
      "to",
      input.to,
    );
    return {
      ok: false,
      skipped: true,
      reason: "POSTMARK_OUTREACH_SERVER_TOKEN not configured",
    };
  }

  const replyTo =
    process.env.POSTMARK_OUTREACH_REPLY_TO ?? "jim@propertoasty.com";

  // RFC 8058 one-click unsubscribe — Gmail/Yahoo bulk-sender rules
  // require BOTH headers. Without these the campaign gets throttled
  // or routed to spam regardless of DKIM/SPF correctness.
  const headers = [
    { Name: "List-Unsubscribe", Value: `<${input.unsubscribeUrl}>` },
    { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
  ];

  // Merge subject into the template model — Postmark templates have
  // `{{subject}}` as the subject placeholder so the per-send variant
  // selection in outreach_email_sequence.subject_variants flows
  // through cleanly.
  const fullModel: Record<string, string | number | null> = {
    ...input.templateModel,
    subject: input.subject,
  };

  try {
    const res = await client.sendEmailWithTemplate({
      From: formatFrom(),
      To: input.to,
      ReplyTo: replyTo,
      TemplateAlias: input.templateAlias,
      TemplateModel: fullModel,
      MessageStream: MESSAGE_STREAM,
      Headers: headers,
      // Echoed back in event webhooks — lets us look up the recipient
      // row without doing a fragile email-match.
      Metadata: {
        recipient_id: input.recipientId,
        campaign_id: input.campaignId,
      },
      Tag: "outreach",
      TrackOpens: true,
      TrackLinks: LINK_TRACKING_HTML_AND_TEXT,
    });

    if (res.ErrorCode !== 0) {
      console.error("[outreach/email] Postmark returned error:", res);
      return {
        ok: false,
        skipped: false,
        error: res.Message ?? `Postmark error ${res.ErrorCode}`,
        postmarkErrorCode: res.ErrorCode,
      };
    }
    return { ok: true, messageId: res.MessageID };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Postmark call failed";
    console.error("[outreach/email] send threw:", msg);
    return { ok: false, skipped: false, error: msg };
  }
}
