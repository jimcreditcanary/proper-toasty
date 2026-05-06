// Wizard → /api/checks/upsert helper.
//
// Centralises the request shape so individual step components don't
// each repeat the field-mapping. Fire-and-forget by design: every
// caller catches and logs failures so a hiccup with persistence
// never blocks the wizard.
//
// Returns the server-assigned check id on success so the caller can
// store it in state (and pass it back on the next call to skip the
// session-id lookup).

import type { CheckWizardState } from "./types";

export interface UpsertCheckArgs {
  state: CheckWizardState;
  /** Override the wizard's status — useful when transitioning. */
  status?: "draft" | "running" | "complete" | "failed";
}

export interface UpsertCheckResult {
  ok: boolean;
  id: string | null;
  created: boolean;
  error?: string;
}

export async function upsertCheck(args: UpsertCheckArgs): Promise<UpsertCheckResult> {
  const { state, status } = args;
  if (!state.clientSessionId) {
    // Wizard provider should always mint one before any step renders.
    // If it hasn't, we don't try to persist — no key to dedupe on.
    return { ok: false, id: null, created: false, error: "no clientSessionId" };
  }

  const body = {
    clientSessionId: state.clientSessionId,
    checkId: state.checkId ?? undefined,
    status: status ?? "draft",
    address: state.address
      ? {
          uprn: state.address.uprn ?? null,
          udprn: null, // not currently surfaced through wizard state
          formatted: state.address.formattedAddress ?? null,
          line1: state.address.line1 ?? null,
          line2: state.address.line2 ?? null,
          postTown: state.address.postTown ?? null,
          postcode: state.address.postcode ?? null,
          latitude: state.address.latitude ?? null,
          longitude: state.address.longitude ?? null,
          country: state.country ?? null,
          metadata: state.address.metadata ?? null,
        }
      : undefined,
    context: {
      tenure: state.tenure ?? null,
      currentHeatingFuel:
        state.currentHeatingFuel === "gas"
          ? "gas"
          : state.currentHeatingFuel === "electric"
            ? "electric"
            : state.currentHeatingFuel === "other"
              ? "other"
              : null,
      // Wizard doesn't capture these directly yet — they come from
      // the floorplan analysis. Leave undefined so we don't overwrite.
      hotWaterTankPresent: undefined,
      outdoorSpaceForAshp: undefined,
      hybridPreference: undefined,
    },
    floorplanObjectKey: state.floorplanObjectKey ?? null,
    // Headline metrics — denormalised on checks. Only sent when
    // the metrics extraction has actually run (extractedAt set).
    floorplanMetrics: state.floorplanAnalysis?.metrics?.extractedAt
      ? {
          roomCount: state.floorplanAnalysis.metrics.rooms.length,
          floorsCount: state.floorplanAnalysis.metrics.floorsCount ?? null,
          totalAreaM2: state.floorplanAnalysis.metrics.totalAreaM2 ?? null,
          totalAreaSqFt: state.floorplanAnalysis.metrics.totalAreaSqFt ?? null,
        }
      : undefined,
    // Full FloorplanAnalysis blob — written to check_results.floorplan_analysis.
    floorplanAnalysis: state.floorplanAnalysis ?? undefined,
    electricityTariff: state.electricityTariff ?? undefined,
    gasTariff: state.gasTariff ?? undefined,
    // EPC cert from the analyse step. Forwarded to /api/checks/upsert
    // which (a) writes the full cert to check_results.epc_raw and
    // (b) denormalises high-cardinality fields onto the checks row
    // — see migration 058. Sent when the analyse step has produced
    // a found:true response; omitted otherwise to avoid blanking
    // a previously-stored cert.
    epcCertificate:
      state.analysis?.epc.found && state.analysis.epc.certificate
        ? state.analysis.epc.certificate
        : undefined,

    // Other API blobs from the analyse step. Each lands in its
    // dedicated check_results JSONB column. Sent only once the
    // analyse step has produced a result so partial mid-wizard
    // upserts don't blank previously-stored data.
    solarRaw: state.analysis?.solar ?? undefined,
    pvgisRaw: state.analysis?.pvgis ?? undefined,
    floodRaw: state.analysis?.enrichments?.flood ?? undefined,
    listedRaw: state.analysis?.enrichments?.listed ?? undefined,
    planningRaw: state.analysis?.enrichments?.planning ?? undefined,
    eligibility: state.analysis?.eligibility ?? undefined,
    finance: state.analysis?.finance ?? undefined,
  };

  try {
    const res = await fetch("/api/checks/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      console.warn("[wizard.persist] upsert HTTP fail", res.status, j.error);
      return {
        ok: false,
        id: null,
        created: false,
        error: j.error ?? `HTTP ${res.status}`,
      };
    }
    const j = (await res.json()) as { id: string; created: boolean };
    return { ok: true, id: j.id, created: j.created };
  } catch (err) {
    console.warn("[wizard.persist] upsert threw", err);
    return {
      ok: false,
      id: null,
      created: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
