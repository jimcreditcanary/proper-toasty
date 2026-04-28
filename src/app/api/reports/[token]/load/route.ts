import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseReportToken } from "@/lib/email/tokens";
import type { LoadReportResponse } from "@/lib/schemas/report-share";

// GET /api/reports/[token]/load
//
// Validates the token (HMAC + DB lookup), returns the snapshot for the
// public report viewer at /r/[token]. Increments view_count.
//
// Status codes:
//   200 — { ok: true, snapshot, property, ... }
//   400 — bad token shape
//   404 — token not found
//   410 — token expired (but recognised) — UI shows "do a new search"

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const reportId = parseReportToken(token);
  if (!reportId) {
    return NextResponse.json<LoadReportResponse>(
      { ok: false, error: "Invalid link" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("report_tokens")
    .select(
      "id, analysis_snapshot, property_address, property_postcode, property_uprn, property_latitude, property_longitude, created_at, expires_at, view_count",
    )
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    console.error("[reports/load] lookup failed", error);
    return NextResponse.json<LoadReportResponse>(
      { ok: false, error: "Could not load report" },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json<LoadReportResponse>(
      { ok: false, error: "Report not found" },
      { status: 404 },
    );
  }

  const expired = new Date(data.expires_at).getTime() < Date.now();
  if (expired) {
    return NextResponse.json<LoadReportResponse>(
      {
        ok: false,
        expired: true,
        expiresAt: data.expires_at,
        error:
          "This report has expired. Energy prices and grant rules may have changed — please run a fresh check.",
      },
      { status: 410 },
    );
  }

  // Bump view tracking — fire-and-forget, doesn't gate the response.
  const now = new Date().toISOString();
  admin
    .from("report_tokens")
    .update({
      last_viewed_at: now,
      first_viewed_at: data.view_count === 0 ? now : undefined,
      view_count: data.view_count + 1,
    })
    .eq("id", reportId)
    .then(({ error: e }) => {
      if (e) console.warn("[reports/load] view bump failed", e);
    });

  return NextResponse.json<LoadReportResponse>({
    ok: true,
    snapshot: data.analysis_snapshot,
    property: {
      address: data.property_address,
      postcode: data.property_postcode,
      uprn: data.property_uprn,
      latitude: data.property_latitude
        ? Number(data.property_latitude)
        : null,
      longitude: data.property_longitude
        ? Number(data.property_longitude)
        : null,
    },
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  });
}
