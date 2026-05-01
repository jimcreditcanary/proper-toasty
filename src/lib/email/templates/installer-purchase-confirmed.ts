// Sent immediately after a successful credit pack purchase via
// Stripe Checkout (manual buy, not auto top-up). Confirms the
// purchase + balance + gives a link to the Stripe-hosted receipt.
//
// Stripe also sends its own receipt by default. This email is OUR
// confirmation — it sets the right tone, points back into the
// portal, and groups the receipt next to a "buy more" CTA so the
// installer has everything in one place.

import { escapeHtml } from "../client";

export interface PurchaseConfirmedEmailInput {
  contactName: string | null;
  packLabel: string;
  packCredits: number;
  pricePence: number;
  newBalance: number;
  receiptUrl: string | null;
  creditsPortalUrl: string;
}

export function buildPurchaseConfirmedEmail(
  input: PurchaseConfirmedEmailInput,
): { subject: string; html: string; text: string } {
  const firstName = input.contactName?.split(" ")[0] || "there";
  const priceGbp = (input.pricePence / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: input.pricePence % 100 === 0 ? 0 : 2,
  });
  const subject = `Receipt — ${input.packCredits} Propertoasty credits`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Thanks for buying the ${input.packLabel} pack — ${input.packCredits} Propertoasty credits for ${priceGbp}.`,
    ``,
    `Your new balance is ${input.newBalance} credits.`,
    ``,
    input.receiptUrl
      ? `Download your VAT receipt here:\n  ${input.receiptUrl}`
      : `(Stripe will email a separate receipt within a few minutes.)`,
    ``,
    `Manage credits, top up, or turn on auto top-up:`,
    `  ${input.creditsPortalUrl}`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#10b981;margin:0 0 6px;">
        Purchase confirmed
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Thanks ${escapeHtml(firstName)} — ${input.packCredits} credits added
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        You bought the
        <strong style="color:#0b3140;">${escapeHtml(input.packLabel)}</strong>
        pack for <strong style="color:#0b3140;">${escapeHtml(priceGbp)}</strong>
        (VAT inclusive). Your new balance is
        <strong style="color:#0b3140;">${input.newBalance} credits</strong>.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f1f5f9;border-radius:10px;padding:16px;margin:0 0 20px;">
        <tr>
          <td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;width:140px;">Pack</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(input.packLabel)} (${input.packCredits} credits)</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;">Amount paid</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(priceGbp)}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;">New balance</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;">${input.newBalance} credits</td>
        </tr>
      </table>

      ${
        input.receiptUrl
          ? `<a href="${escapeHtml(input.receiptUrl)}"
              style="display:inline-block;background:#0b3140;color:#ffffff;font-weight:600;font-size:14px;padding:11px 22px;border-radius:999px;text-decoration:none;margin:0 8px 16px 0;">
            Download VAT receipt →
          </a>`
          : ""
      }
      <a href="${escapeHtml(input.creditsPortalUrl)}"
         style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:14px;padding:11px 22px;border-radius:999px;text-decoration:none;margin:0 0 16px;">
        Manage credits →
      </a>

      <p style="font-size:12px;color:#94a3b8;line-height:1.55;margin:8px 0 0;">
        Need a different invoice format or question on VAT? Just reply to this email.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent by Propertoasty in response to your purchase.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
