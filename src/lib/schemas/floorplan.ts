import { z } from "zod";

// Floorplan schema v3 — user-annotation model.
//
// The uploaded floorplan image IS the canvas. The user draws on top:
// walls (polylines), doors (points), stairs (rectangles), radiators (points).
// AI then places heat pump + hot water cylinder candidates based on the
// annotations + the satellite outdoor-space check.
//
// All coordinates are NORMALISED 0..1000 against the image's natural
// aspect ratio (SVG overlay uses preserveAspectRatio="none" so points
// stay anchored to the image no matter what display size).
//
// The legacy summary fields (roomCount, boilerLocation etc.) are all
// optional now — they were only populated by the old Claude extraction
// pass. The report surfaces them conditionally when present.

// ─── Shared primitives ───────────────────────────────────────────────────────

export const PointSchema = z.object({
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
});
export type Point = z.infer<typeof PointSchema>;

export const RectSchema = z.object({
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  vWidth: z.number().min(1).max(1000),
  vHeight: z.number().min(1).max(1000),
});
export type Rect = z.infer<typeof RectSchema>;

// ─── User-drawn annotations ──────────────────────────────────────────────────

// A continuous run of wall — polyline. User click-to-add-points then
// double-click / Enter to close the path.
export const WallPathSchema = z.object({
  id: z.string().min(1),
  points: z.array(PointSchema).min(2),
});
export type WallPath = z.infer<typeof WallPathSchema>;

// A door — just a marker point. Optional snap-to-wall metadata so the
// renderer can orient the arc correctly.
export const DoorSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  // Which wall this door sits on (set when the user drops a door onto a
  // wall, used for future swing-arc rendering). Nullable because the user
  // might just tap empty space.
  wallPathId: z.string().nullable(),
});
export type Door = z.infer<typeof DoorSchema>;

// Outdoor zone — user outlines a garden, side return, driveway etc. as
// a closed polygon. This is the key constraint for AI heat-pump placement
// in v3: the HP must sit WITHIN one of these zones (unless it's an indoor
// fallback in a utility room).
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
  label: z.string().default("Outdoor space"),
  type: OutdoorZoneTypeEnum.default("other"),
  // Closed polygon — the renderer connects the last point back to the
  // first automatically.
  points: z.array(PointSchema).min(3),
  notes: z.string().default(""),
});
export type OutdoorZone = z.infer<typeof OutdoorZoneSchema>;

// Stairs — user drags a rectangle.
export const UserStairsSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  vWidth: z.number().min(1).max(1000),
  vHeight: z.number().min(1).max(1000),
  direction: z.enum(["up", "down", "both"]).default("up"),
});
export type UserStairs = z.infer<typeof UserStairsSchema>;

// Radiators — point + condition. No roomId in v3 (we have no rooms).
export const RadiatorConditionEnum = z.enum(["good", "fair", "poor", "unsure"]);
export type RadiatorCondition = z.infer<typeof RadiatorConditionEnum>;

export const RadiatorSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  condition: RadiatorConditionEnum.nullable(),
  // All radiators in v3 are user-placed. Kept for parity with other
  // elements (AI doesn't drop radiator pins — the user knows where they
  // actually are).
  source: z.literal("user_placed").default("user_placed"),
});
export type Radiator = z.infer<typeof RadiatorSchema>;

// ─── AI-placed (user-draggable) pins ─────────────────────────────────────────

// Heat pump candidate. AI drops 1-2 after the user hits "Find placements".
// User can drag them to the actually-correct spot.
export const HeatPumpLocationSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  vWidth: z.number().default(50),   // ~1m² at diagram scale
  vHeight: z.number().default(50),
  notes: z.string().default(""),
  source: z.enum(["ai_suggested", "user_placed"]).default("ai_suggested"),
});
export type HeatPumpLocation = z.infer<typeof HeatPumpLocationSchema>;

// Hot water cylinder candidate. Smaller footprint (~0.6m × 0.6m), indoor.
export const HotWaterCylinderCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  vWidth: z.number().default(30),   // ~0.6m² at diagram scale
  vHeight: z.number().default(30),
  notes: z.string().default(""),
  source: z.enum(["ai_suggested", "user_placed"]).default("ai_suggested"),
});
export type HotWaterCylinderCandidate = z.infer<typeof HotWaterCylinderCandidateSchema>;

// ─── Outdoor space check (from satellite) ────────────────────────────────────

export const OutdoorSpaceCheckSchema = z.object({
  indicated: z.boolean().default(false),
  adjacentToLivingSpace: z.boolean().nullable().default(null),
  notes: z.string().default(""),
  satelliteVerdict: z.enum(["yes", "no", "unsure"]).nullable().default(null),
  satelliteNotes: z.string().nullable().default(null),
  userConfirmed: z.enum(["yes", "no"]).nullable().default(null),
});
export type OutdoorSpaceCheck = z.infer<typeof OutdoorSpaceCheckSchema>;

// ─── Top-level analysis ──────────────────────────────────────────────────────

export const FloorplanAnalysisSchema = z.object({
  // ─── v3 annotations (user-drawn) ──────────────────────────────────────
  walls: z.array(WallPathSchema).default([]),
  doors: z.array(DoorSchema).default([]),
  outdoorZones: z.array(OutdoorZoneSchema).default([]),
  userStairs: z.array(UserStairsSchema).default([]),
  radiators: z.array(RadiatorSchema).default([]),

  // ─── v3 AI-placed pins (user-draggable) ───────────────────────────────
  heatPumpLocations: z.array(HeatPumpLocationSchema).default([]),
  hotWaterCylinderCandidates: z.array(HotWaterCylinderCandidateSchema).default([]),

  // ─── Satellite outdoor check ──────────────────────────────────────────
  outdoorSpace: OutdoorSpaceCheckSchema.default({
    indicated: false,
    adjacentToLivingSpace: null,
    notes: "",
    satelliteVerdict: null,
    satelliteNotes: null,
    userConfirmed: null,
  }),

  // ─── Meta ─────────────────────────────────────────────────────────────
  edited: z.boolean().default(false),
  // Whether the user has pressed "Find heat pump & cylinder" yet. Drives
  // the UI copy — before: "Ready when you are"; after: "Drag the pins".
  placementsRequested: z.boolean().default(false),

  // ─── Legacy summary fields (now all optional) ─────────────────────────
  // In v3 we don't run the Claude extraction pass, so these are only
  // populated if the AI placement call returns them as side-channel info.
  // The report renders them conditionally.
  roomCount: z.number().int().nonnegative().default(0),
  roomsByType: z
    .object({
      bedrooms: z.number().int().nonnegative().default(0),
      bathrooms: z.number().int().nonnegative().default(0),
      livingRooms: z.number().int().nonnegative().default(0),
      kitchens: z.number().int().nonnegative().default(0),
      utility: z.number().int().nonnegative().default(0),
      other: z.number().int().nonnegative().default(0),
    })
    .default({
      bedrooms: 0,
      bathrooms: 0,
      livingRooms: 0,
      kitchens: 0,
      utility: 0,
      other: 0,
    }),
  estimatedTotalAreaM2: z.number().nullable().default(null),
  floorsVisible: z.number().int().positive().default(1),
  radiatorsVisible: z.number().int().nonnegative().nullable().default(null),
  boilerLocation: z.string().nullable().default(null),
  hotWaterCylinderSpace: z
    .object({
      likelyPresent: z.boolean().default(false),
      location: z.string().nullable().default(null),
      notes: z.string().default(""),
    })
    .default({
      likelyPresent: false,
      location: null,
      notes: "",
    }),
  externalWallExposure: z
    .enum(["low", "medium", "high", "unknown"])
    .default("unknown"),
  heatPumpInstallationConcerns: z.array(z.string()).default([]),
  solarInstallationConcerns: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  confidenceNotes: z.string().default(""),
  recommendedInstallerQuestions: z.array(z.string()).default([]),
});

export type FloorplanAnalysis = z.infer<typeof FloorplanAnalysisSchema>;

// Factory for a fresh blank analysis — used when Step 4 opens the editor
// before the user has drawn anything.
export function emptyFloorplanAnalysis(): FloorplanAnalysis {
  return FloorplanAnalysisSchema.parse({});
}
