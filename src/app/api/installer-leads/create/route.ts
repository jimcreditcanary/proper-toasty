import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateInstallerLeadRequestSchema,
  type CreateInstallerLeadResponse,
} from "@/lib/schemas/installers";
import { sendEmail, type SendEmailResult } from "@/lib/email/client";
import { signLeadAckToken } from "@/lib/email/tokens";
import { buildInstallerEmail } from "@/lib/email/templates/booking-installer";
import { buildHomeownerEmail } from "@/lib/email/templates/booking-homeowner";
import type { Database } from "@/types/database";

// POST /api/installer-leads/create
//
// Captures a "book a site visit" submission from the report tab.
// Inserts into public.installer_leads, then fires two emails:
//   1. To the installer — full details + magic-link "I'll take this lead"
//   2. To the homeowner — confirmation that we've passed it along
//
// Email failures don't fail the request — the lead is captured either
// way, just marked notification_status='failed' / 'skipped' for the
// admin team to chase manually.

export const runtime = "nodejs";
export const maxDuration = 30; // emails add latency

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
  return `${normalised.replace(/\/+$/, "")}/installer/acknowledge?lead=${encodeURIComponent(leadId)}&token=${encodeURIComponent(token)}`;
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
  // Both failed — distinguish "skipped" (provider not set up) from
  // "failed" (provider returned an error).
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
  const admin = createAdminClient();

  // 1. Verify the installer exists + pull contact + name for the email.
  const { data: installer, error: lookupError } = await admin
    .from("installers")
    .select(
      "id, company_name, email, telephone, website, postcode, county",
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

  // 2. Insert the lead with a placeholder ack token (we sign it once we
  // have the row's id, then update). status='new' lifecycle, notification
  // status defaults to 'pending'. If the booking modal supplied a
  // `meeting` envelope (slot was picked) we set status='visit_booked'
  // and write the timestamp to visit_booked_for so the lead row
  // reflects the scheduled state from the start.
  const hasMeeting = input.meeting != null;
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
      status: hasMeeting ? "visit_booked" : "new",
      visit_booked_for: hasMeeting ? input.meeting!.scheduledAtUtc : null,
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

  // 2a. If a slot was chosen, also write a row into installer_meetings.
  // We don't fail the whole request if this errors — the lead's already
  // saved with visit_booked_for set, so the admin team can chase via
  // that. Logged so we notice if it's a recurring problem.
  if (hasMeeting && input.meeting) {
    const { error: meetingError } = await admin
      .from("installer_meetings")
      .insert({
        installer_id: input.installerId,
        installer_lead_id: inserted.id,
        homeowner_lead_id: input.homeownerLeadId ?? null,
        scheduled_at: input.meeting.scheduledAtUtc,
        duration_min: input.meeting.durationMin,
        travel_buffer_min: input.meeting.travelBufferMin,
        contact_name: input.contactName ?? "Homeowner",
        contact_email: input.contactEmail.trim().toLowerCase(),
        contact_phone: input.contactPhone,
        notes: input.notes ?? null,
        status: "booked",
      });
    if (meetingError) {
      console.error(
        "[installer-leads] meeting insert failed (lead saved without it)",
        meetingError,
      );
    }
  }

  // 3. Sign the ack token + build the URL, then fire both emails in parallel.
  let acknowledgeToken: string;
  try {
    acknowledgeToken = signLeadAckToken(inserted.id);
  } catch (e) {
    // INSTALLER_LEAD_ACK_SECRET not set — skip notifications entirely
    // and mark the lead so admin can chase manually. The booking is
    // already saved, so we still return ok=true to the user.
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

  const reportFacts = extractReportFacts(input.analysisSnapshot);

  const installerEmail = installer.email
    ? buildInstallerEmail({
        installerCompanyName: installer.company_name,
        homeownerName: input.contactName ?? "A homeowner",
        homeownerEmail: input.contactEmail.trim(),
        homeownerPhone: input.contactPhone ?? null,
        preferredContactMethod: input.preferredContactMethod ?? null,
        preferredContactWindow: input.preferredContactWindow ?? null,
        notes: input.notes ?? null,
        propertyAddress: input.propertyAddress ?? null,
        propertyPostcode: input.propertyPostcode ?? null,
        wantsHeatPump: input.wantsHeatPump,
        wantsSolar: input.wantsSolar,
        wantsBattery: input.wantsBattery,
        hpVerdict: reportFacts.hpVerdict,
        hpGrantGbp: reportFacts.hpGrantGbp,
        hpSystemKw: reportFacts.hpSystemKw,
        solarRating: reportFacts.solarRating,
        solarKwp: reportFacts.solarKwp,
        acknowledgeUrl,
      })
    : null;

  const homeownerEmail = buildHomeownerEmail({
    homeownerName: input.contactName ?? "there",
    installerCompanyName: installer.company_name,
    installerEmail: installer.email,
    installerTelephone: installer.telephone,
    installerWebsite: installer.website,
    propertyAddress: input.propertyAddress ?? null,
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
            { name: "kind", value: "booking_installer" },
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
        { name: "kind", value: "booking_homeowner" },
        { name: "lead_id", value: inserted.id },
      ],
    }),
  ]);

  // 4. Persist notification outcome + token. If the installer email went,
  // also bump the lifecycle status to sent_to_installer.
  const notificationStatus = deriveNotificationStatus(
    installerResult,
    homeownerResult,
  );
  const lifecycleStatus =
    installerResult.ok ? "sent_to_installer" : "new";
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
