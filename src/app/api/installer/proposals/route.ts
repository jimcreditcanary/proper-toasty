// /api/installer/proposals
//
//   POST  — create a new draft proposal for the given lead. Returns
//           the freshly minted proposal id + homeowner_token.
//
// Auth: must be signed in + bound to an installer + the lead must
// belong to that installer (no cross-installer access). Pre-survey
// must be acknowledged — we don't let installers quote leads they
// haven't accepted yet.
//
// The PATCH/SEND endpoints live at /api/installer/proposals/[id]
// since they need the proposal id in the URL.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  proposalDraftSchema,
  computeTotals,
  type ProposalDraftInput,
} from "@/lib/proposals/schema";
import { buildProposalToken } from "@/lib/email/tokens";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: ProposalDraftInput;
  try {
    body = proposalDraftSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Resolve the bound installer.
  const { data: installer } = await admin
    .from("installers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number }>();
  if (!installer) {
    return NextResponse.json(
      { error: "Installer profile not linked to this account" },
      { status: 403 },
    );
  }

  // Auth-gate the lead — installer must own it, must be acknowledged.
  const { data: lead } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, installer_acknowledged_at, homeowner_lead_id",
    )
    .eq("id", body.installer_lead_id)
    .eq("installer_id", installer.id)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!lead.installer_acknowledged_at) {
    return NextResponse.json(
      { error: "Accept this lead before sending a proposal" },
      { status: 409 },
    );
  }

  const totals = computeTotals(body.line_items, body.vat_rate_bps);

  // Mint the homeowner token up-front so the row can be referenced
  // by URL the moment it's created (even as a draft — the page
  // gates on status, not token presence).
  const id = randomUUID();
  const homeownerToken = buildProposalToken(id);

  const { data: inserted, error } = await admin
    .from("installer_proposals")
    .insert({
      id,
      installer_id: installer.id,
      installer_lead_id: lead.id,
      homeowner_lead_id: lead.homeowner_lead_id,
      status: "draft",
      line_items: body.line_items,
      cover_message: body.cover_message ?? null,
      vat_rate_bps: body.vat_rate_bps,
      subtotal_pence: totals.subtotalPence,
      vat_pence: totals.vatPence,
      total_pence: totals.totalPence,
      homeowner_token: homeownerToken,
    })
    .select("id, homeowner_token, status")
    .single();
  if (error || !inserted) {
    console.error("[proposals] insert failed", error);
    return NextResponse.json({ error: "Could not save draft" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    homeownerToken: inserted.homeowner_token,
    status: inserted.status,
  });
}
