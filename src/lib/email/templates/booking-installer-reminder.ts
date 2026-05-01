// "12 hours left to accept this lead" — sent by the C4 cron at the
// 12-hour mark when the installer hasn't acted yet. Same minimal-
// info principle as the pending email (postcode area + tech, no
// homeowner contact details until acceptance unlocks them).
//
// The CTA is the same magic-link `/lead/accept` URL the original
// pending email points at. Clicking through still works the same
// way — accept / reschedule / decline.

import { escapeHtml } from "../client";

export interface InstallerReminderEmailInput {
  installerCompanyName: string;
  propertyPostcodeArea: string | null;
  meetingStartUtc: string;
  meetingDurationMin: number;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  acknowledgeUrl: string;
  hoursRemaining: number;
}

function listWants(hp: boolean, solar: boolean, battery: boolean): string {
  const parts: string[] = [];
  if (hp) parts.push("a heat pump");
  if (solar) parts.push("solar PV");
  if (battery) parts.push("a battery");
  if (parts.length === 0) return "energy upgrades";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function formatSlot(utcIso: string): {
  dayLabel: string;
  timeLabel: string;
  longDateLabel: string;
} {
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
  return {
    dayLabel,
    timeLabel,
    longDateLabel: `${dayLabel} at ${timeLabel}`,
  };
}

export function buildInstallerReminderEmail(
  input: InstallerReminderEmailInput,
): { subject: string; html: string; text: string } {
  const wants = listWants(
    input.wantsHeatPump,
    input.wantsSolar,
    input.wantsBattery,
  );
  const slot = formatSlot(input.meetingStartUtc);
  const subject = `${input.hoursRemaining}h left — lead waiting for ${input.installerCompanyName}`;

  const text = [
    `Quick reminder — you've got a Propertoasty lead waiting.`,
    ``,
    `Slot: ${slot.longDateLabel} (UK time)`,
    `Visit length: ${input.meetingDurationMin} min`,
    `Area: ${input.propertyPostcodeArea ?? "unknown"}`,
    `Tech: ${wants}`,
    ``,
    `If you don't respond within ${input.hoursRemaining} hours we'll release the lead and let the homeowner choose another installer.`,
    ``,
    `Accept, reschedule, or decline:`,
    `  ${input.acknowledgeUrl}`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#b45309;margin:0 0 6px;">
        ${input.hoursRemaining}h left to respond
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Lead still waiting for ${escapeHtml(input.installerCompanyName)}
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        Just a nudge — the booking below is still pending. If you
        don&rsquo;t respond within
        <strong style="color:#0b3140;">${input.hoursRemaining} hours</strong>
        we&rsquo;ll release it and point the homeowner at other
        installers.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:0 0 20px;">
        <tr>
          <td style="padding:3px 12px 3px 0;color:#92400e;font-size:13px;width:100px;">Slot</td>
          <td style="padding:3px 0;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(slot.longDateLabel)} <span style="font-weight:400;color:#78350f;">(UK time)</span></td>
        </tr>
        ${
          input.propertyPostcodeArea
            ? `<tr>
          <td style="padding:3px 12px 3px 0;color:#92400e;font-size:13px;">Area</td>
          <td style="padding:3px 0;font-size:13px;color:#0f172a;">${escapeHtml(input.propertyPostcodeArea)}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding:3px 12px 3px 0;color:#92400e;font-size:13px;">Tech</td>
          <td style="padding:3px 0;font-size:13px;color:#0f172a;">${escapeHtml(wants)}</td>
        </tr>
        <tr>
          <td style="padding:3px 12px 3px 0;color:#92400e;font-size:13px;">Visit</td>
          <td style="padding:3px 0;font-size:13px;color:#0f172a;">${input.meetingDurationMin} min</td>
        </tr>
      </table>

      <a href="${escapeHtml(input.acknowledgeUrl)}"
         style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;text-decoration:none;margin:0 0 16px;">
        Accept, reschedule, or decline →
      </a>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Already actioned? Ignore this email — we&rsquo;ll have moved on.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent because a Propertoasty lead is still pending on your account.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
