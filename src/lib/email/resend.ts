// Thin wrapper around the Resend SDK.
//
// Goals:
//   - Single point of import — every transactional email goes through here.
//   - Fail-soft: if RESEND_API_KEY isn't set, return { ok: false, skipped: true }
//     and let the caller decide what to do (we never want a missing email
//     provider to fail user-facing requests).
//   - Always BCC EMAIL_BCC_ADDRESS if set, so the team has visibility on
//     every outbound while we're early.
//
// Required env vars:
//   RESEND_API_KEY            (your Resend secret)
//
// Optional env vars:
//   EMAIL_FROM_ADDRESS        (defaults to "bookings@propertoasty.com" —
//                              the domain must be verified in Resend, or
//                              fall back to "onboarding@resend.dev" for
//                              testing)
//   EMAIL_FROM_NAME           (defaults to "Propertoasty")
//   EMAIL_BCC_ADDRESS         (your team's monitoring inbox)
//   EMAIL_REPLY_TO_FALLBACK   (used when caller doesn't pass replyTo)

import { Resend } from "resend";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // Override the default From / BCC for this send.
  from?: string;
  bcc?: string | string[];
  // Tags for Resend dashboard filtering (e.g. "installer_booking").
  tags?: { name: string; value: string }[];
}

export type SendEmailResult =
  | { ok: true; id: string; skipped?: false }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

const DEFAULT_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS ?? "bookings@propertoasty.com";
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME ?? "Propertoasty";
const DEFAULT_BCC = process.env.EMAIL_BCC_ADDRESS ?? null;

let cachedClient: Resend | null = null;
function getClient(): Resend | null {
  if (cachedClient) return cachedClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cachedClient = new Resend(key);
  return cachedClient;
}

function formatFrom(): string {
  // Resend accepts "Name <addr@domain>" format.
  return `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_ADDRESS}>`;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    console.warn(
      "[email] RESEND_API_KEY not set — would have sent:",
      input.subject,
      "to",
      input.to,
    );
    return {
      ok: false,
      skipped: true,
      reason: "RESEND_API_KEY not configured",
    };
  }

  const bccs: string[] = [];
  if (input.bcc) {
    bccs.push(...(Array.isArray(input.bcc) ? input.bcc : [input.bcc]));
  } else if (DEFAULT_BCC) {
    bccs.push(DEFAULT_BCC);
  }

  try {
    const res = await client.emails.send({
      from: input.from ?? formatFrom(),
      to: input.to,
      bcc: bccs.length > 0 ? bccs : undefined,
      replyTo: input.replyTo ?? process.env.EMAIL_REPLY_TO_FALLBACK,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tags,
    });

    if (res.error) {
      console.error("[email] Resend returned error:", res.error);
      return {
        ok: false,
        skipped: false,
        error: res.error.message ?? "Resend error",
      };
    }
    return { ok: true, id: res.data?.id ?? "" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resend call failed";
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
