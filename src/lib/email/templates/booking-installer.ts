// Email sent to the installer the moment they accept a lead.
//
// Pairs with booking-pending-installer.ts (sent at request time).
// This is the "you've accepted, here are the details" email — drops
// the accept CTA (already done) and surfaces the full homeowner
// contact + property info that was hidden in the pending email.
//
// The Google Calendar invite for the visit (with travel buffers) is
// inserted in parallel via the Calendar API; this email mentions it.

import { escapeHtml } from "../client";

export interface ConfirmedInstallerEmailInput {
  installerCompanyName: string;
  // Homeowner contact
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string | null;
  notes: string | null;
  // Property
  propertyAddress: string | null;
  propertyPostcode: string | null;
  // Confirmed slot
  meetingStartUtc: string;
  meetingDurationMin: number;
  travelBufferMin: number;
  // What they want
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  // Optional report context (one-line summaries)
  hpVerdict?: string | null;
  hpGrantGbp?: number | null;
  hpSystemKw?: number | null;
  solarRating?: string | null;
  solarKwp?: number | null;
}

function listWants(wantsHp: boolean, wantsSolar: boolean, wantsBattery: boolean): string {
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

export function buildInstallerEmail(input: ConfirmedInstallerEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(input.wantsHeatPump, input.wantsSolar, input.wantsBattery);
  const slot = formatSlot(input.meetingStartUtc);

  const subject = `Lead accepted — ${slot.longDateLabel} with ${input.homeownerName}${
    input.propertyPostcode ? ` (${input.propertyPostcode})` : ""
  }`;

  const reportSummary: string[] = [];
  if (input.wantsHeatPump && input.hpSystemKw != null) {
    reportSummary.push(
      `Heat pump: ${input.hpSystemKw} kW estimated${
        input.hpGrantGbp ? `, £${input.hpGrantGbp.toLocaleString()} BUS grant available` : ""
      }${input.hpVerdict ? ` (${input.hpVerdict} verdict)` : ""}`,
    );
  }
  if (input.wantsSolar && input.solarKwp != null) {
    reportSummary.push(
      `Solar: ${input.solarKwp} kWp recommended${
        input.solarRating ? ` (${input.solarRating} rating)` : ""
      }`,
    );
  }

  const text = [
    `You've accepted ${input.homeownerName}'s site visit booking.`,
    ``,
    `Slot: ${slot.longDateLabel} (UK time)`,
    `${input.meetingDurationMin}-min visit + ${input.travelBufferMin}-min travel buffer either side. Both windows have been added to your Google Calendar — accept the invite to confirm.`,
    ``,
    `How to reach ${input.homeownerName.split(" ")[0]}:`,
    `  Email: ${input.homeownerEmail}`,
    input.homeownerPhone ? `  Phone: ${input.homeownerPhone}` : "",
    ``,
    input.propertyAddress ? `Property: ${input.propertyAddress}` : "",
    ``,
    input.notes ? `Notes from ${input.homeownerName}:\n  ${input.notes}` : "",
    ``,
    `What they want: ${wants}.`,
    reportSummary.length ? `From their pre-survey:\n  ${reportSummary.join("\n  ")}` : "",
    ``,
    `Reply directly to this email to contact ${input.homeownerName} — replies go straight through to them.`,
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
        Lead accepted
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(input.homeownerName)} — ${escapeHtml(wants)}
      </h1>
      <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 20px;">
        Confirmed for ${escapeHtml(slot.longDateLabel)}. Calendar invite
        is on its way to your inbox — accept it to confirm.
      </p>

      <div style="background:#fef7f3;border:1px solid #fbcec0;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a3a25;margin:0 0 8px;">
          Booked for
        </p>
        <p style="font-size:18px;font-weight:700;color:#0b3140;margin:0 0 6px;">
          ${escapeHtml(slot.longDateLabel)} <span style="font-size:13px;font-weight:400;color:#64748b;">(UK time)</span>
        </p>
        <p style="font-size:13px;color:#475569;margin:0;line-height:1.5;">
          ${input.meetingDurationMin}-min visit + ${input.travelBufferMin}-min travel buffer either side.
        </p>
      </div>

      <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 8px;">
          How to reach ${escapeHtml(input.homeownerName.split(" ")[0])}
        </p>
        <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#0f172a;">
          <tr>
            <td style="padding:2px 12px 2px 0;color:#64748b;">Email</td>
            <td style="padding:2px 0;"><a href="mailto:${escapeHtml(input.homeownerEmail)}" style="color:#ef6c4f;text-decoration:none;">${escapeHtml(input.homeownerEmail)}</a></td>
          </tr>
          ${
            input.homeownerPhone
              ? `<tr>
            <td style="padding:2px 12px 2px 0;color:#64748b;">Phone</td>
            <td style="padding:2px 0;"><a href="tel:${escapeHtml(input.homeownerPhone)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(input.homeownerPhone)}</a></td>
          </tr>`
              : ""
          }
        </table>
      </div>

      ${
        input.propertyAddress
          ? `<p style="font-size:14px;line-height:1.5;color:#0f172a;margin:0 0 16px;">
        <strong style="color:#0b3140;">Property:</strong> ${escapeHtml(input.propertyAddress)}
      </p>`
          : ""
      }

      ${
        input.notes
          ? `<div style="border-left:3px solid #ef6c4f;padding:8px 0 8px 14px;margin:0 0 20px;color:#475569;font-size:14px;line-height:1.5;">
        <strong style="color:#0b3140;display:block;margin-bottom:4px;">From ${escapeHtml(input.homeownerName.split(" ")[0])}:</strong>
        ${escapeHtml(input.notes).replace(/\n/g, "<br>")}
      </div>`
          : ""
      }

      ${
        reportSummary.length > 0
          ? `<div style="background:#f1f5f9;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 8px;">
          From their pre-survey
        </p>
        <ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;line-height:1.6;">
          ${reportSummary.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
        </ul>
      </div>`
          : ""
      }

      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">
        Reply to this email to contact ${escapeHtml(input.homeownerName.split(" ")[0])}
        directly — replies go straight through, we don't sit in the
        middle.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent by Propertoasty · ${escapeHtml(input.installerCompanyName)} is on our MCS-certified directory.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
