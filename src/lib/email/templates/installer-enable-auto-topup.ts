// "Try auto top-up" email — fires once, just after the user's
// first manual purchase. The CTA is a one-click magic link that
// flips auto_recharge_pack_id ON for the same pack they just
// bought, no login required. Same trust model as a magic-link
// auth: the HMAC signature on the URL is the auth.

import { escapeHtml } from "../client";

export interface EnableAutoTopUpEmailInput {
  contactName: string | null;
  packLabel: string;
  packCredits: number;
  enableUrl: string; // /api/installer/credits/auto-recharge/enable?token=...
  creditsPortalUrl: string; // /installer/credits (for "no thanks, manage manually")
}

export function buildEnableAutoTopUpEmail(
  input: EnableAutoTopUpEmailInput,
): { subject: string; html: string; text: string } {
  const firstName = input.contactName?.split(" ")[0] || "there";
  const subject = "Never run out of credits — turn on auto top-up";

  const text = [
    `Hi ${firstName},`,
    ``,
    `Now you've got credits on the system, here's a quick win: turn on auto top-up so your account stays funded without any thinking.`,
    ``,
    `How it works:`,
    `  - When your balance drops to 10 credits or below, we automatically buy you another ${input.packLabel} pack (${input.packCredits} credits).`,
    `  - Same card you just used. Stripe sends a receipt every time.`,
    `  - Cancel any time from the credits page.`,
    ``,
    `Turn it on with one click:`,
    `  ${input.enableUrl}`,
    ``,
    `Or manage manually:`,
    `  ${input.creditsPortalUrl}`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">
        Quick tip
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — never run out of credits
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        Turn on auto top-up and we&rsquo;ll automatically buy you another
        <strong style="color:#0b3140;">${escapeHtml(input.packLabel)}</strong>
        pack (${input.packCredits} credits) the moment your balance drops to 10 or below.
        Same card, same Stripe receipts, no surprises.
      </p>

      <a href="${escapeHtml(input.enableUrl)}"
         style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;text-decoration:none;margin:0 0 16px;">
        Turn on auto top-up →
      </a>

      <div style="background:#f1f5f9;border-radius:10px;padding:14px 16px;margin:8px 0 16px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 6px;">
          How it works
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 4px;">
          • Balance drops to 10 — we buy another ${input.packCredits}-credit pack on your saved card.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 4px;">
          • Stripe sends a fresh receipt every time.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0;">
          • Cancel any time from the credits page in two clicks.
        </p>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Prefer to manage manually? <a href="${escapeHtml(input.creditsPortalUrl)}" style="color:#ef6c4f;text-decoration:none;font-weight:600;">Visit the credits page</a>.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent because you just made your first credit purchase.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
