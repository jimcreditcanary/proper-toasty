// /api/proposals/[token]/respond
//
//   POST { decision: "accepted" | "declined", reason?: string }
//
// Tokenised — no login required. Verifies the HMAC, looks up the
// proposal row, atomically transitions sent → accepted|declined,
// and emails the installer. Idempotent at the DB level (CAS on
// status='sent') so a double-click can't double-fire.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseProposalToken } from "@/lib/email/tokens";
import { sendEmail } from "@/lib/email/client";
import { buildProposalAcceptedInstallerEmail } from "@/lib/email/templates/proposal-accepted-installer";
import { buildProposalDeclinedInstallerEmail } from "@/lib/email/templates/proposal-declined-installer";
import { resolveInstallerNotifyEmail } from "@/lib/proposals/notify";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 30;

const respondSchema = z.object({
  decision: z.enum(["accepted", "declined"]),
  reason: z.string().max(1000).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  // Token signature check first — cheap, gives an early-out for
  // tampered URLs without hitting the DB.
  const proposalId = parseProposalToken(token);
  if (!proposalId) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  let body: z.infer<typeof respondSchema>;
  try {
    body = respondSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Pull the proposal so we know who to email + what to email them.
  const { data: proposal } = await admin
    .from("installer_proposals")
    .select(
      "id, installer_id, installer_lead_id, status, total_pence, vat_rate_bps, homeowner_token",
    )
    .eq("id", proposalId)
    .eq("homeowner_token", token)
    .maybeSingle();
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (proposal.status === "accepted" || proposal.status === "declined") {
    // Already responded — return the same outcome so the page can
    // render the right state without erroring.
    return NextResponse.json({ ok: true, status: proposal.status });
  }
  if (proposal.status !== "sent") {
    // Drafts (impossible from the homeowner side, but defence in
    // depth) and anything else fall through here.
    return NextResponse.json(
      { error: "This proposal isn't open for response" },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const updates =
    body.decision === "accepted"
      ? { status: "accepted" as const, accepted_at: now, decline_reason: null }
      : {
          status: "declined" as const,
          declined_at: now,
          decline_reason: body.reason ?? null,
        };

  const { data: flipped } = await admin
    .from("installer_proposals")
    .update(updates)
    .eq("id", proposalId)
    .eq("status", "sent")
    .select("id")
    .maybeSingle();
  if (!flipped) {
    return NextResponse.json(
      { ok: true, status: body.decision },
      { status: 200 },
    );
  }

  // Pull installer + lead contact info to build the notification email.
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

  // Falls back to the bound user's auth email if installers.email is null.
  const installerToEmail = installer
    ? await resolveInstallerNotifyEmail(admin, installer)
    : null;

  if (installerToEmail && installer && lead) {
    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
    ).replace(/\/+$/, "");
    const installerProposalUrl = `${appBaseUrl}/installer/proposals/${proposal.id}`;

    const built =
      body.decision === "accepted"
        ? buildProposalAcceptedInstallerEmail({
            installerCompanyName: installer.company_name,
            homeownerName: lead.contact_name,
            homeownerEmail: lead.contact_email,
            homeownerPhone: lead.contact_phone,
            propertyAddress: lead.property_address,
            totalPence: proposal.total_pence,
            vatRateBps: proposal.vat_rate_bps,
            acceptedAtIso: now,
            installerProposalUrl,
          })
        : buildProposalDeclinedInstallerEmail({
            installerCompanyName: installer.company_name,
            homeownerName: lead.contact_name,
            totalPence: proposal.total_pence,
            declineReason: body.reason ?? null,
            installerProposalUrl,
          });

    const sendResult = await sendEmail({
      to: installerToEmail,
      subject: built.subject,
      html: built.html,
      text: built.text,
      replyTo: lead.contact_email,
      tags: [
        { name: "kind", value: `proposal-${body.decision}` },
        { name: "proposalId", value: proposal.id },
      ],
    });
    if (!sendResult.ok && !sendResult.skipped) {
      // Don't fail the homeowner's response if the installer-side
      // notification couldn't go out — log + carry on.
      console.error(
        "[proposals] response notify failed",
        sendResult.error,
      );
    }
  } else {
    console.warn(
      "[proposals] response notify skipped — recipient or lead missing",
      {
        proposalId: proposal.id,
        installerHasEmail: !!installerToEmail,
        leadFound: !!lead,
      },
    );
  }

  // Conversion analytics — homeowner is anonymous (no auth), so
  // distinct_id is the SHA-256 prefix of their email. Decline
  // reason text NEVER ships to PostHog (privacy + signal-to-noise);
  // we only emit `has_reason: bool` so we can sense-check the
  // capture rate of the optional field.
  if (body.decision === "accepted") {
    track("homeowner_quote_accepted", {
      props: {
        installer_id: proposal.installer_id,
        total_pence: proposal.total_pence,
      },
      email: lead?.contact_email ?? null,
    });
  } else {
    track("homeowner_quote_declined", {
      props: {
        installer_id: proposal.installer_id,
        has_reason: !!(body.reason && body.reason.trim()),
      },
      email: lead?.contact_email ?? null,
    });
  }

  return NextResponse.json({ ok: true, status: body.decision });
}
