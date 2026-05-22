import { describe, it, expect } from "vitest";
import type { EpcByAddressResponse } from "@/lib/schemas/epc";
import type { Eligibility } from "@/lib/schemas/eligibility";
import {
  classifyBoilerHomeType,
  lookupBoilerCost,
  buildHeatPumpCost,
  hasOutstandingInsulationRec,
  buildBoilerVsHeatPump,
  financeQuote,
  annualRunningCost,
  totalCostOfOwnership,
  BOILER_COST_TABLE,
  BOILER_NATIONAL_FALLBACK,
  BOILER_COMPLEXITY_UPLIFT_GBP,
  HEAT_PUMP_GROSS_COST_RANGE_GBP,
  HEATING_FINANCE,
  RUNNING_COST,
} from "../boiler-comparison";
import type { FuelTariff } from "@/lib/schemas/bill";

// ─── Test fixtures ───────────────────────────────────────────────────

function epcFound(
  cert: {
    propertyType?: string | null;
    builtForm?: string | null;
    dwellingType?: string | null;
    totalFloorAreaM2?: number | null;
  },
  recommendations: Array<{ improvementSummary: string }> = [],
): EpcByAddressResponse {
  return {
    found: true,
    matchMethod: "uprn",
    registrationDate: "2024-01-01",
    ageYears: 2,
    recommendations: recommendations.map((r) => ({
      improvementSummary: r.improvementSummary,
      improvementDescription: null,
      improvementItem: null,
      indicativeCost: null,
      typicalSavingPerYear: null,
      energyPerformanceRatingImprovement: null,
      energyPerformanceBandImprovement: null,
      environmentalImpactRatingImprovement: null,
      greenDealCategoryCode: null,
    })),
    // Only the fields the comparison reads need to be realistic; the
    // rest are filled with nulls to satisfy the certificate shape.
    certificate: {
      certificateNumber: "0000-0000-0000-0000-0000",
      uprn: "100000000000",
      address: "1 Test St",
      postcode: "SW1A 1AA",
      registrationDate: "2024-01-01",
      transactionType: null,
      council: null,
      currentEnergyBand: "D",
      potentialEnergyBand: "B",
      currentEnergyRating: 60,
      potentialEnergyRating: 80,
      environmentImpactCurrent: null,
      environmentImpactPotential: null,
      energyConsumptionCurrent: null,
      energyConsumptionPotential: null,
      co2EmissionsCurrent: null,
      co2EmissionsPotential: null,
      propertyType: cert.propertyType ?? null,
      dwellingType: cert.dwellingType ?? null,
      builtForm: cert.builtForm ?? null,
      constructionAgeBand: null,
      tenure: null,
      totalFloorAreaM2: cert.totalFloorAreaM2 ?? null,
      floorHeightM: null,
      extensionCount: null,
      numberHabitableRooms: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const epcNotFound: EpcByAddressResponse = {
  found: false,
  reason: "no_match",
};

function hp(
  overrides: Partial<Eligibility["heatPump"]> = {},
): Eligibility["heatPump"] {
  return {
    verdict: "eligible",
    blockers: [],
    warnings: [],
    estimatedGrantGBP: 7500,
    recommendedSystemKW: 8,
    heatLossPlanningEstimateW: 4000,
    notes: [],
    ...overrides,
  };
}

// ─── classifyBoilerHomeType ──────────────────────────────────────────

describe("classifyBoilerHomeType", () => {
  it("classifies flats from property type", () => {
    expect(classifyBoilerHomeType(epcFound({ propertyType: "Flat" }))).toBe(
      "flat",
    );
    expect(
      classifyBoilerHomeType(epcFound({ propertyType: "Maisonette" })),
    ).toBe("flat");
  });

  it("classifies terraced / semi / detached from built form", () => {
    expect(
      classifyBoilerHomeType(
        epcFound({ propertyType: "House", builtForm: "Mid-Terrace" }),
      ),
    ).toBe("terraced");
    expect(
      classifyBoilerHomeType(
        epcFound({ propertyType: "House", builtForm: "Semi-Detached" }),
      ),
    ).toBe("semi");
    expect(
      classifyBoilerHomeType(
        epcFound({
          propertyType: "House",
          builtForm: "Detached",
          totalFloorAreaM2: 120,
        }),
      ),
    ).toBe("detached");
  });

  it("does not mistake Semi-Detached for detached (ordering)", () => {
    // "Semi-Detached" contains "detached" — must match semi first.
    expect(
      classifyBoilerHomeType(epcFound({ builtForm: "Semi-Detached" })),
    ).toBe("semi");
  });

  it("upgrades a large detached home by floor area", () => {
    expect(
      classifyBoilerHomeType(
        epcFound({ builtForm: "Detached", totalFloorAreaM2: 220 }),
      ),
    ).toBe("large_detached");
  });

  it("falls back to floor-area bands when built form is missing", () => {
    expect(classifyBoilerHomeType(epcFound({ totalFloorAreaM2: 55 }))).toBe(
      "flat",
    );
    expect(classifyBoilerHomeType(epcFound({ totalFloorAreaM2: 200 }))).toBe(
      "large_detached",
    );
  });

  it("returns unknown when EPC not found or no usable signal", () => {
    expect(classifyBoilerHomeType(epcNotFound)).toBe("unknown");
    expect(classifyBoilerHomeType(epcFound({}))).toBe("unknown");
  });
});

// ─── lookupBoilerCost ────────────────────────────────────────────────

describe("lookupBoilerCost", () => {
  it("returns the table band + midpoint + uplift for a known type", () => {
    const r = lookupBoilerCost(
      epcFound({ builtForm: "Semi-Detached", totalFloorAreaM2: 95 }),
    );
    expect(r.homeType).toBe("semi");
    expect(r.cleanSwapRangeGBP).toEqual(BOILER_COST_TABLE.semi.rangeGBP);
    expect(r.installedCostGBP).toBe(
      BOILER_COST_TABLE.semi.midpointGBP + BOILER_COMPLEXITY_UPLIFT_GBP,
    );
  });

  it("uses the national fallback when unclassifiable", () => {
    const r = lookupBoilerCost(epcNotFound);
    expect(r.homeType).toBe("unknown");
    expect(r.cleanSwapRangeGBP).toEqual(BOILER_NATIONAL_FALLBACK.rangeGBP);
    expect(r.installedCostGBP).toBe(
      BOILER_NATIONAL_FALLBACK.midpointGBP + BOILER_COMPLEXITY_UPLIFT_GBP,
    );
  });
});

// ─── insulation detection ────────────────────────────────────────────

describe("hasOutstandingInsulationRec", () => {
  it("detects loft / cavity / wall insulation recs", () => {
    expect(
      hasOutstandingInsulationRec(
        epcFound({}, [{ improvementSummary: "Increase loft insulation to 270mm" }]),
      ),
    ).toBe(true);
    expect(
      hasOutstandingInsulationRec(
        epcFound({}, [{ improvementSummary: "Cavity wall insulation" }]),
      ),
    ).toBe(true);
  });

  it("ignores non-insulation recs", () => {
    expect(
      hasOutstandingInsulationRec(
        epcFound({}, [{ improvementSummary: "Solar water heating" }]),
      ),
    ).toBe(false);
  });
});

// ─── buildHeatPumpCost ───────────────────────────────────────────────

describe("buildHeatPumpCost", () => {
  it("nets the grant off the gross when eligible + no insulation rec", () => {
    const r = buildHeatPumpCost(epcFound({ builtForm: "Detached" }), hp());
    expect(r.busEligible).toBe(true);
    expect(r.insulationFirst).toBe(false);
    expect(r.grossRangeGBP).toEqual(HEAT_PUMP_GROSS_COST_RANGE_GBP);
    // 12000-7500=4500, 16000-7500=8500
    expect(r.netRangeGBP).toEqual([4500, 8500]);
    expect(r.netMidpointGBP).toBe(6500);
  });

  it("withholds the net figure when an insulation rec is outstanding", () => {
    const r = buildHeatPumpCost(
      epcFound({ builtForm: "Detached" }, [
        { improvementSummary: "Loft insulation" },
      ]),
      hp(),
    );
    expect(r.insulationFirst).toBe(true);
    expect(r.netRangeGBP).toBeNull();
    expect(r.netMidpointGBP).toBeNull();
  });

  it("withholds the net figure when BUS is blocked", () => {
    const r = buildHeatPumpCost(
      epcFound({ builtForm: "Detached" }),
      hp({ verdict: "blocked", blockers: ["Scotland not in scope"] }),
    );
    expect(r.busEligible).toBe(false);
    expect(r.netRangeGBP).toBeNull();
  });

  it("never returns a negative net floor", () => {
    const r = buildHeatPumpCost(
      epcFound({ builtForm: "Flat" }),
      hp({ estimatedGrantGBP: 99999 }),
    );
    expect(r.netRangeGBP?.[0]).toBe(0);
  });
});

// ─── buildBoilerVsHeatPump ───────────────────────────────────────────

describe("buildBoilerVsHeatPump", () => {
  it("assembles both sides", () => {
    const out = buildBoilerVsHeatPump({
      epc: epcFound({ builtForm: "Semi-Detached", totalFloorAreaM2: 100 }),
      eligibility: {
        heatPump: hp(),
        // solar + baseline irrelevant to the comparison; minimal stub.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        solar: {} as any,
        householdElectricityBaselineKWh: 0,
      },
    });
    expect(out.boiler.homeType).toBe("semi");
    expect(out.heatPump.netMidpointGBP).toBe(6500);
  });
});

// ─── financeQuote ────────────────────────────────────────────────────

describe("financeQuote", () => {
  it("0% APR: total equals principal, zero interest", () => {
    const q = financeQuote(2250, 0, 24);
    expect(q.totalInterestGBP).toBe(0);
    expect(q.monthlyGBP).toBeCloseTo(93.75, 2); // 2250 / 24
    expect(q.totalRepayableGBP).toBeCloseTo(2250, 2);
  });

  it("low-APR spread: charges interest, total > principal", () => {
    // £2,250 over 60 months @ 11.9% ≈ ~£42/mo (reference §5 worked eg).
    const q = financeQuote(2250, 11.9, 60);
    expect(q.monthlyGBP).toBeGreaterThan(40);
    expect(q.monthlyGBP).toBeLessThan(55);
    expect(q.totalRepayableGBP).toBeGreaterThan(2250);
    expect(q.totalInterestGBP).toBeGreaterThan(0);
  });

  it("flags principals below the market minimum as not financeable", () => {
    expect(financeQuote(500, 0, 12).financeable).toBe(false);
    expect(financeQuote(HEATING_FINANCE.minLoanGBP, 0, 12).financeable).toBe(
      true,
    );
  });
});

// ─── annualRunningCost ───────────────────────────────────────────────

function tariff(overrides: Partial<FuelTariff>): FuelTariff {
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
    usageBand: null,
    timeOfUseTariff: null,
    exportRatePencePerKWh: null,
    ...overrides,
  };
}

describe("annualRunningCost", () => {
  it("models heating energy for both systems from EPC floor area", () => {
    const rc = annualRunningCost({
      epc: epcFound({ builtForm: "Semi-Detached", totalFloorAreaM2: 100 }),
    });
    expect(rc.floorAreaM2).toBe(100);
    expect(rc.floorAreaEstimated).toBe(false);
    // 100 m² × 60 kWh/m² = 6000 kWh HP electricity.
    // thermal = 6000 × 2.8 = 16,800 kWh; gas = 16800 / 0.9 = 18,667 kWh.
    // boiler = 18667 × 7p + 30p×365 = £1306.7 + £109.5 ≈ £1416.
    // heat pump = 6000 × 27p = £1620.
    expect(rc.boilerAnnualGBP).toBeGreaterThan(1300);
    expect(rc.boilerAnnualGBP).toBeLessThan(1500);
    expect(rc.heatPumpAnnualGBP).toBe(1620);
    // The honest truth: on a STANDARD tariff the heat pump is not
    // automatically cheaper to run than gas.
    expect(rc.heatPumpAnnualGBP).toBeGreaterThan(rc.boilerAnnualGBP);
  });

  it("a heat-pump tariff flips the running cost in the heat pump's favour", () => {
    const rc = annualRunningCost({
      epc: epcFound({ totalFloorAreaM2: 100 }),
      // Cosy-style off-peak-weighted effective rate.
      electricityTariff: tariff({ unitRatePencePerKWh: 13 }),
    });
    // 6000 × 13p = £780 — well under the ~£1,400 gas figure.
    expect(rc.heatPumpAnnualGBP).toBe(780);
    expect(rc.heatPumpAnnualGBP).toBeLessThan(rc.boilerAnnualGBP);
  });

  it("prefers the user's gas tariff over the default", () => {
    const rc = annualRunningCost({
      epc: epcFound({ totalFloorAreaM2: 100 }),
      gasTariff: tariff({
        unitRatePencePerKWh: 6,
        standingChargePencePerDay: 28,
      }),
    });
    expect(rc.assumptions.gasUnitPencePerKwh).toBe(6);
    expect(rc.assumptions.gasStandingPencePerDay).toBe(28);
  });

  it("falls back to the national floor area when the EPC has none", () => {
    const rc = annualRunningCost({ epc: epcFound({}) });
    expect(rc.floorAreaEstimated).toBe(true);
    expect(rc.floorAreaM2).toBe(RUNNING_COST.fallbackFloorAreaM2);
  });
});

// ─── totalCostOfOwnership ────────────────────────────────────────────

describe("totalCostOfOwnership", () => {
  it("sums day-one outlay + N years of energy", () => {
    // £2,800 boiler + 10 × £1,400 energy = £16,800.
    expect(
      totalCostOfOwnership({
        upfrontGBP: 2800,
        annualEnergyGBP: 1400,
        years: 10,
      }),
    ).toBe(16800);
  });
});
