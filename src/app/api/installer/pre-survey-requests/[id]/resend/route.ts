// /api/installer/pre-survey-requests/[id]/resend
//
//   POST — re-send the customer email for an existing request,
//          debit another credit, bump sends_count + last_sent_at.
//
// Auth: signed in + bound to an installer that owns the request.
//
// Cooling-off: rejects if last_sent_at is within
// PRE_SURVEY_RESEND_COOLOFF_HOURS — protects against accidental
// double-billing.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRE_SURVEY_RESEND_COOLOFF_HOURS,
  PRE_SURVEY_REQUEST_COST_CREDITS,
} from "@/lib/pre-survey-requests/schema";
import { chargeAndSend } from "@/lib/pre-survey-requests/send";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  // ?force=true bypasses the 72h cooling-off. The UI offers it as a
  // "send anyway" link when the standard resend is blocked, so the
  // installer who knows their customer is just slow to check email
  // can push a second send through.
  const force = new URL(req.url).searchParams.get("force") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name, email, telephone, user_id")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: number;
      company_name: string;
      email: string | null;
      telephone: string | null;
      user_id: string | null;
    }>();
  if (!installer) {
    return NextResponse.json(
      { error: "Installer profile not linked" },
      { status: 403 },
    );
  }

  const { data: request } = await admin
    .from("installer_pre_survey_requests")
    .select(
      "id, installer_id, status, contact_name, contact_email, homeowner_token, sends_count, last_sent_at, total_credits_charged, expires_at, completed_at",
    )
    .eq("id", id)
    .eq("installer_id", installer.id)
    .maybeSingle();
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (request.completed_at) {
    return NextResponse.json(
      { error: "This customer already completed their check — no need to resend" },
      { status: 409 },
    );
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Request expired — create a fresh one for this customer" },
      { status: 410 },
    );
  }

  // Cooling-off check — skipped when ?force=true.
  if (!force) {
    const hoursSinceLastSend =
      (Date.now() - new Date(request.last_sent_at).getTime()) /
      (1000 * 60 * 60);
    if (hoursSinceLastSend < PRE_SURVEY_RESEND_COOLOFF_HOURS) {
      const hoursLeft = Math.ceil(
        PRE_SURVEY_RESEND_COOLOFF_HOURS - hoursSinceLastSend,
      );
      return NextResponse.json(
        {
          error: `Last reminder went out under ${PRE_SURVEY_RESEND_COOLOFF_HOURS} hours ago. Try again in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} — or click 'Send anyway' to override.`,
          coolOffActive: true,
        },
        { status: 429 },
      );
    }
  }

  const send = await chargeAndSend({
    admin,
    user,
    installer,
    request: {
      id: request.id,
      contact_name: request.contact_name,
      contact_email: request.contact_email,
      homeowner_token: request.homeowner_token,
    },
    isResend: true,
    source: "ui",
  });
  if (!send.ok) {
    return NextResponse.json({ error: send.error }, { status: send.status });
  }

  // Bump bookkeeping. Don't touch status — if it was 'clicked',
  // resend keeps it 'clicked' (the original click still counts).
  await admin
    .from("installer_pre_survey_requests")
    .update({
      sends_count: request.sends_count + 1,
      last_sent_at: new Date().toISOString(),
      total_credits_charged:
        request.total_credits_charged + PRE_SURVEY_REQUEST_COST_CREDITS,
    })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    sends: request.sends_count + 1,
    creditsCharged: send.debited,
  });
}
