// Email sent to a customer when their installer fires a pre-survey
// request via /installer/pre-survey-requests.
//
// Tone: friendly + helpful + low-pressure. The installer (someone
// the customer probably already knows or has been chatting with)
// is sending them a personalised link to a free home energy check —
// it's not a cold outreach and shouldn't read like one.
//
// Reply-to is set to the installer's email so any "what's this for"
// reply lands directly with them.

import { escapeHtml } from "../client";

export interface PreSurveyRequestCustomerEmailInput {
  customerName: string;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  // Personalised /check link with the prefill token attached
  checkUrl: string;
  // Whether this is the first send or a re-send (slightly different
  // copy so the customer doesn't think they're getting spammed)
  isResend: boolean;
}

export function buildPreSurveyRequestCustomerEmail(
  input: PreSurveyRequestCustomerEmailInput,
): { subject: string; html: string; text: string } {
  const firstName = (input.customerName ?? "").split(" ")[0] || "there";
  const subject = input.isResend
    ? `Reminder — your free home energy check from ${input.installerCompanyName}`
    : `${input.installerCompanyName} sent you a quick home energy check`;

  const text = [
    `Hi ${firstName},`,
    ``,
    input.isResend
      ? `Just a nudge — ${input.installerCompanyName} sent you a personalised home energy check the other day. Takes about 5 minutes and tells you whether your home is suited to a heat pump, solar PV, or battery — plus rough costs and grants you'd qualify for.`
      : `${input.installerCompanyName} would like you to run a quick home energy check before they put a quote together. It takes about 5 minutes and shows you whether your home is suited to a heat pump, solar PV, or battery — plus rough costs and grants you'd qualify for.`,
    ``,
    `It's free to you — ${input.installerCompanyName} covers it.`,
    ``,
    `Start the check here:`,
    input.checkUrl,
    ``,
    `When you finish, ${input.installerCompanyName} gets a copy of the report so they can prep your quote. They'll be in touch directly.`,
    ``,
    `Got questions?`,
    input.installerEmail ? `  Email ${input.installerCompanyName}: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Call ${input.installerCompanyName}: ${input.installerTelephone}` : "",
    ``,
    `Or just reply to this email — your reply lands with them.`,
    ``,
    `— The Propertoasty team`,
  ]
    .filter((l) => l != null && l !== "")
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">
        ${input.isResend ? "Reminder" : "Personalised home check"}
      </p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — ${escapeHtml(input.installerCompanyName)} sent you a free home energy check
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 18px;">
        ${
          input.isResend
            ? `Just a friendly nudge — your installer would like you to run a quick check so they can prep your quote.`
            : `Before ${escapeHtml(input.installerCompanyName)} puts a quote together, they'd like you to run a quick check on your home. Takes about 5 minutes.`
        }
      </p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:0 0 20px;">
        <p style="font-size:13px;color:#9a3412;margin:0 0 6px;font-weight:600;">
          What you'll see at the end:
        </p>
        <ul style="font-size:13px;color:#9a3412;margin:0;padding-left:18px;line-height:1.7;">
          <li>Whether your home suits a heat pump, solar PV, or battery</li>
          <li>Rough costs + which grants you'd qualify for</li>
          <li>A report you can keep + share</li>
        </ul>
      </div>

      <div style="text-align:center;margin:24px 0 12px;">
        <a href="${escapeHtml(input.checkUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">
          Start the 5-minute check →
        </a>
      </div>
      <p style="font-size:12px;color:#64748b;text-align:center;margin:0 0 20px;">
        It's free to you — ${escapeHtml(input.installerCompanyName)} covers it.
      </p>

      <p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 16px;">
        When you finish, ${escapeHtml(input.installerCompanyName)} gets
        a copy of the report so they can put together a quote with the
        right kit + grants. They&rsquo;ll be in touch directly after that.
      </p>

      ${
        input.installerEmail || input.installerTelephone
          ? `<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:0 0 16px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin:0 0 8px;">
          Got questions about the kit or quote?
        </p>
        <p style="font-size:13px;color:#475569;margin:0 0 8px;line-height:1.5;">
          Reach ${escapeHtml(input.installerCompanyName)} directly:
        </p>
        ${
          input.installerEmail
            ? `<p style="font-size:13px;color:#0f172a;margin:0 0 4px;">📧 <a href="mailto:${escapeHtml(input.installerEmail)}" style="color:#ef6c4f;text-decoration:none;">${escapeHtml(input.installerEmail)}</a></p>`
            : ""
        }
        ${
          input.installerTelephone
            ? `<p style="font-size:13px;color:#0f172a;margin:0;">📞 <a href="tel:${escapeHtml(input.installerTelephone)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(input.installerTelephone)}</a></p>`
            : ""
        }
      </div>`
          : ""
      }

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Anything off — link doesn&rsquo;t work, you weren&rsquo;t
        expecting this — just reply to this email and we&rsquo;ll
        sort it.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You&rsquo;re getting this because ${escapeHtml(input.installerCompanyName)} sent you a personalised home energy check via Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
