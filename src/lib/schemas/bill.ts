import { z } from "zod";

/**
 * Per-fuel tariff record. Same shape used for both electricity and gas, and
 * the same shape regardless of whether the values came from a bill upload, a
 * manual "I know exactly" entry, or a Low/Medium/High estimate seeded from
 * Ofgem TDCV defaults. The `source` field tells downstream code which.
 */
export const FuelTariffSchema = z.object({
  provider: z.string().nullable(),
  tariffName: z.string().nullable(),
  productType: z.string().nullable(), // Fixed / Variable / Standard / Tracker / Time-of-use
  paymentMethod: z.string().nullable(), // Direct Debit / Standard Credit / Pay As You Go
  unitRatePencePerKWh: z.number().nonnegative().nullable(),
  standingChargePencePerDay: z.number().nonnegative().nullable(),
  priceGuaranteedUntil: z.string().nullable(), // ISO date or free text from the bill
  earlyExitFee: z.string().nullable(), // free text — varies wildly between suppliers
  estimatedAnnualUsageKWh: z.number().nonnegative().nullable(),
  source: z.enum(["bill_upload", "manual_known", "manual_estimate"]),
  usageBand: z.enum(["low", "medium", "high", "exact"]).nullable(),
});

export type FuelTariff = z.infer<typeof FuelTariffSchema>;

export const BillAnalysisSchema = z.object({
  electricity: FuelTariffSchema.omit({ source: true, usageBand: true }).nullable(),
  gas: FuelTariffSchema.omit({ source: true, usageBand: true }).nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  supplier: z.string().nullable(),
  billingPeriod: z.string().nullable(),
  notes: z.string(),
});

export type BillAnalysis = z.infer<typeof BillAnalysisSchema>;

export const BillParseResponseSchema = z.union([
  z.object({ ok: z.literal(true), analysis: BillAnalysisSchema }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

export type BillParseResponse = z.infer<typeof BillParseResponseSchema>;
