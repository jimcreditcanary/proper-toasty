import { z } from "zod";

// Floorplan analysis schema — superset of v1 so the existing report renderer
// keeps working. The new geometry fields drive the interactive editor; the
// older summary fields (roomsByType, boilerLocation, concerns) still feed
// the report card.
//
// All coordinates use a normalised 0–1000 viewport. Dimensions in metres are
// the source of truth — the renderer scales metres → viewport units using
// the largest room as a reference. This way:
//   - editing "kitchen is actually 5m × 4m" updates the metric data,
//   - the visual diagram re-flows to keep proportions roughly accurate,
//   - we don't have to fight Claude to produce pixel-perfect coordinates.

// ─── Rooms ───────────────────────────────────────────────────────────────────

export const RoomTypeEnum = z.enum([
  "bedroom",
  "bathroom",
  "kitchen",
  "living",
  "dining",
  "utility",
  "hall",
  "stairs",
  "wc",
  "other",
]);
export type RoomType = z.infer<typeof RoomTypeEnum>;

// Room category — drives how we tint the room and which interactions are
// available. Halls/landings are "circulation" so they read visually as
// transit space rather than usable living space.
export const RoomCategoryEnum = z.enum(["living", "circulation", "service"]);
export type RoomCategory = z.infer<typeof RoomCategoryEnum>;

// One axis-aligned rectangle in viewport coordinates (0..1000).
export const RectSchema = z.object({
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  vWidth: z.number().min(1).max(1000),
  vHeight: z.number().min(1).max(1000),
});
export type Rect = z.infer<typeof RectSchema>;

export const RoomSchema = z.object({
  // Stable id — Claude generates these, the user keeps them.
  id: z.string().min(1),
  // Free-text label ("Kitchen", "Bedroom 1"). User can rename.
  label: z.string(),
  type: RoomTypeEnum,
  // What kind of space — drives rendering. Defaults to living.
  category: RoomCategoryEnum.default("living"),
  // Floor index (0 = ground, 1 = first, 2 = second). Defaults to 0 if unclear.
  floor: z.number().int().min(0).max(5),

  // ─── Geometry ────────────────────────────────────────────────────────
  // Composite shape — list of axis-aligned rectangles whose union forms the
  // room. L-shapes need 2 rects, T-shapes need 3, simple rooms just 1.
  // Defaults to []; the bounding-box fields below are the fallback for
  // older data (and for the editor's add-extension flow which still creates
  // a single rectangle).
  rects: z.array(RectSchema).default([]),
  // Bounding box of the whole room (still required for older data and as
  // the click-target fallback when rects is empty). When both rects and
  // x/y/vWidth/vHeight exist, rects is the source of truth for rendering;
  // the bounding box is just a hit-test envelope.
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  vWidth: z.number().min(1).max(1000),
  vHeight: z.number().min(1).max(1000),

  // Real dimensions in metres. May be null if Claude couldn't infer.
  widthM: z.number().positive().nullable(),
  heightM: z.number().positive().nullable(),
  // Computed area in m². Null if dimensions are unknown.
  areaM2: z.number().positive().nullable(),
  // Was this room created by the user as an extension?
  source: z.enum(["claude_detected", "user_added"]).default("claude_detected"),
});
export type Room = z.infer<typeof RoomSchema>;

// ─── Stairs ──────────────────────────────────────────────────────────────────
// Stairs occupy real floor area but aren't living space — render them
// distinctly and exclude them from heat-loss calculations.

export const StairsSchema = z.object({
  id: z.string().min(1),
  label: z.string().default("Stairs"),
  // Which floor this set of stairs lives ON (the floor you climb FROM).
  // A 3-storey home has stairs on floors 0 and 1.
  floor: z.number().int().min(0).max(5),
  // Always a single rectangle.
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  vWidth: z.number().min(1).max(1000),
  vHeight: z.number().min(1).max(1000),
  // Direction relative to this floor.
  direction: z.enum(["up", "down", "both"]).default("up"),
  source: z.enum(["claude_detected", "user_added"]).default("claude_detected"),
});
export type Stairs = z.infer<typeof StairsSchema>;

// ─── Outdoor zones ───────────────────────────────────────────────────────────
// The garden / driveway / side return / patio adjacent to the property.
// Heat pumps must sit WITHIN one of these zones — we visualise them so the
// user (and AI) can see where the building footprint ends and outdoor begins.

export const OutdoorZoneTypeEnum = z.enum([
  "garden",
  "side_return",
  "driveway",
  "patio",
  "garage",
  "other",
]);
export type OutdoorZoneType = z.infer<typeof OutdoorZoneTypeEnum>;

export const OutdoorZoneSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  type: OutdoorZoneTypeEnum.default("other"),
  // Always associated with the ground floor (floor 0) — outdoor zones
  // don't exist on upper floors. Kept here in case we want to model
  // balconies / roof terraces later.
  floor: z.number().int().min(0).max(5).default(0),
  // Single rectangle. Real outdoor space is rarely a perfect rectangle but
  // for "is there enough space for a heat pump" purposes it's plenty.
  x: z.number(),
  y: z.number(),
  vWidth: z.number(),
  vHeight: z.number(),
  // Notes — e.g. "south-facing", "neighbour windows on the east side".
  notes: z.string().default(""),
});
export type OutdoorZone = z.infer<typeof OutdoorZoneSchema>;

// ─── Radiators ───────────────────────────────────────────────────────────────

export const RadiatorConditionEnum = z.enum(["good", "fair", "poor", "unsure"]);
export type RadiatorCondition = z.infer<typeof RadiatorConditionEnum>;

export const RadiatorSchema = z.object({
  id: z.string().min(1),
  // Which room this radiator sits in.
  roomId: z.string().min(1),
  // Position relative to the room (0..1 inside the room's bounding box).
  ux: z.number().min(0).max(1),
  uy: z.number().min(0).max(1),
  condition: RadiatorConditionEnum.nullable(),
  // claude_detected = inferred from the floorplan symbols (rare to be reliable);
  // user_added     = user dropped a pin in the editor.
  source: z.enum(["claude_detected", "user_added"]).default("claude_detected"),
});
export type Radiator = z.infer<typeof RadiatorSchema>;

// ─── Heat-pump candidate locations ───────────────────────────────────────────

export const HeatPumpLocationSchema = z.object({
  id: z.string().min(1),
  label: z.string(),               // "Side return", "Utility room corner"
  type: z.enum(["outdoor", "indoor"]),
  // Footprint in viewport units (a 1m² unit takes up the area equivalent
  // of the smallest room ÷ that room's area, more or less).
  x: z.number(),
  y: z.number(),
  vWidth: z.number(),
  vHeight: z.number(),
  // Optional reference to a roomId if the location is inside a known room.
  roomId: z.string().nullable(),
  notes: z.string(),
  source: z.enum(["claude_detected", "user_added"]).default("claude_detected"),
});
export type HeatPumpLocation = z.infer<typeof HeatPumpLocationSchema>;

// ─── Hot water cylinder candidates ───────────────────────────────────────────
// A typical UK unvented cylinder for a 4-bed home is ~600mm × 600mm footprint
// (~0.36m²) and 1.5–2m tall. It needs to sit indoors, near central heating
// pipework. The visualisation answers: "is there ACTUALLY space at scale?"

export const HotWaterCylinderCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string(),               // "Airing cupboard", "Utility room"
  // Same coord system as rooms.
  x: z.number(),
  y: z.number(),
  // Footprint scaled to roughly 0.6m × 0.6m relative to the room scale.
  vWidth: z.number(),
  vHeight: z.number(),
  // Which room does this candidate live in? Should always be set.
  roomId: z.string().nullable(),
  // Why this spot? "Adjacent to the existing boiler", "Under-stairs cupboard
  // already plumbed" etc.
  notes: z.string(),
  source: z.enum(["claude_detected", "user_added"]).default("claude_detected"),
});
export type HotWaterCylinderCandidate = z.infer<typeof HotWaterCylinderCandidateSchema>;

// ─── Outdoor space (cross-referenced with satellite) ─────────────────────────

export const OutdoorSpaceCheckSchema = z.object({
  // What the floorplan suggests (legacy field — kept for back-compat).
  indicated: z.boolean(),
  adjacentToLivingSpace: z.boolean().nullable(),
  notes: z.string(),
  // What the satellite imagery suggests.
  satelliteVerdict: z.enum(["yes", "no", "unsure"]).nullable(),
  satelliteNotes: z.string().nullable(),
  // What the user confirmed (only set if we asked them).
  userConfirmed: z.enum(["yes", "no"]).nullable(),
});
export type OutdoorSpaceCheck = z.infer<typeof OutdoorSpaceCheckSchema>;

// ─── Top-level analysis ──────────────────────────────────────────────────────

export const FloorplanAnalysisSchema = z.object({
  // ─── New geometry layer ────────────────────────────────────────────────
  rooms: z.array(RoomSchema).default([]),
  radiators: z.array(RadiatorSchema).default([]),
  heatPumpLocations: z.array(HeatPumpLocationSchema).default([]),
  hotWaterCylinderCandidates: z.array(HotWaterCylinderCandidateSchema).default([]),
  // v2 additions — defaults to [] so old localStorage data still parses.
  stairs: z.array(StairsSchema).default([]),
  outdoorZones: z.array(OutdoorZoneSchema).default([]),
  // Diagram viewport — always 1000 × 1000 in v1, exposed for forward
  // compatibility (we may want non-square layouts later).
  viewport: z
    .object({ width: z.number(), height: z.number() })
    .default({ width: 1000, height: 1000 }),
  // Detected unit system — useful for the UI to render "we converted from
  // feet" hints.
  unitsDetected: z.enum(["m", "ft", "unknown"]).default("unknown"),
  // Scale anchor: how Claude derived per-room areas (e.g. by reading text
  // labels, by using EPC total area as a divisor, or by guessing).
  scaleAnchor: z.enum(["floorplan_labels", "epc_total_area", "estimate", "unknown"]).default("unknown"),
  // Has the user touched this analysis since extraction?
  edited: z.boolean().default(false),

  // ─── Legacy summary fields (preserved so report stays working) ─────────
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
  outdoorSpace: OutdoorSpaceCheckSchema,
  heatPumpInstallationConcerns: z.array(z.string()),
  solarInstallationConcerns: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  confidenceNotes: z.string(),
  recommendedInstallerQuestions: z.array(z.string()),
});

export type FloorplanAnalysis = z.infer<typeof FloorplanAnalysisSchema>;
