// Schema for the v2 floorplan extraction output.
//
// Single source of truth for the data contract between:
//   - extractFloorplan() service (model output gets validated against
//     this; rejected on parse failure with one retry)
//   - persisted JSON in public.floorplan_uploads.extract
//   - homeowner-facing /report/[id] renderer
//   - installer-facing Site Visit Prep section
//
// Per spec: do not deviate. New fields require a contract review.
//
// Background: replaces the much wider FloorplanAnalysis schema which
// modelled hand-drawn walls / doors / placements geometry. v2 drops
// the geometry entirely — we only persist what the model extracts
// from the image (rooms, areas, heat-pump eligibility), since the
// builder UI it powered is being deprecated.

import { z } from "zod";

// ─── Shared atoms ─────────────────────────────────────────────────────

/** Area in both units. Extraction prompt instructs the model to fill
 *  both via the 1 sq m = 10.764 sq ft conversion when only one is
 *  printed on the plan. */
export const AreaSchema = z.object({
  sq_ft: z.number().nonnegative(),
  sq_m: z.number().nonnegative(),
});
export type Area = z.infer<typeof AreaSchema>;

// ─── property ────────────────────────────────────────────────────────

export const PropertyOrientationSchema = z.object({
  /** Free-text, e.g. "N arrow visible top-left" or "no compass shown". */
  compass_indicator: z.string(),
  /** Inferred rear-of-property aspect, e.g. "south-facing". */
  rear_aspect: z.string(),
  /** Inferred front-of-property aspect. */
  front_aspect: z.string(),
});

export const PropertySchema = z.object({
  /** Address as printed on the plan (model is told to ignore handwritten
   *  PII but keep the printed address label verbatim). */
  address_label: z.string(),
  /** e.g. "Mid-terrace house", "Detached", "1-bed flat". */
  property_type: z.string(),
  total_floors: z.number().int().positive(),
  gross_internal_area: AreaSchema,
  orientation: PropertyOrientationSchema,
});

// ─── floors ──────────────────────────────────────────────────────────

export const RoomSchema = z.object({
  /** As printed on the plan, OR an inference like "bedroom" — the
   *  inference is recorded in the top-level notes array. */
  name: z.string(),
  /** Spatial location, e.g. "front", "rear right", "off the landing". */
  location: z.string(),
  /** Salient observations: "double bedroom", "en-suite", "fitted
   *  wardrobe", "radiator visible", etc. Free-text. */
  features: z.array(z.string()).default([]),
});
export type Room = z.infer<typeof RoomSchema>;

export const ExternalAreaSchema = z.object({
  name: z.string(),
  features: z.array(z.string()).default([]),
});

export const FloorSchema = z.object({
  /** "Ground", "First", "Second", "Loft", etc. */
  level: z.string(),
  gross_internal_area: AreaSchema,
  /** One-sentence layout summary, e.g. "Open-plan kitchen-diner with
   *  separate front reception and downstairs WC." */
  layout_description: z.string(),
  rooms: z.array(RoomSchema).default([]),
  /** Garden / patio / driveway / side return — outdoor zones adjacent
   *  to this floor. Usually only present on ground floor. */
  external: z.array(ExternalAreaSchema).default([]),
});
export type Floor = z.infer<typeof FloorSchema>;

// ─── summary ─────────────────────────────────────────────────────────

export const SummarySchema = z.object({
  bedrooms_total: z.number().int().nonnegative(),
  bathrooms_total: z.number().int().nonnegative(),
  reception_rooms: z.number().int().nonnegative(),
  kitchen_diners: z.number().int().nonnegative(),
  /** Free-text — "Private rear garden + side return" / "No outdoor
   *  space". The eligibility scorer reads this verbatim. */
  outdoor_space: z.string(),
  notable_features: z.array(z.string()).default([]),
});

// ─── heat_pump_eligibility ───────────────────────────────────────────

export const SchemeContextSchema = z.object({
  /** Name of the applicable grant scheme — for England/Wales this is
   *  always "Boiler Upgrade Scheme (BUS)". Model still names it
   *  explicitly so we can flex to other schemes (HES Scotland) later. */
  applicable_grant: z.string(),
  grant_value_gbp: z.number().nonnegative(),
  /** "Air Source Heat Pump (ASHP)" by default; "Ground Source Heat
   *  Pump (GSHP)" when the plot clearly accommodates ground loops. */
  system_type_assumed: z.string(),
  ground_source_viable: z.boolean(),
  ground_source_reason: z.string(),
});

export const HeatDemandEstimateSchema = z.object({
  floor_area_sq_m: z.number().nonnegative(),
  /** W/m² used as the heat-loss assumption — 60 modern, 70 typical
   *  Victorian/Edwardian terrace, 90 detached/older/uninsulated. */
  assumed_specific_heat_loss_w_per_sq_m: z.number().positive(),
  assumed_specific_heat_loss_basis: z.string(),
  estimated_peak_heat_demand_kw: z.number().nonnegative(),
  /** [low, high] tuple. Encoded as a 2-element array per spec rather
   *  than a {min, max} object. */
  recommended_heat_pump_capacity_kw_range: z
    .tuple([z.number().nonnegative(), z.number().nonnegative()]),
  estimated_annual_heat_demand_kwh: z.number().nonnegative(),
  /** Mandatory disclaimer copy — every UI surface that renders the
   *  numbers above must also surface this. */
  caveat: z.string(),
});

/** A single risk / unknown the installer should plan around. */
export const RiskFactorSchema = z.object({
  factor: z.string(),
  /** What the impact on a heat-pump install would be. */
  impact: z.string(),
  /** True only when the floorplan alone gives a definitive answer.
   *  "Partial" when the floorplan gives evidence but a site visit
   *  is needed to confirm. False when the floorplan tells us
   *  nothing on this factor. */
  determinable_from_floorplan: z.union([z.boolean(), z.literal("Partial")]),
});
export type RiskFactor = z.infer<typeof RiskFactorSchema>;

export const ExternalUnitSitingSchema = z.object({
  recommended_location: z.string(),
  /** Free-text dimensions, e.g. "1m x 1m unit + 0.3m clearance per
   *  side ≈ 1.6m x 1.6m total". */
  approximate_footprint_required_m: z.string(),
  alternative_locations: z.array(z.string()).default([]),
  /** Why front-elevation siting is generally not recommended. Per
   *  MCS 020 noise + planning. */
  front_elevation_siting: z.string(),
});

export const EligibilityScoreSchema = z.object({
  score_out_of_10: z.number().int().min(0).max(10),
  rationale: z.string(),
});

export const HeatPumpEligibilitySchema = z.object({
  /** One-paragraph high-level read on suitability. */
  overall_assessment: z.string(),
  /** Confidence in the assessment, e.g. "Medium — depends on site
   *  verification of cylinder location + radiator sizing". */
  confidence: z.string(),
  scheme_context: SchemeContextSchema,
  heat_demand_estimate: HeatDemandEstimateSchema,
  positive_factors: z.array(z.string()).default([]),
  risk_factors_and_unknowns: z.array(RiskFactorSchema).default([]),
  external_unit_siting: ExternalUnitSitingSchema,
  indicative_eligibility_score: EligibilityScoreSchema,
  recommended_next_steps: z.array(z.string()).default([]),
});
export type HeatPumpEligibility = z.infer<typeof HeatPumpEligibilitySchema>;

// ─── root ────────────────────────────────────────────────────────────

export const FloorplanExtractSchema = z.object({
  property: PropertySchema,
  floors: z.array(FloorSchema).min(1),
  summary: SummarySchema,
  heat_pump_eligibility: HeatPumpEligibilitySchema,
  /** Inferences, caveats, anything the model marked as a guess.
   *  Surfaced at the bottom of the report — installer needs to
   *  see which fields aren't ground truth. */
  notes: z.array(z.string()).default([]),
});
export type FloorplanExtract = z.infer<typeof FloorplanExtractSchema>;
