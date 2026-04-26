// Confirmation email sent to the homeowner after they book a site visit.
//
// Lightweight — just confirms what they did and tells them what to expect.
// No CTAs (they're already on our site).

import { escapeHtml } from "../resend";

export interface HomeownerEmailInput {
  homeownerName: string;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  installerWebsite: string | null;
  // Property
  propertyAddress: string | null;
  // What they asked about
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
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

export function buildHomeownerEmail(input: HomeownerEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const wants = listWants(input.wantsHeatPump, input.wantsSolar, input.wantsBattery);
  const firstName = input.homeownerName.split(" ")[0];

  const subject = `Your booking with ${input.installerCompanyName} is on its way`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Quick confirmation that we've passed your booking through to ${input.installerCompanyName} along with your full pre-survey report.`,
    ``,
    `What happens next:`,
    `  1. They'll get in touch (usually within a couple of working days) to arrange a time to come round.`,
    `  2. They'll measure up, confirm what you've already seen on the report, and put together a formal quote.`,
    `  3. From there it's up to you — you're not committed to anything by booking the visit.`,
    ``,
    `What you've asked them about: ${wants}.`,
    input.propertyAddress ? `For: ${input.propertyAddress}` : "",
    ``,
    `Their contact details if you need them:`,
    `  ${input.installerCompanyName}`,
    input.installerEmail ? `  Email: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Phone: ${input.installerTelephone}` : "",
    input.installerWebsite ? `  Website: ${input.installerWebsite}` : "",
    ``,
    `Reminder — get three quotes if you can. Even great installers vary 20–30% in price for the same kit. The Book a site visit tab on your report has more sitting there.`,
    ``,
    `If you have any issues with this installer, just reply to this email and we'll help.`,
    ``,
    `— The Propertoasty team`,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#10b981;margin:0 0 6px;">
        Booking confirmed
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — your booking is on its way
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        We've passed your details and your full pre-survey report through
        to <strong style="color:#0b3140;">${escapeHtml(input.installerCompanyName)}</strong>.
        Here's what happens next.
      </p>

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

      <div style="background:#fef7f3;border:1px solid #fbcec0;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a3a25;margin:0 0 8px;">
          ${escapeHtml(input.installerCompanyName)}
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
      </div>

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        <strong style="color:#0b3140;">A friendly nudge:</strong> get three
        quotes if you can. Even great installers vary 20–30% in price for
        the same kit. The Book a site visit tab on your report has more
        ready when you are.
      </p>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        If anything goes wrong with this installer — they don't reply, the
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
