// POST /api/v1/pre-survey-requests
//
// Programmatic equivalent of the /installer/pre-survey-requests
// form. Lets installers POST a customer's name + email + postcode
// from their CRM, charge 1 credit, and have the personalised
// /check link emailed to the customer.
//
// Auth: Bearer api-key (or X-API-Key header). The key is bound to
// a single installer; we never let one installer's key send leads
// attributed to another.
//
// Body:
//   {
//     "contact_name":  "Sam Patel",
//     "contact_email": "sam@example.com",
//     "contact_postcode": "SW1A 1AA"   // optional
//   }
//
// Returns 200:
//   { ok: true, id, status, credits_charged }
//
// Errors:
//   401  bad / missing API key
//   402  insufficient credits
//   403  API key not linked to an installer profile
//   400  validation
//   502  Postmark send failed (credit refunded)

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authenticateInstallerApiKey } from "@/lib/api-auth";
import { buildPreSurveyToken } from "@/lib/email/tokens";
import { createPreSurveyRequestSchema } from "@/lib/pre-survey-requests/schema";
import { chargeAndSend } from "@/lib/pre-survey-requests/send";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const auth = await authenticateInstallerApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPreSurveyRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid request body",
        // Include the full issue list so a CRM-side integration can
        // surface multiple validation errors at once.
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const id = randomUUID();
  const homeownerToken = buildPreSurveyToken(id);

  // Insert the row first so we have a stable id to reference in
  // logs + the eventual /api/leads/capture attribution path.
  const { data: inserted, error: insertErr } = await auth.admin
    .from("installer_pre_survey_requests")
    .insert({
      id,
      installer_id: auth.installer.id,
      contact_name: parsed.data.contact_name.trim(),
      contact_email: parsed.data.contact_email.trim().toLowerCase(),
      contact_postcode: parsed.data.contact_postcode,
      homeowner_token: homeownerToken,
    })
    .select("id, contact_name, contact_email, homeowner_token, status")
    .single();
  if (insertErr || !inserted) {
    console.error("[v1/pre-survey] insert failed", insertErr);
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
    admin: auth.admin,
    user: auth.user,
    installer: auth.installer,
    request: {
      id: inserted.id,
      contact_name: inserted.contact_name,
      contact_email: inserted.contact_email,
      homeowner_token: inserted.homeowner_token,
    },
    isResend: false,
    source: "api",
  });
  if (!send.ok) {
    // Drop the row so a 402 / 502 leaves the installer's list
    // clean — no half-state "tried to send but failed" entries.
    await auth.admin
      .from("installer_pre_survey_requests")
      .delete()
      .eq("id", inserted.id);
    return NextResponse.json({ error: send.error }, { status: send.status });
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    status: inserted.status,
    credits_charged: send.debited,
  });
}
