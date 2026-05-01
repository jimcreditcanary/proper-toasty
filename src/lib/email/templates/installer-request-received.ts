// "We got your request" ack — sent immediately when a user submits
// the F3 installer signup request form. Sets the expectation: a
// human will look at this within a working day.

import { escapeHtml } from "../client";

export interface RequestReceivedEmailInput {
  contactName: string;
  companyName: string;
}

export function buildRequestReceivedEmail(input: RequestReceivedEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.contactName.split(" ")[0] || "there";
  const subject = `Got your Propertoasty request — ${input.companyName}`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Thanks for asking to join the Propertoasty installer directory under ${input.companyName}.`,
    ``,
    `What happens next:`,
    `  - One of us will look at your details within a working day.`,
    `  - If we need anything else (MCS reference, certification proof) we'll reply directly to this email.`,
    `  - Once approved, we'll send you a link to set a password and start receiving leads.`,
    ``,
    `If you didn't make this request, just ignore this email — nothing happens until we approve.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#a16207;margin:0 0 6px;">
        Request received
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — we&rsquo;ve got your request
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        Thanks for asking to join the Propertoasty installer
        directory under <strong style="color:#0b3140;">${escapeHtml(input.companyName)}</strong>.
        We&rsquo;ll come back to you within a working day.
      </p>

      <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:13px;font-weight:600;color:#0b3140;margin:0 0 8px;">
          What happens next
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • One of us will look at your details within a working day.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • If we need any extra evidence (MCS certificate, BUS reference, etc.) we&rsquo;ll reply directly to this email.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0;">
          • Once approved, we&rsquo;ll send you a link to set a password and start receiving leads.
        </p>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Didn&rsquo;t make this request? Just ignore this email — nothing
        happens until we approve.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent because you submitted a Propertoasty directory request.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
