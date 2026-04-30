import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLeadAckToken } from "@/lib/email/tokens";
import { sendEmail, type SendEmailResult } from "@/lib/email/client";
import { buildHomeownerEmail } from "@/lib/email/templates/booking-homeowner";
import { buildInstallerEmail } from "@/lib/email/templates/booking-installer";
import {
  insertHomeownerEvent,
  insertInstallerEvent,
  type CalendarResult,
} from "@/lib/google/calendar";
import type { Database } from "@/types/database";

// GET /api/installer-leads/acknowledge?lead=<uuid>&token=<hmac>
//
// New flow (PR C3): when the installer clicks "Accept this lead" in
// their pending-installer email, we:
//
//   1. Verify the HMAC token (rejects tampered links)
//   2. Update lead status → 'visit_booked' (skipping the
//      installer_acknowledged middle state — they're equivalent now)
//   3. Update meeting status → 'booked' (releasing the slot from
//      "pending" to "confirmed")
//   4. Insert two Google Calendar events (homeowner 1hr +
//      installer-with-buffer)
//   5. Send the confirmed-flavour emails to both parties
//   6. Redirect to /installer/acknowledge?state=ok
//
// Idempotent — clicking twice flips already-booked rows to themselves
// and skips the calendar/email fan-out (we detect it via existing
// google_event_id on the meeting row).
//
// Verbose logging via [ack] prefix so the post-accept fan-out is
// traceable in Vercel logs (we previously had to guess what fired
// when the homeowner reported missing invites).

export const runtime = "nodejs";
export const maxDuration = 60;

type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];
type MeetingRow = Database["public"]["Tables"]["installer_meetings"]["Row"];
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

function landingUrl(state: "ok" | "invalid" | "expired" | "error" | "already"): string {
  return `/installer/acknowledge?state=${state}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const leadId = url.searchParams.get("lead");
  const token = url.searchParams.get("token");

  if (!leadId || !token) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url));
  }
  if (!verifyLeadAckToken(leadId, token)) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url));
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Look up the lead. We need its analysis_snapshot for the
  // confirmed-installer email's pre-survey insights, plus the contact
  // details we'll surface in the email + calendar event.
  const { data: lead, error: leadErr } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, status, contact_name, contact_email, contact_phone, " +
        "property_address, property_postcode, " +
        "wants_heat_pump, wants_solar, wants_battery, notes, analysis_snapshot",
    )
    .eq("id", leadId)
    .maybeSingle<
      Pick<
        LeadRow,
        | "id"
        | "installer_id"
        | "status"
        | "contact_name"
        | "contact_email"
        | "contact_phone"
        | "property_address"
        | "property_postcode"
        | "wants_heat_pump"
        | "wants_solar"
        | "wants_battery"
        | "notes"
        | "analysis_snapshot"
      >
    >();

  if (leadErr) {
    console.error("[ack] lead lookup failed", leadErr);
    return NextResponse.redirect(new URL(landingUrl("error"), url));
  }
  if (!lead) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url));
  }

  // 2. Look up the matching meeting + installer in parallel.
  const [meetingResult, installerResult] = await Promise.all([
    admin
      .from("installer_meetings")
      .select(
        "id, scheduled_at, duration_min, travel_buffer_min, status, google_event_id, google_installer_event_id",
      )
      .eq("installer_lead_id", leadId)
      .maybeSingle<
        Pick<
          MeetingRow,
          | "id"
          | "scheduled_at"
          | "duration_min"
          | "travel_buffer_min"
          | "status"
          | "google_event_id"
          | "google_installer_event_id"
        >
      >(),
    admin
      .from("installers")
      .select("id, company_name, email, telephone, website, postcode")
      .eq("id", lead.installer_id)
      .maybeSingle<
        Pick<
          InstallerRow,
          "id" | "company_name" | "email" | "telephone" | "website" | "postcode"
        >
      >(),
  ]);

  if (meetingResult.error) {
    console.error("[ack] meeting lookup failed", meetingResult.error);
  }
  if (installerResult.error) {
    console.error("[ack] installer lookup failed", installerResult.error);
    return NextResponse.redirect(new URL(landingUrl("error"), url));
  }
  const meeting = meetingResult.data;
  const installer = installerResult.data;
  if (!installer) {
    console.error("[ack] installer row missing for lead", { leadId });
    return NextResponse.redirect(new URL(landingUrl("error"), url));
  }

  // 3. If we've already fired the calendar invites for this meeting,
  // re-clicking the link is a no-op — bump the timestamp so we know
  // they came back, but don't double-send invites or emails.
  const alreadyAccepted =
    meeting?.status === "booked" &&
    (meeting.google_event_id != null ||
      meeting.google_installer_event_id != null);

  if (alreadyAccepted) {
    console.log("[ack] already accepted — idempotent re-click", {
      leadId,
      meetingId: meeting?.id,
    });
    await admin
      .from("installer_leads")
      .update({ acknowledge_clicked_at: now })
      .eq("id", leadId);
    return NextResponse.redirect(new URL(landingUrl("ok"), url));
  }

  // 4. Flip lead → visit_booked + meeting → booked.
  const { error: leadUpdateErr } = await admin
    .from("installer_leads")
    .update({
      acknowledge_clicked_at: now,
      installer_acknowledged_at: now,
      status: "visit_booked",
      visit_booked_for: meeting?.scheduled_at ?? null,
    })
    .eq("id", leadId);
  if (leadUpdateErr) {
    console.error("[ack] lead status update failed", leadUpdateErr);
    return NextResponse.redirect(new URL(landingUrl("error"), url));
  }

  if (meeting) {
    const { error: meetingUpdateErr } = await admin
      .from("installer_meetings")
      .update({ status: "booked" })
      .eq("id", meeting.id);
    if (meetingUpdateErr) {
      console.error("[ack] meeting status update failed", meetingUpdateErr);
    }
  } else {
    console.warn(
      "[ack] no meeting row found for lead — calendar invites cannot fire",
      { leadId },
    );
  }

  // 5. Calendar invites + confirmed emails. Skip calendar if no
  // meeting row (legacy edge case). Verbose logging so missing
  // invites are easy to diagnose in Vercel logs.
  const reportFacts = extractReportFacts(lead.analysis_snapshot);

  const skippedCalendar: CalendarResult = {
    ok: false,
    skipped: true,
    reason: "no meeting row",
  };

  let homeownerCalendarResult: CalendarResult = skippedCalendar;
  let installerCalendarResult: CalendarResult = skippedCalendar;

  if (meeting) {
    console.log("[ack] firing calendar inserts", {
      leadId,
      meetingId: meeting.id,
      scheduledAt: meeting.scheduled_at,
      hasInstallerEmail: Boolean(installer.email),
    });

    const [hRes, iRes] = await Promise.all([
      insertHomeownerEvent({
        meetingStartUtc: meeting.scheduled_at,
        meetingDurationMin: meeting.duration_min,
        homeownerEmail: lead.contact_email,
        homeownerName: lead.contact_name ?? "Homeowner",
        installerCompanyName: installer.company_name,
        installerEmail: installer.email,
        installerTelephone: installer.telephone,
        propertyAddress: lead.property_address,
        propertyPostcode: lead.property_postcode,
        wantsHeatPump: lead.wants_heat_pump,
        wantsSolar: lead.wants_solar,
        wantsBattery: lead.wants_battery,
      }),
      installer.email
        ? insertInstallerEvent({
            meetingStartUtc: meeting.scheduled_at,
            meetingDurationMin: meeting.duration_min,
            travelBufferMin: meeting.travel_buffer_min,
            installerEmail: installer.email,
            installerCompanyName: installer.company_name,
            homeownerName: lead.contact_name ?? "Homeowner",
            homeownerEmail: lead.contact_email,
            homeownerPhone: lead.contact_phone ?? "",
            propertyAddress: lead.property_address,
            propertyPostcode: lead.property_postcode,
            wantsHeatPump: lead.wants_heat_pump,
            wantsSolar: lead.wants_solar,
            wantsBattery: lead.wants_battery,
          })
        : Promise.resolve<CalendarResult>({
            ok: false,
            skipped: true,
            reason: "installer has no email on file",
          }),
    ]);
    homeownerCalendarResult = hRes;
    installerCalendarResult = iRes;

    console.log("[ack] calendar results", {
      homeowner: homeownerCalendarResult.ok
        ? { ok: true, eventId: homeownerCalendarResult.eventId }
        : { ok: false, ...("skipped" in homeownerCalendarResult && homeownerCalendarResult.skipped ? { skipped: true, reason: homeownerCalendarResult.reason } : { error: "error" in homeownerCalendarResult ? homeownerCalendarResult.error : "unknown" }) },
      installer: installerCalendarResult.ok
        ? { ok: true, eventId: installerCalendarResult.eventId }
        : { ok: false, ...("skipped" in installerCalendarResult && installerCalendarResult.skipped ? { skipped: true, reason: installerCalendarResult.reason } : { error: "error" in installerCalendarResult ? installerCalendarResult.error : "unknown" }) },
    });

    if (homeownerCalendarResult.ok || installerCalendarResult.ok) {
      const { error: calUpdateErr } = await admin
        .from("installer_meetings")
        .update({
          google_event_id: homeownerCalendarResult.ok
            ? homeownerCalendarResult.eventId
            : null,
          google_installer_event_id: installerCalendarResult.ok
            ? installerCalendarResult.eventId
            : null,
          google_calendar_id: process.env.GOOGLE_CALENDAR_ID ?? null,
          invite_sent_at: now,
        })
        .eq("id", meeting.id);
      if (calUpdateErr) {
        console.error("[ack] meeting calendar id update failed", calUpdateErr);
      }
    }
  }

  // 6. Confirmed emails to both parties.
  const homeownerEmail = meeting
    ? buildHomeownerEmail({
        homeownerName: lead.contact_name ?? "there",
        installerCompanyName: installer.company_name,
        installerEmail: installer.email,
        installerTelephone: installer.telephone,
        installerWebsite: installer.website,
        propertyAddress: lead.property_address,
        meetingStartUtc: meeting.scheduled_at,
        meetingDurationMin: meeting.duration_min,
        wantsHeatPump: lead.wants_heat_pump,
        wantsSolar: lead.wants_solar,
        wantsBattery: lead.wants_battery,
      })
    : null;

  const installerEmail =
    meeting && installer.email
      ? buildInstallerEmail({
          installerCompanyName: installer.company_name,
          homeownerName: lead.contact_name ?? "Homeowner",
          homeownerEmail: lead.contact_email,
          homeownerPhone: lead.contact_phone ?? null,
          notes: lead.notes,
          propertyAddress: lead.property_address,
          propertyPostcode: lead.property_postcode,
          meetingStartUtc: meeting.scheduled_at,
          meetingDurationMin: meeting.duration_min,
          travelBufferMin: meeting.travel_buffer_min,
          wantsHeatPump: lead.wants_heat_pump,
          wantsSolar: lead.wants_solar,
          wantsBattery: lead.wants_battery,
          hpVerdict: reportFacts.hpVerdict,
          hpGrantGbp: reportFacts.hpGrantGbp,
          hpSystemKw: reportFacts.hpSystemKw,
          solarRating: reportFacts.solarRating,
          solarKwp: reportFacts.solarKwp,
        })
      : null;

  const [homeownerEmailResult, installerEmailResult] = await Promise.all([
    homeownerEmail
      ? sendEmail({
          to: lead.contact_email,
          subject: homeownerEmail.subject,
          html: homeownerEmail.html,
          text: homeownerEmail.text,
          tags: [
            { name: "kind", value: "booking_confirmed_homeowner" },
            { name: "lead_id", value: leadId },
          ],
        })
      : Promise.resolve<SendEmailResult>({
          ok: false,
          skipped: true,
          reason: "no meeting row",
        }),
    installerEmail && installer.email
      ? sendEmail({
          to: installer.email,
          subject: installerEmail.subject,
          html: installerEmail.html,
          text: installerEmail.text,
          replyTo: lead.contact_email,
          tags: [
            { name: "kind", value: "booking_confirmed_installer" },
            { name: "lead_id", value: leadId },
          ],
        })
      : Promise.resolve<SendEmailResult>({
          ok: false,
          skipped: true,
          reason: "no installer email on file",
        }),
  ]);

  console.log("[ack] confirmed email results", {
    homeowner: homeownerEmailResult.ok
      ? { ok: true, id: homeownerEmailResult.id }
      : "skipped" in homeownerEmailResult && homeownerEmailResult.skipped
        ? { skipped: true, reason: homeownerEmailResult.reason }
        : "error" in homeownerEmailResult
          ? { error: homeownerEmailResult.error }
          : { error: "unknown" },
    installer: installerEmailResult.ok
      ? { ok: true, id: installerEmailResult.id }
      : "skipped" in installerEmailResult && installerEmailResult.skipped
        ? { skipped: true, reason: installerEmailResult.reason }
        : "error" in installerEmailResult
          ? { error: installerEmailResult.error }
          : { error: "unknown" },
  });

  return NextResponse.redirect(new URL(landingUrl("ok"), url));
}
