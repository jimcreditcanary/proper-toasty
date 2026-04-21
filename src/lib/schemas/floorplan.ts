import { z } from "zod";

export const FloorplanAnalysisSchema = z.object({
  roomCount: z.number().int().nonnegative(),
  roomsByType: z.object({
    bedrooms: z.number().int().nonnegative(),
    bathrooms: z.number().int().nonnegative(),
    livingRooms: z.number().int().nonnegative(),
    kitchens: z.number().int().nonnegative(),
    utility: z.number().int().nonnegative(),
    other: z.number().int().nonnegative(),
  }),
  estimatedTotalAreaM2: z.number().nullable(),
  floorsVisible: z.number().int().positive(),
  radiatorsVisible: z.number().int().nonnegative().nullable(),
  boilerLocation: z.string().nullable(),
  hotWaterCylinderSpace: z.object({
    likelyPresent: z.boolean(),
    location: z.string().nullable(),
    notes: z.string(),
  }),
  externalWallExposure: z.enum(["low", "medium", "high", "unknown"]),
  outdoorSpace: z.object({
    indicated: z.boolean(),
    adjacentToLivingSpace: z.boolean().nullable(),
    notes: z.string(),
  }),
  heatPumpInstallationConcerns: z.array(z.string()),
  solarInstallationConcerns: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  confidenceNotes: z.string(),
  recommendedInstallerQuestions: z.array(z.string()),
});

export type FloorplanAnalysis = z.infer<typeof FloorplanAnalysisSchema>;
