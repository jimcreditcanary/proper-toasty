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

// The curl example. We use these exact figures as defaults so the calculator
// produces meaningful numbers even if a user reaches the report with sparse
// tariff data (shouldn't happen in normal flow — Step 3 enforces it — but
// belt-and-braces).
const SAMPLE_FALLBACKS = {
  elec_price_now: 0.28,
  gas_price_now: 0.0575,
  annual_elec_kwh: 3500,
  annual_gas_kwh: 12000,
  elec_standing_charge_daily: 0.55,
  gas_standing_charge_daily: 0.30,
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
  const solarPot =
    analysis.solar.coverage === true ? analysis.solar.data.solarPotential : null;
  const numPanels = solarPot?.maxArrayPanelsCount ?? SAMPLE_FALLBACKS.num_panels;
  const panelWatts = solarPot?.panelCapacityWatts ?? SAMPLE_FALLBACKS.panel_size_watts;

  const body: SavingsCalculatorRequest = {
    num_panels: numPanels,
    panel_size_watts: panelWatts,
    years: inputs.years ?? FINANCE_DEFAULTS.defaultYears,

    has_solar: inputs.hasSolar,
    has_battery: inputs.hasBattery,
    has_heat_pump: inputs.hasHeatPump,

    battery_kwh: inputs.batteryKwh ?? FINANCE_DEFAULTS.defaultBatteryKwh,

    elec_price_now: penceToPounds(
      electricityTariff?.unitRatePencePerKWh,
      SAMPLE_FALLBACKS.elec_price_now,
    ),
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

    off_peak_elec_price: FINANCE_DEFAULTS.defaultOffPeakElecPrice,
    export_price: inputs.exportPrice ?? FINANCE_DEFAULTS.defaultExportPrice,

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
