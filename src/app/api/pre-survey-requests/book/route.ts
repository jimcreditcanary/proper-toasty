// Homeowner-side slot-booking endpoint for pre-survey requests.
//
// When the installer's pre-survey email said "site visit NOT booked",
// the homeowner sees a slot picker on their report's Book tab. They
// pick a slot from the installer's availability and POST it here.
//
// Distinct from /api/installer-leads/create because the homeowner
// already has an installer_lead row — auto-created when they hit
// /check?presurvey=<token> and submitted the lead-capture form (or
// auto-fired by the new pre-survey skip-lead-capture path). We just
// need to:
//
//   1. Re-validate the homeowner's right to book (token + request id)
//   2. Insert the installer_meetings row tied to the EXISTING lead
//   3. Stamp installer_pre_survey_requests.meeting_status='booked' +
//      meeting_at so the report's Book tab disappears on next load
//   4. Send the same pending-installer + pending-homeowner emails
//      that /api/installer-leads/create sends after a from-scratch
//      booking — installers get one workflow, regardless of which
//      origin booked the slot.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import { signLeadAckToken, parsePreSurveyToken } from "@/lib/email/tokens";
import { buildPendingInstallerEmail } from "@/lib/email/templates/booking-pending-installer";
import { buildPendingHomeownerEmail } from "@/lib/email/templates/booking-pending-homeowner";
import { LEAD_ACCEPT_COST_CREDITS } from "@/lib/booking/credits";
import { isValidUkMobile } from "@/lib/schemas/booking";

// Mirrors the slice of CreateInstallerLeadRequest we still need —
// just the booking inputs the homeowner controls. Everything else
// (installer id, contact email/name, property, want flags) we read
// off the existing pre-survey request + linked installer_lead.
const PreSurveyBookRequestSchema = z.object({
  preSurveyRequestId: z.string().uuid(),
  homeownerToken: z.string().min(1),
  scheduledAtUtc: z.string().datetime(),
  contactPhone: z
    .string()
    .min(1, "Phone is required")
    .refine(isValidUkMobile, "Enter a valid UK mobile number"),
  notes: z.string().max(2000).nullable().optional(),
});

interface PreSurveyBookResponse {
  ok: boolean;
  error?: string;
  meetingAtUtc?: string;
}

function postcodeArea(postcode: string | null): string | null {
  if (!postcode) return null;
  const m = postcode.trim().toUpperCase().match(/^[A-Z]{1,2}\d[A-Z\d]?/);
  return m ? m[0] : null;
}

function buildAcknowledgeUrl(leadId: string, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? "https://www.propertoasty.com";
  return `${base}/lead/accept?id=${leadId}&token=${token}`;
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = PreSurveyBookRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<PreSurveyBookResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // 1. Token must validate against the request id. We're not auth'd
  //    in this endpoint — the token IS the auth (same trust model
  //    as the /check?presurvey=<token> link).
  const tokenRequestId = parsePreSurveyToken(input.homeownerToken);
  if (!tokenRequestId || tokenRequestId !== input.preSurveyRequestId) {
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "Invalid or expired booking link" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  // 2. Load the request + linked installer_lead. Both must exist;
  //    the request must not already have a booked meeting; the
  //    request must not be expired.
  const { data: request, error: requestError } = await admin
    .from("installer_pre_survey_requests")
    .select(
      "id, installer_id, contact_name, contact_email, contact_postcode, expires_at, completed_at, meeting_status, meeting_at, result_installer_lead_id",
    )
    .eq("id", input.preSurveyRequestId)
    .maybeSingle();

  if (requestError) {
    console.error("[pre-survey-book] request lookup failed", requestError);
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "Database error" },
      { status: 500 },
    );
  }
  if (!request) {
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "Booking link not recognised" },
      { status: 404 },
    );
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "This booking link has expired" },
      { status: 410 },
    );
  }
  if (request.meeting_status === "booked") {
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "A meeting is already booked for this request" },
      { status: 409 },
    );
  }
  if (!request.result_installer_lead_id) {
    return NextResponse.json<PreSurveyBookResponse>(
      {
        ok: false,
        error: "We can't find the lead linked to this request — try again",
      },
      { status: 500 },
    );
  }

  // 3. Pull installer + lead so we have the wants/property info we
  //    need for the meeting row + the pending emails.
  const [installerRes, leadRes] = await Promise.all([
    admin
      .from("installers")
      .select(
        "id, company_name, email, telephone, postcode, meeting_duration_min, travel_buffer_min",
      )
      .eq("id", request.installer_id)
      .maybeSingle(),
    admin
      .from("installer_leads")
      .select(
        "id, contact_email, contact_name, wants_heat_pump, wants_solar, wants_battery, property_address, property_postcode, analysis_snapshot",
      )
      .eq("id", request.result_installer_lead_id)
      .maybeSingle(),
  ]);

  if (installerRes.error || !installerRes.data) {
    console.error("[pre-survey-book] installer lookup failed", installerRes.error);
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "Installer not found" },
      { status: 404 },
    );
  }
  if (leadRes.error || !leadRes.data) {
    console.error("[pre-survey-book] lead lookup failed", leadRes.error);
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "Lead not found" },
      { status: 404 },
    );
  }

  const installer = installerRes.data;
  const lead = leadRes.data;
  const meetingDurationMin = installer.meeting_duration_min ?? 60;
  const travelBufferMin = installer.travel_buffer_min ?? 30;

  // 4. Insert the meeting against the EXISTING installer_lead row.
  //    Status='pending' — same semantics as /api/installer-leads/create:
  //    the slot is held until the installer acknowledges.
  const contactEmail = (lead.contact_email ?? request.contact_email).trim().toLowerCase();
  const contactName = lead.contact_name ?? request.contact_name ?? "Homeowner";

  const { error: meetingError } = await admin
    .from("installer_meetings")
    .insert({
      installer_id: installer.id,
      installer_lead_id: lead.id,
      homeowner_lead_id: null,
      scheduled_at: input.scheduledAtUtc,
      duration_min: meetingDurationMin,
      travel_buffer_min: travelBufferMin,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: input.contactPhone,
      notes: input.notes ?? null,
      status: "pending",
    });
  if (meetingError) {
    console.error("[pre-survey-book] meeting insert failed", meetingError);
    return NextResponse.json<PreSurveyBookResponse>(
      { ok: false, error: "Couldn't save the meeting — try again" },
      { status: 500 },
    );
  }

  // 5. Stamp the request booked. After this the report's Book tab
  //    will hide on next load + the meeting banner appears at the top.
  const { error: stampError } = await admin
    .from("installer_pre_survey_requests")
    .update({
      meeting_status: "booked",
      meeting_at: input.scheduledAtUtc,
    })
    .eq("id", request.id);
  if (stampError) {
    // Non-fatal — the meeting row is the source of truth. Log + carry
    // on so the homeowner doesn't get a confusing failure.
    console.warn("[pre-survey-book] request status stamp failed", stampError);
  }

  // 6. Persist the homeowner's phone onto the lead row so the
  //    installer can call them once they accept. Best-effort.
  await admin
    .from("installer_leads")
    .update({ contact_phone: input.contactPhone })
    .eq("id", lead.id);

  // 7. Build emails. Sign the same lead-ack token /api/installer-
  //    leads/create signs so the installer's "Accept" link works
  //    identically regardless of booking origin.
  let acknowledgeToken: string;
  try {
    acknowledgeToken = signLeadAckToken(lead.id);
  } catch (e) {
    console.warn(
      "[pre-survey-book] ack secret missing — skipping notifications",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json<PreSurveyBookResponse>({
      ok: true,
      meetingAtUtc: input.scheduledAtUtc,
    });
  }
  const acknowledgeUrl = buildAcknowledgeUrl(lead.id, acknowledgeToken);

  // Pull verdict / rating off the snapshot if the lead capture
  // stamped it — same path the installer-create route uses.
  let hpVerdict: string | null = null;
  let solarRating: string | null = null;
  try {
    const snap = lead.analysis_snapshot as
      | { analysis?: { eligibility?: { heatPump?: { verdict?: string }; solar?: { rating?: string } } } }
      | null;
    hpVerdict = snap?.analysis?.eligibility?.heatPump?.verdict ?? null;
    solarRating = snap?.analysis?.eligibility?.solar?.rating ?? null;
  } catch {
    // ignore — analysis_snapshot is optional
  }

  const installerEmail = installer.email
    ? buildPendingInstallerEmail({
        installerCompanyName: installer.company_name,
        propertyPostcodeArea: postcodeArea(
          lead.property_postcode ?? request.contact_postcode ?? null,
        ),
        meetingStartUtc: input.scheduledAtUtc,
        meetingDurationMin,
        travelBufferMin,
        wantsHeatPump: lead.wants_heat_pump ?? false,
        wantsSolar: lead.wants_solar ?? false,
        wantsBattery: lead.wants_battery ?? false,
        hpVerdict,
        solarRating,
        acknowledgeUrl,
        creditCost: LEAD_ACCEPT_COST_CREDITS,
      })
    : null;

  const homeownerEmail = buildPendingHomeownerEmail({
    homeownerName: contactName,
    installerCompanyName: installer.company_name,
    installerEmail: installer.email,
    installerTelephone: installer.telephone,
    propertyAddress: lead.property_address ?? null,
    meetingStartUtc: input.scheduledAtUtc,
    wantsHeatPump: lead.wants_heat_pump ?? false,
    wantsSolar: lead.wants_solar ?? false,
    wantsBattery: lead.wants_battery ?? false,
  });

  // Fire both emails in parallel; log failures but don't fail the
  // booking call — the meeting + status stamp landed already.
  await Promise.all([
    installerEmail && installer.email
      ? sendEmail({
          to: installer.email,
          subject: installerEmail.subject,
          html: installerEmail.html,
          text: installerEmail.text,
          replyTo: contactEmail,
          tags: [
            { name: "kind", value: "booking_pending_installer" },
            { name: "lead_id", value: lead.id },
            { name: "via_pre_survey", value: "true" },
          ],
        }).catch((e: unknown) => {
          console.error("[pre-survey-book] installer email failed", e);
        })
      : Promise.resolve(),
    sendEmail({
      to: contactEmail,
      subject: homeownerEmail.subject,
      html: homeownerEmail.html,
      text: homeownerEmail.text,
      tags: [
        { name: "kind", value: "booking_pending_homeowner" },
        { name: "lead_id", value: lead.id },
        { name: "via_pre_survey", value: "true" },
      ],
    }).catch((e: unknown) => {
      console.error("[pre-survey-book] homeowner email failed", e);
    }),
  ]);

  return NextResponse.json<PreSurveyBookResponse>({
    ok: true,
    meetingAtUtc: input.scheduledAtUtc,
  });
}
