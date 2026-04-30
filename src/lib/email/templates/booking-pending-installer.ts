// Email sent to the installer when a homeowner requests a booking.
//
// New flow (PR C3): the installer sees only the bare minimum needed
// to decide whether to accept — postcode area, tech interests, slot
// time. NO name, address, email or phone (those land in the calendar
// invite description AFTER they accept).
//
// The "Accept this lead" CTA links to the same HMAC-token endpoint as
// before. When the credit ledger ships (PR C1) we'll add a credit
// check + cost-per-lead line to this template.

import { escapeHtml } from "../client";

export interface PendingInstallerEmailInput {
  installerCompanyName: string;
  // Limited property info — first half of postcode only
  propertyPostcodeArea: string | null;
  // Slot
  meetingStartUtc: string;
  meetingDurationMin: number;
  travelBufferMin: number;
  // What they want
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  // Optional pre-survey insights — single-line summaries the installer
  // can use to decide if the lead's a good fit before unlocking it.
  hpVerdict?: string | null;
  solarRating?: string | null;
  // Magic link to /api/installer-leads/acknowledge
  acknowledgeUrl: string;
  // Credits this lead would cost (5 today; will become installer-
  // configurable later). For display only — no debit happens until
  // the credit ledger lands in C1.
  creditCost: number;
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

export function buildPendingInstallerEmail(input: PendingInstallerEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(input.wantsHeatPump, input.wantsSolar, input.wantsBattery);
  const slot = formatSlot(input.meetingStartUtc);
  const area = input.propertyPostcodeArea ?? "your area";

  const subject = `New lead — ${wants} in ${area}, ${slot.longDateLabel}`;

  const reportSummary: string[] = [];
  if (input.wantsHeatPump && input.hpVerdict) {
    reportSummary.push(`Heat pump: ${input.hpVerdict} verdict`);
  }
  if (input.wantsSolar && input.solarRating) {
    reportSummary.push(`Solar: ${input.solarRating} rating`);
  }

  const text = [
    `New lead waiting for you on Propertoasty.`,
    ``,
    `Slot requested: ${slot.longDateLabel} (UK time)`,
    `Area: ${area}`,
    `Wants: ${wants}`,
    `Visit length: ${input.meetingDurationMin} min + ${input.travelBufferMin}-min travel buffer either side`,
    reportSummary.length ? `From their pre-survey: ${reportSummary.join(", ")}` : "",
    ``,
    `Cost to accept: ${input.creditCost} credit${input.creditCost === 1 ? "" : "s"}`,
    ``,
    `The homeowner's name, address, email and phone unlock when you accept.`,
    `If you don't accept within 24 hours we'll release the slot and notify them.`,
    ``,
    `Accept this lead:`,
    input.acknowledgeUrl,
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
        New lead — pending your acceptance
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(wants[0].toUpperCase() + wants.slice(1))} in ${escapeHtml(area)}
      </h1>
      <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 20px;">
        A homeowner has requested a site visit. Accept to unlock their
        contact details + the full pre-survey report — they're added
        to your calendar automatically.
      </p>

      <div style="background:#fef7f3;border:1px solid #fbcec0;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a3a25;margin:0 0 8px;">
          Slot requested
        </p>
        <p style="font-size:18px;font-weight:700;color:#0b3140;margin:0 0 6px;">
          ${escapeHtml(slot.longDateLabel)} <span style="font-size:13px;font-weight:400;color:#64748b;">(UK time)</span>
        </p>
        <p style="font-size:13px;color:#475569;margin:0;line-height:1.5;">
          ${input.meetingDurationMin}-min visit + ${input.travelBufferMin}-min travel buffer either side.
        </p>
      </div>

      <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#0f172a;width:100%;">
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;width:120px;">Area</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(area)}</td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Wants</td>
            <td style="padding:3px 0;">${escapeHtml(wants)}</td>
          </tr>
          ${reportSummary
            .map(
              (s) => `<tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Insight</td>
            <td style="padding:3px 0;color:#475569;">${escapeHtml(s)}</td>
          </tr>`,
            )
            .join("")}
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Cost</td>
            <td style="padding:3px 0;font-weight:600;color:#7a3a25;">${input.creditCost} credit${input.creditCost === 1 ? "" : "s"}</td>
          </tr>
        </table>
      </div>

      <div style="margin:24px 0;text-align:center;">
        <a href="${escapeHtml(input.acknowledgeUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px;text-decoration:none;">
          Accept this lead
        </a>
        <p style="font-size:12px;color:#64748b;margin:10px 0 0;">
          One click to unlock contact details + add to your calendar.
        </p>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.5;margin:0;">
        If you don't accept within 24 hours we'll release the slot and
        let the homeowner pick a different installer.
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
