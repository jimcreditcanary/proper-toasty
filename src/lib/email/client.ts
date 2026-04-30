// Thin wrapper around the Postmark SDK.
//
// Goals:
//   - Single point of import — every transactional email goes through here.
//   - Fail-soft: if POSTMARK_SERVER_TOKEN isn't set, return
//     { ok: false, skipped: true } and let the caller decide what to do.
//     We never want a missing email provider to fail a user-facing request.
//   - Always BCC EMAIL_BCC_ADDRESS if set, so the team has visibility on
//     every outbound while we're early.
//
// Required env vars:
//   POSTMARK_SERVER_TOKEN     (your Postmark server API token)
//
// Optional env vars:
//   POSTMARK_MESSAGE_STREAM   (defaults to "outbound" — Postmark's default
//                              transactional stream)
//   EMAIL_FROM_ADDRESS        (defaults to "bookings@propertoasty.com" —
//                              the sender signature must be verified in
//                              Postmark)
//   EMAIL_FROM_NAME           (defaults to "Propertoasty")
//   EMAIL_BCC_ADDRESS         (your team's monitoring inbox)
//   EMAIL_REPLY_TO_FALLBACK   (used when caller doesn't pass replyTo)

import { ServerClient } from "postmark";

export interface SendEmailAttachment {
  /** Filename the recipient sees */
  name: string;
  /** Base64-encoded contents */
  contentBase64: string;
  /** MIME type. For ICS calendar invites: `text/calendar; method=REQUEST; charset=utf-8` */
  contentType: string;
  /** Optional ContentID for inline (image-style) attachments. We don't use this for ICS. */
  contentId?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // Override the default From / BCC for this send.
  from?: string;
  bcc?: string | string[];
  // Tags for Postmark filtering. Postmark's Tag field is a single string,
  // so we use the FIRST tag value. Everything else goes into Metadata
  // (a string→string map) which is also queryable in their dashboard.
  tags?: { name: string; value: string }[];
  // Optional attachments — ICS calendar invites etc.
  attachments?: SendEmailAttachment[];
}

export type SendEmailResult =
  | { ok: true; id: string; skipped?: false }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

const DEFAULT_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS ?? "bookings@propertoasty.com";
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME ?? "Propertoasty";
const DEFAULT_BCC = process.env.EMAIL_BCC_ADDRESS ?? null;
const MESSAGE_STREAM = process.env.POSTMARK_MESSAGE_STREAM ?? "outbound";

let cachedClient: ServerClient | null = null;
function getClient(): ServerClient | null {
  if (cachedClient) return cachedClient;
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) return null;
  cachedClient = new ServerClient(token);
  return cachedClient;
}

function formatFrom(): string {
  // Postmark accepts "Name <addr@domain>" format the same as Resend.
  return `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_ADDRESS}>`;
}

function bccString(input: SendEmailInput): string | undefined {
  if (input.bcc) {
    return Array.isArray(input.bcc) ? input.bcc.join(",") : input.bcc;
  }
  return DEFAULT_BCC ?? undefined;
}

function metadataFromTags(
  tags: SendEmailInput["tags"],
): { tag: string | undefined; metadata: Record<string, string> } {
  if (!tags || tags.length === 0) return { tag: undefined, metadata: {} };
  // First tag becomes the headline Tag (single value field in Postmark).
  // Remaining tags + the first one too go into Metadata so we never lose
  // anything queryable.
  const [first, ...rest] = tags;
  const metadata: Record<string, string> = {};
  for (const t of [first, ...rest]) metadata[t.name] = t.value;
  return { tag: first.value, metadata };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    console.warn(
      "[email] POSTMARK_SERVER_TOKEN not set — would have sent:",
      input.subject,
      "to",
      input.to,
    );
    return {
      ok: false,
      skipped: true,
      reason: "POSTMARK_SERVER_TOKEN not configured",
    };
  }

  const { tag, metadata } = metadataFromTags(input.tags);

  // Postmark's Attachment type wants ContentID as string (not
  // optional / undefined). Use null for non-inline attachments —
  // that's the documented "no Content-ID" sentinel.
  const attachments =
    input.attachments && input.attachments.length > 0
      ? input.attachments.map((a) => ({
          Name: a.name,
          Content: a.contentBase64,
          ContentType: a.contentType,
          ContentID: a.contentId ?? null,
        }))
      : undefined;

  try {
    const res = await client.sendEmail({
      From: input.from ?? formatFrom(),
      To: input.to,
      Bcc: bccString(input),
      ReplyTo: input.replyTo ?? process.env.EMAIL_REPLY_TO_FALLBACK,
      Subject: input.subject,
      HtmlBody: input.html,
      TextBody: input.text,
      Tag: tag,
      Metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      MessageStream: MESSAGE_STREAM,
      Attachments: attachments,
    });

    // Postmark returns ErrorCode 0 on success. Anything else is a failure.
    if (res.ErrorCode !== 0) {
      console.error("[email] Postmark returned error:", res);
      return {
        ok: false,
        skipped: false,
        error: res.Message ?? `Postmark error ${res.ErrorCode}`,
      };
    }
    return { ok: true, id: res.MessageID };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Postmark call failed";
    console.error("[email] send threw:", msg);
    return { ok: false, skipped: false, error: msg };
  }
}

// Tiny helper — escape user-supplied strings before interpolating into
// the HTML templates. We don't ship a templating engine.
export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
