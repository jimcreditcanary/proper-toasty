// "We've released this lead" — sent to the installer when the C4
// cron auto-cancels a lead they didn't respond to within 24 hours.
//
// Tone: factual, not punitive. We don't penalise installers for
// missing one — they just lose the lead this round. The email
// signs off with a "want to keep getting leads? set availability /
// keep auto top-up on" nudge so they leave the message with a
// clear next step rather than just a closed door.

import { escapeHtml } from "../client";

export interface AutoReleasedInstallerEmailInput {
  installerCompanyName: string;
  propertyPostcodeArea: string | null;
  meetingStartUtc: string;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  installerPortalUrl: string; // /installer
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

function formatSlot(utcIso: string): string {
  const d = new Date(utcIso);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(d);
}

export function buildAutoReleasedInstallerEmail(
  input: AutoReleasedInstallerEmailInput,
): { subject: string; html: string; text: string } {
  const wants = listWants(
    input.wantsHeatPump,
    input.wantsSolar,
    input.wantsBattery,
  );
  const slot = formatSlot(input.meetingStartUtc);
  const subject = "Lead released — no response in 24 hours";

  const text = [
    `Heads up — we've released the Propertoasty lead below because we didn't get an accept/decline within 24 hours.`,
    ``,
    `Slot was: ${slot} (UK time)`,
    `Area: ${input.propertyPostcodeArea ?? "unknown"}`,
    `Tech: ${wants}`,
    ``,
    `The homeowner has been told and pointed at other installers nearby. No charge to your credit balance.`,
    ``,
    `Want to keep getting leads? Make sure your availability is up to date and your auto top-up is on:`,
    `  ${input.installerPortalUrl}`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#94a3b8;margin:0 0 6px;">
        Lead released
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        We&rsquo;ve released the lead waiting for ${escapeHtml(input.installerCompanyName)}
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        We didn&rsquo;t hear back within 24 hours, so we&rsquo;ve let
        the homeowner know and pointed them at other installers
        nearby. No charge to your credit balance.
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f1f5f9;border-radius:10px;padding:16px;margin:0 0 20px;">
        <tr>
          <td style="padding:3px 12px 3px 0;color:#64748b;font-size:13px;width:100px;">Slot was</td>
          <td style="padding:3px 0;font-size:13px;color:#0f172a;">${escapeHtml(slot)} <span style="color:#64748b;">(UK time)</span></td>
        </tr>
        ${
          input.propertyPostcodeArea
            ? `<tr>
          <td style="padding:3px 12px 3px 0;color:#64748b;font-size:13px;">Area</td>
          <td style="padding:3px 0;font-size:13px;color:#0f172a;">${escapeHtml(input.propertyPostcodeArea)}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding:3px 12px 3px 0;color:#64748b;font-size:13px;">Tech</td>
          <td style="padding:3px 0;font-size:13px;color:#0f172a;">${escapeHtml(wants)}</td>
        </tr>
      </table>

      <div style="background:#fef7f3;border:1px solid #fbcec0;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:13px;font-weight:600;color:#0b3140;margin:0 0 6px;">
          Want to keep getting leads?
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 8px;">
          Make sure your availability is up to date and your auto
          top-up is on so you can accept the next one quickly.
        </p>
        <a href="${escapeHtml(input.installerPortalUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:13px;padding:9px 18px;border-radius:999px;text-decoration:none;">
          Open the portal →
        </a>
      </div>

      <p style="font-size:12px;color:#94a3b8;line-height:1.55;margin:0;">
        We aim to release pending leads within 24 hours so homeowners
        aren&rsquo;t left hanging. No hard feelings — just keep an eye
        on the inbox.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent because a Propertoasty lead on your account auto-released.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
