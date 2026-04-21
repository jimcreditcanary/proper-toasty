import { z } from "zod";

const LatLngSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

// .passthrough() on every level so any field Google returns that we haven't
// explicitly enumerated (financialAnalyses, new solar-panel metadata, extra
// roof-segment fields, etc.) survives parsing and stays on the response. Lets
// us use "what we need now" without throwing "what we might need later" away.

export const RoofSegmentSchema = z
  .object({
    pitchDegrees: z.number().optional(),
    azimuthDegrees: z.number().optional(),
    stats: z
      .object({
        areaMeters2: z.number().optional(),
        sunshineQuantiles: z.array(z.number()).optional(),
        groundAreaMeters2: z.number().optional(),
      })
      .passthrough()
      .optional(),
    center: LatLngSchema.optional(),
    boundingBox: z
      .object({ sw: LatLngSchema, ne: LatLngSchema })
      .passthrough()
      .optional(),
    planeHeightAtCenterMeters: z.number().optional(),
  })
  .passthrough();

export const SolarPanelConfigSchema = z
  .object({
    panelsCount: z.number(),
    yearlyEnergyDcKwh: z.number(),
    roofSegmentSummaries: z
      .array(
        z
          .object({
            segmentIndex: z.number().optional(),
            panelsCount: z.number().optional(),
            yearlyEnergyDcKwh: z.number().optional(),
            pitchDegrees: z.number().optional(),
            azimuthDegrees: z.number().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

export const BuildingInsightsSchema = z
  .object({
    name: z.string().optional(),
    center: LatLngSchema.optional(),
    imageryDate: z
      .object({ year: z.number(), month: z.number(), day: z.number() })
      .passthrough()
      .optional(),
    imageryQuality: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    solarPotential: z
      .object({
        maxArrayPanelsCount: z.number().optional(),
        maxArrayAreaMeters2: z.number().optional(),
        maxSunshineHoursPerYear: z.number().optional(),
        carbonOffsetFactorKgPerMwh: z.number().optional(),
        wholeRoofStats: z
          .object({
            areaMeters2: z.number().optional(),
            sunshineQuantiles: z.array(z.number()).optional(),
          })
          .passthrough()
          .optional(),
        roofSegmentStats: z.array(RoofSegmentSchema).optional(),
        solarPanelConfigs: z.array(SolarPanelConfigSchema).optional(),
        panelCapacityWatts: z.number().optional(),
        panelHeightMeters: z.number().optional(),
        panelWidthMeters: z.number().optional(),
        panelLifetimeYears: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type BuildingInsights = z.infer<typeof BuildingInsightsSchema>;
export type RoofSegment = z.infer<typeof RoofSegmentSchema>;

// The shape returned by /api/solar/building — either a hit or a graceful miss.
export const BuildingInsightsResponseSchema = z.discriminatedUnion("coverage", [
  z.object({
    coverage: z.literal(true),
    quality: z.enum(["HIGH", "MEDIUM", "LOW"]),
    data: BuildingInsightsSchema,
  }),
  z.object({
    coverage: z.literal(false),
    reason: z.string(),
  }),
]);

export type BuildingInsightsResponse = z.infer<typeof BuildingInsightsResponseSchema>;
