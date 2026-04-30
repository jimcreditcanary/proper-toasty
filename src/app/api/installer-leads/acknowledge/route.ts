import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLeadAckToken, buildReportToken } from "@/lib/email/tokens";
import {
  sendEmail,
  type SendEmailAttachment,
  type SendEmailResult,
} from "@/lib/email/client";
import { buildHomeownerEmail } from "@/lib/email/templates/booking-homeowner";
import { buildInstallerEmail } from "@/lib/email/templates/booking-installer";
import { buildReschedulingHomeownerEmail } from "@/lib/email/templates/booking-rescheduling-homeowner";
import { buildDeclinedHomeownerEmail } from "@/lib/email/templates/booking-declined-homeowner";
import { buildIcs, icsToBase64 } from "@/lib/email/ics";
import { LEAD_ACCEPT_COST_CREDITS } from "@/lib/booking/credits";
import { findNearby } from "@/lib/services/installers";
import type { Database } from "@/types/database";

const FROM_EMAIL =
  process.env.EMAIL_FROM_ADDRESS ?? "bookings@propertoasty.com";

// Decline email's "X installers nearby" stat — radius the homeowner
// is offered alternatives within.
const DECLINE_NEARBY_RADIUS_MILES = 10;
const DECLINE_NEARBY_RADIUS_KM = DECLINE_NEARBY_RADIUS_MILES * 1.609344;

// POST /api/installer-leads/acknowledge
//   form fields: lead, token, action ∈ {accept | reschedule | decline}
//
// PR-C3.2: split single-action endpoint into three. All three are
// reachable without login — the HMAC token is the auth, and we
// identify the installer's user (for credit attribution) via email
// match between installers.email and users.email.
//
//   action=accept     — book the slot. Calendar invite + confirmed
//                        emails fire. Debits LEAD_ACCEPT_COST_CREDITS.
//   action=reschedule — installer takes the lead but can't make the
//                        slot. Meeting → cancelled (slot freed).
//                        Debits credits. Homeowner gets a "they took
//                        it but want to pick a new time" email with
//                        the installer's contact details.
//   action=decline    — installer doesn't want the lead. Meeting →
//                        cancelled (slot freed). NO credit debit.
//                        Homeowner gets a "they couldn't take it,
//                        here are X other installers" email.
//
// Race-condition CAS pattern (status=pending → booked / cancelled in
// a single UPDATE … WHERE) prevents double-fanout from concurrent
// submits. Idempotent on re-click.

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

function landingUrl(
  state: "ok" | "reschedule" | "invalid" | "expired" | "error" | "declined",
): string {
  return `/lead/accepted?state=${state}`;
}

function backToAcceptUrl(leadId: string, token: string): string {
  return `/lead/accept?lead=${encodeURIComponent(leadId)}&token=${encodeURIComponent(token)}`;
}

interface ParsedBody {
  leadId: string | null;
  token: string | null;
  action: "accept" | "reschedule" | "decline";
}

async function readBody(req: Request): Promise<ParsedBody> {
  const contentType = req.headers.get("content-type") ?? "";
  let leadId: string | null = null;
  let token: string | null = null;
  let actionRaw = "accept";

  if (contentType.includes("application/json")) {
    try {
      const json = (await req.json()) as {
        lead?: string;
        token?: string;
        action?: string;
      };
      leadId = json.lead ?? null;
      token = json.token ?? null;
      actionRaw = json.action ?? "accept";
    } catch {
      /* fall through */
    }
  } else {
    try {
      const form = await req.formData();
      const v = (k: string) => {
        const x = form.get(k);
        return typeof x === "string" ? x : null;
      };
      leadId = v("lead");
      token = v("token");
      actionRaw = v("action") ?? "accept";
    } catch {
      /* fall through */
    }
  }

  const action: "accept" | "reschedule" | "decline" =
    actionRaw === "reschedule" || actionRaw === "decline"
      ? actionRaw
      : "accept";
  return { leadId, token, action };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const { leadId, token, action } = await readBody(req);

  if (!leadId || !token) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url), 303);
  }
  if (!verifyLeadAckToken(leadId, token)) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url), 303);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  console.log("[ack] action received", { leadId, action });

  // 1. Look up the lead. We need its analysis_snapshot for the
  // confirmed-installer email's pre-survey insights, plus the contact
  // details we'll surface in the email + calendar event.
  const { data: lead, error: leadErr } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, status, contact_name, contact_email, contact_phone, " +
        "property_address, property_postcode, property_latitude, property_longitude, " +
        "homeowner_lead_id, " +
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
        | "property_latitude"
        | "property_longitude"
        | "homeowner_lead_id"
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

  // ── Branch on action ────────────────────────────────────────────
  if (action === "decline") {
    return handleDecline({ admin, url, lead, meeting, installer, leadId, now });
  }

  // accept / reschedule both need credit attribution.

  // Idempotent re-click on accept: meeting is already 'booked'.
  if (action === "accept" && meeting?.status === "booked") {
    console.log("[ack] already accepted — idempotent re-click", {
      leadId,
      meetingId: meeting.id,
    });
    await admin
      .from("installer_leads")
      .update({ acknowledge_clicked_at: now })
      .eq("id", leadId);
    return NextResponse.redirect(new URL(landingUrl("ok"), url), 303);
  }
  if (
    (action === "accept" || action === "reschedule") &&
    (lead.status === "visit_booked" ||
      lead.status === "installer_acknowledged")
  ) {
    console.log("[ack] lead already taken — idempotent re-click", {
      leadId,
      status: lead.status,
    });
    return NextResponse.redirect(new URL(landingUrl("ok"), url), 303);
  }
  if (lead.status === "cancelled" || lead.status === "closed_lost") {
    return NextResponse.redirect(new URL(landingUrl("declined"), url), 303);
  }

  // ── Identify the user account whose credits cover this lead ─────
  // Email match between installers.email and users.email. Until F2
  // installer claim ships, this is the only binding we have. If
  // there's no match, push them back to the page which renders the
  // "claim your profile" CTA.
  const installerEmail = installer.email?.toLowerCase().trim() ?? null;
  if (!installerEmail) {
    console.warn("[ack] installer has no email — can't attribute credits", {
      leadId,
      installerId: installer.id,
    });
    return NextResponse.redirect(new URL(backToAcceptUrl(leadId, token), url), 303);
  }
  const { data: profile } = await admin
    .from("users")
    .select("id, email, credits, blocked")
    .ilike("email", installerEmail)
    .limit(1)
    .maybeSingle<{
      id: string;
      email: string;
      credits: number;
      blocked: boolean;
    }>();
  if (!profile || profile.blocked) {
    console.warn("[ack] no matching user account for installer email", {
      leadId,
      installerEmail,
    });
    return NextResponse.redirect(new URL(backToAcceptUrl(leadId, token), url), 303);
  }
  if (profile.credits < LEAD_ACCEPT_COST_CREDITS) {
    console.warn("[ack] insufficient credits at submit", {
      userId: profile.id,
      credits: profile.credits,
    });
    return NextResponse.redirect(new URL(backToAcceptUrl(leadId, token), url), 303);
  }

  // ── Atomic claim of the meeting slot ────────────────────────────
  // pending → booked (accept) or pending → cancelled (reschedule).
  // CAS returns 0 rows if another concurrent POST got there first.
  if (!meeting) {
    console.warn(
      "[ack] no meeting row found for lead — calendar invite cannot fire",
      { leadId },
    );
  } else {
    const targetStatus = action === "accept" ? "booked" : "cancelled";
    const { data: claimedRows, error: claimErr } = await admin
      .from("installer_meetings")
      .update({ status: targetStatus })
      .eq("id", meeting.id)
      .eq("status", "pending")
      .select("id");
    if (claimErr) {
      console.error("[ack] meeting CAS update failed", claimErr);
      return NextResponse.redirect(new URL(landingUrl("error"), url), 303);
    }
    if (!claimedRows || claimedRows.length === 0) {
      console.log(
        "[ack] CAS lost — meeting was already claimed by another request",
        { leadId, meetingId: meeting.id, targetStatus },
      );
      await admin
        .from("installer_leads")
        .update({ acknowledge_clicked_at: now })
        .eq("id", leadId);
      return NextResponse.redirect(new URL(landingUrl("ok"), url), 303);
    }
  }

  // ── Atomic credit debit ────────────────────────────────────────
  const { data: debited, error: debitErr } = await admin.rpc("deduct_credits", {
    p_user_id: profile.id,
    p_count: LEAD_ACCEPT_COST_CREDITS,
  });
  if (debitErr || !debited) {
    console.error("[ack] credit debit failed — rolling back meeting", {
      err: debitErr,
      ok: debited,
    });
    if (meeting) {
      await admin
        .from("installer_meetings")
        .update({ status: "pending" })
        .eq("id", meeting.id);
    }
    return NextResponse.redirect(new URL(backToAcceptUrl(leadId, token), url), 303);
  }
  console.log("[ack] credits debited", {
    userId: profile.id,
    cost: LEAD_ACCEPT_COST_CREDITS,
    action,
  });

  // ── Lead status update ────────────────────────────────────────
  // accept → visit_booked, reschedule → installer_acknowledged (took
  // the lead, no slot booked).
  const { error: leadUpdateErr } = await admin
    .from("installer_leads")
    .update({
      acknowledge_clicked_at: now,
      installer_acknowledged_at: now,
      status: action === "accept" ? "visit_booked" : "installer_acknowledged",
      visit_booked_for:
        action === "accept" ? meeting?.scheduled_at ?? null : null,
    })
    .eq("id", leadId);
  if (leadUpdateErr) {
    console.error("[ack] lead status update failed", leadUpdateErr);
  }

  // Stamp invite_sent_at so admin sees when notifications fired.
  if (meeting) {
    await admin
      .from("installer_meetings")
      .update({ invite_sent_at: now })
      .eq("id", meeting.id);
  }

  // ── Confirmed emails (+ ICS for accept only) ───────────────────
  const reportFacts = extractReportFacts(lead.analysis_snapshot);
  const wantsList = listWants(
    lead.wants_heat_pump,
    lead.wants_solar,
    lead.wants_battery,
  );

  if (action === "accept") {
    await sendAcceptEmails({
      lead,
      meeting,
      installer,
      reportFacts,
      wantsList,
      leadId,
    });
  } else {
    // reschedule
    await sendRescheduleEmails({ lead, meeting, installer, reportFacts, leadId });
  }

  return NextResponse.redirect(
    new URL(landingUrl(action === "accept" ? "ok" : "reschedule"), url),
    303,
  );
}

// ─── action=decline ────────────────────────────────────────────────────

async function handleDecline({
  admin,
  url,
  lead,
  meeting,
  installer,
  leadId,
  now,
}: {
  admin: ReturnType<typeof createAdminClient>;
  url: URL;
  lead: Pick<
    LeadRow,
    | "id"
    | "installer_id"
    | "status"
    | "contact_name"
    | "contact_email"
    | "homeowner_lead_id"
    | "property_latitude"
    | "property_longitude"
    | "wants_heat_pump"
    | "wants_solar"
    | "wants_battery"
    | "analysis_snapshot"
    | "property_address"
    | "property_postcode"
  >;
  meeting: Pick<
    MeetingRow,
    "id" | "scheduled_at" | "status"
  > | null;
  installer: Pick<InstallerRow, "id" | "company_name" | "email">;
  leadId: string;
  now: string;
}) {
  // Already declined — bail
  if (lead.status === "cancelled" || lead.status === "closed_lost") {
    return NextResponse.redirect(new URL(landingUrl("declined"), url), 303);
  }
  // Already accepted (visit booked) — declining isn't allowed at that point
  if (lead.status === "visit_booked") {
    return NextResponse.redirect(new URL(landingUrl("ok"), url), 303);
  }

  // Cancel the meeting + lead atomically (CAS-style on meeting if present).
  if (meeting && meeting.status === "pending") {
    await admin
      .from("installer_meetings")
      .update({ status: "cancelled" })
      .eq("id", meeting.id)
      .eq("status", "pending");
  }
  await admin
    .from("installer_leads")
    .update({
      status: "cancelled",
      acknowledge_clicked_at: now,
    })
    .eq("id", leadId);

  console.log("[ack] declined", { leadId, installerId: installer.id });

  // Compute "X installers nearby" for the homeowner email.
  let nearbyCount = 0;
  if (lead.property_latitude != null && lead.property_longitude != null) {
    try {
      const result = await findNearby({
        latitude: Number(lead.property_latitude),
        longitude: Number(lead.property_longitude),
        wantsHeatPump: lead.wants_heat_pump,
        wantsSolar: lead.wants_solar,
        wantsBattery: lead.wants_battery,
        page: 1,
        pageSize: 1,
        maxDistanceKm: DECLINE_NEARBY_RADIUS_KM,
        homeownerLeadId: null,
      });
      // Subtract 1 for the declining installer themselves (their record
      // is in the directory and would show up in the nearby query).
      nearbyCount = Math.max(0, result.totalCount - 1);
    } catch (e) {
      console.warn(
        "[ack] nearby count failed — falling back to 0",
        e instanceof Error ? e.message : e,
      );
    }
  }

  // Issue a fresh report-share token so the email can deep-link the
  // homeowner back to their report's "Book a site visit" tab.
  let reportUrl = `${normalisedBase()}/check`;
  try {
    reportUrl = await issueReportUrl({ admin, lead });
  } catch (e) {
    console.warn(
      "[ack] report token issue failed — falling back to /check",
      e instanceof Error ? e.message : e,
    );
  }

  if (meeting) {
    const declineEmail = buildDeclinedHomeownerEmail({
      homeownerName: lead.contact_name ?? "there",
      installerCompanyName: installer.company_name,
      originalSlotUtc: meeting.scheduled_at,
      wantsHeatPump: lead.wants_heat_pump,
      wantsSolar: lead.wants_solar,
      wantsBattery: lead.wants_battery,
      nearbyInstallerCount: nearbyCount,
      nearbyRadiusMiles: DECLINE_NEARBY_RADIUS_MILES,
      reportUrl,
    });
    const result = await sendEmail({
      to: lead.contact_email,
      subject: declineEmail.subject,
      html: declineEmail.html,
      text: declineEmail.text,
      tags: [
        { name: "kind", value: "booking_declined_homeowner" },
        { name: "lead_id", value: leadId },
      ],
    });
    console.log("[ack] decline email", {
      ok: result.ok,
      ...(result.ok ? { id: result.id } : {}),
    });
  }

  return NextResponse.redirect(new URL(landingUrl("declined"), url), 303);
}

// ─── Email senders ──────────────────────────────────────────────────────

async function sendAcceptEmails({
  lead,
  meeting,
  installer,
  reportFacts,
  wantsList,
  leadId,
}: {
  lead: Pick<
    LeadRow,
    | "contact_name"
    | "contact_email"
    | "contact_phone"
    | "property_address"
    | "property_postcode"
    | "wants_heat_pump"
    | "wants_solar"
    | "wants_battery"
    | "notes"
  >;
  meeting: Pick<
    MeetingRow,
    "id" | "scheduled_at" | "duration_min" | "travel_buffer_min"
  > | null;
  installer: Pick<
    InstallerRow,
    "company_name" | "email" | "telephone" | "website"
  >;
  reportFacts: ReportFacts;
  wantsList: string;
  leadId: string;
}) {
  if (!meeting) return;

  const homeownerEmail = buildHomeownerEmail({
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
  });
  const installerEmail = installer.email
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

  const homeownerIcs = buildHomeownerIcsAttachment({
    leadId,
    meeting,
    installerName: installer.company_name,
    installerEmail: installer.email,
    homeownerName: lead.contact_name ?? "Homeowner",
    homeownerEmail: lead.contact_email,
    propertyAddress: lead.property_address,
    wantsList,
  });
  const installerIcs =
    installer.email && meeting
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

  const [hRes, iRes] = await Promise.all([
    sendEmail({
      to: lead.contact_email,
      subject: homeownerEmail.subject,
      html: homeownerEmail.html,
      text: homeownerEmail.text,
      tags: [
        { name: "kind", value: "booking_confirmed_homeowner" },
        { name: "lead_id", value: leadId },
      ],
      attachments: [homeownerIcs],
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
          attachments: installerIcs ? [installerIcs] : undefined,
        })
      : Promise.resolve<SendEmailResult>({
          ok: false,
          skipped: true,
          reason: "no installer email on file",
        }),
  ]);
  console.log("[ack] accept emails", { homeowner: hRes.ok, installer: iRes.ok });
}

async function sendRescheduleEmails({
  lead,
  meeting,
  installer,
  reportFacts,
  leadId,
}: {
  lead: Pick<
    LeadRow,
    | "contact_name"
    | "contact_email"
    | "contact_phone"
    | "property_address"
    | "property_postcode"
    | "wants_heat_pump"
    | "wants_solar"
    | "wants_battery"
    | "notes"
  >;
  meeting: Pick<MeetingRow, "scheduled_at" | "duration_min" | "travel_buffer_min"> | null;
  installer: Pick<
    InstallerRow,
    "company_name" | "email" | "telephone" | "website"
  >;
  reportFacts: ReportFacts;
  leadId: string;
}) {
  if (!meeting) return;

  // Homeowner: "took your lead, wants to reschedule"
  const reschedule = buildReschedulingHomeownerEmail({
    homeownerName: lead.contact_name ?? "there",
    installerCompanyName: installer.company_name,
    installerEmail: installer.email,
    installerTelephone: installer.telephone,
    installerWebsite: installer.website,
    originalSlotUtc: meeting.scheduled_at,
    propertyAddress: lead.property_address,
    wantsHeatPump: lead.wants_heat_pump,
    wantsSolar: lead.wants_solar,
    wantsBattery: lead.wants_battery,
  });

  // Installer: confirmed-installer email gives them full contact details
  // so they can reach out. We reuse the existing template — it's the
  // same payload, just no calendar invite.
  const installerConf = installer.email
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

  const [hRes, iRes] = await Promise.all([
    sendEmail({
      to: lead.contact_email,
      subject: reschedule.subject,
      html: reschedule.html,
      text: reschedule.text,
      tags: [
        { name: "kind", value: "booking_rescheduling_homeowner" },
        { name: "lead_id", value: leadId },
      ],
    }),
    installerConf && installer.email
      ? sendEmail({
          to: installer.email,
          subject: installerConf.subject,
          html: installerConf.html,
          text: installerConf.text,
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
  console.log("[ack] reschedule emails", { homeowner: hRes.ok, installer: iRes.ok });
}

// ─── Helpers ────────────────────────────────────────────────────────────

function normalisedBase(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://propertoasty.com";
  const url = base.startsWith("http") ? base : `https://${base}`;
  return url.replace(/\/+$/, "");
}

async function issueReportUrl({
  admin,
  lead,
}: {
  admin: ReturnType<typeof createAdminClient>;
  lead: Pick<
    LeadRow,
    | "homeowner_lead_id"
    | "contact_email"
    | "analysis_snapshot"
    | "property_address"
    | "property_postcode"
    | "property_latitude"
    | "property_longitude"
  >;
}): Promise<string> {
  // Same pattern as /api/reports/share — generate UUID first so we
  // can sign + persist in one round-trip.
  const reportId = randomUUID();
  const token = buildReportToken(reportId);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from("report_tokens").insert({
    id: reportId,
    token,
    kind: "self",
    homeowner_lead_id: lead.homeowner_lead_id ?? null,
    recipient_email: lead.contact_email,
    analysis_snapshot: (lead.analysis_snapshot ?? {}) as never,
    property_address: lead.property_address,
    property_postcode: lead.property_postcode,
    property_latitude: lead.property_latitude,
    property_longitude: lead.property_longitude,
    expires_at: expires,
  });
  if (error) {
    throw new Error(`report token insert failed: ${error.message}`);
  }
  return `${normalisedBase()}/r/${token}`;
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
    '• Specific make + model — never accept a vague "a 5 kW system" line.',
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
