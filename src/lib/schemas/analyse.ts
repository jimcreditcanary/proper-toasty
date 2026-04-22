import { z } from "zod";
import { BuildingInsightsResponseSchema } from "@/lib/schemas/solar";
import { EpcByAddressResponseSchema } from "@/lib/schemas/epc";
import { FloorplanAnalysisSchema } from "@/lib/schemas/floorplan";
import { FuelTariffSchema } from "@/lib/schemas/bill";
import {
  FloodResponseSchema,
  ListedResponseSchema,
  PlanningResponseSchema,
} from "@/lib/schemas/enrichments";
import { EligibilitySchema, FinanceSchema } from "@/lib/schemas/eligibility";

export const AnalyseRequestSchema = z.object({
  address: z.object({
    uprn: z.string().min(1),
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
  floorplanObjectKey: z.string(),
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
