// Email sent to the installer when the homeowner accepts their
// quote on /p/<token>. This is the "you've won the job" moment —
// celebratory tone, clear next steps (contact the homeowner to book
// the install).

import { escapeHtml } from "../client";
import { formatGbp } from "@/lib/proposals/schema";

export interface ProposalAcceptedInstallerInput {
  installerCompanyName: string;
  homeownerName: string | null;
  homeownerEmail: string;
  homeownerPhone: string | null;
  propertyAddress: string | null;
  totalPence: number;
  vatRateBps: number;
  acceptedAtIso: string;
  // Link back to the installer's view of the proposal in their portal
  installerProposalUrl: string;
}

export function buildProposalAcceptedInstallerEmail(
  input: ProposalAcceptedInstallerInput,
): { subject: string; html: string; text: string } {
  const total = formatGbp(input.totalPence);
  const vatLabel = input.vatRateBps === 0 ? "0% VAT" : "incl. 20% VAT";
  const homeowner = input.homeownerName ?? "the homeowner";

  const subject = `${homeowner} accepted your quote — ${total}`;

  const text = [
    `Great news — ${homeowner} just accepted your quote of ${total} (${vatLabel}).`,
    ``,
    `Reach out to lock in the install date:`,
    `  Email: ${input.homeownerEmail}`,
    input.homeownerPhone ? `  Phone: ${input.homeownerPhone}` : "",
    input.propertyAddress ? `  Property: ${input.propertyAddress}` : "",
    ``,
    `View the accepted quote in your portal:`,
    input.installerProposalUrl,
    ``,
    `— Propertoasty`,
  ]
    .filter((l) => l != null && l !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#10b981;margin:0 0 6px;">
        Quote accepted
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(homeowner)} accepted your quote
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        Headline: <strong style="color:#0b3140;">${escapeHtml(total)}</strong>
        <span style="color:#64748b;">(${escapeHtml(vatLabel)})</span>.
        Time to reach out and lock in the install date.
      </p>

      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#065f46;margin:0 0 8px;">
          Homeowner contact
        </p>
        <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#0f172a;width:100%;">
          ${
            input.homeownerName
              ? `<tr><td style="padding:3px 12px 3px 0;color:#64748b;width:90px;">Name</td><td style="padding:3px 0;font-weight:600;">${escapeHtml(input.homeownerName)}</td></tr>`
              : ""
          }
          <tr><td style="padding:3px 12px 3px 0;color:#64748b;">Email</td><td style="padding:3px 0;"><a href="mailto:${escapeHtml(input.homeownerEmail)}" style="color:#ef6c4f;text-decoration:none;">${escapeHtml(input.homeownerEmail)}</a></td></tr>
          ${
            input.homeownerPhone
              ? `<tr><td style="padding:3px 12px 3px 0;color:#64748b;">Phone</td><td style="padding:3px 0;"><a href="tel:${escapeHtml(input.homeownerPhone)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(input.homeownerPhone)}</a></td></tr>`
              : ""
          }
          ${
            input.propertyAddress
              ? `<tr><td style="padding:3px 12px 3px 0;color:#64748b;">Property</td><td style="padding:3px 0;">${escapeHtml(input.propertyAddress)}</td></tr>`
              : ""
          }
        </table>
      </div>

      <div style="text-align:center;margin:24px 0 12px;">
        <a href="${escapeHtml(input.installerProposalUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">
          Open the accepted quote →
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:18px 0 0;">
        Tip: get the install date confirmed in writing within 48 hours
        — the conversion drops sharply after that.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You're getting this because you sent a quote to ${escapeHtml(homeowner)} via Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
