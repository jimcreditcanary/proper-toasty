// "We can't approve this request" — sent when an admin rejects a
// /installer-signup/request submission. Always includes the admin's
// reason so the user knows what happened.
//
// Tone: polite, factual, no shaming. Could be a typo or a missing
// MCS cert; reply goes to the team.

import { escapeHtml } from "../client";

export interface RequestRejectedEmailInput {
  contactName: string;
  companyName: string;
  adminNote: string | null;
}

export function buildRequestRejectedEmail(input: RequestRejectedEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.contactName.split(" ")[0] || "there";
  const subject = `Re: your Propertoasty directory request`;

  const reason =
    input.adminNote ??
    "We weren't able to verify your MCS certification or approve the request right now.";

  const text = [
    `Hi ${firstName},`,
    ``,
    `We've had a look at your request to join the Propertoasty installer directory under ${input.companyName}, and unfortunately we can't approve it at this stage.`,
    ``,
    `Reason: ${reason}`,
    ``,
    `Want to try again? Just reply to this email with anything that helps clear up the issue (MCS certificate, BUS confirmation, recent invoices, etc.) and we'll take another look.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#94a3b8;margin:0 0 6px;">
        Request reviewed
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — we can&rsquo;t approve this one yet
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 16px;">
        We&rsquo;ve had a look at your request for
        <strong style="color:#0b3140;">${escapeHtml(input.companyName)}</strong>
        and unfortunately we can&rsquo;t approve it right now.
      </p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#991b1b;margin:0 0 6px;">
          Reason
        </p>
        <p style="font-size:14px;color:#7f1d1d;margin:0;line-height:1.5;">
          ${escapeHtml(reason)}
        </p>
      </div>

      <p style="font-size:14px;color:#475569;line-height:1.55;margin:0 0 16px;">
        Want to try again? Just reply to this email with anything
        that helps clear up the issue — MCS certificate, BUS
        confirmation, recent invoices, anything you&rsquo;ve got. We&rsquo;ll
        take another look.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent in response to your Propertoasty directory request.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
