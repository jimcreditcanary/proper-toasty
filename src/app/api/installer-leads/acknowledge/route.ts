import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLeadAckToken } from "@/lib/email/tokens";
import {
  sendEmail,
  type SendEmailAttachment,
  type SendEmailResult,
} from "@/lib/email/client";
import { buildHomeownerEmail } from "@/lib/email/templates/booking-homeowner";
import { buildInstallerEmail } from "@/lib/email/templates/booking-installer";
import {
  insertHomeownerEvent,
  insertInstallerEvent,
  type CalendarResult,
} from "@/lib/google/calendar";
import { buildIcs, icsToBase64 } from "@/lib/email/ics";
import type { Database } from "@/types/database";

const FROM_EMAIL =
  process.env.EMAIL_FROM_ADDRESS ?? "bookings@propertoasty.com";

// POST /api/installer-leads/acknowledge
//   form fields: lead=<uuid>, token=<hmac>
//
// POST-only since PR C3.1: corporate email security scanners
// (Outlook / Defender / Mimecast) GET every URL in incoming email
// to scan for malware. With a GET endpoint here, the prefetch
// auto-accepted leads before the installer's inbox even rendered.
// The /lead/accept page is the GET-side: it shows a summary + an
// "Accept this lead" button that POSTs to this route. Form
// submission isn't something email scanners do.
//
// Flow on POST:
//   1. Verify the HMAC token (rejects tampered links)
//   2. Update lead status → 'visit_booked'
//   3. Update meeting status → 'booked' (slot now confirmed)
//   4. Insert two Google Calendar events (homeowner 1hr +
//      installer-with-buffer)
//   5. Send the confirmed-flavour emails to both parties
//   6. Redirect to /lead/accepted?state=ok
//
// Idempotent — re-submitting the form on an already-accepted lead
// returns ok without re-inserting events or re-sending emails.
//
// Verbose [ack] logging through the post-accept fan-out so missing
// calendar invites are traceable in Vercel logs.

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
  return `/lead/accepted?state=${state}`;
}

/**
 * Read both form-encoded and JSON bodies — we accept the standard
 * HTML form submit from /lead/accept, plus JSON if a future internal
 * caller wants the same endpoint.
 */
async function readBody(
  req: Request,
): Promise<{ leadId: string | null; token: string | null }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const json = (await req.json()) as { lead?: string; token?: string };
      return { leadId: json.lead ?? null, token: json.token ?? null };
    } catch {
      return { leadId: null, token: null };
    }
  }
  // Default to form-encoded (the /lead/accept page POSTs this).
  try {
    const form = await req.formData();
    return {
      leadId: typeof form.get("lead") === "string" ? (form.get("lead") as string) : null,
      token:
        typeof form.get("token") === "string" ? (form.get("token") as string) : null,
    };
  } catch {
    return { leadId: null, token: null };
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const { leadId, token } = await readBody(req);

  if (!leadId || !token) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url), 303);
  }
  if (!verifyLeadAckToken(leadId, token)) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url), 303);
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
    return NextResponse.redirect(new URL(landingUrl("error"), url), 303);
  }
  if (!lead) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url), 303);
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
    return NextResponse.redirect(new URL(landingUrl("error"), url), 303);
  }
  const meeting = meetingResult.data;
  const installer = installerResult.data;
  if (!installer) {
    console.error("[ack] installer row missing for lead", { leadId });
    return NextResponse.redirect(new URL(landingUrl("error"), url), 303);
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
    return NextResponse.redirect(new URL(landingUrl("ok"), url), 303);
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
    return NextResponse.redirect(new URL(landingUrl("error"), url), 303);
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

  // Build ICS attachments for both confirmed emails. The homeowner
  // gets a 1hr event, the installer gets a 2hr block (1hr meeting +
  // travel buffers either side). Each ICS file gets a stable UID so
  // updates / cancellations later can supersede the right event.
  const wantsList = listWants(
    lead.wants_heat_pump,
    lead.wants_solar,
    lead.wants_battery,
  );

  const homeownerIcsAttachment: SendEmailAttachment | null = meeting
    ? buildHomeownerIcsAttachment({
        leadId,
        meeting,
        installerName: installer.company_name,
        installerEmail: installer.email,
        homeownerName: lead.contact_name ?? "Homeowner",
        homeownerEmail: lead.contact_email,
        propertyAddress: lead.property_address,
        wantsList,
      })
    : null;

  const installerIcsAttachment: SendEmailAttachment | null =
    meeting && installer.email
      ? buildInstallerIcsAttachment({
          leadId,
          meeting,
          installerName: installer.company_name,
          installerEmail: installer.email,
          homeownerName: lead.contact_name ?? "Homeowner",
          homeownerEmail: lead.contact_email,
          homeownerPhone: lead.contact_phone ?? "",
          propertyAddress: lead.property_address,
          propertyPostcode: lead.property_postcode,
          wantsList,
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
          attachments: homeownerIcsAttachment ? [homeownerIcsAttachment] : undefined,
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
          attachments: installerIcsAttachment ? [installerIcsAttachment] : undefined,
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

  return NextResponse.redirect(new URL(landingUrl("ok"), url), 303);
}

// ─── ICS helpers ────────────────────────────────────────────────────────

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

function buildHomeownerIcsAttachment(args: {
  leadId: string;
  meeting: { id: string; scheduled_at: string; duration_min: number };
  installerName: string;
  installerEmail: string | null;
  homeownerName: string;
  homeownerEmail: string;
  propertyAddress: string | null;
  wantsList: string;
}): SendEmailAttachment {
  const start = new Date(args.meeting.scheduled_at);
  const end = new Date(start.getTime() + args.meeting.duration_min * 60_000);
  const description = [
    `Site survey with ${args.installerName} for ${args.wantsList}.`,
    "",
    "How to get the best out of your installer:",
    "• Have your last energy bill handy — they'll want recent kWh figures.",
    "• Walk them through every room they'll work in (loft / garage / cupboards).",
    "• Ask them to flag anything that surprised them about your property.",
    "",
    "Things to bring up:",
    "• MCS certification number on the quote.",
    "• Warranty length on labour AND kit (5+ years labour, 7+ on kit).",
    "• Specific make + model — never accept a vague \"a 5 kW system\" line.",
    "• Whether they handle DNO notification + planning permission.",
    args.installerEmail ? `\nNeed to change or cancel? Email ${args.installerEmail}.` : "",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const ics = buildIcs({
    uid: `lead-${args.leadId}-homeowner@propertoasty.com`,
    startUtc: start,
    endUtc: end,
    summary: `Site survey with ${args.installerName}`,
    description,
    location: args.propertyAddress,
    organiserEmail: FROM_EMAIL,
    organiserName: "Propertoasty",
    attendeeEmail: args.homeownerEmail,
    attendeeName: args.homeownerName,
  });

  return {
    name: "site-survey.ics",
    contentBase64: icsToBase64(ics),
    contentType: "text/calendar; method=REQUEST; charset=utf-8",
  };
}

function buildInstallerIcsAttachment(args: {
  leadId: string;
  meeting: {
    id: string;
    scheduled_at: string;
    duration_min: number;
    travel_buffer_min: number;
  };
  installerName: string;
  installerEmail: string;
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
  propertyAddress: string | null;
  propertyPostcode: string | null;
  wantsList: string;
}): SendEmailAttachment {
  const meetingStart = new Date(args.meeting.scheduled_at);
  const start = new Date(
    meetingStart.getTime() - args.meeting.travel_buffer_min * 60_000,
  );
  const end = new Date(
    meetingStart.getTime() +
      (args.meeting.duration_min + args.meeting.travel_buffer_min) * 60_000,
  );
  const description = [
    `Site survey for ${args.wantsList} via Propertoasty.`,
    `${args.meeting.duration_min}-min visit + ${args.meeting.travel_buffer_min}-min travel buffer either side (this event covers the full block).`,
    "",
    "Homeowner contact:",
    `  Name: ${args.homeownerName}`,
    `  Email: ${args.homeownerEmail}`,
    `  Phone: ${args.homeownerPhone}`,
    "",
    args.propertyAddress ? `Address: ${args.propertyAddress}` : "",
    args.propertyPostcode && !args.propertyAddress
      ? `Postcode: ${args.propertyPostcode}`
      : "",
  ]
    .filter((l) => l !== null && l !== "")
    .join("\n");

  const ics = buildIcs({
    uid: `lead-${args.leadId}-installer@propertoasty.com`,
    startUtc: start,
    endUtc: end,
    summary: `Site survey: ${args.homeownerName}${args.propertyPostcode ? ` (${args.propertyPostcode})` : ""}`,
    description,
    location: args.propertyAddress ?? args.propertyPostcode,
    organiserEmail: FROM_EMAIL,
    organiserName: "Propertoasty",
    attendeeEmail: args.installerEmail,
    attendeeName: args.installerName,
  });

  return {
    name: "site-survey.ics",
    contentBase64: icsToBase64(ics),
    contentType: "text/calendar; method=REQUEST; charset=utf-8",
  };
}
