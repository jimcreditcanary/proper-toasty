import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LeadCaptureRequestSchema,
  type LeadCaptureResponse,
} from "@/lib/schemas/leads";
import { FuelTariffSchema } from "@/lib/schemas/bill";
import { issueReportUrl } from "@/lib/booking/report-link";
import { track } from "@/lib/analytics";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  // Extract tariff metadata from the analysisSnapshot for denormalised
  // columns (migration 027). Best-effort: if the snapshot shape doesn't
  // match (older client, unexpected payload), we leave the columns null
  // and just persist the jsonb blob — analytics queries can backfill
  // later via the snapshot extraction script.
  const tariffDenorm = extractTariffDenorm(input.analysisSnapshot);

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
    // Denormalised tariff columns (migration 027) — null when extraction
    // didn't yield a value rather than blanking what's already in the row.
    ...tariffDenorm,
  };

  let homeownerLeadId: string;
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
    homeownerLeadId = existing.id;
  } else {
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
    homeownerLeadId = inserted.id;
  }

  // I5 — pre-survey attribution. When the capture carries a
  // presurvey request id, auto-create the installer_lead linking
  // back to the requesting installer (no booking dance, no extra
  // credit charge — they paid 1 credit per send already). Failures
  // here don't fail the capture: we want the homeowner to see their
  // report regardless and can heal the attribution out of band.
  if (input.preSurveyRequestId) {
    await tryAttributeToPreSurveyRequest(admin, {
      preSurveyRequestId: input.preSurveyRequestId,
      homeownerLeadId,
      payload,
    });
  }

  // Primary homeowner conversion event — the moment they're
  // captured into the platform. via_pre_survey lets us measure
  // organic vs installer-sourced funnel separately.
  track("homeowner_check_completed", {
    props: {
      via_pre_survey: !!input.preSurveyRequestId,
    },
    email: input.email,
  });

  return NextResponse.json<LeadCaptureResponse>({ ok: true, id: homeownerLeadId });
}

// ─── Pre-survey attribution ───────────────────────────────────────

async function tryAttributeToPreSurveyRequest(
  admin: SupabaseClient<Database>,
  args: {
    preSurveyRequestId: string;
    homeownerLeadId: string;
    payload: Record<string, unknown>;
  },
) {
  try {
    // Pull the request row + verify it's still actionable.
    const { data: request } = await admin
      .from("installer_pre_survey_requests")
      .select(
        "id, installer_id, contact_name, contact_email, contact_postcode, completed_at, expires_at",
      )
      .eq("id", args.preSurveyRequestId)
      .maybeSingle();
    if (!request) {
      console.warn("[leads] presurvey attribution skipped — request not found", {
        requestId: args.preSurveyRequestId,
      });
      return;
    }
    if (request.completed_at) {
      console.warn("[leads] presurvey already completed — skipping duplicate attribution", {
        requestId: args.preSurveyRequestId,
      });
      return;
    }

    const p = args.payload as Record<string, unknown>;

    // Auto-create the installer_lead. status starts at
    // 'installer_acknowledged' + installer_acknowledged_at stamped
    // so the inbox skips the accept dance entirely.
    const nowIso = new Date().toISOString();
    const { data: insertedLead, error: leadErr } = await admin
      .from("installer_leads")
      .insert({
        homeowner_lead_id: args.homeownerLeadId,
        installer_id: request.installer_id,
        contact_email: (p.email as string) ?? request.contact_email,
        contact_name: (p.name as string | null) ?? request.contact_name,
        contact_phone: (p.phone as string | null) ?? null,
        property_address: (p.address as string | null) ?? null,
        property_postcode:
          (p.postcode as string | null) ?? request.contact_postcode ?? null,
        property_uprn: (p.uprn as string | null) ?? null,
        property_latitude: (p.latitude as number | null) ?? null,
        property_longitude: (p.longitude as number | null) ?? null,
        analysis_snapshot: (p.analysis_snapshot ?? null) as never,
        wants_heat_pump: true,
        wants_solar: true,
        wants_battery: false,
        // Auto-acknowledged — installer requested this customer, no
        // booking acceptance needed.
        status: "installer_acknowledged",
        installer_acknowledged_at: nowIso,
        installer_notified_at: nowIso,
        notification_status: "skipped",
        pre_survey_request_id: request.id,
      })
      .select("id, homeowner_lead_id, contact_email, analysis_snapshot, property_address, property_postcode, property_latitude, property_longitude")
      .single();
    if (leadErr || !insertedLead) {
      console.error("[leads] presurvey installer_lead insert failed", leadErr);
      return;
    }

    // Mint a report URL so the installer can read the report from the
    // inbox the same way as a directory-routed lead.
    let reportUrl: string | null = null;
    try {
      const appBaseUrl = (
        process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
      ).replace(/\/+$/, "");
      reportUrl = await issueReportUrl({
        admin,
        lead: insertedLead,
        appBaseUrl,
      });
      await admin
        .from("installer_leads")
        .update({ installer_report_url: reportUrl })
        .eq("id", insertedLead.id);
    } catch (e) {
      console.warn("[leads] presurvey report URL mint failed", {
        leadId: insertedLead.id,
        err: e instanceof Error ? e.message : e,
      });
    }

    // Mark the request done + cross-link both lead ids.
    await admin
      .from("installer_pre_survey_requests")
      .update({
        status: "completed",
        completed_at: nowIso,
        result_homeowner_lead_id: args.homeownerLeadId,
        result_installer_lead_id: insertedLead.id,
      })
      .eq("id", request.id);

    console.info("[leads] presurvey attribution complete", {
      requestId: request.id,
      installerLeadId: insertedLead.id,
      reportUrlMinted: !!reportUrl,
    });
  } catch (e) {
    console.error("[leads] presurvey attribution threw", {
      requestId: args.preSurveyRequestId,
      err: e instanceof Error ? e.message : e,
    });
  }
}


// ─── Tariff denormalisation ─────────────────────────────────────────────────
//
// Pulls supplier + key rates out of the analysis snapshot for the flat
// columns added in migration 027. Best-effort: failures return all-null
// and we still write the row, since the full payload is preserved in
// analysis_snapshot regardless.

interface TariffDenormColumns {
  electricity_supplier: string | null;
  gas_supplier: string | null;
  electricity_unit_rate_p_per_kwh: number | null;
  gas_unit_rate_p_per_kwh: number | null;
  electricity_standing_charge_p_per_day: number | null;
  gas_standing_charge_p_per_day: number | null;
  annual_electricity_kwh: number | null;
  annual_gas_kwh: number | null;
  tariff_source:
    | "bill_upload"
    | "manual_known"
    | "manual_estimate"
    | null;
  is_time_of_use_tariff: boolean | null;
}

const EMPTY_DENORM: TariffDenormColumns = {
  electricity_supplier: null,
  gas_supplier: null,
  electricity_unit_rate_p_per_kwh: null,
  gas_unit_rate_p_per_kwh: null,
  electricity_standing_charge_p_per_day: null,
  gas_standing_charge_p_per_day: null,
  annual_electricity_kwh: null,
  annual_gas_kwh: null,
  tariff_source: null,
  is_time_of_use_tariff: null,
};

function extractTariffDenorm(snapshot: unknown): TariffDenormColumns {
  if (!snapshot || typeof snapshot !== "object") return EMPTY_DENORM;
  const snap = snapshot as Record<string, unknown>;

  const elec = FuelTariffSchema.safeParse(snap.electricityTariff);
  const gas = FuelTariffSchema.safeParse(snap.gasTariff);
  const elecData = elec.success ? elec.data : null;
  const gasData = gas.success ? gas.data : null;

  return {
    electricity_supplier: elecData?.provider ?? null,
    gas_supplier: gasData?.provider ?? null,
    electricity_unit_rate_p_per_kwh: elecData?.unitRatePencePerKWh ?? null,
    gas_unit_rate_p_per_kwh: gasData?.unitRatePencePerKWh ?? null,
    electricity_standing_charge_p_per_day:
      elecData?.standingChargePencePerDay ?? null,
    gas_standing_charge_p_per_day: gasData?.standingChargePencePerDay ?? null,
    annual_electricity_kwh: elecData?.estimatedAnnualUsageKWh
      ? Math.round(elecData.estimatedAnnualUsageKWh)
      : null,
    annual_gas_kwh: gasData?.estimatedAnnualUsageKWh
      ? Math.round(gasData.estimatedAnnualUsageKWh)
      : null,
    // Tariff source is shared across both fuels in the wizard — read from
    // electricity since it's always present (gas is conditional on heating
    // fuel). Fall back to gas if electricity is missing.
    tariff_source: elecData?.source ?? gasData?.source ?? null,
    // TOU flag only meaningful on electricity.
    is_time_of_use_tariff: elecData?.timeOfUseTariff ?? null,
  };
}
