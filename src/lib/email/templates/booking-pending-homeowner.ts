// Email sent to the homeowner immediately after they request a booking.
//
// New flow (PR C3): the booking is NOT confirmed yet — it's "pending"
// until the installer accepts. This email manages expectations:
//   - We've sent the request to {company}
//   - They have 24 hours to confirm
//   - You'll get a calendar invite the moment they accept
//   - If they don't accept, we'll suggest other installers
//
// Tone: warm + clear, no premature "you're booked!" language. The
// confirmed email (booking-confirmed-homeowner.ts) lands once the
// installer accepts.

import { escapeHtml } from "../client";

export interface PendingHomeownerEmailInput {
  homeownerName: string;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  // Property
  propertyAddress: string | null;
  // Requested slot
  meetingStartUtc: string;
  // What they asked about
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}

function listWants(
  wantsHp: boolean,
  wantsSolar: boolean,
  wantsBattery: boolean,
): string {
  const parts: string[] = [];
  if (wantsHp) parts.push("a heat pump");
  if (wantsSolar) parts.push("solar PV");
  if (wantsBattery) parts.push("a battery");
  if (parts.length === 0) return "energy upgrades";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function formatSlot(utcIso: string): { dayLabel: string; timeLabel: string; longDateLabel: string } {
  const d = new Date(utcIso);
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(d);
  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(d);
  return { dayLabel, timeLabel, longDateLabel: `${dayLabel} at ${timeLabel}` };
}

export function buildPendingHomeownerEmail(input: PendingHomeownerEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(input.wantsHeatPump, input.wantsSolar, input.wantsBattery);
  const firstName = input.homeownerName.split(" ")[0];
  const slot = formatSlot(input.meetingStartUtc);

  const subject = `Booking request sent to ${input.installerCompanyName}`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `We've sent your booking request to ${input.installerCompanyName} for ${slot.longDateLabel} (UK time). They have 24 hours to confirm.`,
    ``,
    `What you asked about: ${wants}.`,
    input.propertyAddress ? `Address: ${input.propertyAddress}` : "",
    ``,
    `What happens next:`,
    `  - Most installers respond within a few hours.`,
    `  - The moment they accept, we'll send a confirmation email and a Google Calendar invite for the visit.`,
    `  - If they can't take the slot, we'll let you know and suggest other installers from your report.`,
    ``,
    `Need to chase or change anything? Contact ${input.installerCompanyName} directly:`,
    input.installerEmail ? `  Email: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Phone: ${input.installerTelephone}` : "",
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
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#a16207;margin:0 0 6px;">
        Booking pending
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — your request is with ${escapeHtml(input.installerCompanyName)}
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        You've requested <strong style="color:#0b3140;">${escapeHtml(slot.longDateLabel)}</strong>
        for a site survey covering ${escapeHtml(wants)}. We've passed it to
        the installer — they have <strong style="color:#0b3140;">24 hours</strong>
        to confirm.
      </p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#92400e;margin:0 0 8px;">
          What you've requested
        </p>
        <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#0f172a;width:100%;">
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;width:120px;">Installer</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(input.installerCompanyName)}</td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Date</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(slot.dayLabel)}</td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Time</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(slot.timeLabel)} <span style="font-weight:400;color:#64748b;">(UK time)</span></td>
          </tr>
          ${
            input.propertyAddress
              ? `<tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Address</td>
            <td style="padding:3px 0;">${escapeHtml(input.propertyAddress)}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Discussing</td>
            <td style="padding:3px 0;">${escapeHtml(wants)}</td>
          </tr>
        </table>
      </div>

      <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:13px;font-weight:600;color:#0b3140;margin:0 0 8px;">
          What happens next
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • Most installers respond within a few hours — max 24 hours.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • The moment they accept, we'll send a confirmation email and a Google Calendar invite for the visit.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0;">
          • If they can't take the slot, we'll let you know so you can pick another installer from your report.
        </p>
      </div>

      ${
        input.installerEmail || input.installerTelephone
          ? `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 8px;">
          Need to chase or change?
        </p>
        <p style="font-size:13px;color:#475569;margin:0 0 8px;line-height:1.5;">
          Contact ${escapeHtml(input.installerCompanyName)} directly:
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
        Anything go wrong — they don't reply, the slot doesn't work, anything — just reply to this email and we'll help.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You're getting this because you requested a site visit through Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
