// Email sent to the homeowner when an installer sends them a
// written quote (proposal). The proposal lives at /p/<token> and
// can be accepted or declined without the homeowner needing to
// log in.
//
// We don't list every line item in the body — that's what the page
// is for — but we do show the headline total + VAT badge so the
// homeowner has the size of the number before clicking through.

import { escapeHtml } from "../client";
import { formatGbp } from "@/lib/proposals/schema";

export interface ProposalSentHomeownerInput {
  homeownerName: string | null;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  // Headline numbers for the email body
  totalPence: number;
  vatRateBps: number;     // 0 or 2000
  itemCount: number;
  // Magic link to /p/<token>
  proposalUrl: string;
  // Optional installer-supplied cover note. Plain text; we render
  // verbatim with newlines preserved.
  coverMessage: string | null;
}

export function buildProposalSentHomeownerEmail(
  input: ProposalSentHomeownerInput,
): { subject: string; html: string; text: string } {
  const firstName = (input.homeownerName ?? "").split(" ")[0] || "there";
  const total = formatGbp(input.totalPence);
  const vatLabel = input.vatRateBps === 0 ? "0% VAT (zero-rated)" : "incl. 20% VAT";

  const subject = `${input.installerCompanyName} sent you a quote — ${total}`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `${input.installerCompanyName} has sent you a written quote covering ${input.itemCount} item${input.itemCount === 1 ? "" : "s"}.`,
    ``,
    `Headline total: ${total} (${vatLabel})`,
    ``,
    input.coverMessage ? `Note from the installer:\n${input.coverMessage}\n` : "",
    `Open the full quote, with every line item, here:`,
    input.proposalUrl,
    ``,
    `Once you've reviewed it you can accept or decline directly on the page — no login needed.`,
    ``,
    `A friendly reminder: it's worth getting two or three quotes before committing. Even great installers vary 20–30% on the same job.`,
    ``,
    `Need to ask the installer a question?`,
    input.installerEmail ? `  Email: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Phone: ${input.installerTelephone}` : "",
    ``,
    `If anything goes wrong, just reply to this email and we'll help.`,
    ``,
    `— The Propertoasty team`,
  ]
    .filter((l) => l != null && l !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">
        New quote
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — ${escapeHtml(input.installerCompanyName)} has sent you a quote
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        ${input.itemCount} item${input.itemCount === 1 ? "" : "s"} totalling
        <strong style="color:#0b3140;">${escapeHtml(total)}</strong>
        <span style="color:#64748b;">(${escapeHtml(vatLabel)})</span>.
      </p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:18px;margin:0 0 20px;text-align:center;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9a3412;margin:0 0 6px;">
          Quote total
        </p>
        <p style="font-size:34px;font-weight:800;color:#0b3140;margin:0 0 4px;line-height:1.1;">
          ${escapeHtml(total)}
        </p>
        <p style="font-size:12px;color:#9a3412;margin:0;">${escapeHtml(vatLabel)}</p>
      </div>

      ${
        input.coverMessage
          ? `<div style="background:#f8fafc;border-left:3px solid #ef6c4f;padding:12px 14px;margin:0 0 20px;border-radius:0 6px 6px 0;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 6px;">
          Note from ${escapeHtml(input.installerCompanyName)}
        </p>
        <p style="font-size:14px;color:#334155;margin:0;line-height:1.55;white-space:pre-wrap;">${escapeHtml(input.coverMessage)}</p>
      </div>`
          : ""
      }

      <div style="text-align:center;margin:24px 0 12px;">
        <a href="${escapeHtml(input.proposalUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">
          Open the full quote →
        </a>
      </div>
      <p style="font-size:12px;color:#64748b;text-align:center;margin:0 0 20px;">
        Accept or decline directly on the page — no login needed.
      </p>

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        <strong style="color:#0b3140;">A friendly nudge:</strong> get two
        or three quotes if you can. Even great installers vary 20–30% on
        the same job.
      </p>

      ${
        input.installerEmail || input.installerTelephone
          ? `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 16px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 8px;">
          Got questions about the quote?
        </p>
        <p style="font-size:13px;color:#475569;margin:0 0 8px;line-height:1.5;">
          Reach ${escapeHtml(input.installerCompanyName)} directly:
        </p>
        ${
          input.installerEmail
            ? `<p style="font-size:13px;color:#0f172a;margin:0 0 4px;">📧 <a href="mailto:${escapeHtml(input.installerEmail)}" style="color:#ef6c4f;text-decoration:none;">${escapeHtml(input.installerEmail)}</a></p>`
            : ""
        }
        ${
          input.installerTelephone
            ? `<p style="font-size:13px;color:#0f172a;margin:0;">📞 <a href="tel:${escapeHtml(input.installerTelephone)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(input.installerTelephone)}</a></p>`
            : ""
        }
      </div>`
          : ""
      }

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        If anything goes wrong — quote feels off, installer goes quiet,
        anything — just reply to this email and we'll help sort it.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You're getting this because you asked ${escapeHtml(input.installerCompanyName)} for a quote through Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
