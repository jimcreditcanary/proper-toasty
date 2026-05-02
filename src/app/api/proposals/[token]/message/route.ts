// /api/proposals/[token]/message
//
//   POST { body: string, channel?: "message" | "callback" }
//
// Tokenised, no login. Verifies the HMAC, appends a message to the
// proposal's homeowner_messages array, and emails the installer
// with reply-to set to the homeowner so they can just hit Reply.
//
// Allowed in any non-draft state — homeowners can ask questions
// before deciding, after accepting, even after declining (so they
// can change their mind without wrestling the UI).

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseProposalToken } from "@/lib/email/tokens";
import { sendEmail } from "@/lib/email/client";
import { buildProposalMessageInstallerEmail } from "@/lib/email/templates/proposal-message-installer";
import { resolveInstallerNotifyEmail } from "@/lib/proposals/notify";

export const runtime = "nodejs";
export const maxDuration = 30;

const messageSchema = z.object({
  body: z.string().min(1).max(2000),
  channel: z.enum(["message", "callback"]).default("message"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const proposalId = parseProposalToken(token);
  if (!proposalId) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  let body: z.infer<typeof messageSchema>;
  try {
    body = messageSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("installer_proposals")
    .select(
      "id, installer_id, installer_lead_id, status, total_pence, homeowner_messages, homeowner_token",
    )
    .eq("id", proposalId)
    .eq("homeowner_token", token)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (proposal.status === "draft") {
    return NextResponse.json(
      { error: "This quote isn't open for messages yet" },
      { status: 409 },
    );
  }

  const newMessage = {
    id: randomUUID(),
    body: body.body,
    sent_at: new Date().toISOString(),
    channel: body.channel,
  };
  const existing = Array.isArray(proposal.homeowner_messages)
    ? proposal.homeowner_messages
    : [];
  const updatedMessages = [...existing, newMessage];

  const { error: updateErr } = await admin
    .from("installer_proposals")
    .update({ homeowner_messages: updatedMessages })
    .eq("id", proposalId);
  if (updateErr) {
    console.error("[proposals] message append failed", updateErr);
    return NextResponse.json(
      { error: "Could not save your message — try again" },
      { status: 500 },
    );
  }

  // Email installer (best-effort).
  const [{ data: installer }, { data: lead }] = await Promise.all([
    admin
      .from("installers")
      .select("id, company_name, email, user_id")
      .eq("id", proposal.installer_id)
      .maybeSingle<{
        id: number;
        company_name: string;
        email: string | null;
        user_id: string | null;
      }>(),
    admin
      .from("installer_leads")
      .select(
        "id, contact_email, contact_name, contact_phone, property_address",
      )
      .eq("id", proposal.installer_lead_id)
      .maybeSingle(),
  ]);

  const installerToEmail = installer
    ? await resolveInstallerNotifyEmail(admin, installer)
    : null;

  if (installerToEmail && installer && lead) {
    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
    ).replace(/\/+$/, "");
    const installerProposalUrl = `${appBaseUrl}/installer/proposals/${proposal.id}`;

    const built = buildProposalMessageInstallerEmail({
      installerCompanyName: installer.company_name,
      homeownerName: lead.contact_name,
      homeownerEmail: lead.contact_email,
      homeownerPhone: lead.contact_phone,
      propertyAddress: lead.property_address,
      totalPence: proposal.total_pence,
      channel: body.channel,
      body: body.body,
      installerProposalUrl,
    });

    const sendResult = await sendEmail({
      to: installerToEmail,
      subject: built.subject,
      html: built.html,
      text: built.text,
      replyTo: lead.contact_email,
      tags: [
        { name: "kind", value: `proposal-${body.channel}` },
        { name: "proposalId", value: proposal.id },
      ],
    });
    if (!sendResult.ok && !sendResult.skipped) {
      console.error("[proposals] message email failed", sendResult.error);
    }
  } else {
    console.warn("[proposals] message email skipped — recipient missing", {
      proposalId: proposal.id,
      hasInstaller: !!installer,
      hasInstallerEmail: !!installerToEmail,
    });
  }

  return NextResponse.json({ ok: true, message: newMessage });
}
