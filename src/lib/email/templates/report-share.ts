// Two email variants for the same magic-link share flow:
//   - "self" — homeowner emails their report to themselves so they can
//     come back to it on another device or in a few weeks
//   - "forward" — homeowner shares with a partner / family member

import { escapeHtml } from "../client";

interface CommonInput {
  reportUrl: string;
  propertyAddress: string | null;
  expiresAtIso: string;
}

export interface SelfReportEmailInput extends CommonInput {
  recipientName: string | null;
}

export interface ForwardedReportEmailInput extends CommonInput {
  forwardedByName: string | null;
  personalNote: string | null;
}

function expiryWords(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? "" : "s"}`;
}

// ─── Self ────────────────────────────────────────────────────────────────────

export function buildSelfReportEmail(input: SelfReportEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.recipientName?.split(" ")[0] ?? "there";
  const addrLine = input.propertyAddress
    ? `Your home report — ${input.propertyAddress}`
    : "Your home report";
  const subject = `${addrLine}`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Here's your Propertoasty report. It covers heat pump, solar and battery suitability for ${input.propertyAddress ?? "your home"}.`,
    ``,
    `Open it whenever you like:`,
    input.reportUrl,
    ``,
    `The link works for the next ${expiryWords(input.expiresAtIso)}. After that the data may be out of date — pop back to propertoasty.com to run a fresh check.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">Your home report</p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">Hi ${escapeHtml(firstName)} — your report is ready</h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        Open it on any device. ${input.propertyAddress ? `Covers <strong style="color:#0b3140;">${escapeHtml(input.propertyAddress)}</strong>.` : ""}
      </p>
      <div style="margin:24px 0;text-align:center;">
        <a href="${escapeHtml(input.reportUrl)}" style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px;text-decoration:none;">
          Open my report
        </a>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0 0 16px;">
        The link works for the next ${expiryWords(input.expiresAtIso)}. After that, energy prices and grant rules may have moved on — run a fresh check at propertoasty.com.
      </p>
      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        On the report you can change which upgrades you want to include, switch between paying up front and financing, and see how the numbers move.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">You requested this report at propertoasty.com.</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

// ─── Forward ────────────────────────────────────────────────────────────────

export function buildForwardedReportEmail(input: ForwardedReportEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const sender = input.forwardedByName?.trim();
  const addrPart = input.propertyAddress ? ` for ${input.propertyAddress}` : "";
  const subject = sender
    ? `${sender} shared a Propertoasty report with you${addrPart}`
    : `A Propertoasty report has been shared with you${addrPart}`;

  const text = [
    sender
      ? `${sender} just shared a Propertoasty home-energy report with you${addrPart}.`
      : `Someone has shared a Propertoasty home-energy report with you${addrPart}.`,
    ``,
    input.personalNote ? `Their note:\n  "${input.personalNote}"\n` : "",
    `Open it here:`,
    input.reportUrl,
    ``,
    `It covers whether the property is suited to a heat pump, solar PV and a battery — the costs, the savings, and the trade-offs. You can change which upgrades to include and see how the numbers move.`,
    ``,
    `The link works for the next ${expiryWords(input.expiresAtIso)}.`,
    ``,
    `— The Propertoasty team`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">Shared with you</p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${sender ? `${escapeHtml(sender)} shared a home-energy report with you` : "A home-energy report has been shared with you"}
      </h1>
      ${input.propertyAddress ? `<p style="font-size:14px;color:#475569;margin:0 0 16px;">Covers <strong style="color:#0b3140;">${escapeHtml(input.propertyAddress)}</strong>.</p>` : ""}
      ${
        input.personalNote
          ? `<div style="border-left:3px solid #ef6c4f;padding:8px 0 8px 14px;margin:0 0 20px;color:#475569;font-size:14px;line-height:1.55;font-style:italic;">${escapeHtml(input.personalNote).replace(/\n/g, "<br>")}</div>`
          : ""
      }
      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 20px;">
        The report covers whether the property is suited to a heat pump, solar PV and a battery — the costs, the savings, and the trade-offs. You can change which upgrades to include and see the numbers update.
      </p>
      <div style="margin:24px 0;text-align:center;">
        <a href="${escapeHtml(input.reportUrl)}" style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px;text-decoration:none;">
          Open the report
        </a>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        The link works for the next ${expiryWords(input.expiresAtIso)}.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">Powered by propertoasty.com — your home, greener.</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
