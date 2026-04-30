import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateInstallerLeadRequestSchema,
  type CreateInstallerLeadResponse,
} from "@/lib/schemas/installers";
import { sendEmail, type SendEmailResult } from "@/lib/email/client";
import { signLeadAckToken } from "@/lib/email/tokens";
import { buildPendingInstallerEmail } from "@/lib/email/templates/booking-pending-installer";
import { buildPendingHomeownerEmail } from "@/lib/email/templates/booking-pending-homeowner";
import { LEAD_ACCEPT_COST_CREDITS } from "@/lib/booking/credits";
import type { Database } from "@/types/database";

// POST /api/installer-leads/create
//
// Captures a "book a site visit" submission from the report tab.
// New flow (PR C3 — credit-gated booking):
//
//   1. Insert installer_leads row (status = 'new')
//   2. Insert installer_meetings row (status = 'pending') — holds the
//      slot but doesn't fire calendar invites yet
//   3. Send the homeowner a "request pending" email — sets the
//      "we'll email you when they confirm" expectation
//   4. Send the installer a "new lead" notification with bare-minimum
//      info (postcode area, tech, slot) + magic-link "Accept this
//      lead" CTA. Full contact details are unlocked on accept.
//
// Calendar invites + the confirmed emails fire from
// /api/installer-leads/acknowledge once the installer accepts.
// 24h auto-release + reminder email are scheduled cron work (next PR).
//
// All side-effects fail soft — the lead row is captured even if every
// notification fails. Notification failures are logged + persisted to
// the lead row so admin can chase manually.

export const runtime = "nodejs";
export const maxDuration = 30; // emails

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface ReportFacts {
  hpVerdict: string | null;
  hpGrantGbp: number | null;
  hpSystemKw: number | null;
  solarRating: string | null;
  solarKwp: number | null;
}

function extractReportFacts(snapshot: unknown): ReportFacts {
  const empty: ReportFacts = {
    hpVerdict: null,
    hpGrantGbp: null,
    hpSystemKw: null,
    solarRating: null,
    solarKwp: null,
  };
  if (!snapshot || typeof snapshot !== "object") return empty;
  const snap = snapshot as Record<string, unknown>;
  const analysis = snap.analysis as Record<string, unknown> | undefined;
  if (!analysis) return empty;
  const eligibility = analysis.eligibility as Record<string, unknown> | undefined;
  if (!eligibility) return empty;
  const hp = eligibility.heatPump as Record<string, unknown> | undefined;
  const solar = eligibility.solar as Record<string, unknown> | undefined;
  return {
    hpVerdict: typeof hp?.verdict === "string" ? hp.verdict : null,
    hpGrantGbp: typeof hp?.estimatedGrantGBP === "number" ? hp.estimatedGrantGBP : null,
    hpSystemKw:
      typeof hp?.recommendedSystemKW === "number" ? hp.recommendedSystemKW : null,
    solarRating: typeof solar?.rating === "string" ? solar.rating : null,
    solarKwp:
      typeof solar?.recommendedKWp === "number" ? solar.recommendedKWp : null,
  };
}

function buildAcknowledgeUrl(leadId: string, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://propertoasty.com";
  // VERCEL_URL omits the protocol — add it.
  const normalised = base.startsWith("http") ? base : `https://${base}`;
  // Point at the /lead/accept confirmation page — NOT the API
  // endpoint directly. The page renders a summary + an "Accept" button
  // that POSTs to /api/installer-leads/acknowledge. This dodges the
  // email-scanner prefetch problem: corporate gateways (Outlook,
  // Defender, Mimecast) GET every URL in incoming email to scan it,
  // which auto-accepted leads when the API was on GET. Email scanners
  // don't submit forms, so the lead stays pending until a human
  // clicks the button.
  return `${normalised.replace(/\/+$/, "")}/lead/accept?lead=${encodeURIComponent(leadId)}&token=${encodeURIComponent(token)}`;
}

// Truncate a postcode to its outward code ("SW1A 1AA" → "SW1A") for
// the area-only display in the pending-installer email — preserves
// privacy until the installer accepts.
function postcodeArea(postcode: string | null): string | null {
  if (!postcode) return null;
  const trimmed = postcode.trim().toUpperCase();
  if (trimmed.length === 0) return null;
  // Outward code is everything before the first space.
  const outward = trimmed.split(/\s+/)[0];
  return outward.length > 0 ? outward : null;
}

function deriveNotificationStatus(
  installerResult: SendEmailResult,
  homeownerResult: SendEmailResult,
):
  | "sent"
  | "installer_only"
  | "homeowner_only"
  | "failed"
  | "skipped" {
  const installerOk = installerResult.ok;
  const homeownerOk = homeownerResult.ok;
  if (installerOk && homeownerOk) return "sent";
  if (installerOk && !homeownerOk) return "installer_only";
  if (!installerOk && homeownerOk) return "homeowner_only";
  const bothSkipped =
    !installerResult.ok &&
    "skipped" in installerResult &&
    installerResult.skipped &&
    !homeownerResult.ok &&
    "skipped" in homeownerResult &&
    homeownerResult.skipped;
  return bothSkipped ? "skipped" : "failed";
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = CreateInstallerLeadRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<CreateInstallerLeadResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (!input.meeting) {
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "A meeting slot must be picked before booking" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // 1. Verify the installer exists + pull contact + visit settings.
  const { data: installer, error: lookupError } = await admin
    .from("installers")
    .select(
      "id, company_name, email, telephone, website, postcode, county, meeting_duration_min, travel_buffer_min",
    )
    .eq("id", input.installerId)
    .maybeSingle<
      Pick<
        InstallerRow,
        | "id"
        | "company_name"
        | "email"
        | "telephone"
        | "website"
        | "postcode"
        | "county"
        | "meeting_duration_min"
        | "travel_buffer_min"
      >
    >();
  if (lookupError) {
    console.error("[installer-leads] lookup failed", lookupError);
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Database error" },
      { status: 500 },
    );
  }
  if (!installer) {
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Installer not found" },
      { status: 404 },
    );
  }

  const meetingDurationMin = installer.meeting_duration_min ?? 60;
  const travelBufferMin = installer.travel_buffer_min ?? 30;

  // 2. Insert the lead row (status starts at 'new'; bumps to
  // 'sent_to_installer' once the notification email goes through).
  // visit_booked_for is left null for now — only set on accept.
  const { data: inserted, error: insertError } = await admin
    .from("installer_leads")
    .insert({
      installer_id: input.installerId,
      homeowner_lead_id: input.homeownerLeadId ?? null,
      contact_email: input.contactEmail.trim().toLowerCase(),
      contact_name: input.contactName ?? null,
      contact_phone: input.contactPhone ?? null,
      preferred_contact_method: input.preferredContactMethod ?? null,
      preferred_contact_window: input.preferredContactWindow ?? null,
      notes: input.notes ?? null,
      wants_heat_pump: input.wantsHeatPump,
      wants_solar: input.wantsSolar,
      wants_battery: input.wantsBattery,
      property_address: input.propertyAddress ?? null,
      property_postcode: input.propertyPostcode ?? null,
      property_uprn: input.propertyUprn ?? null,
      property_latitude: input.propertyLatitude ?? null,
      property_longitude: input.propertyLongitude ?? null,
      analysis_snapshot: (input.analysisSnapshot ?? null) as never,
      status: "new",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[installer-leads] insert failed", insertError);
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Could not save your booking" },
      { status: 500 },
    );
  }

  // 3. Insert the meeting row at status='pending'. Slot is held while
  // we wait for the installer to accept. Duration + buffer come from
  // the installer's record (config in PR I2), not the client payload.
  const { error: meetingError } = await admin
    .from("installer_meetings")
    .insert({
      installer_id: input.installerId,
      installer_lead_id: inserted.id,
      homeowner_lead_id: input.homeownerLeadId ?? null,
      scheduled_at: input.meeting.scheduledAtUtc,
      duration_min: meetingDurationMin,
      travel_buffer_min: travelBufferMin,
      contact_name: input.contactName ?? "Homeowner",
      contact_email: input.contactEmail.trim().toLowerCase(),
      contact_phone: input.contactPhone,
      notes: input.notes ?? null,
      status: "pending",
    });
  if (meetingError) {
    console.error(
      "[installer-leads] meeting insert failed (lead saved without it)",
      meetingError,
    );
  }

  // 4. Sign the ack token + build the URL.
  let acknowledgeToken: string;
  try {
    acknowledgeToken = signLeadAckToken(inserted.id);
  } catch (e) {
    console.warn(
      "[installer-leads] ack secret missing — skipping notifications:",
      e instanceof Error ? e.message : e,
    );
    await admin
      .from("installer_leads")
      .update({
        notification_status: "skipped",
        notification_error:
          "INSTALLER_LEAD_ACK_SECRET not configured — manual relay required",
        notification_attempted_at: new Date().toISOString(),
      })
      .eq("id", inserted.id);
    return NextResponse.json<CreateInstallerLeadResponse>({
      ok: true,
      id: inserted.id,
    });
  }
  const acknowledgeUrl = buildAcknowledgeUrl(inserted.id, acknowledgeToken);

  // 5. Build emails. PENDING flavour for both — confirmed flavour
  // fires from the acknowledge route once the installer accepts.
  const reportFacts = extractReportFacts(input.analysisSnapshot);

  const installerEmail = installer.email
    ? buildPendingInstallerEmail({
        installerCompanyName: installer.company_name,
        propertyPostcodeArea: postcodeArea(input.propertyPostcode ?? null),
        meetingStartUtc: input.meeting.scheduledAtUtc,
        meetingDurationMin,
        travelBufferMin,
        wantsHeatPump: input.wantsHeatPump,
        wantsSolar: input.wantsSolar,
        wantsBattery: input.wantsBattery,
        hpVerdict: reportFacts.hpVerdict,
        solarRating: reportFacts.solarRating,
        acknowledgeUrl,
        creditCost: LEAD_ACCEPT_COST_CREDITS,
      })
    : null;

  const homeownerEmail = buildPendingHomeownerEmail({
    homeownerName: input.contactName ?? "there",
    installerCompanyName: installer.company_name,
    installerEmail: installer.email,
    installerTelephone: installer.telephone,
    propertyAddress: input.propertyAddress ?? null,
    meetingStartUtc: input.meeting.scheduledAtUtc,
    wantsHeatPump: input.wantsHeatPump,
    wantsSolar: input.wantsSolar,
    wantsBattery: input.wantsBattery,
  });

  const [installerResult, homeownerResult] = await Promise.all([
    installerEmail && installer.email
      ? sendEmail({
          to: installer.email,
          subject: installerEmail.subject,
          html: installerEmail.html,
          text: installerEmail.text,
          replyTo: input.contactEmail.trim(),
          tags: [
            { name: "kind", value: "booking_pending_installer" },
            { name: "lead_id", value: inserted.id },
          ],
        })
      : Promise.resolve<SendEmailResult>({
          ok: false,
          skipped: true,
          reason: "Installer has no email on file",
        }),
    sendEmail({
      to: input.contactEmail.trim(),
      subject: homeownerEmail.subject,
      html: homeownerEmail.html,
      text: homeownerEmail.text,
      tags: [
        { name: "kind", value: "booking_pending_homeowner" },
        { name: "lead_id", value: inserted.id },
      ],
    }),
  ]);

  // 6. Persist notification outcome + token.
  const notificationStatus = deriveNotificationStatus(
    installerResult,
    homeownerResult,
  );
  const lifecycleStatus = installerResult.ok ? "sent_to_installer" : "new";
  const installerError =
    installerResult.ok || ("skipped" in installerResult && installerResult.skipped)
      ? null
      : "error" in installerResult
        ? installerResult.error
        : null;
  const homeownerError =
    homeownerResult.ok || ("skipped" in homeownerResult && homeownerResult.skipped)
      ? null
      : "error" in homeownerResult
        ? homeownerResult.error
        : null;
  const errorSummary =
    [installerError, homeownerError].filter(Boolean).join(" | ") || null;

  await admin
    .from("installer_leads")
    .update({
      notification_status: notificationStatus,
      notification_error: errorSummary,
      notification_attempted_at: new Date().toISOString(),
      installer_email_id: installerResult.ok ? installerResult.id : null,
      homeowner_email_id: homeownerResult.ok ? homeownerResult.id : null,
      acknowledge_token: acknowledgeToken,
      status: lifecycleStatus,
      installer_notified_at: installerResult.ok ? new Date().toISOString() : null,
    })
    .eq("id", inserted.id);

  return NextResponse.json<CreateInstallerLeadResponse>({
    ok: true,
    id: inserted.id,
  });
}
