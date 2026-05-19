// Email sent to a registered installer (one who's claimed their
// MCS profile and has a bound user_id) when a homeowner opened the
// booking modal but found zero available slots in the next 28 days.
//
// The homeowner has finished a check — they're a warm, identified
// lead — but our booking flow would otherwise drop the connection on
// the floor because there's no diary entry to slot them into.
// This email gives the installer a one-click path to claim the lead:
// they sign in, see the homeowner's full report context, and hit
// "Reach out to homeowner" to log that they've made contact.
//
// Tone: direct + slightly apologetic about the diary gap, but
// orientated around the upside (warm lead, choose your moment).

import { escapeHtml } from "../client";

export interface NoSlotsRegisteredInstallerEmailInput {
  installerCompanyName: string;
  /** Homeowner-side display name. May be missing for anonymous flows. */
  homeownerName: string | null;
  /** Property postcode is the safest "where" indicator pre-claim. */
  propertyPostcode: string | null;
  /** What the homeowner ticked in the check wizard. */
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  /** Absolute URL: /installer/leads/[lead_id]/claim?source=no-slots */
  claimUrl: string;
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

export function buildNoSlotsRegisteredInstallerEmail(
  input: NoSlotsRegisteredInstallerEmailInput,
): { subject: string; html: string; text: string } {
  const subject =
    "A lead came through but you had no diary slots — claim it?";
  const wants = listWants(
    input.wantsHeatPump,
    input.wantsSolar,
    input.wantsBattery,
  );
  const whoBits = [
    input.homeownerName ?? "A homeowner",
    input.propertyPostcode ? `in ${input.propertyPostcode}` : null,
  ]
    .filter((b): b is string => !!b)
    .join(" ");

  const text = [
    `Hi ${input.installerCompanyName},`,
    ``,
    `${whoBits} just tried to book a site visit with you on Propertoasty — but your diary's empty for the next 28 days, so the booking flow couldn't go any further.`,
    ``,
    `They're after ${wants}, and they've already finished a full home check (EPC, solar, floorplan) — so they're a warm lead, not a tyre-kicker.`,
    ``,
    `Want to reach out to them directly?`,
    input.claimUrl,
    ``,
    `Click the link, sign in, and you'll see their report + contact details. There's no charge — you only pay for accepted booked leads.`,
    ``,
    `If you'd rather pass, just ignore this email — the lead doesn't expire and we'll keep showing it in your dashboard's "Missed because no slots" section until you act on it (or it goes stale).`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">
        Warm lead — diary full
      </p>
      <h1 style="font-size:22px;line-height:1.3;font-weight:700;color:#0b3140;margin:0 0 12px;">
        A homeowner${input.propertyPostcode ? ` in ${escapeHtml(input.propertyPostcode)}` : ""} just tried to book ${escapeHtml(input.installerCompanyName)}
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 18px;">
        Your diary's empty for the next 28 days, so the booking flow
        couldn&rsquo;t put them in a slot. We didn&rsquo;t want you to lose
        the lead.
      </p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:18px;margin:0 0 24px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9a3412;margin:0 0 6px;">
          What we know
        </p>
        <ul style="font-size:14px;color:#9a3412;margin:0;padding-left:18px;line-height:1.7;">
          <li>They&rsquo;re after <strong>${escapeHtml(wants)}</strong></li>
          ${input.propertyPostcode ? `<li>Property in <strong>${escapeHtml(input.propertyPostcode)}</strong></li>` : ""}
          <li>They&rsquo;ve already completed a full home check (EPC, solar, floorplan)</li>
        </ul>
      </div>

      <div style="text-align:center;margin:24px 0 16px;">
        <a href="${escapeHtml(input.claimUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">
          Claim this lead →
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0 0 12px;text-align:center;">
        Sign in to see their report + contact details. No charge — you
        only pay for accepted booked leads.
      </p>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:16px 0 0;">
        Not interested? Ignore this email. The lead stays in your
        dashboard&rsquo;s &ldquo;Missed because no slots&rdquo;
        section until you act on it.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You&rsquo;re getting this because ${escapeHtml(input.installerCompanyName)} is a claimed installer on Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
