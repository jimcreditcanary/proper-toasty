// Email sent to an unregistered installer (one in our MCS directory
// but with user_id IS NULL — i.e. they haven't claimed their
// Propertoasty profile yet) when a homeowner opened the booking
// modal for them and found zero diary slots in the next 28 days.
//
// They've never signed up, so this email doubles as our first
// touchpoint: surface the warm lead AND the 30-free-credit signup
// offer. Goal is to convert the curious "huh, a lead?" into "OK I'll
// claim the profile" in a single click.
//
// The CTA goes to /installer-signup?lead=<lead_id>&source=no-slots
// — the signup page pre-fills email + name from the installers row
// and, on completion, lands them on the lead detail page where they
// can hit "Reach out to homeowner".

import { escapeHtml } from "../client";

export interface NoSlotsUnregisteredInstallerEmailInput {
  installerCompanyName: string;
  /** Homeowner display name (may be missing for fully-anonymous flows). */
  homeownerName: string | null;
  /** Property postcode — safest "where" indicator pre-claim. */
  propertyPostcode: string | null;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  /** Absolute URL: /installer-signup?lead=<lead_id>&source=no-slots&id=<installer_id> */
  signupUrl: string;
  /** Starter credits granted on signup completion. Surfaced verbatim
   *  so the marketing claim and the actual award can't drift. */
  starterCredits: number;
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

export function buildNoSlotsUnregisteredInstallerEmail(
  input: NoSlotsUnregisteredInstallerEmailInput,
): { subject: string; html: string; text: string } {
  const subject = "A homeowner wants you to quote them — set up free in 60 seconds";
  const wants = listWants(
    input.wantsHeatPump,
    input.wantsSolar,
    input.wantsBattery,
  );

  const text = [
    `Hi ${input.installerCompanyName},`,
    ``,
    `${input.homeownerName ?? "A homeowner"}${input.propertyPostcode ? ` in ${input.propertyPostcode}` : ""} just picked you on Propertoasty — they want ${wants} and they're ready to talk to an MCS-certified installer.`,
    ``,
    `You're on our directory (sourced from the MCS list) but you haven't claimed your Propertoasty profile yet, so the booking flow can't route them to you.`,
    ``,
    `Set up your account — takes 60 seconds, no card needed — and you'll see their full report + contact details right after. ${input.starterCredits} free credits land in your balance the moment you finish.`,
    ``,
    input.signupUrl,
    ``,
    `Why bother:`,
    `  • The homeowner's already done a full home energy check (EPC, solar, floorplan) — you start the conversation with the report in hand`,
    `  • ${input.starterCredits} starter credits cover ~${Math.floor(input.starterCredits / 5)} accepted booked leads`,
    `  • Reject any lead, one click, no charge — you only pay for accepted booked leads`,
    `  • No subscription, no minimum spend`,
    ``,
    `If you'd rather not, just ignore this email — we won't follow up.`,
    ``,
    `— The Propertoasty team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#faf6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;border:1px solid #e2e8f0;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ef6c4f;margin:0 0 6px;">
        Warm lead waiting
      </p>
      <h1 style="font-size:22px;line-height:1.3;font-weight:700;color:#0b3140;margin:0 0 12px;">
        ${escapeHtml(input.homeownerName ?? "A homeowner")}${input.propertyPostcode ? ` in ${escapeHtml(input.propertyPostcode)}` : ""} wants ${escapeHtml(input.installerCompanyName)} to quote them
      </h1>
      <p style="font-size:15px;line-height:1.55;color:#475569;margin:0 0 18px;">
        They&rsquo;re after <strong>${escapeHtml(wants)}</strong> and they picked you on Propertoasty. You&rsquo;re on our directory (sourced from the MCS list) but you haven&rsquo;t claimed your profile yet, so the booking flow can&rsquo;t route them to you.
      </p>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:18px;margin:0 0 24px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#9a3412;margin:0 0 8px;">
          🎁 Set up free — ${input.starterCredits} starter credits inside
        </p>
        <p style="font-size:13px;color:#9a3412;margin:0;line-height:1.5;">
          60-second signup, no card needed. ${input.starterCredits} credits cover roughly ${Math.floor(input.starterCredits / 5)} accepted booked leads. Reject any lead, one click, no charge.
        </p>
      </div>

      <div style="text-align:center;margin:24px 0 16px;">
        <a href="${escapeHtml(input.signupUrl)}"
           style="display:inline-block;background:#ef6c4f;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:700;font-size:15px;">
          Claim ${escapeHtml(input.installerCompanyName)} →
        </a>
      </div>

      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">
        Right after signup you&rsquo;ll land on the lead&rsquo;s report
        and contact details. Decide whether to reach out — no charge
        unless you accept a booked lead.
      </p>

      <p style="font-size:13px;color:#64748b;line-height:1.55;margin:16px 0 0;">
        Not interested? Ignore this email — we won&rsquo;t follow up.
      </p>
    </div>

    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:16px 0 0;line-height:1.5;">
      You&rsquo;re getting this because ${escapeHtml(input.installerCompanyName)} is on our MCS-sourced directory — a homeowner picked you, but your profile isn&rsquo;t claimed yet.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
