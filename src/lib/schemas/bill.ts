import { z } from "zod";

export const BillAnalysisSchema = z.object({
  annualGasKWh: z.number().nonnegative().nullable(),
  annualElectricityKWh: z.number().nonnegative().nullable(),
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
