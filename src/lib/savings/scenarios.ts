// Pure 10-year savings scenario engine.
//
// Given current energy use, planned improvements, and financing
// options, produces a year-by-year projection across four scenarios:
//   1. Do nothing                     — gas + elec, escalated
//   2. Finance the upgrades           — personal loan, fixed APR
//   3. Pay upfront                    — capital cost in Year 1
//   4. Add to mortgage                — fixed annual addition for the
//                                       full 10-year window (mortgage
//                                       term is much longer)
//
// All math is pure — no I/O, no random, no Date.now(). Same inputs →
// same outputs. Easy to test, easy to memoise if we ever want to cache.
//
// Replicates the spec at docs/savings-calculator.md verbatim. The spec's
// example response numbers are internally inconsistent in places (the
// loan_payment array uses a 0% APR despite the request defaulting to
// 6.9%) — this implementation follows the formulas, not the example
// numbers. The bottom-of-spec test-case targets (which are the real
// contract) all pass — see scenarios.test.ts.

import type { CalculateRequest, CalculateResponse } from "./scenarios-schema";

const PROJECTION_YEARS = 10;

// ─── PMT (loan amortisation) ────────────────────────────────────────────
//
// Standard fixed-rate fully-amortising payment formula:
//   payment = P × r / (1 − (1+r)^−n)
// where P = principal, r = period rate, n = number of periods.
//
// Edge case: r = 0 collapses the formula to plain linear repayment
// (P / n). Without this guard you'd get 0/0.

export function pmt(periodRate: number, nPeriods: number, principal: number): number {
  if (principal <= 0) return 0;
  if (nPeriods <= 0) return 0;
  if (periodRate === 0) return principal / nPeriods;
  return (principal * periodRate) / (1 - Math.pow(1 + periodRate, -nPeriods));
}

// ─── Battery cost lookup ────────────────────────────────────────────────

function batteryCostFor(
  kwh: 0 | 3 | 5 | 10,
  cost3: number,
  cost5: number,
  cost10: number,
): number {
  switch (kwh) {
    case 0:
      return 0;
    case 3:
      return cost3;
    case 5:
      return cost5;
    case 10:
      return cost10;
  }
}

// ─── Output helpers ─────────────────────────────────────────────────────

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round2Arr = (a: number[]): number[] => a.map(round2);

// ─── Main entry point ───────────────────────────────────────────────────

export function calculateScenarios(input: CalculateRequest): CalculateResponse {
  const ce = input.currentEnergy;
  const imp = input.improvements;
  const cost = input.costAssumptions;
  const tech = input.technicalAssumptions;
  const fin = input.financing;

  // ── Step 1: current spend ─────────────────────────────────────────────
  const annualGasSpend = ce.hasGas
    ? ce.gasStandingChargePerDay * 365 +
      ce.annualGasConsumptionKwh * ce.gasKwhPrice
    : 0;
  const annualElectricitySpend = ce.hasElectric
    ? ce.electricStandingChargePerDay * 365 +
      ce.annualElectricityConsumptionKwh * ce.electricityKwhPrice
    : 0;
  const totalAnnualEnergySpend = annualGasSpend + annualElectricitySpend;

  // ── Step 2: improvement costs ─────────────────────────────────────────
  const totalSolarCost = imp.installSolar
    ? imp.solarPanelCount * cost.solarCostPerPanel
    : 0;
  const totalBatteryCost = batteryCostFor(
    imp.batterySizeKwh,
    cost.batteryCost3Kwh,
    cost.batteryCost5Kwh,
    cost.batteryCost10Kwh,
  );
  const totalHeatPumpCost = imp.installHeatPump ? cost.heatPumpCost : 0;
  // BUS grant only applies when both eligible AND the heat pump is
  // actually being installed (no heat pump = no grant to apply).
  const busGrantReduction =
    imp.busGrantEligible && imp.installHeatPump ? cost.busGrantAmount : 0;
  const totalImprovementCost = Math.max(
    0,
    totalSolarCost + totalBatteryCost + totalHeatPumpCost - busGrantReduction,
  );

  // ── Step 3: technical ─────────────────────────────────────────────────
  const annualSolarGeneration = imp.installSolar
    ? imp.solarPanelCount * tech.solarGenerationPerPanelKwh
    : 0;
  const selfConsumptionRatio =
    imp.batterySizeKwh > 0
      ? tech.selfConsumptionRatioWithBattery
      : tech.selfConsumptionRatioNoBattery;
  // COP-based fuel-switch: gas kWh demand → electric kWh demand.
  // (annualGasConsumptionKwh is the heat load proxy — assumes the boiler
  // was doing 100% of the heating, which is the standard simplification.)
  const heatPumpElectricityDemand = imp.installHeatPump
    ? ce.annualGasConsumptionKwh / tech.heatPumpCop
    : 0;

  // ── Step 4: finance ──────────────────────────────────────────────────
  const monthlyLoanPayment = imp.wantFinance
    ? pmt(fin.loanApr / 12, fin.loanTermMonths, totalImprovementCost)
    : 0;
  const annualLoanPayment = monthlyLoanPayment * 12;
  // Mortgage addition is always computed (it's an option you can pick
  // even if you didn't tick "want_finance" for the loan).
  const monthlyMortgageAddition = pmt(
    fin.mortgageRate / 12,
    fin.mortgageTermYears * 12,
    totalImprovementCost,
  );
  const annualMortgageAddition = monthlyMortgageAddition * 12;

  // ── Step 5: per-year shared math ──────────────────────────────────────
  // Computed once per year, reused across the 3 improved scenarios
  // (finance / upfront / mortgage all share the same energy story —
  // they only differ in how the upgrade is paid for).
  const yearly = Array.from({ length: PROJECTION_YEARS }, (_, y) => {
    const escFactor = Math.pow(1 + tech.annualEnergyPriceEscalation, y);
    const degrFactor = Math.pow(1 - tech.solarDegradationPerYear, y);
    const solarGen = annualSolarGeneration * degrFactor;
    const selfConsumed = solarGen * selfConsumptionRatio;
    const exported = solarGen - selfConsumed;
    // Gas drops to 0 when a heat pump is installed (the heat load
    // moves to electricity, captured below).
    const gasSpend = imp.installHeatPump ? 0 : annualGasSpend * escFactor;
    // Net electricity demand = baseline elec + heat-pump load − solar
    // self-consumption. Floored at 0 — surplus is exported (priced
    // separately via exportIncome), not credited at the unit rate.
    const netElecDemand =
      ce.annualElectricityConsumptionKwh +
      heatPumpElectricityDemand -
      selfConsumed;
    const elecSpend =
      ce.hasElectric || imp.installHeatPump
        ? (ce.electricStandingChargePerDay * 365 +
            Math.max(0, netElecDemand) * ce.electricityKwhPrice) *
          escFactor
        : 0;
    const exportIncome = exported * tech.exportTariffPerKwh * escFactor;
    return { solarGen, selfConsumed, exported, gasSpend, elecSpend, exportIncome };
  });

  // ── Scenario 1: do nothing ────────────────────────────────────────────
  const doNothingAnnual = Array.from({ length: PROJECTION_YEARS }, (_, y) => {
    const escFactor = Math.pow(1 + tech.annualEnergyPriceEscalation, y);
    return annualGasSpend * escFactor + annualElectricitySpend * escFactor;
  });
  const doNothingCumulative = cumulative(doNothingAnnual);

  // ── Scenario 2: finance ───────────────────────────────────────────────
  // Loan payments only fire for the loan term (in years). Beyond that
  // the loan is paid off and only energy costs continue.
  const financeLoanYears = Math.ceil(fin.loanTermMonths / 12);
  const financeLoanPayment = Array.from({ length: PROJECTION_YEARS }, (_, y) =>
    y < financeLoanYears ? annualLoanPayment : 0,
  );
  const financeAnnual = yearly.map(
    (y, i) => y.gasSpend + y.elecSpend - y.exportIncome + financeLoanPayment[i],
  );
  const financeCumulative = cumulative(financeAnnual);

  // ── Scenario 3: pay upfront ───────────────────────────────────────────
  // Capital cost lands in Year 1; ongoing years are just energy.
  const upfrontCapital = Array.from({ length: PROJECTION_YEARS }, (_, y) =>
    y === 0 ? totalImprovementCost : 0,
  );
  const upfrontAnnual = yearly.map(
    (y, i) => y.gasSpend + y.elecSpend - y.exportIncome + upfrontCapital[i],
  );
  const upfrontCumulative = cumulative(upfrontAnnual);

  // ── Scenario 4: mortgage ──────────────────────────────────────────────
  // Mortgage term (default 25 years) is longer than the projection
  // window (10 years), so the addition fires every year of the model.
  const mortgageAnnualPayment = Array.from(
    { length: PROJECTION_YEARS },
    () => annualMortgageAddition,
  );
  const mortgageAnnual = yearly.map(
    (y, i) => y.gasSpend + y.elecSpend - y.exportIncome + mortgageAnnualPayment[i],
  );
  const mortgageCumulative = cumulative(mortgageAnnual);

  // ── Step 6: summary + payback ────────────────────────────────────────
  const tenYearDoNothing = doNothingCumulative[PROJECTION_YEARS - 1];
  const tenYearFinance = financeCumulative[PROJECTION_YEARS - 1];
  const tenYearUpfront = upfrontCumulative[PROJECTION_YEARS - 1];
  const tenYearMortgage = mortgageCumulative[PROJECTION_YEARS - 1];

  // Payback year = first year (1-indexed) where the scenario's
  // cumulative cost dips below the do-nothing baseline. Returns null
  // when payback never happens in the 10-year window.
  function paybackYear(scenarioCum: number[]): number | null {
    for (let y = 0; y < PROJECTION_YEARS; y++) {
      if (doNothingCumulative[y] > scenarioCum[y]) return y + 1;
    }
    return null;
  }

  // ── Step 7: monthly comparison ───────────────────────────────────────
  // Year-1 figures only — what the homeowner will actually feel on a
  // monthly statement. For pay-upfront we strip the capital cost so
  // "monthly bills" reflects ongoing months 2-12, not the Jan capital
  // outlay.
  const monthlyComparison = {
    doNothing: {
      energyBills: round2(doNothingAnnual[0] / 12),
      payment: 0,
      totalMonthly: round2(doNothingAnnual[0] / 12),
    },
    finance: {
      energyBills: round2(
        (financeAnnual[0] - financeLoanPayment[0]) / 12,
      ),
      payment: round2(monthlyLoanPayment),
      totalMonthly: round2(financeAnnual[0] / 12),
    },
    payUpfront: {
      energyBills: round2(
        (upfrontAnnual[0] - upfrontCapital[0]) / 12,
      ),
      payment: 0,
      totalMonthly: round2(
        (upfrontAnnual[0] - upfrontCapital[0]) / 12,
      ),
    },
    mortgage: {
      energyBills: round2(
        (mortgageAnnual[0] - mortgageAnnualPayment[0]) / 12,
      ),
      payment: round2(monthlyMortgageAddition),
      totalMonthly: round2(mortgageAnnual[0] / 12),
    },
  };

  // ── Step 8: consumer narrative ───────────────────────────────────────
  const year1EnergyOnly =
    yearly[0].gasSpend + yearly[0].elecSpend - yearly[0].exportIncome;
  const billReductionPercent =
    totalAnnualEnergySpend > 0
      ? 1 - year1EnergyOnly / totalAnnualEnergySpend
      : 0;

  const candidates: Array<{
    key: "finance" | "payUpfront" | "mortgage";
    cum: number;
  }> = [
    { key: "finance", cum: tenYearFinance },
    { key: "payUpfront", cum: tenYearUpfront },
    { key: "mortgage", cum: tenYearMortgage },
  ];
  const bestValueOption = candidates.reduce((best, c) =>
    c.cum < best.cum ? c : best,
  ).key;

  const consumerNarrative = {
    solarGenerationStatement: imp.installSolar
      ? `Your panels will generate ~${Math.round(annualSolarGeneration).toLocaleString("en-GB")} kWh/year — that's ${Math.round((annualSolarGeneration / Math.max(1, ce.annualElectricityConsumptionKwh)) * 100)}% of your current electricity use`
      : "No solar panels in this plan",
    batteryStatement:
      imp.batterySizeKwh > 0
        ? `With a ${imp.batterySizeKwh} kWh battery, you'll use ${Math.round(tech.selfConsumptionRatioWithBattery * 100)}% of your solar energy yourself instead of ${Math.round(tech.selfConsumptionRatioNoBattery * 100)}%`
        : "No battery in this plan",
    heatPumpStatement: imp.installHeatPump
      ? `Your gas bill drops to £0. The heat pump uses ${Math.round(heatPumpElectricityDemand).toLocaleString("en-GB")} kWh of electricity instead of ${ce.annualGasConsumptionKwh.toLocaleString("en-GB")} kWh of gas`
      : "No heat pump in this plan",
    exportStatement:
      imp.installSolar && yearly[0].exportIncome > 0
        ? `You'll earn ~£${Math.round(yearly[0].exportIncome).toLocaleString("en-GB")}/year selling surplus electricity back`
        : "No solar export income",
    billReductionPercent: round2(billReductionPercent),
    bestValueOption,
  };

  // ── Compose the response ─────────────────────────────────────────────
  return {
    currentSpend: {
      annualGasSpend: round2(annualGasSpend),
      annualElectricitySpend: round2(annualElectricitySpend),
      totalAnnualEnergySpend: round2(totalAnnualEnergySpend),
    },
    improvementCosts: {
      totalSolarCost: round2(totalSolarCost),
      totalBatteryCost: round2(totalBatteryCost),
      totalHeatPumpCost: round2(totalHeatPumpCost),
      busGrantReduction: round2(busGrantReduction),
      totalImprovementCost: round2(totalImprovementCost),
      annualSolarGenerationKwh: round2(annualSolarGeneration),
      selfConsumptionRatio,
      heatPumpElectricityDemandKwh: round2(heatPumpElectricityDemand),
      monthlyLoanPayment: round2(monthlyLoanPayment),
      annualLoanPayment: round2(annualLoanPayment),
      monthlyMortgageAddition: round2(monthlyMortgageAddition),
      annualMortgageAddition: round2(annualMortgageAddition),
    },
    projections: {
      years: Array.from({ length: PROJECTION_YEARS }, (_, i) => i + 1),
      doNothing: {
        annualCost: round2Arr(doNothingAnnual),
        cumulativeCost: round2Arr(doNothingCumulative),
      },
      finance: {
        solarGenerationKwh: round2Arr(yearly.map((y) => y.solarGen)),
        selfConsumedKwh: round2Arr(yearly.map((y) => y.selfConsumed)),
        exportedKwh: round2Arr(yearly.map((y) => y.exported)),
        gasSpend: round2Arr(yearly.map((y) => y.gasSpend)),
        electricitySpend: round2Arr(yearly.map((y) => y.elecSpend)),
        exportIncome: round2Arr(yearly.map((y) => y.exportIncome)),
        loanPayment: round2Arr(financeLoanPayment),
        annualCost: round2Arr(financeAnnual),
        cumulativeCost: round2Arr(financeCumulative),
      },
      payUpfront: {
        solarGenerationKwh: round2Arr(yearly.map((y) => y.solarGen)),
        selfConsumedKwh: round2Arr(yearly.map((y) => y.selfConsumed)),
        exportedKwh: round2Arr(yearly.map((y) => y.exported)),
        gasSpend: round2Arr(yearly.map((y) => y.gasSpend)),
        electricitySpend: round2Arr(yearly.map((y) => y.elecSpend)),
        exportIncome: round2Arr(yearly.map((y) => y.exportIncome)),
        upfrontCapital: round2Arr(upfrontCapital),
        annualCost: round2Arr(upfrontAnnual),
        cumulativeCost: round2Arr(upfrontCumulative),
      },
      mortgage: {
        solarGenerationKwh: round2Arr(yearly.map((y) => y.solarGen)),
        selfConsumedKwh: round2Arr(yearly.map((y) => y.selfConsumed)),
        exportedKwh: round2Arr(yearly.map((y) => y.exported)),
        gasSpend: round2Arr(yearly.map((y) => y.gasSpend)),
        electricitySpend: round2Arr(yearly.map((y) => y.elecSpend)),
        exportIncome: round2Arr(yearly.map((y) => y.exportIncome)),
        mortgagePayment: round2Arr(mortgageAnnualPayment),
        annualCost: round2Arr(mortgageAnnual),
        cumulativeCost: round2Arr(mortgageCumulative),
      },
    },
    summary: {
      tenYearCostDoNothing: round2(tenYearDoNothing),
      tenYearCostFinance: round2(tenYearFinance),
      tenYearCostPayUpfront: round2(tenYearUpfront),
      tenYearCostMortgage: round2(tenYearMortgage),
      savingsFinanceVsDoNothing: round2(tenYearDoNothing - tenYearFinance),
      savingsUpfrontVsDoNothing: round2(tenYearDoNothing - tenYearUpfront),
      savingsMortgageVsDoNothing: round2(tenYearDoNothing - tenYearMortgage),
      paybackYearFinance: paybackYear(financeCumulative),
      paybackYearUpfront: paybackYear(upfrontCumulative),
      paybackYearMortgage: paybackYear(mortgageCumulative),
    },
    monthlyComparison,
    consumerNarrative,
  };
}

// Running cumulative sum: [a, b, c] → [a, a+b, a+b+c].
function cumulative(arr: number[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (const v of arr) {
    sum += v;
    out.push(sum);
  }
  return out;
}
