import { z } from "zod";
import { BuildingInsightsResponseSchema } from "@/lib/schemas/solar";
import { EpcByAddressResponseSchema } from "@/lib/schemas/epc";
import { FloorplanAnalysisSchema } from "@/lib/schemas/floorplan";
// Re-export so other files (route handlers, services) get the schema from a
// single import surface.
export { FloorplanAnalysisSchema };
import { FuelTariffSchema } from "@/lib/schemas/bill";
import {
  FloodResponseSchema,
  ListedResponseSchema,
  PlanningResponseSchema,
} from "@/lib/schemas/enrichments";
import { EligibilitySchema, FinanceSchema } from "@/lib/schemas/eligibility";

export const AnalyseRequestSchema = z.object({
  address: z.object({
    // Real UPRN when Postcoder supplies one; null otherwise. The EPC
    // and OS services skip UPRN-first lookups when null and use
    // postcode + address matching instead. See /api/address/lookup.
    uprn: z.string().nullable(),
    formattedAddress: z.string(),
    line1: z.string(),
    line2: z.string().nullable().optional(),
    postcode: z.string(),
    postTown: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  country: z.enum(["England", "Wales", "Scotland", "Northern Ireland"]).nullable(),
  // We deliberately ask the user as little as possible. Anything we can
  // answer from the EPC, the floorplan AI analysis, Postcoder, or the Solar
  // API is inferred instead of surveyed. Only questions that can't be
  // resolved from public data live here.
  questionnaire: z.object({
    interests: z.array(z.enum(["heat_pump", "solar_battery"])).min(1),
    tenure: z.enum(["owner", "landlord", "tenant", "social"]),
    currentHeatingFuel: z.enum(["gas", "electric", "other"]),
    priorHeatPumpFunding: z.enum(["yes", "no", "unsure"]).optional(),
    // Per-fuel tariff details (electricity always required when the
    // questionnaire reaches Step 5, gas required when fuel === "gas"). The
    // shape is the same whether sourced from a bill upload or a manual entry —
    // see FuelTariffSchema for the discriminator.
    electricityTariff: FuelTariffSchema.nullable(),
    gasTariff: FuelTariffSchema.nullable(),
  }),
  // Optional now — the v2 upload-only flow stores the floorplan in
  // public.floorplan_uploads and supplies the structured extract via
  // wizard state, so the analyse pipeline doesn't need the raw image
  // key. Empty-string default keeps the schema lenient when the
  // wizard's gate has cleared but the legacy field is unset.
  floorplanObjectKey: z.string().default(""),
  // Precomputed floorplan analysis from the legacy Step 4 builder
  // (canvas walls / placements). When present, /api/analyse skips
  // its own Claude vision call. The v2 upload-only flow doesn't
  // populate this — it sends `floorplanExtract` separately so the
  // report's heat-pump tab can render the new content directly.
  precomputedFloorplan: z
    .object({
      analysis: FloorplanAnalysisSchema.nullable(),
      degraded: z.boolean(),
      reason: z.string().optional(),
    })
    .optional(),
});

export type AnalyseRequest = z.infer<typeof AnalyseRequestSchema>;

export const PvgisResultSchema = z.object({
  annualKwh: z.number(),
  monthlyKwh: z.array(z.number()),
  inputs: z.object({
    peakPowerKwp: z.number(),
    anglePitchDegrees: z.number(),
    aspectPvgis: z.number(),
    googleAzimuthDegrees: z.number(),
    systemLossPct: z.number(),
  }),
});

export const AnalyseResponseSchema = z.object({
  solar: BuildingInsightsResponseSchema,
  epc: EpcByAddressResponseSchema,
  pvgis: PvgisResultSchema.nullable(),
  floorplan: z.object({
    degraded: z.boolean(),
    reason: z.string().optional(),
    analysis: FloorplanAnalysisSchema.nullable(),
  }),
  enrichments: z.object({
    flood: FloodResponseSchema.nullable(),
    listed: ListedResponseSchema.nullable(),
    planning: PlanningResponseSchema.nullable(),
  }),
  eligibility: EligibilitySchema,
  finance: FinanceSchema,
});

export type AnalyseResponse = z.infer<typeof AnalyseResponseSchema>;
