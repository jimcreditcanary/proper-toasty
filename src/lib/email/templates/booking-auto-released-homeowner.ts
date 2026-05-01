// "We couldn't reach [installer]" — sent to the homeowner when the
// C4 cron auto-releases a pending lead they booked. Mirrors the
// existing booking-declined-homeowner template structurally
// (apologise, surface alternatives, link back to the report) but
// the copy distinguishes between an active decline and a no-show.
//
// Skipped silently when the booked slot is already in the past —
// at that point the email's just confusing.

import { escapeHtml } from "../client";

export interface AutoReleasedHomeownerEmailInput {
  homeownerName: string;
  installerCompanyName: string;
  originalSlotUtc: string;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  nearbyInstallerCount: number;
  nearbyRadiusMiles: number;
  reportUrl: string;
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

export function buildAutoReleasedHomeownerEmail(
  input: AutoReleasedHomeownerEmailInput,
): { subject: string; html: string; text: string } {
  const firstName = input.homeownerName.split(" ")[0] || "there";
  const wants = listWants(
    input.wantsHeatPump,
    input.wantsSolar,
    input.wantsBattery,
  );
  const slot = formatSlot(input.originalSlotUtc);
  const subject = `${input.installerCompanyName} hasn't replied — let's find another installer`;

  const nearbyLine =
    input.nearbyInstallerCount > 0
      ? `We found ${input.nearbyInstallerCount} other installer${input.nearbyInstallerCount === 1 ? "" : "s"} within ${input.nearbyRadiusMiles} miles of you who could help with ${wants}.`
      : `Open your report and we'll widen the search to find someone nearby.`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `${input.installerCompanyName} hasn't responded to your booking request for ${slot} (UK time), so we've cancelled it on your behalf.`,
    ``,
    `${nearbyLine}`,
    ``,
    `Pick another installer here:`,
    `  ${input.reportUrl}`,
    ``,
    `Sorry for the run-around. We auto-release any booking where the installer doesn't respond within 24 hours so you're never left waiting.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#b45309;margin:0 0 6px;">
        Booking auto-released
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(input.installerCompanyName)} hasn&rsquo;t replied
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        Hi ${escapeHtml(firstName)} — sorry, ${escapeHtml(input.installerCompanyName)}
        didn&rsquo;t respond to your booking request for
        <strong style="color:#0b3140;">${escapeHtml(slot)}</strong>
        (UK time) within 24 hours, so we&rsquo;ve cancelled it on your
        behalf.
      </p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:13px;font-weight:600;color:#0b3140;margin:0 0 6px;">
          What now?
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 12px;">
          ${escapeHtml(nearbyLine)}
        </p>
        <a href="${escapeHtml(input.reportUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:13px;padding:9px 18px;border-radius:999px;text-decoration:none;">
          Open my report →
        </a>
      </div>

      <p style="font-size:12px;color:#94a3b8;line-height:1.55;margin:0;">
        We auto-release any booking where the installer doesn&rsquo;t
        respond within 24 hours so you&rsquo;re never left waiting.
        Sorry for the run-around — let us know if anything else trips
        up.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent because your Propertoasty booking auto-released.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
