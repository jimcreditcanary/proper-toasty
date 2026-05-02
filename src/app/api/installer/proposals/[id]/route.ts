// /api/installer/proposals/[id]
//
//   PATCH — update draft contents (line items, cover, VAT). Only
//           valid while status === 'draft'. Once sent the proposal
//           is locked from the installer side; revisions go via
//           creating a new draft.
//
// Auth: signed in + bound to the installer that owns the proposal.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  proposalDraftSchema,
  computeTotals,
  type ProposalDraftInput,
} from "@/lib/proposals/schema";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

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
      { error: "Installer profile not linked" },
      { status: 403 },
    );
  }

  // Read the proposal row to check status + ownership in one go.
  const { data: existing } = await admin
    .from("installer_proposals")
    .select("id, installer_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.installer_id !== installer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "Sent proposals can't be edited — start a new one for revisions" },
      { status: 409 },
    );
  }

  const totals = computeTotals(body.line_items, body.vat_rate_bps);

  const { error } = await admin
    .from("installer_proposals")
    .update({
      line_items: body.line_items,
      cover_message: body.cover_message ?? null,
      vat_rate_bps: body.vat_rate_bps,
      subtotal_pence: totals.subtotalPence,
      vat_pence: totals.vatPence,
      total_pence: totals.totalPence,
    })
    .eq("id", id);
  if (error) {
    console.error("[proposals] update failed", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
