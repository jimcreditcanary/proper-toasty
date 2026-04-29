// Email sent to the MCS installer when a homeowner books a site visit.
//
// PR B.3 rewrite — when a slot was picked, the email leads with the
// scheduled date/time and frames the booking as "you've been booked
// for {time}" rather than "lead waiting to be picked up".
//
// Reply-To is set to the homeowner's email so the installer can reply
// directly without us in the middle. The "I'll take this lead" CTA
// is a magic link that updates the lead status to installer_acknowledged
// (no installer auth required — the token is HMAC-signed).

import { escapeHtml } from "../client";

export interface InstallerEmailInput {
  installerCompanyName: string;
  // Homeowner contact
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string | null;
  preferredContactMethod: "email" | "phone" | "whatsapp" | "any" | null;
  preferredContactWindow: string | null;
  notes: string | null;
  // Property
  propertyAddress: string | null;
  propertyPostcode: string | null;
  // Meeting (PR B.3 onwards). null when this email fires for the
  // legacy "request callback" flow without a scheduled slot.
  meetingStartUtc: string | null;
  meetingDurationMin: number | null;
  travelBufferMin: number | null;
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
  // Magic link
  acknowledgeUrl: string;
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

export function buildInstallerEmail(input: InstallerEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(input.wantsHeatPump, input.wantsSolar, input.wantsBattery);
  const slot = input.meetingStartUtc ? formatSlot(input.meetingStartUtc) : null;

  // Subject leads with the slot when we have one — installers
  // triage by date/time so it should be the first thing they see.
  const subject = slot
    ? `Site survey booked — ${slot.longDateLabel} with ${input.homeownerName}${
        input.propertyPostcode ? ` (${input.propertyPostcode})` : ""
      }`
    : `New ${wants} enquiry from ${input.homeownerName}${
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

  // ── Plain text body ─────────────────────────────────────────────────
  const textLines: string[] = [];
  if (slot) {
    textLines.push(
      `${input.homeownerName} has booked a site survey with you for ${slot.longDateLabel} (UK time).`,
      "",
      `1-hour visit + ${input.travelBufferMin ?? 30}-min travel buffer either side. Both windows are on your Google Calendar — accept the invite to confirm.`,
      "",
    );
  } else {
    textLines.push(
      `${input.homeownerName} just booked a site visit with you through Propertoasty.`,
      "",
    );
  }
  textLines.push(
    `What they want: ${wants}.`,
    input.propertyAddress ? `Property: ${input.propertyAddress}` : "",
    "",
    "How to reach them:",
    `  Email: ${input.homeownerEmail}`,
    input.homeownerPhone ? `  Phone: ${input.homeownerPhone}` : "",
    input.preferredContactMethod
      ? `  Best method: ${input.preferredContactMethod}`
      : "",
    input.preferredContactWindow
      ? `  Best time: ${input.preferredContactWindow}`
      : "",
    "",
    input.notes ? `Notes from ${input.homeownerName}:\n  ${input.notes}` : "",
    "",
    reportSummary.length ? `From their pre-survey:\n  ${reportSummary.join("\n  ")}` : "",
    "",
    "Click to acknowledge — this lets them know you've received it:",
    input.acknowledgeUrl,
    "",
    `Reply directly to this email to contact ${input.homeownerName}.`,
    "",
    "— The Propertoasty team",
  );
  const text = textLines.filter((l) => l != null).join("\n");

  // ── HTML body ───────────────────────────────────────────────────────
  const slotBlock = slot
    ? `
      <div style="background:#fef7f3;border:1px solid #fbcec0;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a3a25;margin:0 0 8px;">
          Booked for
        </p>
        <p style="font-size:18px;font-weight:700;color:#0b3140;margin:0 0 6px;">
          ${escapeHtml(slot.longDateLabel)} <span style="font-size:13px;font-weight:400;color:#64748b;">(UK time)</span>
        </p>
        <p style="font-size:13px;color:#475569;margin:0;line-height:1.5;">
          1-hour visit + ${input.travelBufferMin ?? 30}-min travel buffer either side.
          Both windows are on your Google Calendar — accept the invite to confirm.
        </p>
      </div>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">
        ${slot ? "Site survey booked" : "New site visit booking"}
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(input.homeownerName)} wants ${escapeHtml(wants)}.
      </h1>
      <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 20px;">
        They booked you through Propertoasty and shared their pre-survey
        report. ${slot ? "Slot details and contact info below." : "They're expecting to hear from you."}
      </p>

      ${slotBlock}

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
          ${
            input.preferredContactMethod
              ? `<tr>
            <td style="padding:2px 12px 2px 0;color:#64748b;">Prefers</td>
            <td style="padding:2px 0;text-transform:capitalize;">${escapeHtml(input.preferredContactMethod)}</td>
          </tr>`
              : ""
          }
          ${
            input.preferredContactWindow
              ? `<tr>
            <td style="padding:2px 12px 2px 0;color:#64748b;">Best time</td>
            <td style="padding:2px 0;">${escapeHtml(input.preferredContactWindow)}</td>
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

      <div style="margin:24px 0;text-align:center;">
        <a href="${escapeHtml(input.acknowledgeUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px;text-decoration:none;">
          I'll take this lead
        </a>
        <p style="font-size:12px;color:#64748b;margin:10px 0 0;">
          One click. Lets ${escapeHtml(input.homeownerName.split(" ")[0])}
          know you've got it — they'll get a confirmation email.
        </p>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">
        You can also just hit Reply to this email and it'll go straight to
        ${escapeHtml(input.homeownerName.split(" ")[0])} — we don't sit in
        the middle.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent by Propertoasty on behalf of ${escapeHtml(input.homeownerName)}.<br>
      ${escapeHtml(input.installerCompanyName)} is on our MCS-certified
      installer directory.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
