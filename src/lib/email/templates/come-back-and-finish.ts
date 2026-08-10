// Exit-intent recovery email.
//
// Sent from POST /api/leads/exit-intent when a homeowner submits
// their email + postcode via the homepage exit-intent modal but
// hasn't completed the wizard. Body invites them back with a
// direct link that pre-fills the postcode so they only have one
// address pick + one questionnaire between them and the report.
//
// Deliberately NOT a promotional email — this is transactional
// (they just asked us for their savings estimate). PECR + UK GDPR
// treat it as fine without a marketing opt-in.

import { escapeHtml } from "../client";

export interface ComeBackAndFinishInput {
  /** Fully-qualified URL like https://www.propertoasty.com/check?postcode=BS3+4AA
   *  — the wizard's context.tsx picks up prefillPostcode from the query
   *  and auto-searches the address on mount. */
  resumeUrl: string;
  /** Optional — used to personalise the greeting. Falls back to "there". */
  recipientName: string | null;
  /** Optional — used in the address line. */
  postcode: string | null;
}

export function buildComeBackAndFinishEmail(input: ComeBackAndFinishInput): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = input.recipientName?.split(" ")[0] ?? "there";
  const postcodeLine = input.postcode
    ? `for ${input.postcode.toUpperCase()}`
    : "for your home";
  const subject = `Your savings estimate ${postcodeLine} — pick up where you left off`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `You started a Propertoasty check ${postcodeLine} but didn't quite finish.`,
    ``,
    `We only ask a couple of quick questions — tenure, current heating fuel — and then we run the numbers on heat pump savings, solar payback, and the current UK grants you qualify for.`,
    ``,
    `Pick up where you left off:`,
    input.resumeUrl,
    ``,
    `Takes about a minute. No account needed.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#2C5E4A;margin:0 0 6px;">Pick up where you left off</p>
      <h1 style="font-size:22px;line-height:1.25;font-weight:700;color:#0b3140;margin:0 0 12px;">
        Hi ${escapeHtml(firstName)} — your savings estimate is one minute away
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 16px;">
        You started a Propertoasty check ${escapeHtml(postcodeLine)} but didn&rsquo;t quite finish. Two quick questions is all that&rsquo;s between you and the numbers on:
      </p>
      <ul style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 20px;padding-left:20px;">
        <li>Heat pump savings vs your current bills</li>
        <li>Solar payback and roof yield</li>
        <li>Current UK grants you qualify for</li>
      </ul>
      <div style="margin:24px 0;text-align:center;">
        <a href="${escapeHtml(input.resumeUrl)}" style="display:inline-block;background:#2C5E4A;color:#ffffff;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px;text-decoration:none;">
          Finish my check
        </a>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:0;">
        Takes about a minute. No account needed. We won&rsquo;t email you again unless you complete the check and ask us to.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You gave us your email at propertoasty.com. Not you? Ignore this and we&rsquo;ll wipe the record within 30 days.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
