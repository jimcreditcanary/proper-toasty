// "Your request is approved — claim your profile" — sent when an
// admin approves a /installer-signup/request submission and a real
// installers row gets created. Drops the user back into the F2
// claim flow at /installer-signup?id=<new_id>.

import { escapeHtml } from "../client";

export interface RequestApprovedEmailInput {
  contactName: string;
  companyName: string;
  claimUrl: string; // /installer-signup?id=<new_id>
  adminNote: string | null;
}

export function buildRequestApprovedEmail(input: RequestApprovedEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.contactName.split(" ")[0] || "there";
  const subject = `${input.companyName} — you're in. Claim your Propertoasty profile`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Good news — we've approved ${input.companyName} for the Propertoasty installer directory.`,
    ``,
    `Claim your profile here (set a password, then you're ready to take leads):`,
    `  ${input.claimUrl}`,
    ``,
    input.adminNote
      ? `One note from us: ${input.adminNote}`
      : "",
    `What happens once you're in:`,
    `  - Set your password.`,
    `  - Buy a starter pack of credits (each accepted lead costs 5).`,
    `  - Set your visit availability so homeowners can book directly.`,
    `  - Wait for the first lead to land in your inbox.`,
    ``,
    `— The Propertoasty team`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#10b981;margin:0 0 6px;">
        Approved
      </p>
      <h1 style="font-size:22px;line-height:1.2;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(input.companyName)} — you&rsquo;re in
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 20px;">
        Hi ${escapeHtml(firstName)} — we&rsquo;ve approved your request
        to join the Propertoasty installer directory. Claim your
        profile, set a password, and you&rsquo;re ready to take leads.
      </p>

      <a href="${escapeHtml(input.claimUrl)}"
         style="display:inline-block;background:#ef6c4f;color:#ffffff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;text-decoration:none;margin:0 0 20px;">
        Claim your profile →
      </a>

      ${
        input.adminNote
          ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:0 0 20px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#92400e;margin:0 0 6px;">
          A note from us
        </p>
        <p style="font-size:14px;color:#78350f;margin:0;line-height:1.5;">
          ${escapeHtml(input.adminNote)}
        </p>
      </div>`
          : ""
      }

      <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:13px;font-weight:600;color:#0b3140;margin:0 0 8px;">
          What happens once you&rsquo;re in
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • Set your password and confirm your details.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • Buy a starter pack of credits (each accepted lead costs 5).
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0 0 6px;">
          • Set your visit availability so homeowners can book directly.
        </p>
        <p style="font-size:13px;color:#475569;line-height:1.55;margin:0;">
          • Wait for the first lead to land in your inbox.
        </p>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Stuck on the link or got questions? Just hit reply.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      Sent because we approved your Propertoasty directory request.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
