// Zod schemas for the savings-scenario calculator.
//
// Mirrors the spec at docs/savings-calculator.md (10-year projection
// across 4 financing scenarios). Field names use camelCase to match
// the rest of the TS codebase — semantics are identical to the
// snake_case spec.
//
// Every input field has a default so a frontend can POST `{}` and
// get back a sensible default-driven projection (handy for previews
// + smoke-testing).
//
// Note on `.prefault({})` (not `.default({})`) on each object: in
// Zod v4 `.default(x)` treats `x` as the parsed *output* and skips
// the parser, so nested `.default(...)` inside the inner schema
// would NOT cascade. `.prefault(x)` treats `x` as the *input* and
// re-runs the parser — which is what we want so an empty `{}` from
// the caller resolves to a fully-defaulted object.

import { z } from "zod";

// ─── Request schemas ────────────────────────────────────────────────────

export const CurrentEnergySchema = z
  .object({
    hasGas: z.boolean().default(true),
    hasElectric: z.boolean().default(true),
    electricStandingChargePerDay: z.number().nonnegative().default(0.2),
    gasStandingChargePerDay: z.number().nonnegative().default(0.2),
    electricityKwhPrice: z.number().nonnegative().default(0.2518),
    gasKwhPrice: z.number().nonnegative().default(0.0504),
    annualGasConsumptionKwh: z.number().nonnegative().default(11500),
    annualElectricityConsumptionKwh: z.number().nonnegative().default(4000),
  })
  .prefault({});

export const ImprovementsSchema = z
  .object({
    installHeatPump: z.boolean().default(true),
    installSolar: z.boolean().default(true),
    solarPanelCount: z.number().int().min(0).max(50).default(12),
    // Battery sizing is constrained — the cost lookup table
    // only knows the 0/3/5/10 kWh price points. Anything else
    // is rejected with a 400 from the route handler.
    batterySizeKwh: z
      .union([z.literal(0), z.literal(3), z.literal(5), z.literal(10)])
      .default(5),
    busGrantEligible: z.boolean().default(true),
    wantFinance: z.boolean().default(true),
  })
  .prefault({});

export const CostAssumptionsSchema = z
  .object({
    solarCostPerPanel: z.number().nonnegative().default(350),
    batteryCost3Kwh: z.number().nonnegative().default(2500),
    batteryCost5Kwh: z.number().nonnegative().default(3500),
    batteryCost10Kwh: z.number().nonnegative().default(5500),
    heatPumpCost: z.number().nonnegative().default(12000),
    busGrantAmount: z.number().nonnegative().default(7500),
  })
  .prefault({});

export const TechnicalAssumptionsSchema = z
  .object({
    solarGenerationPerPanelKwh: z.number().nonnegative().default(400),
    // COP must be > 0 — divisor in heatPumpElectricityDemand calc.
    heatPumpCop: z.number().positive().default(3.0),
    selfConsumptionRatioNoBattery: z.number().min(0).max(1).default(0.4),
    selfConsumptionRatioWithBattery: z.number().min(0).max(1).default(0.7),
    exportTariffPerKwh: z.number().nonnegative().default(0.15),
    annualEnergyPriceEscalation: z.number().min(0).max(1).default(0.04),
    solarDegradationPerYear: z.number().min(0).max(1).default(0.005),
  })
  .prefault({});

export const FinancingSchema = z
  .object({
    loanTermMonths: z.number().int().min(12).max(360).default(120),
    loanApr: z.number().min(0).max(1).default(0.069),
    mortgageRate: z.number().min(0).max(1).default(0.045),
    mortgageTermYears: z.number().int().min(5).max(35).default(25),
  })
  .prefault({});

export const CalculateRequestSchema = z
  .object({
    currentEnergy: CurrentEnergySchema,
    improvements: ImprovementsSchema,
    costAssumptions: CostAssumptionsSchema,
    technicalAssumptions: TechnicalAssumptionsSchema,
    financing: FinancingSchema,
  })
  .prefault({});

export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;

// ─── Response shape ─────────────────────────────────────────────────────
// Not enforced via Zod (we trust our own pure-function output) but
// exported as a TS type so the frontend can `import type` it.

export interface CalculateResponse {
  currentSpend: {
    annualGasSpend: number;
    annualElectricitySpend: number;
    totalAnnualEnergySpend: number;
  };
  improvementCosts: {
    totalSolarCost: number;
    totalBatteryCost: number;
    totalHeatPumpCost: number;
    busGrantReduction: number;
    totalImprovementCost: number;
    annualSolarGenerationKwh: number;
    selfConsumptionRatio: number;
    heatPumpElectricityDemandKwh: number;
    monthlyLoanPayment: number;
    annualLoanPayment: number;
    monthlyMortgageAddition: number;
    annualMortgageAddition: number;
  };
  projections: {
    /** 1-indexed year labels: [1, 2, 3, ..., 10]. */
    years: number[];
    doNothing: {
      annualCost: number[];
      cumulativeCost: number[];
    };
    finance: ScenarioWithEnergy & {
      loanPayment: number[];
    };
    payUpfront: ScenarioWithEnergy & {
      upfrontCapital: number[];
    };
    mortgage: ScenarioWithEnergy & {
      mortgagePayment: number[];
    };
  };
  summary: {
    tenYearCostDoNothing: number;
    tenYearCostFinance: number;
    tenYearCostPayUpfront: number;
    tenYearCostMortgage: number;
    savingsFinanceVsDoNothing: number;
    savingsUpfrontVsDoNothing: number;
    savingsMortgageVsDoNothing: number;
    /** First year (1-indexed) where cumulative cost falls below the
     *  do-nothing baseline. `null` if it never recovers within the
     *  10-year window. */
    paybackYearFinance: number | null;
    paybackYearUpfront: number | null;
    paybackYearMortgage: number | null;
  };
  monthlyComparison: {
    doNothing: MonthlyBreakdown;
    finance: MonthlyBreakdown;
    payUpfront: MonthlyBreakdown;
    mortgage: MonthlyBreakdown;
  };
  consumerNarrative: {
    solarGenerationStatement: string;
    batteryStatement: string;
    heatPumpStatement: string;
    exportStatement: string;
    /** Year-1 energy-bill reduction (excludes finance/capital costs)
     *  as a 0..1 fraction. */
    billReductionPercent: number;
    bestValueOption: "finance" | "payUpfront" | "mortgage";
  };
}

interface ScenarioWithEnergy {
  solarGenerationKwh: number[];
  selfConsumedKwh: number[];
  exportedKwh: number[];
  gasSpend: number[];
  electricitySpend: number[];
  exportIncome: number[];
  annualCost: number[];
  cumulativeCost: number[];
}

interface MonthlyBreakdown {
  /** Year-1 ongoing energy bill (gas + elec − export), monthly. */
  energyBills: number;
  /** Loan / mortgage payment, monthly. 0 for do-nothing + upfront. */
  payment: number;
  totalMonthly: number;
}
