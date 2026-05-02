// Welcome email — fired exactly once when an installer completes
// their MCS-profile claim. The PostHog activation event catches the
// machine-side moment; this email makes sure the human gets a clear
// "you're in, here's what to do next" message.
//
// Tone: friendly + practical. Highlights the 30 free credits up
// front (they probably don't know they got them), then walks through
// the four onboarding steps from the dashboard checklist so the
// email doubles as a getting-started reference.

import { escapeHtml } from "../client";

export interface WelcomeEmailInput {
  firstName: string;
  companyName: string;
  starterCredits: number;
  /** /installer landing — where they should head first. */
  dashboardUrl: string;
}

export function buildInstallerWelcomeEmail(input: WelcomeEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to Propertoasty, ${input.companyName} — ${input.starterCredits} free credits inside`;

  const text = [
    `Hi ${input.firstName},`,
    ``,
    `Welcome to Propertoasty — ${input.companyName} is now claimed and live.`,
    ``,
    `🎁 We've credited you ${input.starterCredits} free starter credits to get going. That's enough for ~${Math.floor(input.starterCredits / 5)} accepted leads OR ${input.starterCredits} pre-survey check links to your customers — your choice.`,
    ``,
    `Four quick things to get the most out of your first week:`,
    ``,
    `1. SET YOUR AVAILABILITY`,
    `   Pick the times you can take site visits. Without this, the directory won't route any leads to you.`,
    ``,
    `2. SEND YOUR FIRST PRE-SURVEY LINK`,
    `   Email a customer of yours a personalised /check link. The completed report comes back into your inbox auto-accepted — no booking dance.`,
    ``,
    `3. ACCEPT YOUR FIRST DIRECTORY LEAD`,
    `   Once availability is set, homeowners doing a check on Propertoasty can pick you. You'll get an email the moment one does.`,
    ``,
    `4. SEND YOUR FIRST QUOTE`,
    `   From any accepted lead, the line-item builder turns the report into a written quote. The homeowner accepts or declines on a tokenised page — no login needed for them.`,
    ``,
    `Open your dashboard:`,
    input.dashboardUrl,
    ``,
    `Anything tricky, just hit reply. We read every email.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">
        Welcome
      </p>
      <h1 style="font-size:24px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(input.firstName)} — ${escapeHtml(input.companyName)} is live on Propertoasty
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 18px;">
        Your MCS profile is claimed, your account&rsquo;s active, and
        your starter credits are sitting in your balance.
      </p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:18px;margin:0 0 24px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9a3412;margin:0 0 8px;">
          🎁 Your starter pack
        </p>
        <p style="font-size:28px;font-weight:800;color:#0b3140;margin:0 0 6px;line-height:1.1;">
          ${input.starterCredits} free credits
        </p>
        <p style="font-size:13px;color:#9a3412;margin:0;line-height:1.5;">
          ≈ ${Math.floor(input.starterCredits / 5)} accepted leads (5 each) <strong>or</strong>
          ${input.starterCredits} pre-survey check links (1 each) <strong>or</strong>
          any mix of the two. Credits never expire.
        </p>
      </div>

      <p style="font-size:14px;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Four quick things to set up:
      </p>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
        ${stepRow("1", "Set your availability", "Pick the times you can take site visits. Without this, the directory won't route leads to you.")}
        ${stepRow("2", "Send your first pre-survey link", "Email a customer their personalised check link. Completed reports come into your inbox auto-accepted.")}
        ${stepRow("3", "Accept your first directory lead", "Homeowners doing a check on Propertoasty can pick you. You'll get an email the moment one does.")}
        ${stepRow("4", "Send your first quote", "From any accepted lead, build a line-item quote. Homeowner accepts or declines on a tokenised page — no login needed.")}
      </table>

      <div style="text-align:center;margin:24px 0 16px;">
        <a href="${escapeHtml(input.dashboardUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">
          Open my dashboard →
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;text-align:center;">
        Anything tricky — installer-claim glitch, missed lead, weird
        quote behaviour — just hit reply. We read every email.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You&rsquo;re getting this because you just claimed
      ${escapeHtml(input.companyName)} on Propertoasty.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

function stepRow(n: string, title: string, body: string): string {
  return `<tr>
    <td style="padding:8px 0;vertical-align:top;width:36px;">
      <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;background:#fef3c7;color:#92400e;border-radius:8px;font-size:12px;font-weight:700;">
        ${escapeHtml(n)}
      </span>
    </td>
    <td style="padding:8px 0 8px 12px;vertical-align:top;">
      <p style="font-size:14px;font-weight:600;color:#0b3140;margin:0 0 4px;">${escapeHtml(title)}</p>
      <p style="font-size:13px;color:#475569;margin:0;line-height:1.5;">${escapeHtml(body)}</p>
    </td>
  </tr>`;
}
