import { z } from "zod";
import { BuildingInsightsResponseSchema } from "@/lib/schemas/solar";
import { EpcByAddressResponseSchema } from "@/lib/schemas/epc";
import { FloorplanAnalysisSchema } from "@/lib/schemas/floorplan";

export const AnalyseRequestSchema = z.object({
  address: z.object({
    formattedAddress: z.string(),
    line1: z.string(),
    postcode: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    placeId: z.string(),
  }),
  country: z.enum(["England", "Wales", "Scotland", "Northern Ireland"]).nullable(),
  questionnaire: z.object({
    tenure: z.enum(["owner", "landlord", "tenant", "social"]),
    outdoorSpaceForAshp: z.enum(["yes", "no", "unsure"]),
    hotWaterTankPresent: z.enum(["yes", "no", "unsure"]),
    hybridPreference: z.enum(["replace", "hybrid", "undecided"]),
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
});

export type AnalyseResponse = z.infer<typeof AnalyseResponseSchema>;
