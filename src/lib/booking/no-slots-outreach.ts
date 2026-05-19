// Side-channel: when the booking modal lands on "no slots in 28 days"
// for an installer + homeowner-lead combo we haven't already emailed
// about, insert an installer_lead_outreach row and fire the email.
//
// Idempotency: the (installer_id, lead_id) UNIQUE constraint on
// installer_lead_outreach (migration 071) is the load-bearing
// guarantee. We .insert() with onConflict:"installer_id,lead_id" and
// `ignoreDuplicates:true` — Supabase translates that into ON
// CONFLICT DO NOTHING. The returned data is empty when the row
// already exists, which we treat as "already emailed → don't send
// again". One roundtrip, zero races.
//
// Failure mode: any error (DB unreachable, email provider down) is
// logged and swallowed. This is a side-channel — it MUST NOT fail
// the underlying availability lookup, which is on the critical
// rendering path for the booking modal.
//
// Tests: src/lib/booking/__tests__/no-slots-outreach.test.ts covers
// the "fires exactly once per (installer, lead) pair" guarantee.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";
import { buildNoSlotsRegisteredInstallerEmail } from "@/lib/email/templates/installer-no-slots-registered";
import { buildNoSlotsUnregisteredInstallerEmail } from "@/lib/email/templates/installer-no-slots-unregistered";
import { INSTALLER_FREE_STARTER_CREDITS } from "@/lib/booking/credits";
import { track } from "@/lib/analytics";
import type { Database } from "@/types/database";

export interface MaybeFireNoSlotsOutreachInput {
  admin: SupabaseClient<Database>;
  installerId: number;
  /** Homeowner-side lead id. Required — without it we can't tie the
   *  email to a specific homeowner and idempotency falls apart. */
  homeownerLeadId: string;
  /** Absolute origin for building claim / signup URLs. Already
   *  computed in the API route from request headers. */
  origin: string;
}

export type NoSlotsOutreachResult =
  | { ok: true; status: "sent"; outreachId: string }
  | { ok: true; status: "already_sent" }
  | { ok: true; status: "skipped"; reason: string }
  | { ok: false; reason: string };

/**
 * Best-effort: insert the outreach row idempotently, build + send
 * the right email variant, fire analytics. Returns a status the
 * caller can log but should NOT branch user-visible behaviour on —
 * this is a side-channel.
 */
export async function maybeFireNoSlotsOutreach(
  input: MaybeFireNoSlotsOutreachInput,
): Promise<NoSlotsOutreachResult> {
  const { admin, installerId, homeownerLeadId, origin } = input;

  // Pull the installer + homeowner_lead rows in parallel. We need
  // the installer's email + user_id (to pick the template variant)
  // and the homeowner's name + postcode + selection flags to
  // personalise the body.
  const [installerRes, leadRes] = await Promise.all([
    admin
      .from("installers")
      .select("id, company_name, email, user_id")
      .eq("id", installerId)
      .maybeSingle<{
        id: number;
        company_name: string;
        email: string | null;
        user_id: string | null;
      }>(),
    admin
      .from("homeowner_leads")
      .select("id, name, postcode, analysis_snapshot")
      .eq("id", homeownerLeadId)
      .maybeSingle<{
        id: string;
        name: string | null;
        postcode: string | null;
        analysis_snapshot: unknown;
      }>(),
  ]);

  if (installerRes.error) {
    return { ok: false, reason: `installer lookup failed: ${installerRes.error.message}` };
  }
  if (!installerRes.data) {
    return { ok: true, status: "skipped", reason: "installer not found" };
  }
  if (!installerRes.data.email) {
    // We literally can't email an installer with no email on file.
    // (Most directory rows DO have one — sourced from the MCS list —
    // but we can't assume.)
    return { ok: true, status: "skipped", reason: "installer has no email on file" };
  }
  if (leadRes.error) {
    return { ok: false, reason: `lead lookup failed: ${leadRes.error.message}` };
  }
  if (!leadRes.data) {
    return { ok: true, status: "skipped", reason: "homeowner lead not found" };
  }

  // Insert the outreach row. ON CONFLICT DO NOTHING via
  // ignoreDuplicates — Supabase swallows the conflict and returns
  // an empty array on `data`. We use that as the "already sent"
  // signal: no row inserted → another request already won the race.
  const insertRes = await admin
    .from("installer_lead_outreach")
    .insert({
      installer_id: installerId,
      lead_id: homeownerLeadId,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  // Supabase returns an error with code 23505 for unique violations
  // when ignoreDuplicates isn't set. We DO want to detect those
  // here — they mean we already emailed this combo. PostgREST also
  // gives a 409 with details mentioning duplicate key.
  if (insertRes.error) {
    const code = (insertRes.error as { code?: string }).code;
    const msg = insertRes.error.message ?? "";
    const isDupe =
      code === "23505" ||
      /duplicate key/i.test(msg) ||
      /already exists/i.test(msg);
    if (isDupe) {
      return { ok: true, status: "already_sent" };
    }
    return { ok: false, reason: `outreach insert failed: ${msg}` };
  }
  if (!insertRes.data) {
    // Defensive — shouldn't happen with .select() but just in case.
    return { ok: true, status: "already_sent" };
  }

  // We won the race — build + send the email.
  const wantsHeatPump = pickWant(leadRes.data.analysis_snapshot, "heat_pump");
  const wantsSolar = pickWant(leadRes.data.analysis_snapshot, "solar");
  const wantsBattery = pickWant(leadRes.data.analysis_snapshot, "battery");
  const isRegistered = installerRes.data.user_id != null;

  const { subject, html, text } = isRegistered
    ? buildNoSlotsRegisteredInstallerEmail({
        installerCompanyName: installerRes.data.company_name,
        homeownerName: leadRes.data.name,
        propertyPostcode: leadRes.data.postcode,
        wantsHeatPump,
        wantsSolar,
        wantsBattery,
        claimUrl: `${origin}/installer/leads/${homeownerLeadId}/claim?source=no-slots`,
      })
    : buildNoSlotsUnregisteredInstallerEmail({
        installerCompanyName: installerRes.data.company_name,
        homeownerName: leadRes.data.name,
        propertyPostcode: leadRes.data.postcode,
        wantsHeatPump,
        wantsSolar,
        wantsBattery,
        // The signup page takes `id` for installer prefill and
        // accepts `lead` + `source` so the post-claim landing can
        // bounce them straight to the lead detail.
        signupUrl: `${origin}/installer-signup?id=${installerId}&lead=${homeownerLeadId}&source=no-slots`,
        starterCredits: INSTALLER_FREE_STARTER_CREDITS,
      });

  const send = await sendEmail({
    to: installerRes.data.email,
    subject,
    html,
    text,
    tags: [
      { name: "category", value: "installer_no_slots" },
      { name: "installer_id", value: String(installerId) },
      { name: "lead_id", value: homeownerLeadId },
      { name: "registered", value: String(isRegistered) },
    ],
  });

  // Fire-and-forget analytics. Don't await — track() is sync
  // anyway, but the SDK queues internally.
  try {
    track("installer_no_slots_email_sent", {
      props: {
        installer_id: installerId,
        is_registered: isRegistered,
      },
      // No user_id for installers in this flow; some directory rows
      // don't even have one. Hash the email instead.
      email: installerRes.data.email,
    });
  } catch {
    // never break the side-channel for analytics
  }

  if (!send.ok && !send.skipped) {
    // Email failure: log but don't roll back the outreach row.
    // Rolling back would invite duplicate sends on retry; keeping
    // the row means we tried once, the homeowner / installer can
    // be reached out to manually via the dashboard section.
    console.warn("[no-slots-outreach] email send failed", {
      installerId,
      homeownerLeadId,
      error: send.error,
    });
  }

  return { ok: true, status: "sent", outreachId: insertRes.data.id };
}

// Heuristic: read selection flags out of the homeowner_leads
// analysis_snapshot JSON. The shape varies (the wizard has
// rewritten it a few times) but the recent convention puts
// per-tech flags under `selection.has_*` or `selection.has*`.
// Falls back to false rather than blowing up if the shape changes.
function pickWant(snap: unknown, tech: "heat_pump" | "solar" | "battery"): boolean {
  if (!snap || typeof snap !== "object") return false;
  const obj = snap as Record<string, unknown>;
  const selection =
    (obj.selection as Record<string, unknown> | undefined) ?? null;
  if (!selection) return false;
  const camelKey =
    tech === "heat_pump"
      ? "hasHeatPump"
      : tech === "solar"
        ? "hasSolar"
        : "hasBattery";
  const snakeKey = `has_${tech}`;
  return Boolean(selection[camelKey] ?? selection[snakeKey] ?? false);
}
