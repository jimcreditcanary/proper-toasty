import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLeadAckToken } from "@/lib/email/tokens";

// GET /api/installer-leads/acknowledge?lead=<uuid>&token=<hmac>
//
// Endpoint hit by the magic link in the installer's notification email.
// Verifies the HMAC token, updates the lead's status to
// installer_acknowledged, then 302s to the public landing page so the
// installer sees a friendly confirmation in-browser.
//
// Idempotent — clicking the link twice just updates the timestamp again,
// or noops if already acknowledged.

export const runtime = "nodejs";
export const maxDuration = 10;

function landingUrl(state: "ok" | "invalid" | "expired" | "error"): string {
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

  // Look up the lead first so we can preserve the lifecycle status if
  // it's already past 'installer_acknowledged' (e.g. visit booked).
  const { data: existing, error: lookupErr } = await admin
    .from("installer_leads")
    .select("id, status")
    .eq("id", leadId)
    .maybeSingle();

  if (lookupErr) {
    console.error("[ack] lookup failed", lookupErr);
    return NextResponse.redirect(new URL(landingUrl("error"), url));
  }
  if (!existing) {
    return NextResponse.redirect(new URL(landingUrl("invalid"), url));
  }

  // Don't downgrade the status — if the installer's already booked the
  // visit, leave that. Just always bump the click timestamp.
  const shouldAdvance = existing.status === "new" || existing.status === "sent_to_installer";

  const { error: updateErr } = await admin
    .from("installer_leads")
    .update({
      acknowledge_clicked_at: now,
      ...(shouldAdvance
        ? {
            status: "installer_acknowledged",
            installer_acknowledged_at: now,
          }
        : {}),
    })
    .eq("id", leadId);

  if (updateErr) {
    console.error("[ack] update failed", updateErr);
    return NextResponse.redirect(new URL(landingUrl("error"), url));
  }

  return NextResponse.redirect(new URL(landingUrl("ok"), url));
}
