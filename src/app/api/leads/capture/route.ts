import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LeadCaptureRequestSchema,
  type LeadCaptureResponse,
} from "@/lib/schemas/leads";

// POST /api/leads/capture
//
// Called from the lead-capture screen between analysis and report.
// Upserts into public.leads keyed on lower(email) so the same user
// redoing the flow updates their record instead of creating duplicates.
//
// Future:
//   - When Supabase Auth is wired up, this becomes "or update" on user_id.
//   - Installer + admin signups use different endpoints that feed the
//     same table with different user_type values.

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<LeadCaptureResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = LeadCaptureRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<LeadCaptureResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const email = input.email.trim().toLowerCase();

  const admin = createAdminClient();

  // Look for an existing lead with the same email — dedupe by updating
  // instead of inserting a second row.
  const { data: existing, error: lookupError } = await admin
    .from("homeowner_leads")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[leads] lookup failed", lookupError);
    return NextResponse.json<LeadCaptureResponse>(
      { ok: false, error: "Database error" },
      { status: 500 },
    );
  }

  const payload = {
    email,
    name: input.name ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
    postcode: input.postcode ?? null,
    uprn: input.uprn ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    consent_marketing: input.consentMarketing,
    consent_installer_matching: input.consentInstallerMatching,
    analysis_snapshot: (input.analysisSnapshot ?? null) as unknown as never,
    user_type: "homeowner" as const,
    source: "check_flow" as const,
  };

  if (existing?.id) {
    const { error } = await admin
      .from("homeowner_leads")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      console.error("[leads] update failed", error);
      return NextResponse.json<LeadCaptureResponse>(
        { ok: false, error: "Could not save" },
        { status: 500 },
      );
    }
    return NextResponse.json<LeadCaptureResponse>({ ok: true, id: existing.id });
  }

  const { data: inserted, error: insertError } = await admin
    .from("homeowner_leads")
    .insert(payload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[leads] insert failed", insertError);
    return NextResponse.json<LeadCaptureResponse>(
      { ok: false, error: "Could not save" },
      { status: 500 },
    );
  }

  return NextResponse.json<LeadCaptureResponse>({ ok: true, id: inserted.id });
}
