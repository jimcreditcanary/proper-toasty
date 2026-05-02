// /api/installer/proposals/[id]/send
//
//   POST — flip a draft proposal to 'sent' and email the homeowner
//          a link to /p/<homeowner_token>. The installer can no
//          longer edit it once sent.
//
// We do CAS on (id, status='draft') so a duplicate POST from a
// double-clicking installer can't fire two emails.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import { buildProposalSentHomeownerEmail } from "@/lib/email/templates/proposal-sent-homeowner";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  _req: Request,
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

  const admin = createAdminClient();

  // Resolve installer.
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name, email, telephone")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: number;
      company_name: string;
      email: string | null;
      telephone: string | null;
    }>();
  if (!installer) {
    return NextResponse.json(
      { error: "Installer profile not linked" },
      { status: 403 },
    );
  }

  // Pull the proposal + the lead in one round-trip via the foreign
  // key relationship — we need contact info from the lead to email.
  const { data: proposal } = await admin
    .from("installer_proposals")
    .select(
      "id, installer_id, installer_lead_id, status, line_items, cover_message, vat_rate_bps, total_pence, homeowner_token",
    )
    .eq("id", id)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (proposal.installer_id !== installer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (proposal.status !== "draft") {
    return NextResponse.json(
      { error: "This proposal has already been sent" },
      { status: 409 },
    );
  }
  // Reject empty / zero-total proposals at send time (the builder
  // also blocks but defence in depth — direct API hits shouldn't
  // succeed either).
  const itemCount = Array.isArray(proposal.line_items)
    ? proposal.line_items.length
    : 0;
  if (itemCount === 0 || proposal.total_pence <= 0) {
    return NextResponse.json(
      { error: "Add at least one priced line item before sending" },
      { status: 400 },
    );
  }

  const { data: lead } = await admin
    .from("installer_leads")
    .select("contact_email, contact_name")
    .eq("id", proposal.installer_lead_id)
    .maybeSingle<{ contact_email: string; contact_name: string | null }>();
  if (!lead) {
    return NextResponse.json(
      { error: "Lead row missing — can't email" },
      { status: 500 },
    );
  }

  // CAS — atomically flip to 'sent' only if still draft. If a
  // concurrent send already flipped it, abort.
  const sentAt = new Date().toISOString();
  const { data: flipped } = await admin
    .from("installer_proposals")
    .update({ status: "sent", sent_at: sentAt })
    .eq("id", id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (!flipped) {
    return NextResponse.json(
      { error: "Already sent" },
      { status: 409 },
    );
  }

  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
  ).replace(/\/+$/, "");
  const proposalUrl = `${appBaseUrl}/p/${proposal.homeowner_token}`;

  const email = buildProposalSentHomeownerEmail({
    homeownerName: lead.contact_name,
    installerCompanyName: installer.company_name,
    installerEmail: installer.email,
    installerTelephone: installer.telephone,
    totalPence: proposal.total_pence,
    vatRateBps: proposal.vat_rate_bps,
    itemCount,
    proposalUrl,
    coverMessage: proposal.cover_message ?? null,
  });

  const sendResult = await sendEmail({
    to: lead.contact_email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: installer.email ?? undefined,
    tags: [
      { name: "kind", value: "proposal-sent" },
      { name: "proposalId", value: id },
    ],
  });

  if (!sendResult.ok && !sendResult.skipped) {
    // Email failed for real — flip status back so the installer can
    // retry without ending up in a "sent but they never got it" state.
    console.error("[proposals] send email failed", sendResult.error);
    await admin
      .from("installer_proposals")
      .update({ status: "draft", sent_at: null })
      .eq("id", id);
    return NextResponse.json(
      { error: "Email send failed — try again in a moment" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    proposalUrl,
    emailSkipped: sendResult.skipped === true,
  });
}
