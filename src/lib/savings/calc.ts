// Pure front-end savings calculator.
//
// Single source of truth for "given the user's selections (which techs,
// how many panels, how big a battery), what does it cost and what do
// they save?". Used by the Solar tab, Savings tab, and the persistent
// recommendation strip.
//
// No network calls — everything is derived from data we already
// captured during the user journey:
//   - `analysis`            : AnalyseResponse — the full property + EPC + Solar API payload
//   - `electricityTariff`   : FuelTariff       — unit rate, standing charge, export rate, est. annual usage
//   - `gasTariff`           : FuelTariff       — same, for gas
//   - `selection`           : ReportSelection  — toggles + panel count + battery kWh
//
// ── Current state ──────────────────────────────────────────────────────
// The previous implementation called an external savings API. It was
// retired (Apr 2026) because the figures didn't add up. This module is
// the rebuild target.
//
// What works today:
//   - `computeCost()` — install costs (heat pump / solar / battery), BUS
//     grant deduction, net upfront. All pure, no calc engine needed.
//   - `monthlyLoanPayment()` — fixed-rate fully-amortising PMT formula.
//
// What's stubbed (returns null):
//   - `computeBills()` — annual baseline bill, post-upgrade bill,
//     savings, payback, finance scenarios. The report tabs render a
//     "calculations rebuilding" placeholder when this is null.
//
// TODO: implement `computeBills()` next. Will need:
//   - Annual electricity + gas spend baseline from tariffs × usage
//   - Annual solar generation per panel from `analysis.solar` (the
//     Google Solar API gives per-config kWh/yr — pick the config closest
//     to the user's chosen panel count)
//   - Self-consumption ratio model (with vs. without battery)
//   - Heat pump fuel-switch model (gas kWh → electric kWh × COP, lose
//     gas standing charge, keep electricity standing charge)
//   - Export earnings: leftover solar × SEG rate
//   - Energy-price inflation curve over the planning horizon

import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { ReportSelection } from "@/components/check-wizard/report/report-shell";

// ─── Cost benchmarks ────────────────────────────────────────────────────
// Installer-quoted UK averages (Apr 2026). Used when the analysis
// payload doesn't carry a usable installCostGBP, or to scale costs for
// non-recommended panel counts.

// 5 kWh ≈ £3,500 installed. Includes cells, hybrid inverter, install
// labour, commissioning.
export const BATTERY_COST_PER_KWH = 700;

// Roughly £1,500 per kWp installed; 1 panel ≈ 0.4 kWp ⇒ ~£600 per
// panel. Includes panels, inverter, mounting, install, scaffolding,
// commissioning, DNO notification.
export const SOLAR_COST_PER_PANEL = 600;

// ─── Public types ───────────────────────────────────────────────────────

export interface CalcInput {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  selection: ReportSelection;
}

export interface CostBreakdown {
  // Gross install costs (before any grant)
  hpGross: number;
  solarCost: number;
  batteryCost: number;
  grossTotal: number;
  // Deductions
  busGrant: number;
  // Net upfront — what you'd pay today, after grants.
  netUpfront: number;
}

export interface CalcResult {
  cost: CostBreakdown;
  // null until the new bills engine is implemented. Tabs check this and
  // render a placeholder when null.
  bills: null;
}

// ─── Cost breakdown ─────────────────────────────────────────────────────

export function computeCost(input: CalcInput): CostBreakdown {
  const { analysis, selection } = input;
  const fin = analysis.finance;

  // Heat pump — prefer the analysis's net range, add grant back to get
  // gross so the breakdown reads naturally as install → grant → net.
  const hpRange = fin.heatPump.estimatedNetInstallCostRangeGBP;
  const hpNet = hpRange ? (hpRange[0] + hpRange[1]) / 2 : 0;
  const busGrantFull = analysis.eligibility.heatPump.estimatedGrantGBP ?? 0;
  const hpGrossFromAnalysis = hpNet + busGrantFull;

  const hpGross = selection.hasHeatPump ? hpGrossFromAnalysis : 0;
  const busGrant = selection.hasHeatPump ? busGrantFull : 0;

  // Scale solar install by panel count if the user changed it from the
  // recommendation. Fall back to per-panel benchmark when the analysis
  // didn't give a cost (e.g. Solar API coverage failure).
  const recommendedPanels = analysis.eligibility.solar.recommendedPanels ?? 0;
  const apiSolarCost = fin.solar.installCostGBP ?? 0;
  let solarCost = 0;
  if (selection.hasSolar) {
    if (apiSolarCost > 0 && recommendedPanels > 0) {
      solarCost = (apiSolarCost / recommendedPanels) * selection.panelCount;
    } else {
      solarCost = selection.panelCount * SOLAR_COST_PER_PANEL;
    }
  }

  const batteryCost = selection.hasBattery
    ? selection.batteryKwh * BATTERY_COST_PER_KWH
    : 0;

  const grossTotal = hpGross + solarCost + batteryCost;
  const netUpfront = Math.max(0, grossTotal - busGrant);

  return {
    hpGross,
    solarCost,
    batteryCost,
    grossTotal,
    busGrant,
    netUpfront,
  };
}

// ─── Top-level entrypoint ───────────────────────────────────────────────
// Tabs call this once per render with the journey state. Returns the
// cost breakdown today; bills/scenarios are stubbed to null until the
// new calc engine ships.

export function computeCalc(input: CalcInput): CalcResult {
  return {
    cost: computeCost(input),
    bills: null,
  };
}

// ─── Loan amortisation (pure maths — keep) ──────────────────────────────
// PMT formula for a fixed-rate fully-amortising loan.
//   payment = P × r × (1+r)^n / ((1+r)^n − 1)
// where P = principal, r = monthly rate (APR/100/12), n = total months.
export function monthlyLoanPayment(
  principal: number,
  aprPct: number,
  termYears: number,
): number {
  if (principal <= 0) return 0;
  const r = aprPct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}
