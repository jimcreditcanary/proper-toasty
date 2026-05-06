// POST /api/checks/upsert
//
// Single endpoint the wizard hits at every persistence-worthy
// milestone (floorplan uploaded, analysis complete, lead captured).
// Anonymous-friendly: takes a `clientSessionId` so a guest browser
// can keep updating the same draft check across reloads.
//
// Identity resolution:
//   1. If the request is authenticated, prefer auth.uid() as the
//      lookup key. The clientSessionId still gets stored so we can
//      stitch a guest-then-signed-up flow back together later.
//   2. Otherwise look up by clientSessionId. If none exists, insert.
//
// Idempotent: send the same payload twice and you get the same row.
// The `id` returned in the response is the canonical handle the
// wizard should remember for follow-up writes (e.g. the lead capture
// route uses it to set homeowner_lead_id).
//
// What this endpoint does NOT do:
//   - Insert into check_results. That belongs to the analyse pipeline,
//     not the per-step upsert. (Future: when /api/analyse runs from
//     here, it can write the results blob too.)
//   - Run any analysis. Pure persistence.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 15;

// Mirrors the wizard's address shape (kept loose — fields are all
// optional because the wizard upserts at multiple points and earlier
// upserts won't have everything yet).
//
// `metadata` is the OS Places rich-fields blob — see
// src/lib/schemas/address-lookup.ts AddressMetadataSchema. Persisted to
// public.checks.address_metadata as JSONB (migration 057). Validated
// loosely as a generic record so a future addition to AddressMetadata
// doesn't break older clients still sending the old shape.
const AddressSchema = z.object({
  uprn: z.string().nullable().optional(),
  udprn: z.string().nullable().optional(),
  formatted: z.string().nullable().optional(),
  line1: z.string().nullable().optional(),
  line2: z.string().nullable().optional(),
  postTown: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  country: z.enum(["England", "Wales", "Scotland", "Northern Ireland"]).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

const ContextSchema = z.object({
  tenure: z.enum(["owner", "landlord", "tenant", "social"]).nullable().optional(),
  currentHeatingFuel: z.enum(["gas", "oil", "lpg", "electric", "heat_pump", "biomass", "other"]).nullable().optional(),
  hotWaterTankPresent: z.enum(["yes", "no", "unsure"]).nullable().optional(),
  outdoorSpaceForAshp: z.enum(["yes", "no", "unsure"]).nullable().optional(),
  hybridPreference: z.enum(["replace", "hybrid", "undecided"]).nullable().optional(),
});

// Headline metrics from the floorplan extraction pass. Optional —
// when present, we denormalise them onto the checks row so admin
// queries don't need a JSONB path expression. The full analysis
// blob (per-room breakdown, walls, doors, etc.) goes into
// check_results.floorplan_analysis when supplied via floorplanAnalysis.
const FloorplanMetricsLiteSchema = z.object({
  roomCount: z.number().int().nonnegative().nullable().optional(),
  floorsCount: z.number().int().positive().nullable().optional(),
  totalAreaM2: z.number().positive().nullable().optional(),
  totalAreaSqFt: z.number().positive().nullable().optional(),
});

const RequestSchema = z.object({
  // UUID minted client-side (in the wizard) and kept in localStorage.
  // Required even for authenticated users so we have a stable handle.
  clientSessionId: z.string().min(8).max(64),
  // Optional canonical id — once the first upsert returns one, the
  // wizard sends it back on subsequent calls so we never go searching.
  checkId: z.string().uuid().optional(),
  // What state the wizard is in — the column we set + the check status.
  status: z.enum(["draft", "running", "complete", "failed"]).default("draft"),
  address: AddressSchema.optional(),
  context: ContextSchema.optional(),
  // Floorplan tracking — set when the upload completes.
  floorplanObjectKey: z.string().nullable().optional(),
  // Headline floorplan metrics (denormalised onto checks columns).
  floorplanMetrics: FloorplanMetricsLiteSchema.optional(),
  // Full FloorplanAnalysis blob — written into check_results.floorplan_analysis
  // as JSONB. Loose schema here because the canonical Zod schema
  // lives in src/lib/schemas/floorplan.ts and runs client-side; we
  // store whatever the wizard sends rather than re-parsing the full
  // shape on every upsert.
  floorplanAnalysis: z.unknown().optional(),
  // Tariff blobs — pass-through. Schema-validated upstream.
  electricityTariff: z.unknown().nullable().optional(),
  gasTariff: z.unknown().nullable().optional(),
  // EPC certificate — when the wizard's analyse step completes it
  // forwards the full normalised cert here. We write the JSONB blob
  // to check_results.epc_raw and denormalise the high-cardinality
  // fields onto the checks row (migration 058) for admin queries.
  // Schema kept loose so a future EpcCertificate field addition
  // doesn't need a coordinated client+server release.
  epcCertificate: z
    .object({
      certificateNumber: z.string().nullable().optional(),
      currentEnergyBand: z.string().nullable().optional(),
      potentialEnergyBand: z.string().nullable().optional(),
      propertyType: z.string().nullable().optional(),
      builtForm: z.string().nullable().optional(),
      constructionAgeBand: z.string().nullable().optional(),
      mainFuel: z.string().nullable().optional(),
      totalFloorAreaM2: z.number().nullable().optional(),
      registrationDate: z.string().nullable().optional(),
    })
    .passthrough()
    .nullable()
    .optional(),
});

type CheckInsert = Database["public"]["Tables"]["checks"]["Insert"];

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Auth lookup — best-effort. The endpoint works without it (guest
  // mode) so we don't fail when there's no session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const admin = createAdminClient();

  // ─── Build the patch ────────────────────────────────────────────
  // We never set fields that weren't sent. Guards against an early
  // upsert overwriting later wizard state with empty defaults.
  const patch: Partial<CheckInsert> = {
    status: input.status,
    client_session_id: input.clientSessionId,
    user_id: userId,
  };
  if (input.address) {
    if (input.address.uprn !== undefined) patch.uprn = input.address.uprn;
    if (input.address.udprn !== undefined) patch.udprn = input.address.udprn;
    if (input.address.formatted !== undefined) patch.address_formatted = input.address.formatted;
    if (input.address.line1 !== undefined) patch.address_line1 = input.address.line1;
    if (input.address.line2 !== undefined) patch.address_line2 = input.address.line2;
    if (input.address.postTown !== undefined) patch.post_town = input.address.postTown;
    if (input.address.postcode !== undefined) patch.postcode = input.address.postcode;
    if (input.address.latitude !== undefined) patch.latitude = input.address.latitude;
    if (input.address.longitude !== undefined) patch.longitude = input.address.longitude;
    if (input.address.country !== undefined) patch.country = input.address.country;
    // Rich OS Places metadata — JSONB column, see migration 057.
    // Sent fresh on the address-pick upsert; later upserts omit it
    // (undefined) so we don't clobber the captured row.
    // Cast to Json — Postgres JSONB accepts the same shapes our zod
    // record schema produces; the Supabase Json type is recursive and
    // a generic Record<string, unknown> doesn't structurally match.
    if (input.address.metadata !== undefined) {
      patch.address_metadata = (input.address.metadata ?? null) as
        | Json
        | null;
    }
  }
  if (input.context) {
    if (input.context.tenure !== undefined) patch.tenure = input.context.tenure;
    if (input.context.currentHeatingFuel !== undefined) patch.current_heating_fuel = input.context.currentHeatingFuel;
    if (input.context.hotWaterTankPresent !== undefined) patch.hot_water_tank_present = input.context.hotWaterTankPresent;
    if (input.context.outdoorSpaceForAshp !== undefined) patch.outdoor_space_for_ashp = input.context.outdoorSpaceForAshp;
    if (input.context.hybridPreference !== undefined) patch.hybrid_preference = input.context.hybridPreference;
  }
  if (input.floorplanObjectKey !== undefined) {
    patch.floorplan_object_key = input.floorplanObjectKey;
    // Stamp the upload time only on the first time we set the key
    // for a given check. Re-uploads would re-stamp via the application
    // layer if needed; not worth the complexity here.
    if (input.floorplanObjectKey !== null) {
      patch.floorplan_uploaded_at = new Date().toISOString();
    }
  }
  // Headline metrics → denormalised columns on checks. Each is set
  // only when sent so partial upserts don't blank previously-extracted
  // values.
  if (input.floorplanMetrics) {
    const m = input.floorplanMetrics;
    if (m.roomCount !== undefined) patch.room_count = m.roomCount;
    if (m.floorsCount !== undefined) patch.floors_count = m.floorsCount;
    if (m.totalAreaM2 !== undefined) patch.total_area_m2 = m.totalAreaM2;
    if (m.totalAreaSqFt !== undefined) patch.total_area_sqft = m.totalAreaSqFt;
  }
  // Tariff blobs are jsonb — admin client takes any JSON-serialisable.
  if (input.electricityTariff !== undefined) {
    patch.electricity_tariff = input.electricityTariff as never;
  }
  if (input.gasTariff !== undefined) {
    patch.gas_tariff = input.gasTariff as never;
  }

  // EPC denormalised fields — migration 058. Source-of-truth JSONB
  // lives in check_results.epc_raw (written below). These columns
  // exist for indexed admin queries + BUS rules without JSONB paths.
  // Each is set only when the cert carries it so partial sends don't
  // blank previously-stored values.
  if (input.epcCertificate) {
    const c = input.epcCertificate;
    if (c.certificateNumber !== undefined) patch.epc_certificate_number = c.certificateNumber;
    if (c.currentEnergyBand !== undefined) patch.epc_band = c.currentEnergyBand;
    if (c.potentialEnergyBand !== undefined) patch.epc_band_potential = c.potentialEnergyBand;
    if (c.propertyType !== undefined) patch.epc_property_type = c.propertyType;
    if (c.builtForm !== undefined) patch.epc_built_form = c.builtForm;
    if (c.constructionAgeBand !== undefined) patch.epc_construction_age_band = c.constructionAgeBand;
    if (c.mainFuel !== undefined) patch.epc_main_fuel = c.mainFuel;
    if (c.totalFloorAreaM2 !== undefined) patch.epc_total_floor_area_m2 = c.totalFloorAreaM2;
    // EPC API returns ISO date "2024-11-20" or sometimes a full datetime.
    // Postgres `date` accepts both — slice to YYYY-MM-DD defensively.
    if (c.registrationDate !== undefined) {
      patch.epc_registration_date = c.registrationDate
        ? c.registrationDate.slice(0, 10)
        : null;
    }
  }

  // ─── Find existing row ──────────────────────────────────────────
  // Order of preference:
  //   1. Explicit checkId in the request (cheapest — no scan).
  //   2. user_id (when authenticated).
  //   3. client_session_id (guest case).
  let existingId: string | null = null;
  if (input.checkId) {
    const { data } = await admin
      .from("checks")
      .select("id")
      .eq("id", input.checkId)
      .maybeSingle();
    if (data) existingId = data.id;
  }
  if (!existingId && userId) {
    // For authenticated users we keep one in-flight check at a time —
    // the most recently updated draft. Completed checks are left
    // alone so a returning user starting fresh always gets a new row.
    const { data } = await admin
      .from("checks")
      .select("id")
      .eq("user_id", userId)
      .eq("client_session_id", input.clientSessionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) existingId = data.id;
  }
  if (!existingId) {
    const { data } = await admin
      .from("checks")
      .select("id")
      .eq("client_session_id", input.clientSessionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) existingId = data.id;
  }

  // ─── Upsert checks row ──────────────────────────────────────────
  let resultId: string;
  let created: boolean;
  if (existingId) {
    const { error } = await admin
      .from("checks")
      .update(patch)
      .eq("id", existingId);
    if (error) {
      console.error("[checks/upsert] update failed", error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    resultId = existingId;
    created = false;
  } else {
    // Insert path — short_id auto-fills via the BEFORE INSERT trigger
    // from migration 053, so we don't need to provide one.
    const { data: inserted, error: insertError } = await admin
      .from("checks")
      .insert(patch as CheckInsert)
      .select("id")
      .single();
    if (insertError || !inserted) {
      console.error("[checks/upsert] insert failed", insertError);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }
    resultId = inserted.id;
    created = true;
  }

  // ─── Upsert check_results when blobby analysis present ──────────
  // Two JSONB blobs land here:
  //   - floorplan_analysis (per-room breakdown + walls/doors + AI placements)
  //   - epc_raw            (full EPC certificate — every field GOV.UK
  //                         returned, plus the .passthrough() leftovers)
  // Either, both, or neither may be present on a given upsert. We
  // build the patch lazily so a wizard step that only has floorplan
  // doesn't blank a previously-stored EPC and vice versa.
  type CheckResultsInsert = Database["public"]["Tables"]["check_results"]["Insert"];
  const resultsPatch: Partial<CheckResultsInsert> = {};
  if (input.floorplanAnalysis !== undefined) {
    resultsPatch.floorplan_analysis = input.floorplanAnalysis as never;
  }
  if (input.epcCertificate !== undefined) {
    resultsPatch.epc_raw = (input.epcCertificate ?? null) as Json | null;
  }
  if (Object.keys(resultsPatch).length > 0) {
    const { error: resultsErr } = await admin
      .from("check_results")
      .upsert(
        {
          check_id: resultId,
          ...resultsPatch,
        },
        { onConflict: "check_id" },
      );
    if (resultsErr) {
      // Non-fatal — the checks row is saved, just log + continue.
      console.warn("[checks/upsert] check_results upsert failed", resultsErr);
    }
  }

  return NextResponse.json({ ok: true, id: resultId, created });
}
