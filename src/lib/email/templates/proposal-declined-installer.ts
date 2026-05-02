// Email sent to the installer when the homeowner declines their
// quote. Honest tone — no spin. Includes the optional reason the
// homeowner left so the installer can learn from it.

import { escapeHtml } from "../client";
import { formatGbp } from "@/lib/proposals/schema";

export interface ProposalDeclinedInstallerInput {
  installerCompanyName: string;
  homeownerName: string | null;
  totalPence: number;
  declineReason: string | null;
  // Link back to the proposal in the installer portal so they can
  // build a revised v2 if they want to take another swing.
  installerProposalUrl: string;
}

export function buildProposalDeclinedInstallerEmail(
  input: ProposalDeclinedInstallerInput,
): { subject: string; html: string; text: string } {
  const total = formatGbp(input.totalPence);
  const homeowner = input.homeownerName ?? "the homeowner";

  const subject = `${homeowner} declined your quote (${total})`;

  const text = [
    `${homeowner} has declined the quote you sent (${total}).`,
    ``,
    input.declineReason ? `Reason given:\n${input.declineReason}\n` : `No reason was given.`,
    ``,
    `If you want to take another swing, you can build a revised v2 from the original here:`,
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
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;margin:0 0 6px;">
        Quote declined
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(homeowner)} declined your quote
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        They didn't go ahead with your <strong style="color:#0b3140;">${escapeHtml(total)}</strong> quote.
      </p>

      ${
        input.declineReason
          ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#78350f;margin:0 0 6px;">
          Reason given
        </p>
        <p style="font-size:14px;color:#1f2937;margin:0;line-height:1.55;white-space:pre-wrap;">${escapeHtml(input.declineReason)}</p>
      </div>`
          : `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:13px;color:#475569;margin:0;line-height:1.55;">
          No reason was given.
        </p>
      </div>`
      }

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        Want to take another swing? You can build a revised v2 from
        the original.
      </p>

      <div style="text-align:center;margin:8px 0 4px;">
        <a href="${escapeHtml(input.installerProposalUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">
          Open the original quote →
        </a>
      </div>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You're getting this because you sent a quote to ${escapeHtml(homeowner)} via Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
