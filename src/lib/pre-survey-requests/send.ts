// Shared "send the email + bookkeeping" helper for both initial
// creation and resends. Keeps the route handlers thin and the
// credit-deduct + email-fire path identical between the two paths.
//
// Returns the persisted result so the route can hand back a
// useful response. On failure, surfaces an error string the route
// can return verbatim.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";
import { buildPreSurveyRequestCustomerEmail } from "@/lib/email/templates/installer-pre-survey-request-customer";
import { resolveInstallerNotifyEmail } from "@/lib/proposals/notify";
import { PRE_SURVEY_REQUEST_COST_CREDITS } from "./schema";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface SendArgs {
  admin: AdminClient;
  user: User;
  installer: {
    id: number;
    company_name: string;
    email: string | null;
    telephone: string | null;
    user_id: string | null;
  };
  request: {
    id: string;
    contact_name: string;
    contact_email: string;
    homeowner_token: string;
  };
  isResend: boolean;
}

export type SendResult =
  | { ok: true; debited: number }
  | { ok: false; status: number; error: string };

/**
 * Atomically debits credits then fires the customer email. If the
 * email send fails outright, refunds the credits via a compensating
 * `add` so the installer isn't out of pocket on a non-delivery.
 *
 * Caller is responsible for any row-level state updates (status,
 * sends_count, last_sent_at) after this returns ok.
 */
export async function chargeAndSend(args: SendArgs): Promise<SendResult> {
  const { admin, user, installer, request, isResend } = args;

  // Credit debit — atomic via the existing deduct_credits RPC. Same
  // pattern as the lead-acceptance flow. If the user doesn't have
  // enough credits, the RPC returns false and we bail before sending.
  const { data: debited, error: debitErr } = await admin.rpc(
    "deduct_credits",
    {
      p_user_id: user.id,
      p_count: PRE_SURVEY_REQUEST_COST_CREDITS,
    },
  );
  if (debitErr || !debited) {
    return {
      ok: false,
      status: 402,
      error:
        debitErr?.message ??
        `Not enough credits — ${PRE_SURVEY_REQUEST_COST_CREDITS} per send. Top up from /installer/credits.`,
    };
  }

  // Reply-to: prefer the company email, fall back to the bound user's
  // auth email so the customer can hit Reply and reach a human.
  const replyToEmail = await resolveInstallerNotifyEmail(admin, installer);

  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
  ).replace(/\/+$/, "");
  const checkUrl = `${appBaseUrl}/check?presurvey=${encodeURIComponent(request.homeowner_token)}`;

  const built = buildPreSurveyRequestCustomerEmail({
    customerName: request.contact_name,
    installerCompanyName: installer.company_name,
    installerEmail: replyToEmail,
    installerTelephone: installer.telephone,
    checkUrl,
    isResend,
  });

  console.info("[pre-survey] sending customer email", {
    requestId: request.id,
    to: request.contact_email,
    replyTo: replyToEmail,
    isResend,
  });

  const sendResult = await sendEmail({
    to: request.contact_email,
    subject: built.subject,
    html: built.html,
    text: built.text,
    replyTo: replyToEmail ?? undefined,
    tags: [
      { name: "kind", value: isResend ? "pre-survey-resend" : "pre-survey-send" },
      { name: "requestId", value: request.id },
      { name: "installerId", value: String(installer.id) },
    ],
  });

  if (!sendResult.ok && !sendResult.skipped) {
    // Refund the credit so we never bill for a non-delivery. This is
    // a direct increment via the users table because there's no
    // "add_credits" RPC; safe because we're the service role.
    const { data: profile } = await admin
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle<{ credits: number }>();
    const newBalance = (profile?.credits ?? 0) + PRE_SURVEY_REQUEST_COST_CREDITS;
    await admin.from("users").update({ credits: newBalance }).eq("id", user.id);
    console.error("[pre-survey] send failed, refunded credit", {
      requestId: request.id,
      error: sendResult.error,
    });
    return {
      ok: false,
      status: 502,
      error: "Email send failed — credit refunded, please try again",
    };
  }

  return { ok: true, debited: PRE_SURVEY_REQUEST_COST_CREDITS };
}
