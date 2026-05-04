// /api/installer/pre-survey-requests
//
//   POST — create a new pre-survey request, debit 1 credit, email
//          the customer the personalised /check link.
//
// Auth: signed in + bound to an installer record.
//
// Validation: name + email required, postcode optional. We do not
// enforce uniqueness on (installer, email) because the same
// installer might legitimately want to chase the same customer
// (e.g. they're quoting two properties for them) — resend handles
// the "I sent the same person twice by accident" case via the 72h
// cooling-off.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPreSurveyToken } from "@/lib/email/tokens";
import { createPreSurveyRequestSchema } from "@/lib/pre-survey-requests/schema";
import { chargeAndSend } from "@/lib/pre-survey-requests/send";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createPreSurveyRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
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
      { error: "Installer profile not linked to this account" },
      { status: 403 },
    );
  }

  // Mint id + token up-front so we can persist + email in any order.
  const id = randomUUID();
  const homeownerToken = buildPreSurveyToken(id);

  // Insert with status 'pending'. Credit gets debited inside
  // chargeAndSend; we only commit the row if the send goes out.
  // Order of operations:
  //   1. Insert row
  //   2. Charge + email
  //   3. If charge/email fails, delete the row (or leave with error?)
  // We prefer to keep the row as a paper trail of "tried but
  // failed" rather than delete — easier to debug. But the row never
  // becomes visible to the homeowner in that case (token is unused).
  const { data: inserted, error: insertErr } = await admin
    .from("installer_pre_survey_requests")
    .insert({
      id,
      installer_id: installer.id,
      contact_name: parsed.data.contact_name.trim(),
      contact_email: parsed.data.contact_email.trim().toLowerCase(),
      contact_postcode: parsed.data.contact_postcode,
      homeowner_token: homeownerToken,
      meeting_status: parsed.data.meeting_status,
      meeting_at: parsed.data.meeting_at ?? null,
    })
    .select("id, contact_name, contact_email, homeowner_token")
    .single();
  if (insertErr || !inserted) {
    console.error("[pre-survey] insert failed", insertErr);
    // Surface the underlying cause so missing-migration / FK / RLS
    // failures are diagnosable from the browser without having to
    // grep the server logs. Code helps narrow it down (e.g. 42P01 =
    // table doesn't exist, 23503 = FK violation).
    const code = insertErr?.code ? ` [${insertErr.code}]` : "";
    return NextResponse.json(
      {
        error: insertErr?.message
          ? `Could not save the request${code}: ${insertErr.message}`
          : "Could not save the request",
      },
      { status: 500 },
    );
  }

  const send = await chargeAndSend({
    admin,
    user,
    installer,
    request: {
      id: inserted.id,
      contact_name: inserted.contact_name,
      contact_email: inserted.contact_email,
      homeowner_token: inserted.homeowner_token,
    },
    isResend: false,
    source: "ui",
  });
  if (!send.ok) {
    // Delete the row if the very first send failed — installer
    // shouldn't see a "send failed" entry in their list with no
    // way to retry the initial mint.
    await admin
      .from("installer_pre_survey_requests")
      .delete()
      .eq("id", inserted.id);
    return NextResponse.json({ error: send.error }, { status: send.status });
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    creditsCharged: send.debited,
  });
}
