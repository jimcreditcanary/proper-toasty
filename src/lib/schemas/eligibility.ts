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

export const FinanceSchema = z.object({
  heatPump: z.object({
    grantGBP: z.number(),
    estimatedNetInstallCostRangeGBP: z.tuple([z.number(), z.number()]).nullable(),
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
