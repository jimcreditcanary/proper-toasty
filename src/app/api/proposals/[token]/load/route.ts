// /api/proposals/[token]/load
//
// GET — verify the homeowner's proposal token and return the full
// proposal payload + installer contact card for the /p/<token>
// page. Stamps `viewed_at` on the first valid load (idempotent — we
// only set it if NULL so repeat opens don't shift the timestamp).
//
// Tokenised, no auth. The HMAC signature gates access; the row's
// homeowner_token column is also matched for belt-and-braces.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseProposalToken } from "@/lib/email/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const proposalId = parseProposalToken(token);
  if (!proposalId) {
    return NextResponse.json({ ok: false, error: "Invalid link" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("installer_proposals")
    .select(
      "id, installer_id, installer_lead_id, status, line_items, cover_message, vat_rate_bps, subtotal_pence, vat_pence, total_pence, sent_at, viewed_at, accepted_at, declined_at",
    )
    .eq("id", proposalId)
    .eq("homeowner_token", token)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // Drafts are installer-only — the homeowner shouldn't see one.
  if (proposal.status === "draft") {
    return NextResponse.json(
      { ok: false, error: "This quote isn't ready yet" },
      { status: 404 },
    );
  }

  // Pull installer + lead context in parallel.
  const [{ data: installer }, { data: lead }] = await Promise.all([
    admin
      .from("installers")
      .select(
        "company_name, email, telephone, website, postcode, reviews_score, reviews_count",
      )
      .eq("id", proposal.installer_id)
      .maybeSingle(),
    admin
      .from("installer_leads")
      .select(
        "contact_name, contact_email, property_address, property_postcode, wants_heat_pump, wants_solar, wants_battery",
      )
      .eq("id", proposal.installer_lead_id)
      .maybeSingle(),
  ]);

  // First-view tracking — fire-and-forget, don't block the response.
  if (!proposal.viewed_at && proposal.status === "sent") {
    admin
      .from("installer_proposals")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", proposalId)
      .is("viewed_at", null)
      .then(({ error }) => {
        if (error) console.warn("[proposals] viewed stamp failed", error);
      });
  }

  return NextResponse.json({
    ok: true,
    proposal,
    installer,
    lead,
  });
}
