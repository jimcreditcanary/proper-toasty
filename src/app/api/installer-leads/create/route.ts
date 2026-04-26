import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateInstallerLeadRequestSchema,
  type CreateInstallerLeadResponse,
} from "@/lib/schemas/installers";

// POST /api/installer-leads/create
//
// Captures a "book a site visit" submission from the report tab.
// Inserts into public.installer_leads. Status starts at "new" — a
// future cron / webhook will fan-out to the installer (PR 4 owns the
// notification path).
//
// Service-role write only — no public RLS policies on the table.

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = CreateInstallerLeadRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<CreateInstallerLeadResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const admin = createAdminClient();

  // Verify the installer exists before inserting — gives a clearer error
  // than a foreign-key violation, and lets us 404 properly if someone
  // POSTs a stale id.
  const { data: installer, error: lookupError } = await admin
    .from("installers")
    .select("id")
    .eq("id", input.installerId)
    .maybeSingle();
  if (lookupError) {
    console.error("[installer-leads] lookup failed", lookupError);
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Database error" },
      { status: 500 },
    );
  }
  if (!installer) {
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Installer not found" },
      { status: 404 },
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from("installer_leads")
    .insert({
      installer_id: input.installerId,
      homeowner_lead_id: input.homeownerLeadId ?? null,
      contact_email: input.contactEmail.trim().toLowerCase(),
      contact_name: input.contactName ?? null,
      contact_phone: input.contactPhone ?? null,
      preferred_contact_method: input.preferredContactMethod ?? null,
      preferred_contact_window: input.preferredContactWindow ?? null,
      notes: input.notes ?? null,
      wants_heat_pump: input.wantsHeatPump,
      wants_solar: input.wantsSolar,
      wants_battery: input.wantsBattery,
      property_address: input.propertyAddress ?? null,
      property_postcode: input.propertyPostcode ?? null,
      property_uprn: input.propertyUprn ?? null,
      property_latitude: input.propertyLatitude ?? null,
      property_longitude: input.propertyLongitude ?? null,
      analysis_snapshot: (input.analysisSnapshot ?? null) as never,
      status: "new",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[installer-leads] insert failed", insertError);
    return NextResponse.json<CreateInstallerLeadResponse>(
      { ok: false, error: "Could not save your booking" },
      { status: 500 },
    );
  }

  return NextResponse.json<CreateInstallerLeadResponse>({
    ok: true,
    id: inserted.id,
  });
}
