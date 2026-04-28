// Unified plan-cost + savings calculation.
//
// Single source of truth for "given the user's selections (which techs,
// how many panels, how big a battery, finance vs pay-up-front), what
// does it cost and what do they save?".
//
// Used by the Solar tab, Savings tab, and the persistent recommendation
// strip — so changing battery size on the Solar tab updates the cost in
// the Savings tab without us having to thread state through both.
//
// The Octopus calculator API gives us BAU bills + post-upgrade bills +
// export revenue. We layer our own finance maths (PMT) on top because
// the API's grant treatment is opaque and users want to verify
// "6.9% over 10y on £X" arithmetically.

import type { AnalyseResponse } from "@/lib/schemas/analyse";

// Battery cost benchmark — installed price for a typical lithium system.
// Includes cells, hybrid inverter, install labour, commissioning.
export const BATTERY_COST_PER_KWH = 700;

// Solar install cost per panel — used when the analysis API hasn't
// returned a usable installCostGBP, or to scale for non-recommended
// panel counts. Roughly £1,500 per kWp installed; 1 panel = 0.4 kWp;
// so ~£600 per panel. Includes panels, inverter, mounting, install,
// scaffolding, commissioning, DNO notification.
export const SOLAR_COST_PER_PANEL = 600;

export interface PlanInputs {
  hasSolar: boolean;
  hasBattery: boolean;
  hasHeatPump: boolean;
  panelCount: number;
  batteryKwh: number;
}

export interface CostBreakdown {
  // Gross install costs (before any grant)
  hpGross: number;
  solarCost: number;
  batteryCost: number;
  grossTotal: number;

  // Deductions
  busGrant: number; // BUS grant on heat pump

  // Net upfront — what you'd pay if paying up front (before any export earnings)
  netUpfront: number;

  // Year-1 export revenue (solar only — sold to grid)
  exportRevenueY1: number;
  exportKwhY1: number;

  // After year-1 export earnings — useful "what would I be out of pocket
  // at end of year 1 if paying up front?"
  netAfterYear1Export: number;
}

export function computeCostBreakdown(
  analysis: AnalyseResponse,
  inputs: PlanInputs,
  exportRevenueY1: number = 0,
  exportKwhY1: number = 0,
): CostBreakdown {
  // Heat pump cost — prefer the API's net range, add grant back to get
  // gross, so the breakdown reads naturally as "install → grant → net".
  const hpRange = analysis.finance.heatPump.estimatedNetInstallCostRangeGBP;
  const hpNet = hpRange ? (hpRange[0] + hpRange[1]) / 2 : 0;
  const busGrant = analysis.eligibility.heatPump.estimatedGrantGBP;
  const hpGrossFromApi = hpNet + busGrant;

  // Scale the solar install cost by panel count if the user has changed
  // it from the recommendation. Falls back to per-panel benchmark when
  // the API didn't give an install cost (e.g. coverage failure).
  const recommendedPanels = analysis.eligibility.solar.recommendedPanels;
  const apiSolarCost = analysis.finance.solar.installCostGBP;
  let solarCost = 0;
  if (inputs.hasSolar) {
    if (apiSolarCost && recommendedPanels && recommendedPanels > 0) {
      solarCost = (apiSolarCost / recommendedPanels) * inputs.panelCount;
    } else {
      solarCost = inputs.panelCount * SOLAR_COST_PER_PANEL;
    }
  }

  const hpGross = inputs.hasHeatPump ? hpGrossFromApi : 0;
  const grant = inputs.hasHeatPump ? busGrant : 0;
  const batteryCost = inputs.hasBattery ? inputs.batteryKwh * BATTERY_COST_PER_KWH : 0;

  const grossTotal = hpGross + solarCost + batteryCost;
  const netUpfront = grossTotal - grant;

  return {
    hpGross,
    solarCost,
    batteryCost,
    grossTotal,
    busGrant: grant,
    netUpfront,
    exportRevenueY1,
    exportKwhY1,
    netAfterYear1Export: Math.max(0, netUpfront - exportRevenueY1),
  };
}

// Standard amortisation (PMT formula).
// monthly = principal * r * (1+r)^n / ((1+r)^n - 1)
// where r = monthly rate (APR/100/12), n = months.
export function monthlyLoanPayment(
  principal: number,
  annualAprPct: number,
  termYears: number,
): number {
  if (principal <= 0) return 0;
  const r = annualAprPct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export interface ScenarioFigures {
  doNothingAnnual: number;
  // Bills only (no finance) — what you'd pay per year if you'd paid up front
  payUpAnnual: number;
  // Bills + finance payment — what you pay per year on the finance plan
  financeAnnual: number;
  financeMonthly: number;
  financeTotalCost: number; // total over the loan term
  // Annual saving on bills vs do-nothing (same in both scenarios — finance
  // doesn't change the bill, just spreads the upfront)
  annualBillSaving: number;
  // Pay-up-front payback — years until cumulative bill saving ≥ net upfront
  payUpPaybackYears: number | null;
}

export function computeScenarios(
  doNothingAnnual: number,
  billsOnlyAnnual: number,
  netUpfront: number,
  aprPct: number,
  termYears: number,
): ScenarioFigures {
  const financeMonthly = monthlyLoanPayment(netUpfront, aprPct, termYears);
  const financeTotalCost = financeMonthly * 12 * termYears;
  const financeAnnual = billsOnlyAnnual + financeMonthly * 12;
  const annualBillSaving = doNothingAnnual - billsOnlyAnnual;
  const payUpPaybackYears =
    annualBillSaving > 0 && netUpfront > 0
      ? netUpfront / annualBillSaving
      : null;
  return {
    doNothingAnnual,
    payUpAnnual: billsOnlyAnnual,
    financeAnnual,
    financeMonthly,
    financeTotalCost,
    annualBillSaving,
    payUpPaybackYears,
  };
}
