// Verifies the wizard-state → API-request mapper.
//
// The mapper is the join point between the existing wizard data and
// the new savings-scenario engine — bugs here would silently feed
// wrong inputs into the calc and the user would see correct-looking
// but wrong numbers. Unit-test it.

import { describe, expect, it } from "vitest";
import {
  buildSavingsRequest,
  DEFAULT_FINANCING,
  snapBatteryKwh,
  type FinancingInputs,
} from "../build-request";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { ReportSelection } from "@/components/check-wizard/report/report-shell";

// Minimal stub of an AnalyseResponse — covers the fields the mapper
// reads: eligibility.heatPump.{verdict,estimatedGrantGBP}, and (after
// the per-property cost-derivation fix) finance.heatPump.{netRange,
// additionalCostsGBP} + finance.solar.installCostGBP.
function stubAnalysis(opts?: {
  verdict?: "eligible" | "conditional" | "blocked";
  grant?: number;
  /** Net HP install range (post-grant). Mapper takes midpoint + adds
   *  grant back to derive the gross cost it sends to the engine.
   *  `null` simulates the "no floor area, no band, no cost" path. */
  hpNetRange?: [number, number] | null;
  /** Additional EPC-renewal style costs the mapper folds into HP gross
   *  so the loan/upfront figures reflect the all-in cost. */
  hpAdditionalCosts?: Array<{ label: string; gbp: number }>;
  /** Total solar install cost — mapper divides by recommendedPanels
   *  to get a per-panel rate. */
  solarInstallCostGBP?: number | null;
}): AnalyseResponse {
  return {
    eligibility: {
      heatPump: {
        verdict: opts?.verdict ?? "eligible",
        estimatedGrantGBP: opts?.grant ?? 7500,
        recommendedSystemKW: 8,
        warnings: [],
        notes: [],
      },
      solar: {
        rating: "Good",
        recommendedKWp: 4.8,
        recommendedPanels: 12,
        estimatedAnnualKWh: 4800,
        notes: [],
      },
    },
    finance: {
      heatPump: {
        grantGBP: opts?.grant ?? 7500,
        estimatedNetInstallCostRangeGBP:
          opts?.hpNetRange === undefined ? [500, 1500] : opts.hpNetRange,
        additionalCostsGBP: opts?.hpAdditionalCosts ?? [],
      },
      solar: {
        installCostGBP:
          opts?.solarInstallCostGBP === undefined
            ? 5280
            : opts.solarInstallCostGBP,
        annualSavingsRangeGBP: null,
        paybackYearsRange: null,
        assumptions: {
          importPricePPerKWh: 27,
          exportPricePPerKWh: 15,
          selfConsumptionRate: 0.6,
          installPricePerKWpGBP: 1100,
        },
      },
    },
    // Fields the mapper doesn't touch — typed as `unknown`-equivalent
    // via the cast below.
    epc: {} as never,
    enrichments: {} as never,
    floorplan: {} as never,
    solar: {} as never,
  } as unknown as AnalyseResponse;
}

function stubTariff(overrides: Partial<FuelTariff>): FuelTariff {
  return {
    provider: null,
    tariffName: null,
    productType: null,
    paymentMethod: null,
    unitRatePencePerKWh: null,
    standingChargePencePerDay: null,
    priceGuaranteedUntil: null,
    earlyExitFee: null,
    estimatedAnnualUsageKWh: null,
    source: "manual_estimate",
    usageBand: "medium",
    timeOfUseTariff: null,
    exportRatePencePerKWh: null,
    ...overrides,
  };
}

const baseSelection: ReportSelection = {
  hasSolar: true,
  hasBattery: true,
  hasHeatPump: true,
  panelCount: 12,
  batteryKwh: 5,
};

const baseFinancing: FinancingInputs = { ...DEFAULT_FINANCING };

describe("snapBatteryKwh", () => {
  it("snaps to the nearest API-allowed rung", () => {
    expect(snapBatteryKwh(0)).toBe(0);
    expect(snapBatteryKwh(2)).toBe(3);
    expect(snapBatteryKwh(3)).toBe(3);
    expect(snapBatteryKwh(4)).toBe(3);
    expect(snapBatteryKwh(5)).toBe(5);
    expect(snapBatteryKwh(7)).toBe(5);
    expect(snapBatteryKwh(8)).toBe(10);
    expect(snapBatteryKwh(20)).toBe(10);
  });

  it("treats non-positive as 0", () => {
    expect(snapBatteryKwh(-3)).toBe(0);
  });
});

describe("buildSavingsRequest", () => {
  it("converts pence-denominated tariff fields to £ for the API", () => {
    const electricityTariff = stubTariff({
      unitRatePencePerKWh: 25.18,
      standingChargePencePerDay: 20,
      estimatedAnnualUsageKWh: 4000,
    });
    const gasTariff = stubTariff({
      unitRatePencePerKWh: 5.04,
      standingChargePencePerDay: 20,
      estimatedAnnualUsageKWh: 11500,
    });

    const req = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff,
      gasTariff,
      selection: baseSelection,
      financing: baseFinancing,
    });

    // 25.18 pence/kWh → 0.2518 £/kWh
    expect(req.currentEnergy.electricityKwhPrice).toBeCloseTo(0.2518, 4);
    expect(req.currentEnergy.gasKwhPrice).toBeCloseTo(0.0504, 4);
    expect(req.currentEnergy.electricStandingChargePerDay).toBeCloseTo(0.2, 2);
    expect(req.currentEnergy.gasStandingChargePerDay).toBeCloseTo(0.2, 2);
    expect(req.currentEnergy.annualElectricityConsumptionKwh).toBe(4000);
    expect(req.currentEnergy.annualGasConsumptionKwh).toBe(11500);
  });

  it("sets hasGas/hasElectric based on tariff presence", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: stubTariff({}),
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.currentEnergy.hasGas).toBe(false);
    expect(req.currentEnergy.hasElectric).toBe(true);
  });

  it("falls back to defaults when a tariff field is null", () => {
    // unitRatePencePerKWh is null — the mapper should leave the API
    // default in place rather than send 0 (which would zero out the
    // bill calculation).
    const req = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: stubTariff({ unitRatePencePerKWh: null }),
      gasTariff: stubTariff({ unitRatePencePerKWh: null }),
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.currentEnergy.electricityKwhPrice).toBe(0.2518); // default
    expect(req.currentEnergy.gasKwhPrice).toBe(0.0504); // default
  });

  it("snaps the wizard's freeform battery kWh onto the 0/3/5/10 rungs", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: null,
      gasTariff: null,
      selection: { ...baseSelection, batteryKwh: 7 },
      financing: baseFinancing,
    });
    expect(req.improvements.batterySizeKwh).toBe(5);
  });

  it("treats hasBattery=false as battery=0 regardless of batteryKwh", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: null,
      gasTariff: null,
      selection: { ...baseSelection, hasBattery: false, batteryKwh: 5 },
      financing: baseFinancing,
    });
    expect(req.improvements.batterySizeKwh).toBe(0);
  });

  it("clamps panel count to 0–50 and rounds to int", () => {
    const tooMany = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: null,
      gasTariff: null,
      selection: { ...baseSelection, panelCount: 99 },
      financing: baseFinancing,
    });
    expect(tooMany.improvements.solarPanelCount).toBe(50);

    const negative = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: null,
      gasTariff: null,
      selection: { ...baseSelection, panelCount: -5 },
      financing: baseFinancing,
    });
    expect(negative.improvements.solarPanelCount).toBe(0);

    const fractional = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: null,
      gasTariff: null,
      selection: { ...baseSelection, panelCount: 12.7 },
      financing: baseFinancing,
    });
    expect(fractional.improvements.solarPanelCount).toBe(13);
  });

  it("flips busGrantEligible off when the heat-pump verdict is blocked", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis({ verdict: "blocked" }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.improvements.busGrantEligible).toBe(false);
  });

  it("uses the analysis's BUS grant amount when present", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis({ grant: 6000 }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.costAssumptions.busGrantAmount).toBe(6000);
  });

  it("falls back to £7,500 when the analysis grant is 0", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis({ grant: 0 }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.costAssumptions.busGrantAmount).toBe(7500);
  });

  it("threads the user's financing inputs through unchanged", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis(),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: {
        loanTermMonths: 60,
        loanApr: 0.099,
        mortgageRate: 0.05,
        mortgageTermYears: 20,
        wantFinance: false,
        wantMortgage: false,
      },
    });
    expect(req.financing.loanTermMonths).toBe(60);
    expect(req.financing.loanApr).toBe(0.099);
    expect(req.financing.mortgageRate).toBe(0.05);
    expect(req.financing.mortgageTermYears).toBe(20);
    expect(req.improvements.wantFinance).toBe(false);
  });

  // ─── Per-property cost derivation (the main bug fix) ─────────────────

  it("derives heatPumpCost from the analysis's net install range + grant", () => {
    // Net range midpoint £1,000 + grant £7,500 = £8,500 gross. This
    // is what the engine subtracts the grant from to produce the
    // loan principal — without this fix the engine saw a flat £12k.
    const req = buildSavingsRequest({
      analysis: stubAnalysis({
        hpNetRange: [500, 1500],
        grant: 7500,
      }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.costAssumptions.heatPumpCost).toBe(8500);
  });

  it("folds additional one-off costs (EPC renewal) into heatPumpCost", () => {
    // £1,000 mid + £7,500 grant + £90 EPC = £8,590 gross. The £90
    // ends up in the loan so the homeowner sees the all-in figure.
    const req = buildSavingsRequest({
      analysis: stubAnalysis({
        hpNetRange: [500, 1500],
        grant: 7500,
        hpAdditionalCosts: [{ label: "New EPC", gbp: 90 }],
      }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.costAssumptions.heatPumpCost).toBe(8590);
  });

  it("falls back to £12,000 when the analysis has no net install range", () => {
    // No floor area → no band → no range. Old behaviour kept as a
    // fallback so we don't silently zero-out the HP cost.
    const req = buildSavingsRequest({
      analysis: stubAnalysis({ hpNetRange: null }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.costAssumptions.heatPumpCost).toBe(12000);
  });

  it("derives solarCostPerPanel from total install cost ÷ recommended panels", () => {
    // £5,280 total / 12 recommended panels = £440 per panel. The
    // engine multiplies this by the user's selected panel count.
    const req = buildSavingsRequest({
      analysis: stubAnalysis({ solarInstallCostGBP: 5280 }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.costAssumptions.solarCostPerPanel).toBe(440);
  });

  it("falls back to £350/panel when solar install cost is missing", () => {
    const req = buildSavingsRequest({
      analysis: stubAnalysis({ solarInstallCostGBP: null }),
      electricityTariff: null,
      gasTariff: null,
      selection: baseSelection,
      financing: baseFinancing,
    });
    expect(req.costAssumptions.solarCostPerPanel).toBe(350);
  });
});
