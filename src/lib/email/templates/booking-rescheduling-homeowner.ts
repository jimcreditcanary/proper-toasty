// Email sent to the homeowner when the installer accepts the lead
// but can't make the original slot — they want to reschedule.
//
// Sent from /api/installer-leads/acknowledge with action=reschedule.
// The installer paid the lead-accept credit cost; meeting was
// cancelled (slot freed); installer's full contact info is now
// shared with the homeowner so they can sort a new time directly.
//
// Tone: positive ("they want to take you on") with a light nudge
// to be flexible. NOT pushy.

import { escapeHtml } from "../client";

export interface ReschedulingHomeownerEmailInput {
  homeownerName: string;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  installerWebsite: string | null;
  // The original slot the homeowner picked — included so they have
  // context about what's being rescheduled.
  originalSlotUtc: string;
  propertyAddress: string | null;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
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

export function buildReschedulingHomeownerEmail(
  input: ReschedulingHomeownerEmailInput,
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

  const subject = `${input.installerCompanyName} took your lead — they'll be in touch to find a new time`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Good news — ${input.installerCompanyName} wants to take on your survey for ${wants}, but the slot you picked (${originalSlot}) doesn't work for them.`,
    ``,
    `They'll reach out shortly to find a time that suits both of you. You can also get ahead of it — here's how to contact them directly:`,
    ``,
    input.installerEmail ? `  Email: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Phone: ${input.installerTelephone}` : "",
    input.installerWebsite ? `  Website: ${input.installerWebsite}` : "",
    ``,
    input.propertyAddress ? `Address for the visit: ${input.propertyAddress}` : "",
    ``,
    `If you'd rather not wait, you can pick a different installer from your Propertoasty report.`,
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
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#a16207;margin:0 0 6px;">
        Lead taken — slot needs rescheduling
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — ${escapeHtml(input.installerCompanyName)} wants in
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        They&rsquo;ve taken on your survey for ${escapeHtml(wants)}, but
        the slot you picked (<strong style="color:#0b3140;">${escapeHtml(originalSlot)}</strong>)
        doesn&rsquo;t work for them.
      </p>

      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        They&rsquo;ll reach out shortly to find a time that works for
        both of you. You can also get ahead of it &mdash; their
        contact details are below.
      </p>

      ${
        input.installerEmail || input.installerTelephone || input.installerWebsite
          ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#92400e;margin:0 0 8px;">
          Reach out to ${escapeHtml(input.installerCompanyName)}
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

      ${
        input.propertyAddress
          ? `<p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 20px;">
        <strong style="color:#0b3140;">Address for the visit:</strong> ${escapeHtml(input.propertyAddress)}
      </p>`
          : ""
      }

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0 0 8px;">
        If you&rsquo;d rather not wait, you can pick another installer
        from your Propertoasty report.
      </p>
      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Anything goes wrong with this installer &mdash; just reply to
        this email and we&rsquo;ll help sort it.
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
