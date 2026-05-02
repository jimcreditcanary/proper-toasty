// Email sent to the installer when the homeowner leaves a message
// or callback request on /p/<token>. The reply-to is set to the
// homeowner's email so the installer just hits Reply to respond
// directly — no link round-trip needed.

import { escapeHtml } from "../client";
import { formatGbp } from "@/lib/proposals/schema";

export interface ProposalMessageInstallerInput {
  installerCompanyName: string;
  homeownerName: string | null;
  homeownerEmail: string;
  homeownerPhone: string | null;
  propertyAddress: string | null;
  totalPence: number;
  channel: "message" | "callback";
  body: string;
  installerProposalUrl: string;
}

export function buildProposalMessageInstallerEmail(
  input: ProposalMessageInstallerInput,
): { subject: string; html: string; text: string } {
  const homeowner = input.homeownerName ?? "the homeowner";
  const total = formatGbp(input.totalPence);
  const isCallback = input.channel === "callback";
  const headlineLabel = isCallback
    ? `${homeowner} requested a callback on your quote`
    : `${homeowner} sent a message about your quote`;

  const subject = isCallback
    ? `Callback requested — ${homeowner} on your ${total} quote`
    : `Question on your quote — ${homeowner} (${total})`;

  const text = [
    `${headlineLabel}.`,
    ``,
    `Their message:`,
    input.body,
    ``,
    `Reach them directly:`,
    `  Email: ${input.homeownerEmail}`,
    input.homeownerPhone ? `  Phone: ${input.homeownerPhone}` : "",
    input.propertyAddress ? `  Property: ${input.propertyAddress}` : "",
    ``,
    `Just hit Reply to send back a response — your reply lands in their inbox.`,
    ``,
    `View the quote:`,
    input.installerProposalUrl,
    ``,
    `— Propertoasty`,
  ]
    .filter((l) => l != null && l !== "")
    .join("\n");

  const accent = isCallback ? "#f59e0b" : "#0ea5e9";
  const accentBg = isCallback ? "#fef3c7" : "#e0f2fe";
  const accentBorder = isCallback ? "#fcd34d" : "#7dd3fc";

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${accent};margin:0 0 6px;">
        ${isCallback ? "Callback request" : "Question on quote"}
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(headlineLabel)}
      </h1>
      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        Quote total: <strong style="color:#0b3140;">${escapeHtml(total)}</strong>
      </p>

      <div style="background:${accentBg};border:1px solid ${accentBorder};border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${accent};margin:0 0 8px;">
          Their message
        </p>
        <p style="font-size:14px;color:#1f2937;margin:0;line-height:1.55;white-space:pre-wrap;">${escapeHtml(input.body)}</p>
      </div>

      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#065f46;margin:0 0 8px;">
          Reach them directly
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

      <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 16px;">
        <strong style="color:#0b3140;">Just hit Reply</strong> to
        send a response — your reply goes straight to ${escapeHtml(homeowner)}&rsquo;s inbox.
      </p>

      <div style="text-align:center;margin:18px 0 4px;">
        <a href="${escapeHtml(input.installerProposalUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;font-size:14px;">
          View the quote →
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
