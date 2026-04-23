// Mutators + id helpers for the floorplan editor (v3 annotation model).
// Every mutator returns a new analysis object — never mutate the input.

import type {
  Door,
  FloorplanAnalysis,
  HeatPumpLocation,
  HotWaterCylinderCandidate,
  OutdoorZone,
  Point,
  Radiator,
  RadiatorCondition,
  UserStairs,
  WallPath,
} from "@/lib/schemas/floorplan";

function genId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export const newWallId = () => genId("wall");
export const newDoorId = () => genId("door");
export const newZoneId = () => genId("zone");
export const newStairsId = () => genId("stairs");
export const newRadiatorId = () => genId("rad");
export const newHpId = () => genId("hp");
export const newCylId = () => genId("cyl");

// ─── Walls ───────────────────────────────────────────────────────────────────

export function addWallPath(
  analysis: FloorplanAnalysis,
  points: Point[],
): FloorplanAnalysis {
  if (points.length < 2) return analysis;
  const wall: WallPath = { id: newWallId(), points };
  return {
    ...analysis,
    walls: [...analysis.walls, wall],
    edited: true,
  };
}

export function removeWallPath(
  analysis: FloorplanAnalysis,
  id: string,
): FloorplanAnalysis {
  return {
    ...analysis,
    walls: analysis.walls.filter((w) => w.id !== id),
    // Drop any doors anchored to this wall.
    doors: analysis.doors.filter((d) => d.wallPathId !== id),
    edited: true,
  };
}

// ─── Doors ───────────────────────────────────────────────────────────────────

export function addDoor(
  analysis: FloorplanAnalysis,
  x: number,
  y: number,
  wallPathId: string | null,
): FloorplanAnalysis {
  const door: Door = { id: newDoorId(), x, y, wallPathId };
  return {
    ...analysis,
    doors: [...analysis.doors, door],
    edited: true,
  };
}

export function removeDoor(
  analysis: FloorplanAnalysis,
  id: string,
): FloorplanAnalysis {
  return {
    ...analysis,
    doors: analysis.doors.filter((d) => d.id !== id),
    edited: true,
  };
}

// ─── Outdoor zones ───────────────────────────────────────────────────────────

export function addOutdoorZone(
  analysis: FloorplanAnalysis,
  points: Point[],
  label = "Outdoor space",
): FloorplanAnalysis {
  if (points.length < 3) return analysis;
  const zone: OutdoorZone = {
    id: newZoneId(),
    label,
    type: "other",
    points,
    notes: "",
  };
  return {
    ...analysis,
    outdoorZones: [...analysis.outdoorZones, zone],
    edited: true,
  };
}

export function removeOutdoorZone(
  analysis: FloorplanAnalysis,
  id: string,
): FloorplanAnalysis {
  return {
    ...analysis,
    outdoorZones: analysis.outdoorZones.filter((z) => z.id !== id),
    edited: true,
  };
}

// ─── Stairs ──────────────────────────────────────────────────────────────────

export function addStairs(
  analysis: FloorplanAnalysis,
  rect: { x: number; y: number; vWidth: number; vHeight: number },
): FloorplanAnalysis {
  const stairs: UserStairs = {
    id: newStairsId(),
    x: rect.x,
    y: rect.y,
    vWidth: rect.vWidth,
    vHeight: rect.vHeight,
    direction: "up",
  };
  return {
    ...analysis,
    userStairs: [...analysis.userStairs, stairs],
    edited: true,
  };
}

export function removeStairs(
  analysis: FloorplanAnalysis,
  id: string,
): FloorplanAnalysis {
  return {
    ...analysis,
    userStairs: analysis.userStairs.filter((s) => s.id !== id),
    edited: true,
  };
}

// ─── Radiators ───────────────────────────────────────────────────────────────

export function addRadiator(
  analysis: FloorplanAnalysis,
  x: number,
  y: number,
): FloorplanAnalysis {
  const r: Radiator = {
    id: newRadiatorId(),
    x,
    y,
    condition: null,
    source: "user_placed",
  };
  return {
    ...analysis,
    radiators: [...analysis.radiators, r],
    radiatorsVisible: (analysis.radiatorsVisible ?? 0) + 1,
    edited: true,
  };
}

export function removeRadiator(
  analysis: FloorplanAnalysis,
  id: string,
): FloorplanAnalysis {
  const filtered = analysis.radiators.filter((r) => r.id !== id);
  return {
    ...analysis,
    radiators: filtered,
    radiatorsVisible: filtered.length,
    edited: true,
  };
}

export function setRadiatorCondition(
  analysis: FloorplanAnalysis,
  id: string,
  condition: RadiatorCondition,
): FloorplanAnalysis {
  return {
    ...analysis,
    radiators: analysis.radiators.map((r) =>
      r.id === id ? { ...r, condition } : r,
    ),
    edited: true,
  };
}

// ─── Heat pump pins (AI-suggested, user-draggable) ───────────────────────────

export function moveHeatPump(
  analysis: FloorplanAnalysis,
  id: string,
  x: number,
  y: number,
): FloorplanAnalysis {
  return {
    ...analysis,
    heatPumpLocations: analysis.heatPumpLocations.map((h) =>
      h.id === id ? { ...h, x, y, source: "user_placed" } : h,
    ),
    edited: true,
  };
}

export function removeHeatPump(
  analysis: FloorplanAnalysis,
  id: string,
): FloorplanAnalysis {
  return {
    ...analysis,
    heatPumpLocations: analysis.heatPumpLocations.filter((h) => h.id !== id),
    edited: true,
  };
}

export function addUserHeatPump(
  analysis: FloorplanAnalysis,
  x: number,
  y: number,
): FloorplanAnalysis {
  const hp: HeatPumpLocation = {
    id: newHpId(),
    label: "Heat pump (you placed)",
    x: x - 25,
    y: y - 25,
    vWidth: 50,
    vHeight: 50,
    notes: "Placed by user.",
    source: "user_placed",
  };
  return {
    ...analysis,
    heatPumpLocations: [...analysis.heatPumpLocations, hp],
    edited: true,
  };
}

// ─── Cylinder pins ───────────────────────────────────────────────────────────

export function moveCylinder(
  analysis: FloorplanAnalysis,
  id: string,
  x: number,
  y: number,
): FloorplanAnalysis {
  return {
    ...analysis,
    hotWaterCylinderCandidates: analysis.hotWaterCylinderCandidates.map((c) =>
      c.id === id ? { ...c, x, y, source: "user_placed" } : c,
    ),
    edited: true,
  };
}

export function removeCylinder(
  analysis: FloorplanAnalysis,
  id: string,
): FloorplanAnalysis {
  return {
    ...analysis,
    hotWaterCylinderCandidates: analysis.hotWaterCylinderCandidates.filter(
      (c) => c.id !== id,
    ),
    edited: true,
  };
}

// ─── Applying AI placement results ───────────────────────────────────────────

export function applyAiPlacements(
  analysis: FloorplanAnalysis,
  payload: {
    heatPumpLocations: HeatPumpLocation[];
    hotWaterCylinderCandidates: HotWaterCylinderCandidate[];
    concerns: string[];
    installerQuestions: string[];
  },
): FloorplanAnalysis {
  return {
    ...analysis,
    heatPumpLocations: payload.heatPumpLocations,
    hotWaterCylinderCandidates: payload.hotWaterCylinderCandidates,
    heatPumpInstallationConcerns: payload.concerns,
    recommendedInstallerQuestions: payload.installerQuestions,
    placementsRequested: true,
    edited: true,
  };
}

// ─── Outdoor-space user confirmation (kept for back-compat) ──────────────────

export function setUserOutdoor(
  analysis: FloorplanAnalysis,
  answer: "yes" | "no",
): FloorplanAnalysis {
  return {
    ...analysis,
    outdoorSpace: {
      ...analysis.outdoorSpace,
      userConfirmed: answer,
      indicated: answer === "yes" ? true : analysis.outdoorSpace.indicated,
    },
    edited: true,
  };
}

// ─── Hit-testing helpers ─────────────────────────────────────────────────────

// Project a point onto a line segment; return distance + projected point.
export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { dist: number; t: number; projX: number; projY: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) {
    const dx = px - ax;
    const dy = py - ay;
    return { dist: Math.sqrt(dx * dx + dy * dy), t: 0, projX: ax, projY: ay };
  }
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * abx;
  const projY = ay + t * aby;
  const dx = px - projX;
  const dy = py - projY;
  return { dist: Math.sqrt(dx * dx + dy * dy), t, projX, projY };
}

// Find the wall path whose closest segment is nearest to (x, y) within
// maxDistance. Used for snapping doors to walls.
export function findNearestWall(
  walls: WallPath[],
  x: number,
  y: number,
  maxDistance = 30,
): { wallPathId: string; x: number; y: number } | null {
  let best: { wallPathId: string; x: number; y: number; dist: number } | null = null;
  for (const w of walls) {
    for (let i = 0; i < w.points.length - 1; i++) {
      const a = w.points[i]!;
      const b = w.points[i + 1]!;
      const r = distanceToSegment(x, y, a.x, a.y, b.x, b.y);
      if (r.dist <= maxDistance && (!best || r.dist < best.dist)) {
        best = { wallPathId: w.id, x: r.projX, y: r.projY, dist: r.dist };
      }
    }
  }
  if (!best) return null;
  return { wallPathId: best.wallPathId, x: best.x, y: best.y };
}
