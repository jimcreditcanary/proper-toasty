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

  // Plain transactional subject — keeps M365 / Outlook spam filters
  // happy. Earlier "New lead — pending your acceptance" copy got
  // flagged because of the marketing-style urgency words.
  const subject = `Site visit request, ${slot.longDateLabel} (${area})`;

  const reportSummary: string[] = [];
  if (input.wantsHeatPump && input.hpVerdict) {
    reportSummary.push(`Heat pump: ${input.hpVerdict} verdict`);
  }
  if (input.wantsSolar && input.solarRating) {
    reportSummary.push(`Solar: ${input.solarRating} rating`);
  }

  const text = [
    `Hi from Propertoasty,`,
    ``,
    `A homeowner has requested a site visit through your Propertoasty profile.`,
    ``,
    `When: ${slot.longDateLabel} (UK time)`,
    `Where: ${area} (full address shared after you confirm)`,
    `Topic: ${wants}`,
    `Duration: ${input.meetingDurationMin} minutes (${input.travelBufferMin} min travel buffer either side)`,
    reportSummary.length ? `Pre-survey: ${reportSummary.join(", ")}` : "",
    ``,
    `To confirm, please follow this link:`,
    input.acknowledgeUrl,
    ``,
    `Confirming uses ${input.creditCost} credit${input.creditCost === 1 ? "" : "s"} from your account. The homeowner's full contact details will then be shared with you.`,
    ``,
    `If you can't take this visit, no need to do anything — the request will lapse after 24 hours.`,
    ``,
    `Thanks,`,
    `The Propertoasty team`,
  ]
    .filter((l) => l != null && l !== "")
    .join("\n");

  // HTML body — deliberately plain. Single neutral container, no
  // coloured pills, single CTA, no "unlock"/"now"/"act" urgency
  // language. M365's Defender flagged the previous version as
  // promotional; this version reads as transactional.
  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0 0 14px;">
      Hi from Propertoasty,
    </p>
    <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0 0 18px;">
      A homeowner has requested a site visit through your Propertoasty profile.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#0f172a;line-height:1.6;margin:0 0 18px;">
      <tr>
        <td style="padding:2px 16px 2px 0;color:#64748b;width:100px;">When</td>
        <td style="padding:2px 0;">${escapeHtml(slot.longDateLabel)} (UK time)</td>
      </tr>
      <tr>
        <td style="padding:2px 16px 2px 0;color:#64748b;">Where</td>
        <td style="padding:2px 0;">${escapeHtml(area)} (full address shared after you confirm)</td>
      </tr>
      <tr>
        <td style="padding:2px 16px 2px 0;color:#64748b;">Topic</td>
        <td style="padding:2px 0;">${escapeHtml(wants)}</td>
      </tr>
      <tr>
        <td style="padding:2px 16px 2px 0;color:#64748b;">Duration</td>
        <td style="padding:2px 0;">${input.meetingDurationMin} minutes (${input.travelBufferMin} min travel either side)</td>
      </tr>
      ${reportSummary
        .map(
          (s) => `<tr>
        <td style="padding:2px 16px 2px 0;color:#64748b;">Pre-survey</td>
        <td style="padding:2px 0;">${escapeHtml(s)}</td>
      </tr>`,
        )
        .join("")}
    </table>

    <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0 0 14px;">
      To confirm, please follow this link:
    </p>
    <p style="font-size:14px;line-height:1.55;margin:0 0 18px;">
      <a href="${escapeHtml(input.acknowledgeUrl)}" style="color:#0b3140;">
        ${escapeHtml(input.acknowledgeUrl)}
      </a>
    </p>

    <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0 0 14px;">
      Confirming uses ${input.creditCost} credit${input.creditCost === 1 ? "" : "s"} from your account.
      The homeowner's full contact details will then be shared with you.
    </p>
    <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0 0 18px;">
      If you can&rsquo;t take this visit, you don&rsquo;t need to do anything &mdash;
      the request will lapse after 24 hours.
    </p>

    <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0 0 6px;">
      Thanks,
    </p>
    <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0;">
      The Propertoasty team
    </p>

    <p style="font-size:11px;color:#94a3b8;margin:24px 0 0;line-height:1.5;">
      ${escapeHtml(input.installerCompanyName)} is listed on our MCS-certified installer directory.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
