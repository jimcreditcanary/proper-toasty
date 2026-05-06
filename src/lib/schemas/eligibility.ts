import { z } from "zod";

export const EligibilitySchema = z.object({
  heatPump: z.object({
    verdict: z.enum(["eligible", "conditional", "blocked"]),
    blockers: z.array(z.string()),
    warnings: z.array(z.string()),
    estimatedGrantGBP: z.number(),
    recommendedSystemKW: z.number().nullable(),
    heatLossPlanningEstimateW: z.number().nullable(),
    notes: z.array(z.string()),
  }),
  solar: z.object({
    rating: z.enum(["Excellent", "Good", "Marginal", "Not recommended"]),
    reason: z.string().nullable(),
    recommendedPanels: z.number().nullable(),
    recommendedKWp: z.number().nullable(),
    estimatedAnnualKWh: z.number().nullable(),
    scoreBreakdown: z.object({
      orientation: z.number(),
      shading: z.number(),
      combined: z.number(),
    }).nullable(),
  }),
  householdElectricityBaselineKWh: z.number(),
});

/**
 * Itemised extra cost the homeowner has to bear before / alongside an
 * install. Currently used for EPC renewal when the cert is expired
 * (BUS requires a non-expired EPC), but designed to grow into other
 * pre-install costs (e.g. building survey, party-wall agreement).
 *
 * Each entry is shown as its own line in the report's cost breakdown
 * and summed into the headline figure. Kept as an array (not a flat
 * total) so the homeowner can see *why* the cost is what it is.
 */
export const AdditionalCostSchema = z.object({
  label: z.string(),
  gbp: z.number(),
  note: z.string().optional(),
});
export type AdditionalCost = z.infer<typeof AdditionalCostSchema>;

export const FinanceSchema = z.object({
  heatPump: z.object({
    grantGBP: z.number(),
    estimatedNetInstallCostRangeGBP: z.tuple([z.number(), z.number()]).nullable(),
    /** Pre-install / one-off extras the homeowner pays separately
     *  from the install cost — e.g. a new EPC when the existing one
     *  has expired. UI sums these into the all-in figure. */
    additionalCostsGBP: z.array(AdditionalCostSchema).default([]),
  }),
  solar: z.object({
    installCostGBP: z.number().nullable(),
    annualSavingsRangeGBP: z.tuple([z.number(), z.number()]).nullable(),
    paybackYearsRange: z.tuple([z.number(), z.number()]).nullable(),
    assumptions: z.object({
      importPricePPerKWh: z.number(),
      exportPricePPerKWh: z.number(),
      selfConsumptionRate: z.number(),
      installPricePerKWpGBP: z.number(),
    }),
  }),
});

export type Eligibility = z.infer<typeof EligibilitySchema>;
export type Finance = z.infer<typeof FinanceSchema>;
