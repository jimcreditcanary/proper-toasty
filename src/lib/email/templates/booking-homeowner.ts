// Confirmation email sent to the homeowner after they book a site visit.
//
// PR B.3 rewrite — copy now reflects "you've booked at THIS time" with
// the slot details inline. Calendar invite is sent separately by the
// Google Calendar integration (PR B.4); this email is the branded
// confirmation that arrives instantly with the booking summary.
//
// Includes installer contact details so a homeowner who needs to
// change or cancel can reach out directly — Propertoasty doesn't sit
// in the middle.

import { escapeHtml } from "../client";

export interface HomeownerEmailInput {
  homeownerName: string;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  installerWebsite: string | null;
  // Property
  propertyAddress: string | null;
  // Meeting (PR B.3 onwards). null when this email fires for the
  // legacy "request callback" flow without a scheduled slot.
  meetingStartUtc: string | null;
  meetingDurationMin: number | null;
  // What they asked about
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}

function listWants(
  wantsHp: boolean,
  wantsSolar: boolean,
  wantsBattery: boolean,
): string {
  const parts: string[] = [];
  if (wantsHp) parts.push("a heat pump");
  if (wantsSolar) parts.push("solar PV");
  if (wantsBattery) parts.push("a battery");
  if (parts.length === 0) return "energy upgrades";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

interface FormattedSlot {
  dayLabel: string;
  timeLabel: string;
  longDateLabel: string;
}

function formatSlot(utcIso: string): FormattedSlot {
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
  const longDateLabel = `${dayLabel} at ${timeLabel}`;
  return { dayLabel, timeLabel, longDateLabel };
}

export function buildHomeownerEmail(input: HomeownerEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(input.wantsHeatPump, input.wantsSolar, input.wantsBattery);
  const firstName = input.homeownerName.split(" ")[0];
  const slot = input.meetingStartUtc ? formatSlot(input.meetingStartUtc) : null;

  // Subject reflects the new "booked at a specific time" semantics
  // when we have a slot, falls back to the old copy when we don't
  // (lets the legacy callback path keep working until it's removed).
  const subject = slot
    ? `You're booked to meet ${input.installerCompanyName} — ${slot.longDateLabel}`
    : `Your booking with ${input.installerCompanyName} is on its way`;

  const headline = slot
    ? `Hi ${firstName} — you're booked to meet ${input.installerCompanyName}`
    : `Hi ${firstName} — your booking is on its way`;

  // ── Plain text body ─────────────────────────────────────────────────
  const textLines: string[] = [
    `Hi ${firstName},`,
    "",
  ];
  if (slot) {
    textLines.push(
      `You're booked in to meet ${input.installerCompanyName} on ${slot.longDateLabel} (UK time) for a 1-hour site survey.`,
      "",
      "Booking summary:",
      `  Company: ${input.installerCompanyName}`,
      input.propertyAddress ? `  Address for survey: ${input.propertyAddress}` : "",
      `  Date: ${slot.dayLabel}`,
      `  Time: ${slot.timeLabel} (UK time)`,
      `  What you asked about: ${wants}`,
      "",
      "We've also sent a Google Calendar invite. If it doesn't show up, check your spam — it'll come from our bookings calendar.",
    );
  } else {
    textLines.push(
      `Quick confirmation that we've passed your booking through to ${input.installerCompanyName} along with your full pre-survey report.`,
      "",
      `What you've asked them about: ${wants}.`,
      input.propertyAddress ? `For: ${input.propertyAddress}` : "",
    );
  }
  textLines.push(
    "",
    `Need to change or cancel? Contact ${input.installerCompanyName} directly:`,
    input.installerEmail ? `  Email: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Phone: ${input.installerTelephone}` : "",
    input.installerWebsite ? `  Website: ${input.installerWebsite}` : "",
    "",
    "Reminder — get three quotes if you can. Even great installers vary 20–30% in price for the same kit. The Book a site visit tab on your report has more sitting there.",
    "",
    "If you have any issues with this installer, just reply to this email and we'll help.",
    "",
    "— The Propertoasty team",
  );
  const text = textLines.filter((l) => l != null).join("\n");

  // ── HTML body ───────────────────────────────────────────────────────
  const slotBlock = slot
    ? `
      <div style="background:#fef7f3;border:1px solid #fbcec0;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a3a25;margin:0 0 8px;">
          Your booking
        </p>
        <table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#0f172a;width:100%;">
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;width:120px;">Company</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(input.installerCompanyName)}</td>
          </tr>
          ${
            input.propertyAddress
              ? `<tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Address</td>
            <td style="padding:3px 0;">${escapeHtml(input.propertyAddress)}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Date</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(slot.dayLabel)}</td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Time</td>
            <td style="padding:3px 0;font-weight:600;">${escapeHtml(slot.timeLabel)} <span style="font-weight:400;color:#64748b;">(UK time)</span></td>
          </tr>
          <tr>
            <td style="padding:3px 12px 3px 0;color:#64748b;">Discussing</td>
            <td style="padding:3px 0;">${escapeHtml(wants)}</td>
          </tr>
        </table>
      </div>

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 20px;">
        We've also sent a Google Calendar invite to your email — it
        should land separately. If it's not there, check your spam
        folder.
      </p>
    `
    : `
      <div style="background:#f1f5f9;border-radius:10px;padding:18px;margin:0 0 20px;">
        <p style="font-size:14px;line-height:1.6;color:#0f172a;margin:0 0 10px;">
          <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#ef6c4f;color:white;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:8px;vertical-align:middle;">1</span>
          They'll get in touch — usually within a couple of working days.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#0f172a;margin:0 0 10px;">
          <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#ef6c4f;color:white;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:8px;vertical-align:middle;">2</span>
          They'll come round, measure up, and write you a formal quote.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#0f172a;margin:0;">
          <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#ef6c4f;color:white;text-align:center;line-height:24px;font-weight:700;font-size:12px;margin-right:8px;vertical-align:middle;">3</span>
          From there it's up to you. Booking the visit doesn't commit you to anything.
        </p>
      </div>

      <p style="font-size:14px;line-height:1.55;color:#0f172a;margin:0 0 16px;">
        <strong style="color:#0b3140;">What you've asked about:</strong> ${escapeHtml(wants)}.
        ${input.propertyAddress ? `<br><strong style="color:#0b3140;">For:</strong> ${escapeHtml(input.propertyAddress)}` : ""}
      </p>
    `;

  const installerContactBlock = `
      <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 8px;">
          Need to change or cancel?
        </p>
        <p style="font-size:13px;color:#475569;margin:0 0 8px;line-height:1.5;">
          Contact ${escapeHtml(input.installerCompanyName)} directly:
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
      </div>`;

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#10b981;margin:0 0 6px;">
        ${slot ? "Booking confirmed" : "Booking on its way"}
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(headline)}
      </h1>
      ${
        slot
          ? `<p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        On <strong style="color:#0b3140;">${escapeHtml(slot.longDateLabel)}</strong>
        for a 1-hour site survey. Here's what you've booked.
      </p>`
          : `<p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        We've passed your details and your full pre-survey report through
        to <strong style="color:#0b3140;">${escapeHtml(input.installerCompanyName)}</strong>.
        Here's what happens next.
      </p>`
      }

      ${slotBlock}

      ${installerContactBlock}

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        <strong style="color:#0b3140;">A friendly nudge:</strong> get three
        quotes if you can. Even great installers vary 20–30% in price for
        the same kit. The Book a site visit tab on your report has more
        ready when you are.
      </p>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Anything go wrong with this installer — they don't reply, the
        quote feels off, anything — just reply to this email and we'll
        help sort it.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You're getting this because you booked a site visit through Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
