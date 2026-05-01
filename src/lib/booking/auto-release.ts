// C4 — auto-release pending leads + 12h reminder logic.
//
// Two passes, both designed to be invoked from a single cron call
// (every 30 minutes). Each pass is idempotent:
//
//   sendDueReminders(admin)
//     finds leads where:
//       status in ('new', 'sent_to_installer')
//       installer_notified_at < now - 12h
//       installer_reminder_sent_at IS NULL
//       (and the booked slot is still in the future — we don't
//        bother nudging an installer about a slot that's already
//        gone)
//     fires the reminder email + stamps installer_reminder_sent_at.
//
//   releaseStaleLeads(admin)
//     finds leads where:
//       status in ('new', 'sent_to_installer')
//       installer_notified_at < now - 24h
//       auto_released_at IS NULL
//     atomically flips status='cancelled' + meeting.status='cancelled'
//     + stamps auto_released_at, then sends both emails.
//     If the booked slot is in the past at release time, the
//     homeowner email is suppressed (the booking's already moot —
//     no point telling them at this stage).
//
// Both passes return summary stats for the cron's response so we
// can spot-check from Vercel cron logs.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";
import { signLeadAckToken } from "@/lib/email/tokens";
import { findNearby } from "@/lib/services/installers";
import { issueReportUrl } from "@/lib/booking/report-link";
import { buildInstallerReminderEmail } from "@/lib/email/templates/booking-installer-reminder";
import { buildAutoReleasedInstallerEmail } from "@/lib/email/templates/booking-auto-released-installer";
import { buildAutoReleasedHomeownerEmail } from "@/lib/email/templates/booking-auto-released-homeowner";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

const REMINDER_AT_HOURS = 12;
const RELEASE_AT_HOURS = 24;
const HOURS_LEFT_AT_REMINDER = RELEASE_AT_HOURS - REMINDER_AT_HOURS;

// Mirror the decline-path radius (acknowledge.ts) so the homeowner
// gets the same "X installers within 10 miles" copy whether the
// installer declined manually or the cron auto-released.
const NEARBY_RADIUS_MILES = 10;
const NEARBY_RADIUS_KM = NEARBY_RADIUS_MILES * 1.609344;

interface PassOptions {
  admin: AdminClient;
  appBaseUrl: string;
  // Cap how many rows each pass processes per cron run. Belt-and-
  // braces against weird DB states (e.g. all 5,000 leads suddenly
  // overdue). Default 100 is plenty for the cadence we run at.
  limit?: number;
}

export interface ReminderResult {
  found: number;
  sent: number;
  failed: number;
}

export interface ReleaseResult {
  found: number;
  released: number;
  failed: number;
  homeownerEmailsSkipped: number; // because the slot was already past
}

// ─── 12h reminder pass ────────────────────────────────────────────

export async function sendDueReminders(
  opts: PassOptions,
): Promise<ReminderResult> {
  const { admin, appBaseUrl, limit = 100 } = opts;
  const cutoff = new Date(
    Date.now() - REMINDER_AT_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: leads, error } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, status, installer_notified_at, wants_heat_pump, wants_solar, wants_battery, property_postcode",
    )
    .in("status", ["new", "sent_to_installer"])
    .is("installer_reminder_sent_at", null)
    .not("installer_notified_at", "is", null)
    .lt("installer_notified_at", cutoff)
    .order("installer_notified_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[auto-release/reminders] query failed", error.message);
    return { found: 0, sent: 0, failed: 0 };
  }
  const rows = leads ?? [];
  const result: ReminderResult = { found: rows.length, sent: 0, failed: 0 };
  if (rows.length === 0) return result;

  for (const lead of rows) {
    try {
      // We need the meeting + installer to render the email.
      const [meetingRes, installerRes] = await Promise.all([
        admin
          .from("installer_meetings")
          .select("scheduled_at, duration_min, status")
          .eq("installer_lead_id", lead.id)
          .maybeSingle<{
            scheduled_at: string;
            duration_min: number;
            status: string;
          }>(),
        admin
          .from("installers")
          .select("company_name, email")
          .eq("id", lead.installer_id)
          .maybeSingle<{ company_name: string; email: string | null }>(),
      ]);
      const meeting = meetingRes.data;
      const installer = installerRes.data;
      if (!meeting || !installer || !installer.email) {
        // Can't email without an installer email. Stamp the row so we
        // don't keep re-querying it every 30min.
        await admin
          .from("installer_leads")
          .update({ installer_reminder_sent_at: new Date().toISOString() })
          .eq("id", lead.id);
        continue;
      }
      // If the slot's already gone, skip — we'll release on the next
      // cron pass anyway. No point reminding about a dead slot.
      if (new Date(meeting.scheduled_at).getTime() <= Date.now()) {
        await admin
          .from("installer_leads")
          .update({ installer_reminder_sent_at: new Date().toISOString() })
          .eq("id", lead.id);
        continue;
      }
      // Don't remind for already-actioned meetings (defensive — the
      // status filter above should already exclude them).
      if (meeting.status !== "pending") {
        await admin
          .from("installer_leads")
          .update({ installer_reminder_sent_at: new Date().toISOString() })
          .eq("id", lead.id);
        continue;
      }

      const acknowledgeUrl = `${appBaseUrl}/lead/accept?lead=${encodeURIComponent(
        lead.id,
      )}&token=${encodeURIComponent(signLeadAckToken(lead.id))}`;

      const email = buildInstallerReminderEmail({
        installerCompanyName: installer.company_name,
        propertyPostcodeArea: postcodeArea(lead.property_postcode),
        meetingStartUtc: meeting.scheduled_at,
        meetingDurationMin: meeting.duration_min,
        wantsHeatPump: lead.wants_heat_pump,
        wantsSolar: lead.wants_solar,
        wantsBattery: lead.wants_battery,
        acknowledgeUrl,
        hoursRemaining: HOURS_LEFT_AT_REMINDER,
      });
      const sendResult = await sendEmail({
        to: installer.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [
          { name: "kind", value: "installer_lead_reminder" },
          { name: "lead_id", value: lead.id },
        ],
      });
      // Stamp the row regardless — even on a Postmark failure we
      // don't want to retry forever and spam the installer if the
      // service comes back. Better to log + move on.
      await admin
        .from("installer_leads")
        .update({ installer_reminder_sent_at: new Date().toISOString() })
        .eq("id", lead.id);

      if (sendResult.ok) {
        result.sent += 1;
      } else {
        result.failed += 1;
        const reason = sendResult.skipped
          ? sendResult.reason
          : sendResult.error;
        console.warn("[auto-release/reminders] send failed", {
          leadId: lead.id,
          reason,
        });
      }
    } catch (e) {
      result.failed += 1;
      console.error(
        "[auto-release/reminders] unexpected error",
        { leadId: lead.id },
        e instanceof Error ? e.message : e,
      );
    }
  }
  return result;
}

// ─── 24h release pass ─────────────────────────────────────────────

export async function releaseStaleLeads(
  opts: PassOptions,
): Promise<ReleaseResult> {
  const { admin, appBaseUrl, limit = 100 } = opts;
  const cutoff = new Date(
    Date.now() - RELEASE_AT_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: leads, error } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, status, contact_name, contact_email, wants_heat_pump, wants_solar, wants_battery, property_address, property_postcode, property_latitude, property_longitude, homeowner_lead_id, analysis_snapshot",
    )
    .in("status", ["new", "sent_to_installer"])
    .is("auto_released_at", null)
    .not("installer_notified_at", "is", null)
    .lt("installer_notified_at", cutoff)
    .order("installer_notified_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[auto-release/release] query failed", error.message);
    return { found: 0, released: 0, failed: 0, homeownerEmailsSkipped: 0 };
  }
  const rows = leads ?? [];
  const result: ReleaseResult = {
    found: rows.length,
    released: 0,
    failed: 0,
    homeownerEmailsSkipped: 0,
  };
  if (rows.length === 0) return result;

  for (const lead of rows) {
    try {
      const [meetingRes, installerRes] = await Promise.all([
        admin
          .from("installer_meetings")
          .select("id, scheduled_at, status")
          .eq("installer_lead_id", lead.id)
          .maybeSingle<{ id: string; scheduled_at: string; status: string }>(),
        admin
          .from("installers")
          .select("company_name, email")
          .eq("id", lead.installer_id)
          .maybeSingle<{ company_name: string; email: string | null }>(),
      ]);
      const meeting = meetingRes.data;
      const installer = installerRes.data;
      if (!installer) {
        // No installer record — just stamp the lead so we don't
        // re-process forever.
        await admin
          .from("installer_leads")
          .update({
            status: "cancelled",
            auto_released_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
        continue;
      }

      // Atomic CAS: only release if the lead is still pending. Lets
      // the cron race safely with a manual accept/decline mid-run.
      const releasedAt = new Date().toISOString();
      const { data: claimedRows, error: claimErr } = await admin
        .from("installer_leads")
        .update({
          status: "cancelled",
          auto_released_at: releasedAt,
        })
        .eq("id", lead.id)
        .in("status", ["new", "sent_to_installer"])
        .is("auto_released_at", null)
        .select("id");
      if (claimErr) {
        result.failed += 1;
        console.error("[auto-release/release] CAS update failed", {
          leadId: lead.id,
          err: claimErr.message,
        });
        continue;
      }
      if (!claimedRows || claimedRows.length === 0) {
        // Someone else got there first. Skip silently.
        continue;
      }

      // Cancel the meeting too (free the slot).
      if (meeting && meeting.status === "pending") {
        await admin
          .from("installer_meetings")
          .update({ status: "cancelled" })
          .eq("id", meeting.id)
          .eq("status", "pending");
      }

      result.released += 1;

      // Notify both parties. Soft-fail; the release itself has
      // already happened, emails are nice-to-have.

      // Installer email — always, unless we have no email on file.
      if (installer.email) {
        try {
          const email = buildAutoReleasedInstallerEmail({
            installerCompanyName: installer.company_name,
            propertyPostcodeArea: postcodeArea(lead.property_postcode),
            meetingStartUtc: meeting?.scheduled_at ?? lead.id,
            wantsHeatPump: lead.wants_heat_pump,
            wantsSolar: lead.wants_solar,
            wantsBattery: lead.wants_battery,
            installerPortalUrl: `${appBaseUrl}/installer`,
          });
          await sendEmail({
            to: installer.email,
            subject: email.subject,
            html: email.html,
            text: email.text,
            tags: [
              { name: "kind", value: "installer_lead_auto_released" },
              { name: "lead_id", value: lead.id },
            ],
          });
        } catch (e) {
          console.warn(
            "[auto-release/release] installer email failed",
            { leadId: lead.id },
            e instanceof Error ? e.message : e,
          );
        }
      }

      // Homeowner email — skip if the slot's already in the past
      // (would just be confusing) or we don't have one to render.
      const slotInPast =
        !meeting || new Date(meeting.scheduled_at).getTime() <= Date.now();
      if (slotInPast) {
        result.homeownerEmailsSkipped += 1;
      } else {
        try {
          // Compute "X installers within 10 miles" the same way the
          // decline path does. Subtract 1 to account for the
          // declining installer themselves.
          let nearbyCount = 0;
          if (
            lead.property_latitude != null &&
            lead.property_longitude != null
          ) {
            try {
              const nearby = await findNearby({
                latitude: Number(lead.property_latitude),
                longitude: Number(lead.property_longitude),
                wantsHeatPump: lead.wants_heat_pump,
                wantsSolar: lead.wants_solar,
                wantsBattery: lead.wants_battery,
                page: 1,
                pageSize: 1,
                maxDistanceKm: NEARBY_RADIUS_KM,
                homeownerLeadId: null,
              });
              nearbyCount = Math.max(0, nearby.totalCount - 1);
            } catch (e) {
              console.warn(
                "[auto-release/release] nearby count failed — falling back to 0",
                e instanceof Error ? e.message : e,
              );
            }
          }

          let reportUrl = `${appBaseUrl}/check`;
          try {
            reportUrl = await issueReportUrl({
              admin,
              lead,
              appBaseUrl,
            });
          } catch (e) {
            console.warn(
              "[auto-release/release] report token issue failed — falling back",
              e instanceof Error ? e.message : e,
            );
          }

          const email = buildAutoReleasedHomeownerEmail({
            homeownerName: lead.contact_name ?? "there",
            installerCompanyName: installer.company_name,
            originalSlotUtc: meeting!.scheduled_at,
            wantsHeatPump: lead.wants_heat_pump,
            wantsSolar: lead.wants_solar,
            wantsBattery: lead.wants_battery,
            nearbyInstallerCount: nearbyCount,
            nearbyRadiusMiles: NEARBY_RADIUS_MILES,
            reportUrl,
          });
          await sendEmail({
            to: lead.contact_email,
            subject: email.subject,
            html: email.html,
            text: email.text,
            tags: [
              { name: "kind", value: "homeowner_lead_auto_released" },
              { name: "lead_id", value: lead.id },
            ],
          });
        } catch (e) {
          console.warn(
            "[auto-release/release] homeowner email failed",
            { leadId: lead.id },
            e instanceof Error ? e.message : e,
          );
        }
      }
    } catch (e) {
      result.failed += 1;
      console.error(
        "[auto-release/release] unexpected error",
        { leadId: lead.id },
        e instanceof Error ? e.message : e,
      );
    }
  }
  return result;
}

// ─── helpers ──────────────────────────────────────────────────────

function postcodeArea(postcode: string | null): string | null {
  if (!postcode) return null;
  const trimmed = postcode.trim().toUpperCase();
  if (trimmed.length === 0) return null;
  const outward = trimmed.split(/\s+/)[0];
  return outward.length > 0 ? outward : null;
}
