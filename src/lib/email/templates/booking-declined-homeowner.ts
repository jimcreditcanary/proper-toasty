// Email sent to the homeowner when the installer declines the lead
// outright (didn't take it, no credit debit).
//
// Sent from /api/installer-leads/acknowledge with action=decline.
// Tells the homeowner this installer can't take the visit, surfaces
// a count of nearby alternatives matching their tech interests, and
// gives them a one-click report link to pick someone else.
//
// Tone: matter-of-fact, not apologetic ("they couldn't take it" —
// no overpromising, no "we're so sorry"). Pragmatic.

import { escapeHtml } from "../client";

export interface DeclinedHomeownerEmailInput {
  homeownerName: string;
  installerCompanyName: string;
  // The original slot they picked — for context.
  originalSlotUtc: string;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  // How many MCS-certified installers within the search radius
  // match the homeowner's tech interests. Computed at email-send
  // time using the existing findNearby helper.
  nearbyInstallerCount: number;
  // Search radius used to compute the count — surfaced in copy so
  // the user knows the geography. Always 10mi today; pass through
  // for future flexibility.
  nearbyRadiusMiles: number;
  // Link back to the homeowner's report (pre-issued report-share
  // token) — drops them into the "Book a site visit" tab so they
  // can pick someone else fast.
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
  return `${dayLabel} at ${timeLabel}`;
}

export function buildDeclinedHomeownerEmail(
  input: DeclinedHomeownerEmailInput,
): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(
    input.wantsHeatPump,
    input.wantsSolar,
    input.wantsBattery,
  );
  const firstName = input.homeownerName.split(" ")[0];
  const originalSlot = formatSlot(input.originalSlotUtc);

  const subject = `${input.installerCompanyName} can't take your visit — pick another installer`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `${input.installerCompanyName} have let us know they can't take on your visit on ${originalSlot} for ${wants}.`,
    ``,
    `Good news: there are ${input.nearbyInstallerCount} other MCS-certified installers within ${input.nearbyRadiusMiles} miles of you who can. Open your Propertoasty report to pick one:`,
    ``,
    input.reportUrl,
    ``,
    `Most installers are competitive on price, so getting two or three quotes is worth the half-hour.`,
    ``,
    `Anything we can help with? Just reply to this email.`,
    ``,
    `Thanks,`,
    `The Propertoasty team`,
  ]
    .filter((l) => l != null && l !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0f172a;margin:0 0 6px;">
        Booking update
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — ${escapeHtml(input.installerCompanyName)} can&rsquo;t take this one
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        They&rsquo;ve let us know they can&rsquo;t take on your visit on
        <strong style="color:#0b3140;">${escapeHtml(originalSlot)}</strong>
        for ${escapeHtml(wants)}. The slot is freed and you haven&rsquo;t
        been charged anything.
      </p>

      <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:18px;margin:0 0 20px;text-align:center;">
        <p style="font-size:13px;font-weight:600;color:#065f46;margin:0 0 6px;">
          You&rsquo;ve got options
        </p>
        <p style="font-size:24px;font-weight:700;color:#0b3140;margin:0 0 4px;line-height:1.1;">
          ${input.nearbyInstallerCount} other MCS-certified installer${input.nearbyInstallerCount === 1 ? "" : "s"}
        </p>
        <p style="font-size:13px;color:#065f46;margin:0;">
          within ${input.nearbyRadiusMiles} miles of you, ready to quote
        </p>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(input.reportUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px;text-decoration:none;">
          Pick another installer
        </a>
        <p style="font-size:12px;color:#64748b;margin:10px 0 0;">
          Opens your Propertoasty report in the &ldquo;Book a site visit&rdquo; tab.
        </p>
      </div>

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        <strong style="color:#0b3140;">Tip:</strong> get two or three
        quotes &mdash; even great installers vary 20&ndash;30% in price
        for the same kit. Worth the half-hour.
      </p>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Anything we can help with? Just reply to this email.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You&rsquo;re getting this because you booked a site visit through Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
