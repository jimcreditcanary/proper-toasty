// Savings calculator service — maps wizard state + user overrides into the
// Octopus calculator API request and returns the parsed response.
//
// Called from the /api/savings/calculate route handler. Never imported into
// client code (the Bearer token must stay server-side).
//
// Reference for the API: see docs/notes or the curl in CLAUDE history.

import {
  SavingsCalculatorRequestSchema,
  SavingsCalculatorResponseSchema,
  type SavingsCalculatorRequest,
  type SavingsCalculatorResponse,
  type SavingsCalculateResult,
} from "@/lib/schemas/savings";
import { FINANCE_DEFAULTS } from "@/lib/config/finance";
import { getSupplierTariff } from "@/lib/energy/supplier-tariffs";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";

const OCTOPUS_CALCULATOR_URL =
  "https://gcp-engineeringpipelines-main-ebac28a.zuplo.app/api/energy/calculate/";

// User-controlled inputs from the report-page calculator UI.
// Anything optional falls back to FINANCE_DEFAULTS / wizard state.
export interface CalculatorInputs {
  hasSolar: boolean;
  hasBattery: boolean;
  hasHeatPump: boolean;
  batteryKwh?: number;
  years?: number;
  exportPrice?: number;
  solarLoanTermYears?: number;
  batteryLoanTermYears?: number;
}

// Pence/kWh → £/kWh, with a sensible fallback when the tariff is missing.
function penceToPounds(pence: number | null | undefined, fallback: number): number {
  if (pence == null || Number.isNaN(pence)) return fallback;
  return pence / 100;
}

// Pence/day → £/day for standing charges.
function penceDayToPoundsDay(pence: number | null | undefined, fallback: number): number {
  return penceToPounds(pence, fallback);
}

function annualKwh(tariff: FuelTariff | null | undefined, fallback: number): number {
  return tariff?.estimatedAnnualUsageKWh ?? fallback;
}

// Belt-and-braces fallback when the user reaches the calculator with no
// tariff data (shouldn't happen in normal flow — Step 3 enforces tariff
// entry — but defensive). Sourced from the "Other" row of SUPPLIER_TARIFFS
// so this stays in sync with whatever the current Ofgem cap is whenever
// we refresh the supplier table.
const OFGEM_FALLBACK = getSupplierTariff(null);
const SAMPLE_FALLBACKS = {
  elec_price_now: OFGEM_FALLBACK.electricity.unitRatePencePerKWh / 100,
  gas_price_now: OFGEM_FALLBACK.gas.unitRatePencePerKWh / 100,
  annual_elec_kwh: 3500,
  annual_gas_kwh: 12000,
  elec_standing_charge_daily:
    OFGEM_FALLBACK.electricity.standingChargePencePerDay / 100,
  gas_standing_charge_daily:
    OFGEM_FALLBACK.gas.standingChargePencePerDay / 100,
  off_peak_elec_price:
    (OFGEM_FALLBACK.electricity.offPeakRatePencePerKWh ?? 10) / 100,
  export_price: OFGEM_FALLBACK.electricity.exportRatePencePerKWh / 100,
  num_panels: 10,
  panel_size_watts: 400, // realistic per-panel; the curl's 10000 looked like total system size
} as const;

// Build the API request body from wizard state + user overrides.
export function buildCalculatorRequest(
  analysis: AnalyseResponse,
  electricityTariff: FuelTariff | null,
  gasTariff: FuelTariff | null,
  inputs: CalculatorInputs,
): SavingsCalculatorRequest {
  // Solar response is a discriminated union — only `coverage: true` carries
  // data. When Google has no coverage we fall back to sample numbers so the
  // calculator still produces meaningful figures.
  //
  // Prefer eligibility.solar.recommendedPanels (post-shading + economic
  // viability) over solarPotential.maxArrayPanelsCount (raw "physically
  // fits") so the calc models the array we'd actually quote, not the
  // theoretical maximum the roof could hold.
  const solarPot =
    analysis.solar.coverage === true ? analysis.solar.data.solarPotential : null;
  const numPanels =
    analysis.eligibility.solar.recommendedPanels ??
    solarPot?.maxArrayPanelsCount ??
    SAMPLE_FALLBACKS.num_panels;
  const panelWatts = solarPot?.panelCapacityWatts ?? SAMPLE_FALLBACKS.panel_size_watts;

  // Supplier-aware tariff lookup. When the user has no electricity tariff
  // at all we still want sensible export / off-peak defaults — pull them
  // from the same supplier table as the band fallback.
  const supplierTariff = getSupplierTariff(electricityTariff?.provider);

  // Standard-rate electricity (£/kWh) — supplied by the user's tariff or
  // the supplier-table fallback. This drives both the "do nothing" cost
  // and the off-peak collapse below.
  const elecPriceNow = penceToPounds(
    electricityTariff?.unitRatePencePerKWh,
    SAMPLE_FALLBACKS.elec_price_now,
  );

  // Off-peak: only meaningful when the user is on a TOU tariff. If they're
  // not (or aren't sure), set off-peak == standard rate so the calculator
  // doesn't credit them with battery / EV savings they're not getting.
  const userOnTou = electricityTariff?.timeOfUseTariff === true;
  const supplierOffPeakP = supplierTariff.electricity.offPeakRatePencePerKWh;
  const offPeakElecPrice = userOnTou
    ? penceToPounds(supplierOffPeakP, FINANCE_DEFAULTS.defaultOffPeakElecPrice)
    : elecPriceNow;

  // SEG export rate: prefer an explicit override on the tariff, else the
  // supplier's published rate from the table, else the FINANCE_DEFAULTS
  // benchmark. Inputs.exportPrice (report-page slider) is the final override.
  const exportPriceFromState = penceToPounds(
    electricityTariff?.exportRatePencePerKWh,
    penceToPounds(
      supplierTariff.electricity.exportRatePencePerKWh,
      FINANCE_DEFAULTS.defaultExportPrice,
    ),
  );

  const body: SavingsCalculatorRequest = {
    num_panels: numPanels,
    panel_size_watts: panelWatts,
    years: inputs.years ?? FINANCE_DEFAULTS.defaultYears,

    has_solar: inputs.hasSolar,
    has_battery: inputs.hasBattery,
    has_heat_pump: inputs.hasHeatPump,

    battery_kwh: inputs.batteryKwh ?? FINANCE_DEFAULTS.defaultBatteryKwh,

    elec_price_now: elecPriceNow,
    gas_price_now: penceToPounds(
      gasTariff?.unitRatePencePerKWh,
      SAMPLE_FALLBACKS.gas_price_now,
    ),

    annual_elec_kwh: annualKwh(electricityTariff, SAMPLE_FALLBACKS.annual_elec_kwh),
    annual_gas_kwh: annualKwh(gasTariff, SAMPLE_FALLBACKS.annual_gas_kwh),

    solar_loan_apr_pct: FINANCE_DEFAULTS.solarLoanAprPct,
    solar_loan_term_years:
      inputs.solarLoanTermYears ?? FINANCE_DEFAULTS.defaultSolarLoanTermYears,
    battery_loan_apr_pct: FINANCE_DEFAULTS.batteryLoanAprPct,
    battery_loan_term_years:
      inputs.batteryLoanTermYears ?? FINANCE_DEFAULTS.defaultBatteryLoanTermYears,

    off_peak_elec_price: offPeakElecPrice,
    export_price: inputs.exportPrice ?? exportPriceFromState,

    elec_standing_charge_daily: penceDayToPoundsDay(
      electricityTariff?.standingChargePencePerDay,
      SAMPLE_FALLBACKS.elec_standing_charge_daily,
    ),
    gas_standing_charge_daily: penceDayToPoundsDay(
      gasTariff?.standingChargePencePerDay,
      SAMPLE_FALLBACKS.gas_standing_charge_daily,
    ),
  };

  return SavingsCalculatorRequestSchema.parse(body);
}

// Call the Octopus calculator. Returns a result envelope so the route handler
// can render a graceful error in the UI (same pattern as other external APIs).
export async function callCalculator(
  request: SavingsCalculatorRequest,
): Promise<SavingsCalculateResult> {
  const bearer = process.env.OCTOPUS_CALCULATOR_BEARER;
  if (!bearer) {
    return {
      ok: false,
      request,
      response: null,
      error: "OCTOPUS_CALCULATOR_BEARER is not configured",
    };
  }

  try {
    const res = await fetch(OCTOPUS_CALCULATOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Schema": "octopus",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(request),
      // Octopus is fast in our testing; 15s is generous.
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        request,
        response: null,
        error: `Octopus API ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const json: unknown = await res.json();
    const parsed: SavingsCalculatorResponse = SavingsCalculatorResponseSchema.parse(json);

    return { ok: true, request, response: parsed, error: null };
  } catch (e) {
    return {
      ok: false,
      request,
      response: null,
      error: e instanceof Error ? e.message : "Unknown error calling Octopus",
    };
  }
}
