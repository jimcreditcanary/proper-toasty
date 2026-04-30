// Email sent to the homeowner once the installer ACCEPTS their booking.
//
// Pairs with booking-pending-homeowner.ts (sent at request time). This
// is the "great news, confirmed" email — explicitly different from
// the pending one so the user can see at a glance which state they're
// in.
//
// A calendar invite is attached as an .ics file (universal — works
// in Gmail, Outlook, Apple Calendar, anything). Installer contact
// info included for any post-confirmation changes.

import { escapeHtml } from "../client";

export interface ConfirmedHomeownerEmailInput {
  homeownerName: string;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  installerWebsite: string | null;
  // Property
  propertyAddress: string | null;
  // Confirmed slot
  meetingStartUtc: string;
  meetingDurationMin: number;
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

export function buildHomeownerEmail(input: ConfirmedHomeownerEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(input.wantsHeatPump, input.wantsSolar, input.wantsBattery);
  const firstName = input.homeownerName.split(" ")[0];
  const slot = formatSlot(input.meetingStartUtc);

  const subject = `Confirmed — ${input.installerCompanyName} accepted your booking for ${slot.longDateLabel}`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Great news — ${input.installerCompanyName} has accepted your booking. You're confirmed for ${slot.longDateLabel} (UK time) for a ${input.meetingDurationMin}-minute site survey.`,
    ``,
    `Booking summary:`,
    `  Company: ${input.installerCompanyName}`,
    input.propertyAddress ? `  Address for survey: ${input.propertyAddress}` : "",
    `  Date: ${slot.dayLabel}`,
    `  Time: ${slot.timeLabel} (UK time)`,
    `  What you asked about: ${wants}`,
    ``,
    `A calendar invite is attached to this email — open it to add the visit to your calendar (Gmail, Outlook, Apple Calendar, anything works).`,
    ``,
    `Need to change or cancel? Contact ${input.installerCompanyName} directly:`,
    input.installerEmail ? `  Email: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Phone: ${input.installerTelephone}` : "",
    input.installerWebsite ? `  Website: ${input.installerWebsite}` : "",
    ``,
    `Reminder — get three quotes if you can. Even great installers vary 20–30% in price for the same kit. The Book a site visit tab on your report has more sitting there.`,
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
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#10b981;margin:0 0 6px;">
        Booking confirmed
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — ${escapeHtml(input.installerCompanyName)} has accepted
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        You're confirmed for <strong style="color:#0b3140;">${escapeHtml(slot.longDateLabel)}</strong>
        for a ${input.meetingDurationMin}-minute site survey.
      </p>

      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#065f46;margin:0 0 8px;">
          Your booking
        </p>
        <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#0f172a;width:100%;">
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;width:120px;">Company</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(input.installerCompanyName)}</td>
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
            <td style="padding:3px 12px 3px 0;color:#64748b;">Date</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(slot.dayLabel)}</td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Time</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(slot.timeLabel)} <span style="font-weight:400;color:#64748b;">(UK time)</span></td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Discussing</td>
            <td style="padding:3px 0;">${escapeHtml(wants)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 20px;">
        A calendar invite is attached to this email — click it to add
        the visit to your calendar. Works with Gmail, Outlook, Apple
        Calendar, and anywhere else that opens .ics files.
      </p>

      ${
        input.installerEmail || input.installerTelephone || input.installerWebsite
          ? `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 8px;">
          Need to change or cancel?
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
            ? `<p style="font-size:13px;color:#0f172a;margin:0 0 4px;">📞 <a href="tel:${escapeHtml(input.installerTelephone)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(input.installerTelephone)}</a></p>`
            : ""
        }
        ${
          input.installerWebsite
            ? `<p style="font-size:13px;color:#0f172a;margin:0;">🌐 <a href="${escapeHtml(input.installerWebsite)}" style="color:#ef6c4f;text-decoration:none;">${escapeHtml(input.installerWebsite)}</a></p>`
            : ""
        }
      </div>`
          : ""
      }

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        <strong style="color:#0b3140;">A friendly nudge:</strong> get three
        quotes if you can. Even great installers vary 20–30% in price for
        the same kit. The Book a site visit tab on your report has more
        ready when you are.
      </p>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Anything goes wrong with this installer — they don't show, the
        quote feels off, anything — just reply to this email and we'll
        help sort it.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You're getting this because you booked a site visit through Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
