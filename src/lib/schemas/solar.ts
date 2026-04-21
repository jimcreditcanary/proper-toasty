/**
 * Full Google Solar API `buildingInsights:findClosest` response schema.
 *
 * Reference:
 * https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest
 *
 * Every field Google documents is captured here with a comment explaining
 * what it is and what units it's in. The schema uses `.passthrough()` at each
 * nested object so anything Google adds in future still survives parsing
 * without a schema update.
 *
 * We currently SURFACE the following in the UI / eligibility engine:
 *   - imageryQuality                         (Step 2 preview card)
 *   - solarPotential.maxArrayPanelsCount     (Step 2 + Step 6 report)
 *   - solarPotential.maxSunshineHoursPerYear (Step 2)
 *   - solarPotential.roofSegmentStats[].pitchDegrees / azimuthDegrees /
 *     stats.areaMeters2 / stats.sunshineQuantiles    (Step 6 segment table
 *     + PVGIS inputs + solar suitability scoring)
 *   - solarPotential.solarPanelConfigs[].panelsCount (PVGIS kWp sizing)
 *
 * Available but NOT yet rendered — worth knowing when we expand the report:
 *   - imageryDate / imageryProcessedDate (tell the user how fresh the tile is)
 *   - panelCapacityWatts / panelHeightMeters / panelWidthMeters / panelLifetimeYears
 *     (Google's assumed panel model — useful to disclose in the report)
 *   - wholeRoofStats (aggregate across all usable segments)
 *   - buildingStats  (whole building — includes unassigned roof)
 *   - carbonOffsetFactorKgPerMwh (for a "CO₂ saved" line in the report)
 *   - solarPanels[]  (per-panel placement — could render the array on top of
 *     the satellite tile instead of the bounding box)
 *   - financialAnalyses[] (we skip these for the UK — 0% VAT + BUS grant +
 *     SEG tariffs are UK-specific and we do our own finance calc)
 *   - postalCode / administrativeArea / statisticalArea / regionCode
 *     (Google's view of where the property sits)
 *   - center / boundingBox (building footprint — could draw an outline)
 */

import { z } from "zod";

// ── primitive shapes ─────────────────────────────────────────────────────────

const LatLngSchema = z
  .object({
    /** Geographic latitude, degrees, range ±90. */
    latitude: z.number(),
    /** Geographic longitude, degrees, range ±180. */
    longitude: z.number(),
  })
  .passthrough();

const LatLngBoxSchema = z
  .object({
    /** Southwest corner: minimum lat, minimum lng. */
    sw: LatLngSchema,
    /** Northeast corner: maximum lat, maximum lng. */
    ne: LatLngSchema,
  })
  .passthrough();

const GDateSchema = z
  .object({
    /** Calendar year. */
    year: z.number(),
    /** Month, 1–12. */
    month: z.number(),
    /** Day of month, 1–31. */
    day: z.number(),
  })
  .passthrough();

const MoneySchema = z
  .object({
    /** ISO 4217 three-letter currency code, e.g. "GBP", "USD". */
    currencyCode: z.string().optional(),
    /** Whole-currency units as a string (int64 — can exceed Number.MAX). */
    units: z.string().optional(),
    /** Fractional part in 10⁻⁹ units (0 ≤ |nanos| < 1e9). */
    nanos: z.number().optional(),
  })
  .passthrough();

// ── size & sunshine ──────────────────────────────────────────────────────────

const SizeAndSunshineStatsSchema = z
  .object({
    /** Usable roof area accounting for tilt. m². */
    areaMeters2: z.number().optional(),
    /**
     * N values = N-1 quantiles of annual sunshine (kWh/kW/year) across the
     * roof segment. Index 0 is the minimum, N-1 the maximum. Median and
     * extremes are what we use for shading scoring.
     */
    sunshineQuantiles: z.array(z.number()).optional(),
    /** Ground footprint (projected). m². */
    groundAreaMeters2: z.number().optional(),
  })
  .passthrough();

// ── roof segments ────────────────────────────────────────────────────────────

export const RoofSegmentSchema = z
  .object({
    /** Slope of the segment relative to the ground plane. degrees. */
    pitchDegrees: z.number().optional(),
    /**
     * Compass direction the segment faces. degrees.
     * 0 = N, 90 = E, 180 = S, 270 = W.
     */
    azimuthDegrees: z.number().optional(),
    /** Size + sunshine stats for this segment. */
    stats: SizeAndSunshineStatsSchema.optional(),
    /** Geographic centre of the roof segment. */
    center: LatLngSchema.optional(),
    /** Segment's perimeter box. */
    boundingBox: LatLngBoxSchema.optional(),
    /** Elevation of the segment centre. metres above mean sea level. */
    planeHeightAtCenterMeters: z.number().optional(),
  })
  .passthrough();

// ── panels and layouts ───────────────────────────────────────────────────────

const SolarPanelSchema = z
  .object({
    /** Geographic centre of the individual panel. */
    center: LatLngSchema.optional(),
    /** Panel alignment: LANDSCAPE or PORTRAIT. */
    orientation: z.enum(["LANDSCAPE", "PORTRAIT"]).optional(),
    /** Annual DC energy output from this single panel. kWh. */
    yearlyEnergyDcKwh: z.number().optional(),
    /** Index into solarPotential.roofSegmentStats[]. */
    segmentIndex: z.number().optional(),
  })
  .passthrough();

const RoofSegmentSummarySchema = z
  .object({
    /** Index into solarPotential.roofSegmentStats[]. */
    segmentIndex: z.number().optional(),
    /** Panels Google fits on this segment in this config. */
    panelsCount: z.number().optional(),
    /** Segment contribution to annual DC energy. kWh. */
    yearlyEnergyDcKwh: z.number().optional(),
    /** Pitch of the segment. degrees. */
    pitchDegrees: z.number().optional(),
    /** Azimuth of the segment (0=N, 90=E, 180=S). degrees. */
    azimuthDegrees: z.number().optional(),
  })
  .passthrough();

export const SolarPanelConfigSchema = z
  .object({
    /** Total panels in this config. */
    panelsCount: z.number(),
    /** Combined annual DC output of the config. kWh. */
    yearlyEnergyDcKwh: z.number(),
    /** Per-segment allocation of panels within this config. */
    roofSegmentSummaries: z.array(RoofSegmentSummarySchema).optional(),
  })
  .passthrough();

// ── finance (US-centric — we ignore these for UK but schema them anyway) ─────

const SavingsOverTimeSchema = z
  .object({
    /** Year-1 net savings vs grid-only. */
    savingsYear1: MoneySchema.optional(),
    /** Cumulative 20-year savings. */
    savingsYear20: MoneySchema.optional(),
    /** NPV at Google's default discount rate, 20 years. */
    presentValueOfSavingsYear20: MoneySchema.optional(),
    /** Total lifetime savings. */
    savingsLifetime: MoneySchema.optional(),
    /** NPV at the default discount rate across the full system lifetime. */
    presentValueOfSavingsLifetime: MoneySchema.optional(),
    /** True iff the scenario yields positive returns. */
    financiallyViable: z.boolean().optional(),
  })
  .passthrough();

const LeasingSavingsSchema = z
  .object({
    leasesAllowed: z.boolean().optional(),
    leasesSupported: z.boolean().optional(),
    annualLeasingCost: MoneySchema.optional(),
    savings: SavingsOverTimeSchema.optional(),
  })
  .passthrough();

const CashPurchaseSavingsSchema = z
  .object({
    /** Upfront cost before tax incentives. */
    outOfPocketCost: MoneySchema.optional(),
    /** Year-1 net cost after incentives. */
    upfrontCost: MoneySchema.optional(),
    /** Total tax credits applied. */
    rebateValue: MoneySchema.optional(),
    savings: SavingsOverTimeSchema.optional(),
    /** Years to cost recovery. -1 means never. */
    paybackYears: z.number().optional(),
  })
  .passthrough();

const FinancedPurchaseSavingsSchema = z
  .object({
    annualLoanPayment: MoneySchema.optional(),
    rebateValue: MoneySchema.optional(),
    /** Financing interest rate assumption. %. */
    loanInterestRate: z.number().optional(),
    savings: SavingsOverTimeSchema.optional(),
  })
  .passthrough();

const FinancialDetailsSchema = z
  .object({
    /** Year-1 AC energy output. kWh. */
    initialAcKwhPerYear: z.number().optional(),
    remainingLifetimeUtilityBill: MoneySchema.optional(),
    federalIncentive: MoneySchema.optional(),
    stateIncentive: MoneySchema.optional(),
    utilityIncentive: MoneySchema.optional(),
    lifetimeSrecTotal: MoneySchema.optional(),
    costOfElectricityWithoutSolar: MoneySchema.optional(),
    netMeteringAllowed: z.boolean().optional(),
    /** First-year power fraction from solar. 0–100. */
    solarPercentage: z.number().optional(),
    /** Assumed share of generation exported to the grid. 0–100. */
    percentageExportedToGrid: z.number().optional(),
  })
  .passthrough();

const FinancialAnalysisSchema = z
  .object({
    /** Assumed monthly bill this analysis was computed against. */
    monthlyBill: MoneySchema.optional(),
    /** True if this is the default billing assumption for the area. */
    defaultBill: z.boolean().optional(),
    /** Monthly consumption derived from the bill. kWh. */
    averageKwhPerMonth: z.number().optional(),
    financialDetails: FinancialDetailsSchema.optional(),
    leasingSavings: LeasingSavingsSchema.optional(),
    cashPurchaseSavings: CashPurchaseSavingsSchema.optional(),
    financedPurchaseSavings: FinancedPurchaseSavingsSchema.optional(),
    /** Index into solarPanelConfigs; -1 if no config is suitable. */
    panelConfigIndex: z.number().optional(),
  })
  .passthrough();

// ── solarPotential ───────────────────────────────────────────────────────────

const SolarPotentialSchema = z
  .object({
    /** Maximum panel count that fits on the building's usable roof. */
    maxArrayPanelsCount: z.number().optional(),
    /** Panel capacity Google modelled with. watts. */
    panelCapacityWatts: z.number().optional(),
    /** Panel height in portrait orientation. metres. */
    panelHeightMeters: z.number().optional(),
    /** Panel width in portrait orientation. metres. */
    panelWidthMeters: z.number().optional(),
    /** Expected panel lifespan. years. */
    panelLifetimeYears: z.number().optional(),
    /** Area of the full maximum array (accounting for tilt). m². */
    maxArrayAreaMeters2: z.number().optional(),
    /** Annual max insolation at this location. kWh/kW (per kWp). */
    maxSunshineHoursPerYear: z.number().optional(),
    /** Grid carbon intensity for CO₂-saved estimates. kg CO₂ / MWh. */
    carbonOffsetFactorKgPerMwh: z.number().optional(),
    /** Totals across all segments Google considered usable. */
    wholeRoofStats: SizeAndSunshineStatsSchema.optional(),
    /** Totals across the entire building (includes unassigned roof). */
    buildingStats: SizeAndSunshineStatsSchema.optional(),
    /** Per-segment pitch, azimuth, area, sunshine. */
    roofSegmentStats: z.array(RoofSegmentSchema).optional(),
    /** Individual panel positions, ordered by expected annual production. */
    solarPanels: z.array(SolarPanelSchema).optional(),
    /** Alternative array layouts. Populated when ≥4 panels fit. */
    solarPanelConfigs: z.array(SolarPanelConfigSchema).optional(),
    /** US-centric finance scenarios (may be absent outside the US). */
    financialAnalyses: z.array(FinancialAnalysisSchema).optional(),
  })
  .passthrough();

// ── top-level response ───────────────────────────────────────────────────────

export const BuildingInsightsSchema = z
  .object({
    /** Resource identifier, format `buildings/{place_id}`. */
    name: z.string().optional(),
    /** Point near the centre of the building. */
    center: LatLngSchema.optional(),
    /** Building perimeter as a lat/lng box. */
    boundingBox: LatLngBoxSchema.optional(),
    /** Approximate acquisition date of the source imagery. */
    imageryDate: GDateSchema.optional(),
    /** Date Google finished processing the imagery for this building. */
    imageryProcessedDate: GDateSchema.optional(),
    /** Postal code containing the building. */
    postalCode: z.string().optional(),
    /** Administrative area 1 (e.g. US state abbreviation). */
    administrativeArea: z.string().optional(),
    /** Statistical area (e.g. US census tract). */
    statisticalArea: z.string().optional(),
    /** Country/region code (ISO). */
    regionCode: z.string().optional(),
    /**
     * Solar potential analysis block. `requiredQuality` on the request
     * determines whether this gets populated at HIGH / MEDIUM / LOW.
     */
    solarPotential: SolarPotentialSchema,
    /** Imagery / analysis quality tier. */
    imageryQuality: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  })
  .passthrough();

export type BuildingInsights = z.infer<typeof BuildingInsightsSchema>;
export type RoofSegment = z.infer<typeof RoofSegmentSchema>;
export type SolarPanelConfig = z.infer<typeof SolarPanelConfigSchema>;

// ── our route's response envelope ────────────────────────────────────────────

/**
 * The shape `/api/solar/building` returns. Either a successful hit (with the
 * quality tier we actually got) or a graceful miss when Google has no
 * coverage at all three qualities.
 */
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
