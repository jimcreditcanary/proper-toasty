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

// Radiators — pin-based with size + orientation metadata. User clicks to
// place, then the popover asks: size (small/medium/large), orientation
// (standard/tall), condition (good/fair/poor/unsure). The rendered
// rectangle derives width/height from size × orientation.
export const RadiatorConditionEnum = z.enum(["good", "fair", "poor", "unsure"]);
export type RadiatorCondition = z.infer<typeof RadiatorConditionEnum>;

export const RadiatorSizeEnum = z.enum(["small", "medium", "large"]);
export type RadiatorSize = z.infer<typeof RadiatorSizeEnum>;

export const RadiatorOrientationEnum = z.enum(["standard", "tall"]);
export type RadiatorOrientation = z.infer<typeof RadiatorOrientationEnum>;

export const RadiatorSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(1000),
  // vWidth / vHeight derived from size+orientation at placement time;
  // preserved here so the renderer doesn't need to know the mapping.
  vWidth: z.number().min(1).max(1000).default(40),
  vHeight: z.number().min(1).max(1000).default(10),
  size: RadiatorSizeEnum.default("medium"),
  orientation: RadiatorOrientationEnum.default("standard"),
  condition: RadiatorConditionEnum.nullable(),
  source: z.literal("user_placed").default("user_placed"),
});
export type Radiator = z.infer<typeof RadiatorSchema>;

// ─── AI-placed (user-draggable) pins ─────────────────────────────────────────

// Heat pump candidate. A typical UK air-source outdoor unit is roughly
// 900-1100mm wide × 300-400mm deep × 700-900mm tall. It needs ≥300mm
// clearance each side and ≥1m in front for airflow, so the realistic
// INSTALLATION PROVISION is ~1.2m × 1.2m. That's what the user should
// see as the "can a heat pump fit here?" footprint.
export const HeatPumpLocationSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  vWidth: z.number().default(60),   // 1.2m at base scale (50 units = 1m)
  vHeight: z.number().default(60),
  notes: z.string().default(""),
  source: z.enum(["ai_suggested", "user_placed"]).default("ai_suggested"),
});
export type HeatPumpLocation = z.infer<typeof HeatPumpLocationSchema>;

// Hot water cylinder candidate. Full 1m × 1m PROVISION — cylinder itself
// is ~0.6m diameter but installers allocate a clear 1m² so there's
// room for pipework, an unvented expansion vessel next to it, and
// working access for servicing / removal. Matches what an MCS surveyor
// marks on a site plan.
export const HotWaterCylinderCandidateSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  vWidth: z.number().default(50),   // 1m at base scale (50 units = 1m)
  vHeight: z.number().default(50),
  notes: z.string().default(""),
  source: z.enum(["ai_suggested", "user_placed"]).default("ai_suggested"),
});
export type HotWaterCylinderCandidate = z.infer<typeof HotWaterCylinderCandidateSchema>;

// ─── AI clarification questions ──────────────────────────────────────────────
// After the AI places HP + cylinder, it can also ask the user follow-up
// questions it needs answered to be confident in the placement. E.g.:
//   "Is the space under your stairs taller than 1.5m?"  (affects whether
//   we can use that space for a cylinder).

export const ClarificationQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string(),
  // Keep it simple: Yes / No / Unsure are the universal options.
  options: z.array(z.string()).default(["Yes", "No", "Not sure"]),
  // What the answer affects — surfaced as helper text under the question.
  context: z.string().default(""),
  answer: z.string().nullable().default(null),
});
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

// ─── Extracted metrics (from floorplan text/labels) ─────────────────────────
//
// When the user uploads a floorplan, /api/floorplan/extract-metrics
// runs a Claude vision pass that reads the labels on the image
// (room names + dimensions, total floor area, "Ground floor / First
// floor" headers) and returns structured data.
//
// All fields are optional — a floorplan with no text labels just
// gets back an empty `rooms` array and null areas. Confidence flag
// lets the report decide how prominently to surface the data.

export const ExtractedRoomSchema = z.object({
  /** "Kitchen", "Master Bedroom", "Bathroom", etc — verbatim from the floorplan label. */
  name: z.string().min(1).max(120),
  /** Floor this room sits on, if the floorplan separates them ("ground", "first", "second"). null if unclear. */
  floor: z.string().nullable().default(null),
  /** Room area in square metres. null when not labelled or only labelled in feet. */
  sizeM2: z.number().positive().nullable().default(null),
  /** Same area in square feet for cross-checking + UK convention. null when not derivable. */
  sizeSqFt: z.number().positive().nullable().default(null),
  /** Free-text dimension label as printed, e.g. "4.2m × 3.1m" — useful for the report's evidence trail. */
  dimensionsRaw: z.string().nullable().default(null),
});
export type ExtractedRoom = z.infer<typeof ExtractedRoomSchema>;

export const FloorplanMetricsSchema = z.object({
  /** Per-room breakdown — empty array when no labelled rooms found. */
  rooms: z.array(ExtractedRoomSchema).default([]),
  /** Sum of room areas (or labelled total) in square metres. */
  totalAreaM2: z.number().positive().nullable().default(null),
  /** Same total in square feet. */
  totalAreaSqFt: z.number().positive().nullable().default(null),
  /** How many distinct floors the floorplan shows (1 for a flat, 2 for a typical UK semi, 3 for townhouses). */
  floorsCount: z.number().int().positive().nullable().default(null),
  /** Claude's confidence in the extraction. low when the floorplan was a sketch with no labels. */
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  /** ISO timestamp the extraction ran — null until the call completes. */
  extractedAt: z.string().nullable().default(null),
});
export type FloorplanMetrics = z.infer<typeof FloorplanMetricsSchema>;

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

  // ─── v4 AI follow-up questions ────────────────────────────────────────
  clarificationQuestions: z.array(ClarificationQuestionSchema).default([]),

  // ─── v4.2 AI-refined geometry ─────────────────────────────────────────
  // The user's freehand annotations get redrawn by Claude into clean,
  // perpendicular shapes using the original floorplan image as the
  // source of truth. Stored separately so we can show "what you drew"
  // vs "what we cleaned up" side-by-side or via a toggle.
  refinedWalls: z.array(WallPathSchema).default([]),
  refinedDoors: z.array(DoorSchema).default([]),
  refinedOutdoorZones: z.array(OutdoorZoneSchema).default([]),
  refinedStairs: z.array(UserStairsSchema).default([]),

  // Scale: how many viewport units = 1 metre. Lets us size HP (1m × 1m)
  // and cylinder (0.6m × 0.6m) at scale on the canonical view. Null when
  // the AI couldn't infer a scale (no labelled dimensions visible, no
  // EPC area to anchor against).
  viewportUnitsPerMeter: z.number().positive().nullable().default(null),

  // ─── Satellite outdoor check ──────────────────────────────────────────
  outdoorSpace: OutdoorSpaceCheckSchema.default({
    indicated: false,
    adjacentToLivingSpace: null,
    notes: "",
    satelliteVerdict: null,
    satelliteNotes: null,
    userConfirmed: null,
  }),

  // ─── Extracted text metrics (from floorplan labels) ──────────────────
  // Populated by /api/floorplan/extract-metrics on upload — Claude
  // reads room names, dimensions, total area, and floor headings off
  // the image and returns structured data. Lives separately from the
  // legacy summary fields below because the extraction is opt-in
  // (only fires when the user actually uploads a floorplan).
  metrics: FloorplanMetricsSchema.default({
    rooms: [],
    totalAreaM2: null,
    totalAreaSqFt: null,
    floorsCount: null,
    confidence: "medium",
    extractedAt: null,
  }),

  // ─── Meta ─────────────────────────────────────────────────────────────
  edited: z.boolean().default(false),
  // Whether the user has pressed "Find heat pump & cylinder" yet. Drives
  // the UI copy — before: "Ready when you are"; after: "Drag the pins".
  placementsRequested: z.boolean().default(false),
  // True when the analysis was generated by the autorun path (Claude
  // detected walls / doors / radiators from the image without any user
  // annotations). Drives the "AI-generated — your installer will verify
  // on site" disclaimer banner on the editor's adjust stage and the
  // report's Heat Pump tab. False when the user did the annotations
  // themselves (the standard flow).
  aiAutorun: z.boolean().default(false),

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
