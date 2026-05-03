// Verifies the savings scenario engine against the spec test case at
// docs/savings-calculator.md, plus edge cases the spec calls out
// (PMT @ rate=0, battery-size validation, no-gas household, etc.).

import { describe, expect, it } from "vitest";
import { calculateScenarios, pmt } from "../scenarios";
import { CalculateRequestSchema } from "../scenarios-schema";

// Helper: parse `{}` → defaulted request → run engine.
function runDefaults() {
  const parsed = CalculateRequestSchema.parse({});
  return calculateScenarios(parsed);
}

describe("PMT formula", () => {
  it("returns principal/n when rate is 0", () => {
    expect(pmt(0, 120, 12000)).toBeCloseTo(100, 6);
  });

  it("matches the standard fixed-rate amortising payment for 6.9% APR / 120mo / £12,200", () => {
    // PMT(0.069/12, 120, 12200) ≈ 141.02
    expect(pmt(0.069 / 12, 120, 12200)).toBeCloseTo(141.02, 2);
  });

  it("matches a 4.5% / 25yr / £12,200 mortgage addition (≈ £67.81/mo)", () => {
    expect(pmt(0.045 / 12, 25 * 12, 12200)).toBeCloseTo(67.81, 2);
  });

  it("returns 0 for non-positive principal", () => {
    expect(pmt(0.05, 12, 0)).toBe(0);
    expect(pmt(0.05, 12, -100)).toBe(0);
  });

  it("returns 0 for non-positive period count", () => {
    expect(pmt(0.05, 0, 1000)).toBe(0);
  });
});

describe("calculateScenarios — spec test case (all defaults)", () => {
  const result = runDefaults();

  it("computes the expected current spend (£1,732.80/yr)", () => {
    expect(result.currentSpend.annualGasSpend).toBeCloseTo(652.6, 2);
    expect(result.currentSpend.annualElectricitySpend).toBeCloseTo(1080.2, 2);
    expect(result.currentSpend.totalAnnualEnergySpend).toBeCloseTo(1732.8, 2);
  });

  it("computes the expected improvement cost (£12,200 net of BUS)", () => {
    expect(result.improvementCosts.totalSolarCost).toBe(4200);
    expect(result.improvementCosts.totalBatteryCost).toBe(3500);
    expect(result.improvementCosts.totalHeatPumpCost).toBe(12000);
    expect(result.improvementCosts.busGrantReduction).toBe(7500);
    expect(result.improvementCosts.totalImprovementCost).toBe(12200);
  });

  it("computes the expected technical figures", () => {
    expect(result.improvementCosts.annualSolarGenerationKwh).toBe(4800);
    expect(result.improvementCosts.selfConsumptionRatio).toBe(0.7);
    expect(result.improvementCosts.heatPumpElectricityDemandKwh).toBeCloseTo(
      3833.33,
      2,
    );
  });

  it("computes the expected loan + mortgage payments", () => {
    expect(result.improvementCosts.monthlyLoanPayment).toBeCloseTo(141.02, 2);
    expect(result.improvementCosts.monthlyMortgageAddition).toBeCloseTo(
      67.81,
      2,
    );
  });

  it("ten-year do-nothing cost is ~£20,804", () => {
    expect(result.summary.tenYearCostDoNothing).toBeCloseTo(20804, 0);
  });

  it("ten-year mortgage cost is ~£20,247 (within £10)", () => {
    expect(result.summary.tenYearCostMortgage).toBeGreaterThan(20240);
    expect(result.summary.tenYearCostMortgage).toBeLessThan(20260);
  });

  it("payback year for mortgage is 7", () => {
    expect(result.summary.paybackYearMortgage).toBe(7);
  });

  it("payback never happens within 10yr for finance or upfront", () => {
    expect(result.summary.paybackYearFinance).toBeNull();
    expect(result.summary.paybackYearUpfront).toBeNull();
  });

  it("year-1 bill reduction is ~43%", () => {
    expect(result.consumerNarrative.billReductionPercent).toBeCloseTo(0.43, 2);
  });

  it("flags mortgage as the best-value option for the default case", () => {
    expect(result.consumerNarrative.bestValueOption).toBe("mortgage");
  });

  it("returns 10 entries for every yearly array", () => {
    expect(result.projections.years).toHaveLength(10);
    expect(result.projections.doNothing.annualCost).toHaveLength(10);
    expect(result.projections.finance.loanPayment).toHaveLength(10);
    expect(result.projections.payUpfront.upfrontCapital).toHaveLength(10);
    expect(result.projections.mortgage.mortgagePayment).toHaveLength(10);
  });

  it("year-1 finance scenario gas spend is 0 (heat pump installed)", () => {
    expect(result.projections.finance.gasSpend[0]).toBe(0);
  });

  it("year-1 mortgage scenario annual cost ≈ £1,797", () => {
    expect(result.projections.mortgage.annualCost[0]).toBeCloseTo(1797.13, 1);
  });

  it("upfrontCapital lands in year 1 only", () => {
    expect(result.projections.payUpfront.upfrontCapital[0]).toBe(12200);
    expect(result.projections.payUpfront.upfrontCapital.slice(1)).toEqual(
      Array(9).fill(0),
    );
  });

  it("loan payment fires for the loan term then stops", () => {
    // Default loan = 120 months = 10 years, so it fires for all 10
    // years of the projection window.
    expect(
      result.projections.finance.loanPayment.every((p) => p > 0),
    ).toBe(true);
  });

  it("monthly comparison sums match the year-1 figures", () => {
    const m = result.monthlyComparison;
    expect(m.doNothing.totalMonthly).toBeCloseTo(
      result.projections.doNothing.annualCost[0] / 12,
      2,
    );
    expect(m.mortgage.totalMonthly).toBeCloseTo(
      result.projections.mortgage.annualCost[0] / 12,
      2,
    );
  });
});

describe("edge cases", () => {
  it("skips gas spend when hasGas is false", () => {
    const parsed = CalculateRequestSchema.parse({
      currentEnergy: { hasGas: false },
    });
    const result = calculateScenarios(parsed);
    expect(result.currentSpend.annualGasSpend).toBe(0);
    // Heat pump still installed by default, so the demand calc still
    // uses the *consumption* figure (which is the heat-load proxy).
    expect(result.improvementCosts.heatPumpElectricityDemandKwh).toBeCloseTo(
      3833.33,
      2,
    );
  });

  it("keeps gas spend when no heat pump is installed", () => {
    const parsed = CalculateRequestSchema.parse({
      improvements: { installHeatPump: false },
    });
    const result = calculateScenarios(parsed);
    // Year 1 gas spend should be the un-escalated baseline.
    expect(result.projections.mortgage.gasSpend[0]).toBeCloseTo(652.6, 2);
    expect(result.improvementCosts.heatPumpElectricityDemandKwh).toBe(0);
    // BUS grant doesn't apply without a heat pump.
    expect(result.improvementCosts.busGrantReduction).toBe(0);
  });

  it("zeroes solar fields when installSolar is false", () => {
    const parsed = CalculateRequestSchema.parse({
      improvements: { installSolar: false, batterySizeKwh: 0 },
    });
    const result = calculateScenarios(parsed);
    expect(result.improvementCosts.totalSolarCost).toBe(0);
    expect(result.improvementCosts.annualSolarGenerationKwh).toBe(0);
    expect(result.projections.mortgage.solarGenerationKwh.every((g) => g === 0))
      .toBe(true);
  });

  it("uses no-battery self-consumption ratio when batterySizeKwh is 0", () => {
    const parsed = CalculateRequestSchema.parse({
      improvements: { batterySizeKwh: 0 },
    });
    const result = calculateScenarios(parsed);
    expect(result.improvementCosts.selfConsumptionRatio).toBe(0.4);
    expect(result.improvementCosts.totalBatteryCost).toBe(0);
  });

  it("rejects an invalid battery size via the schema (zod literal union)", () => {
    const parsed = CalculateRequestSchema.safeParse({
      improvements: { batterySizeKwh: 4 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects out-of-range solar panel count", () => {
    expect(
      CalculateRequestSchema.safeParse({
        improvements: { solarPanelCount: 51 },
      }).success,
    ).toBe(false);
    expect(
      CalculateRequestSchema.safeParse({
        improvements: { solarPanelCount: -1 },
      }).success,
    ).toBe(false);
  });

  it("rejects an out-of-range loan term", () => {
    expect(
      CalculateRequestSchema.safeParse({
        financing: { loanTermMonths: 6 },
      }).success,
    ).toBe(false);
    expect(
      CalculateRequestSchema.safeParse({
        financing: { loanTermMonths: 400 },
      }).success,
    ).toBe(false);
  });

  it("handles a 0% loan APR (PMT edge case)", () => {
    const parsed = CalculateRequestSchema.parse({
      financing: { loanApr: 0 },
    });
    const result = calculateScenarios(parsed);
    // 12,200 / 120 months = 101.667/mo
    expect(result.improvementCosts.monthlyLoanPayment).toBeCloseTo(
      101.67,
      2,
    );
  });

  it("zero improvement cost (no upgrades selected) returns 0 monthly payments", () => {
    const parsed = CalculateRequestSchema.parse({
      improvements: {
        installSolar: false,
        installHeatPump: false,
        batterySizeKwh: 0,
      },
    });
    const result = calculateScenarios(parsed);
    expect(result.improvementCosts.totalImprovementCost).toBe(0);
    expect(result.improvementCosts.monthlyLoanPayment).toBe(0);
    expect(result.improvementCosts.monthlyMortgageAddition).toBe(0);
  });

  it("cumulative arrays are monotonically increasing", () => {
    const result = runDefaults();
    const c = result.projections.doNothing.cumulativeCost;
    for (let i = 1; i < c.length; i++) {
      expect(c[i]).toBeGreaterThanOrEqual(c[i - 1]);
    }
  });

  it("savingsXVsDoNothing equals doNothingTotal − scenarioTotal", () => {
    // Within 1p — the savings field is round2(rawA − rawB), the
    // test's RHS is round2(rawA) − round2(rawB), so they can differ
    // by up to 0.01 due to rounding compensation.
    const r = runDefaults();
    expect(r.summary.savingsMortgageVsDoNothing).toBeCloseTo(
      r.summary.tenYearCostDoNothing - r.summary.tenYearCostMortgage,
      1,
    );
    expect(r.summary.savingsFinanceVsDoNothing).toBeCloseTo(
      r.summary.tenYearCostDoNothing - r.summary.tenYearCostFinance,
      1,
    );
  });
});

describe("CalculateRequestSchema defaults", () => {
  it("parses an empty object into a fully-defaulted request", () => {
    const parsed = CalculateRequestSchema.parse({});
    expect(parsed.currentEnergy.hasGas).toBe(true);
    expect(parsed.improvements.solarPanelCount).toBe(12);
    expect(parsed.financing.loanTermMonths).toBe(120);
    expect(parsed.technicalAssumptions.heatPumpCop).toBe(3.0);
    expect(parsed.costAssumptions.busGrantAmount).toBe(7500);
  });
});
