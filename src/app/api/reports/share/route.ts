import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ShareReportRequestSchema,
  type ShareReportResponse,
} from "@/lib/schemas/report-share";
import { buildReportToken } from "@/lib/email/tokens";
import { sendEmail } from "@/lib/email/client";
import {
  buildSelfReportEmail,
  buildForwardedReportEmail,
} from "@/lib/email/templates/report-share";
import type { Json } from "@/types/database";

// POST /api/reports/share
//
// Two flows:
//   - kind=self      → homeowner emails their own report to themselves
//   - kind=forward   → homeowner emails the report to a partner
// Both create a row in public.report_tokens with a 30-day expiry, then
// send the link via Postmark.
//
// We always return ok=true if the row was inserted, even if the email
// itself failed — the user has a token they could re-share if needed,
// and the dashboard tracking will surface the email failure.

export const runtime = "nodejs";
export const maxDuration = 30;

const REPORT_TOKEN_TTL_DAYS = 30;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<ShareReportResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = ShareReportRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<ShareReportResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const admin = createAdminClient();

  // Generate the row id ourselves so we can sign + return the token
  // before the insert resolves (one round-trip, not two).
  const reportId = randomUUID();
  const token = (() => {
    try {
      return buildReportToken(reportId);
    } catch (e) {
      console.error("[reports/share] cannot build token:", e);
      return null;
    }
  })();
  if (!token) {
    return NextResponse.json<ShareReportResponse>(
      { ok: false, error: "Server misconfiguration — REPORT_TOKEN_SECRET not set" },
      { status: 500 },
    );
  }

  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + REPORT_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  // Insert the token row
  const { error: insertErr } = await admin
    .from("report_tokens")
    .insert({
      id: reportId,
      token,
      kind: input.kind,
      recipient_email: input.recipientEmail.trim().toLowerCase(),
      forwarded_by_email:
        input.kind === "forward"
          ? // Forward sender = whoever owns the homeowner_lead. We
            // don't have their email on the request body, so use the
            // recipient's address as a placeholder for now and rely on
            // homeowner_lead_id for the proper audit trail.
            null
          : null,
      homeowner_lead_id: input.homeownerLeadId ?? null,
      analysis_snapshot: (input.analysisSnapshot ?? null) as Json,
      property_address: input.propertyAddress ?? null,
      property_postcode: input.propertyPostcode ?? null,
      property_uprn: input.propertyUprn ?? null,
      property_latitude: input.propertyLatitude ?? null,
      property_longitude: input.propertyLongitude ?? null,
      expires_at: expiresAt.toISOString(),
    });

  if (insertErr) {
    console.error("[reports/share] insert failed", insertErr);
    return NextResponse.json<ShareReportResponse>(
      { ok: false, error: "Could not save the share link" },
      { status: 500 },
    );
  }

  // Build the URL + send the email
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://propertoasty.com";
  const normalised = base.startsWith("http") ? base : `https://${base}`;
  const reportUrl = `${normalised.replace(/\/+$/, "")}/r/${token}`;

  const tpl =
    input.kind === "self"
      ? buildSelfReportEmail({
          reportUrl,
          propertyAddress: input.propertyAddress ?? null,
          recipientName: input.forwardedByName ?? null,
          expiresAtIso: expiresAt.toISOString(),
        })
      : buildForwardedReportEmail({
          reportUrl,
          propertyAddress: input.propertyAddress ?? null,
          forwardedByName: input.forwardedByName ?? null,
          personalNote: input.personalNote ?? null,
          expiresAtIso: expiresAt.toISOString(),
        });

  const emailRes = await sendEmail({
    to: input.recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    tags: [
      { name: "kind", value: `report_${input.kind}` },
      { name: "report_id", value: reportId },
    ],
  });

  if (emailRes.ok) {
    await admin
      .from("report_tokens")
      .update({ email_message_id: emailRes.id })
      .eq("id", reportId);
  } else if (!("skipped" in emailRes && emailRes.skipped)) {
    console.error(
      "[reports/share] send failed",
      "error" in emailRes ? emailRes.error : "unknown",
    );
  }

  return NextResponse.json<ShareReportResponse>({
    ok: true,
    token,
    expiresAt: expiresAt.toISOString(),
  });
}
