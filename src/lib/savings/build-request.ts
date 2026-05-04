// Maps the wizard's captured state + the user's plan toggles into a
// `CalculateRequest` shaped for POST /api/savings/calculate.
//
// Pure function — kept separate from the React hook so it's trivially
// testable and so the same builder can drive both the live calc and
// future server-side renders (PDF / share-link snapshots).
//
// Anything we don't have a confident value for is OMITTED from the
// request — Zod's prefault on the API side fills it in with a
// reasonable default. Better to fall back to defaults than to send
// zero for a missing field and silently zero out a calculation.

import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { ReportSelection } from "@/components/check-wizard/report/report-shell";
import type { CalculateRequest } from "./scenarios-schema";

export interface FinancingInputs {
  loanTermMonths: number;
  loanApr: number;
  mortgageRate: number;
  mortgageTermYears: number;
  /** Show + fund the personal-loan scenario. Doubles as the API's
   *  `improvements.want_finance` flag — when off, the loan PMT
   *  computation skips so the scenario disappears from the chart. */
  wantFinance: boolean;
  /** Show the "add to mortgage" scenario. UI-only flag — the API
   *  always computes mortgage; this just hides the column when the
   *  homeowner doesn't have / want a mortgage option. */
  wantMortgage: boolean;
}

export const DEFAULT_FINANCING: FinancingInputs = {
  loanTermMonths: 120,
  loanApr: 0.069,
  mortgageRate: 0.045,
  mortgageTermYears: 25,
  wantFinance: true,
  wantMortgage: true,
};

interface BuildArgs {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  selection: ReportSelection;
  financing: FinancingInputs;
}

// Snap an arbitrary battery size onto the API's allowed price-point
// rungs (0 / 3 / 5 / 10). The Solar tab's sizer lets the user pick
// any kWh value; the API only knows the four points the cost lookup
// table is calibrated for.
export function snapBatteryKwh(kwh: number): 0 | 3 | 5 | 10 {
  if (kwh <= 0) return 0;
  if (kwh <= 4) return 3;
  if (kwh <= 7.5) return 5;
  return 10;
}

// Pence-per-kWh / pence-per-day → £/kWh / £/day. Returns null when the
// tariff field itself was null so the caller can decide to omit it
// rather than send 0.
function penceToGbp(p: number | null | undefined): number | null {
  return p == null ? null : p / 100;
}

export function buildSavingsRequest(args: BuildArgs): CalculateRequest {
  const { analysis, electricityTariff, gasTariff, selection, financing } = args;

  // ── current_energy ──────────────────────────────────────────────────
  // Only override fields we have real values for. `null` from
  // penceToGbp means the source tariff didn't have that figure (e.g.
  // user picked a low/medium/high band without entering exact rates).
  const currentEnergy: NonNullable<CalculateRequest["currentEnergy"]> = {
    hasGas: gasTariff != null,
    hasElectric: electricityTariff != null,
    // Provide defaults that Zod's `.prefault({})` would supply anyway —
    // explicit so the TS type is satisfied.
    electricStandingChargePerDay: 0.2,
    gasStandingChargePerDay: 0.2,
    electricityKwhPrice: 0.2518,
    gasKwhPrice: 0.0504,
    annualGasConsumptionKwh: 11500,
    annualElectricityConsumptionKwh: 4000,
  };
  const elecStanding = penceToGbp(electricityTariff?.standingChargePencePerDay);
  if (elecStanding != null) currentEnergy.electricStandingChargePerDay = elecStanding;
  const gasStanding = penceToGbp(gasTariff?.standingChargePencePerDay);
  if (gasStanding != null) currentEnergy.gasStandingChargePerDay = gasStanding;
  const elecRate = penceToGbp(electricityTariff?.unitRatePencePerKWh);
  if (elecRate != null) currentEnergy.electricityKwhPrice = elecRate;
  const gasRate = penceToGbp(gasTariff?.unitRatePencePerKWh);
  if (gasRate != null) currentEnergy.gasKwhPrice = gasRate;
  if (electricityTariff?.estimatedAnnualUsageKWh != null) {
    currentEnergy.annualElectricityConsumptionKwh =
      electricityTariff.estimatedAnnualUsageKWh;
  }
  if (gasTariff?.estimatedAnnualUsageKWh != null) {
    currentEnergy.annualGasConsumptionKwh = gasTariff.estimatedAnnualUsageKWh;
  }

  // ── improvements ────────────────────────────────────────────────────
  const hp = analysis.eligibility.heatPump;
  const improvements: NonNullable<CalculateRequest["improvements"]> = {
    installHeatPump: selection.hasHeatPump,
    installSolar: selection.hasSolar,
    solarPanelCount: Math.max(0, Math.min(50, Math.round(selection.panelCount))),
    batterySizeKwh: snapBatteryKwh(selection.hasBattery ? selection.batteryKwh : 0),
    // `eligible` / `conditional` both qualify for the grant; `blocked`
    // doesn't. Mirrors the report's verdict colour-coding.
    busGrantEligible: hp.verdict !== "blocked",
    wantFinance: financing.wantFinance,
  };

  // ── cost_assumptions ────────────────────────────────────────────────
  // Use the analysis's actual grant figure when we have it; defaults
  // for the rest (we'll wire per-property heat-pump / solar cost
  // overrides in a follow-up — for now the API's UK averages are fine).
  const costAssumptions: NonNullable<CalculateRequest["costAssumptions"]> = {
    solarCostPerPanel: 350,
    batteryCost3Kwh: 2500,
    batteryCost5Kwh: 3500,
    batteryCost10Kwh: 5500,
    heatPumpCost: 12000,
    busGrantAmount: hp.estimatedGrantGBP > 0 ? hp.estimatedGrantGBP : 7500,
  };

  // ── technical_assumptions ───────────────────────────────────────────
  // Defaults are fine — the per-property solar generation could come
  // from analysis.solar in a follow-up but the API default of 400
  // kWh/panel is a sensible UK average.
  const technicalAssumptions: NonNullable<
    CalculateRequest["technicalAssumptions"]
  > = {
    solarGenerationPerPanelKwh: 400,
    heatPumpCop: 3.0,
    selfConsumptionRatioNoBattery: 0.4,
    selfConsumptionRatioWithBattery: 0.7,
    exportTariffPerKwh: 0.15,
    annualEnergyPriceEscalation: 0.04,
    solarDegradationPerYear: 0.005,
  };

  return {
    currentEnergy,
    improvements,
    costAssumptions,
    technicalAssumptions,
    financing: {
      loanTermMonths: financing.loanTermMonths,
      loanApr: financing.loanApr,
      mortgageRate: financing.mortgageRate,
      mortgageTermYears: financing.mortgageTermYears,
    },
  };
}
