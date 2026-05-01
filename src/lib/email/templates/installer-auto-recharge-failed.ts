// "We tried to top up your credits but it didn't work" — sent when
// an off-session auto-recharge attempt fails (card declined, 3DS
// required, Stripe outage, etc.). The user must come back and pay
// manually to keep accepting leads.

import { escapeHtml } from "../client";

export interface AutoRechargeFailedEmailInput {
  contactName: string | null;
  packLabel: string; // 'Growth' / 'Starter' / etc.
  packCredits: number;
  reason: string; // human-friendly failure reason from Stripe
  topUpUrl: string; // /installer/credits
}

export function buildAutoRechargeFailedEmail(
  input: AutoRechargeFailedEmailInput,
): { subject: string; html: string; text: string } {
  const firstName = input.contactName?.split(" ")[0] || "there";
  const subject = "Your Propertoasty auto top-up didn't go through";

  const text = [
    `Hi ${firstName},`,
    ``,
    `Heads up — we tried to auto-recharge your Propertoasty credits with the ${input.packLabel} pack (${input.packCredits} credits) but the payment didn't go through.`,
    ``,
    `Reason: ${input.reason}`,
    ``,
    `What this means:`,
    `  - Auto top-up has been paused on your account so we don't keep retrying.`,
    `  - You can still accept leads — but you'll need a manual top-up first.`,
    ``,
    `Top up here:`,
    `  ${input.topUpUrl}`,
    ``,
    `If your card's expired, just buy a pack manually and the new card replaces the old one. Auto top-up will then be available to re-enable.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#b45309;margin:0 0 6px;">
        Auto top-up failed
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — your auto top-up didn&rsquo;t go through
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        We tried to recharge your credits with the
        <strong style="color:#0b3140;">${escapeHtml(input.packLabel)}</strong>
        pack (${input.packCredits} credits) but the payment didn&rsquo;t complete.
      </p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#991b1b;margin:0 0 6px;">
          Reason
        </p>
        <p style="font-size:14px;color:#7f1d1d;margin:0;line-height:1.5;">
          ${escapeHtml(input.reason)}
        </p>
      </div>

      <a href="${escapeHtml(input.topUpUrl)}"
         style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;text-decoration:none;margin:0 0 16px;">
        Top up manually →
      </a>

      <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:20px 0 0;">
        <p style="font-size:13px;font-weight:600;color:#0b3140;margin:0 0 8px;">
          What this means
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • Auto top-up is paused on your account so we don&rsquo;t keep retrying.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • You can still accept leads — you&rsquo;ll just need a manual top-up first.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0;">
          • If your card&rsquo;s expired, buy a pack manually with a new card and auto top-up will be available again.
        </p>
      </div>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent because auto top-up was enabled on your Propertoasty account.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
