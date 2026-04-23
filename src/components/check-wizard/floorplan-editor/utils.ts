// Layout + id helpers for the floorplan editor.

import type {
  FloorplanAnalysis,
  HeatPumpLocation,
  Radiator,
  RadiatorCondition,
  Rect,
  Room,
} from "@/lib/schemas/floorplan";

// 14 of the typed-out chars in nanoid's default alphabet — collision risk is
// vanishingly low for editor-local ids that only exist in one analysis blob.
function genId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export const newRoomId = () => genId("r");
export const newRadiatorId = () => genId("rad");
export const newHpId = () => genId("hp");

// Distinct floor indices present in the analysis, sorted ascending.
export function floorsPresent(analysis: FloorplanAnalysis): number[] {
  const set = new Set<number>();
  for (const r of analysis.rooms) set.add(r.floor);
  if (set.size === 0) set.add(0);
  return [...set].sort((a, b) => a - b);
}

export function floorLabel(floor: number): string {
  if (floor === 0) return "Ground floor";
  if (floor === 1) return "First floor";
  if (floor === 2) return "Second floor";
  return `Floor ${floor + 1}`;
}

// Composite shapes — a room can be 1+ rectangles (L-shape, T-shape).
// `roomRects` returns whatever's most accurate: prefers the explicit rects[]
// array, falls back to the bounding box for older data.
export function roomRects(room: Room): Rect[] {
  if (room.rects && room.rects.length > 0) return room.rects;
  return [{ x: room.x, y: room.y, vWidth: room.vWidth, vHeight: room.vHeight }];
}

// Point-in-rect test.
function pointInRect(rect: Rect, vx: number, vy: number): boolean {
  return (
    vx >= rect.x &&
    vx <= rect.x + rect.vWidth &&
    vy >= rect.y &&
    vy <= rect.y + rect.vHeight
  );
}

// Convert SVG viewport pixel coordinates back to room-relative coordinates
// (0..1) for radiator placement. Uses the bounding box as the reference
// frame so radiator coordinates stay valid even on composite shapes.
export function pointInRoomNormalised(
  room: Room,
  vx: number,
  vy: number,
): { ux: number; uy: number } {
  const ux = (vx - room.x) / room.vWidth;
  const uy = (vy - room.y) / room.vHeight;
  return {
    ux: Math.max(0, Math.min(1, ux)),
    uy: Math.max(0, Math.min(1, uy)),
  };
}

// Find which (visible) room contains a given viewport point. Tests every
// rect of the composite shape — a click in the missing corner of an
// L-shaped kitchen falls through, as it should.
export function findRoomAt(
  rooms: Room[],
  vx: number,
  vy: number,
): Room | null {
  for (const r of rooms) {
    for (const rect of roomRects(r)) {
      if (pointInRect(rect, vx, vy)) return r;
    }
  }
  return null;
}

// ─── Heat pump movement ──────────────────────────────────────────────────────

export function moveHeatPump(
  analysis: FloorplanAnalysis,
  hpId: string,
  newX: number,
  newY: number,
): FloorplanAnalysis {
  return {
    ...analysis,
    heatPumpLocations: analysis.heatPumpLocations.map((h) =>
      h.id === hpId ? { ...h, x: newX, y: newY } : h,
    ),
    edited: true,
  };
}

export function addHeatPump(
  analysis: FloorplanAnalysis,
  vx: number,
  vy: number,
  size = 50,
): FloorplanAnalysis {
  const hp: HeatPumpLocation = {
    id: newHpId(),
    label: "Heat pump (you placed)",
    type: "outdoor",
    x: vx - size / 2,
    y: vy - size / 2,
    vWidth: size,
    vHeight: size,
    roomId: null,
    notes: "Placed by user.",
    source: "user_added",
  };
  return {
    ...analysis,
    heatPumpLocations: [...analysis.heatPumpLocations, hp],
    edited: true,
  };
}

export function removeHeatPump(
  analysis: FloorplanAnalysis,
  hpId: string,
): FloorplanAnalysis {
  return {
    ...analysis,
    heatPumpLocations: analysis.heatPumpLocations.filter((h) => h.id !== hpId),
    edited: true,
  };
}

// ─── Mutators ────────────────────────────────────────────────────────────────
// All return a new analysis object — never mutate the input. The editor calls
// onChange with the result.

export function addRadiator(
  analysis: FloorplanAnalysis,
  roomId: string,
  ux: number,
  uy: number,
): FloorplanAnalysis {
  const r: Radiator = {
    id: newRadiatorId(),
    roomId,
    ux,
    uy,
    condition: null,
    source: "user_added",
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
  radId: string,
): FloorplanAnalysis {
  const filtered = analysis.radiators.filter((r) => r.id !== radId);
  return {
    ...analysis,
    radiators: filtered,
    radiatorsVisible: filtered.length,
    edited: true,
  };
}

export function setRadiatorCondition(
  analysis: FloorplanAnalysis,
  radId: string,
  condition: RadiatorCondition,
): FloorplanAnalysis {
  return {
    ...analysis,
    radiators: analysis.radiators.map((r) =>
      r.id === radId ? { ...r, condition } : r,
    ),
    edited: true,
  };
}

// Edit a room's metric dimensions. Re-derives areaM2.
export function setRoomDimensions(
  analysis: FloorplanAnalysis,
  roomId: string,
  patch: { widthM?: number | null; heightM?: number | null; label?: string },
): FloorplanAnalysis {
  return {
    ...analysis,
    rooms: analysis.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const widthM = patch.widthM === undefined ? r.widthM : patch.widthM;
      const heightM = patch.heightM === undefined ? r.heightM : patch.heightM;
      const areaM2 =
        widthM != null && heightM != null && widthM > 0 && heightM > 0
          ? Number((widthM * heightM).toFixed(2))
          : null;
      return {
        ...r,
        widthM,
        heightM,
        areaM2,
        label: patch.label !== undefined ? patch.label : r.label,
      };
    }),
    edited: true,
  };
}

export function addRoom(analysis: FloorplanAnalysis, room: Room): FloorplanAnalysis {
  return {
    ...analysis,
    rooms: [...analysis.rooms, room],
    roomCount: analysis.rooms.length + 1,
    edited: true,
  };
}

export function removeRoom(analysis: FloorplanAnalysis, roomId: string): FloorplanAnalysis {
  const rooms = analysis.rooms.filter((r) => r.id !== roomId);
  // Drop any radiators that lived in this room.
  const radiators = analysis.radiators.filter((r) => r.roomId !== roomId);
  return {
    ...analysis,
    rooms,
    radiators,
    roomCount: rooms.length,
    radiatorsVisible: radiators.length,
    edited: true,
  };
}

// Outdoor-space user confirmation helper.
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
