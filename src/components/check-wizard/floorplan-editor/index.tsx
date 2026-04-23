"use client";

// FloorplanEditor — interactive SVG editor for the analysed floorplan.
//
// Four modes (toolbar):
//   - radiator   : click a room → drop a pin → rate condition
//   - dimension  : click a room → side panel opens with metric dimensions
//   - extension  : click+drag empty space → create a new room
//   - move-hp    : click-drag a heat-pump candidate to reposition it
//
// Rendering order (back → front):
//   1. Grid background
//   2. Outdoor zones (muted green — "here's the garden")
//   3. Rooms (composite rects; circulation rooms tinted grey)
//   4. Stairs (diagonal hatch)
//   5. Hot water cylinder candidates (violet dashed, indoor)
//   6. Heat pump candidates (emerald dashed, outdoor)
//   7. Radiators (coral pins with condition colour)
//   8. Drag previews (extension rectangle, HP ghost during drag)

import { useMemo, useRef, useState } from "react";
import {
  Flame,
  Move,
  Plus,
  Target,
  Trash2,
  Wand2,
} from "lucide-react";
import type {
  FloorplanAnalysis,
  OutdoorZone,
  RadiatorCondition,
  Room,
  Stairs,
} from "@/lib/schemas/floorplan";
import type { EditorMode, FloorplanEditorProps } from "./types";
import {
  addRadiator,
  addRoom,
  findRoomAt,
  floorLabel,
  floorsPresent,
  moveHeatPump,
  newRoomId,
  pointInRoomNormalised,
  removeRadiator,
  removeHeatPump,
  removeRoom,
  roomRects,
  setRadiatorCondition,
  setRoomDimensions,
  setUserOutdoor,
} from "./utils";

const VIEWPORT = 1000;

// Tailwind palette in hex so SVG fill/stroke use the same brand colours.
const COLOURS = {
  // Rooms
  roomFillLiving: "#fff7ed",       // amber-50
  roomFillCirculation: "#f1f5f9",  // slate-100 — halls/landings feel like transit space
  roomFillService: "#fef3c7",      // amber-100 — utility/cupboards
  roomStroke: "#94a3b8",           // slate-400 (a touch darker than v1 for legibility)
  roomLabel: "#0f172a",
  selectedStroke: "#ef6c4f",       // coral

  // Outdoor zones
  zoneFill: "#86efac30",           // green-300 @ ~19%
  zoneStroke: "#22c55e",           // green-500
  zoneLabel: "#15803d",            // green-700

  // Stairs
  stairsFill: "#e2e8f0",           // slate-200
  stairsStroke: "#64748b",         // slate-500

  // Equipment
  hpStroke: "#10b981",             // emerald-500 — outdoor heat pump
  hpFill: "#10b98120",
  hpDragStroke: "#059669",         // emerald-600 — while dragging
  cylStroke: "#8b5cf6",            // violet-500 — indoor cylinder
  cylFill: "#8b5cf620",
  radiator: "#ef6c4f",             // coral
} as const;

export function FloorplanEditor({
  analysis,
  onChange,
  outdoorAsk,
  onOutdoorConfirm,
}: FloorplanEditorProps) {
  const [mode, setMode] = useState<EditorMode>("radiator");
  const [activeFloor, setActiveFloor] = useState(() => floorsPresent(analysis)[0] ?? 0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [pendingRadiatorId, setPendingRadiatorId] = useState<string | null>(null);

  // Drag state for "add extension" mode.
  const [extensionDrag, setExtensionDrag] = useState<
    | { startX: number; startY: number; curX: number; curY: number }
    | null
  >(null);

  // Drag state for "move-hp" mode.
  const [hpDrag, setHpDrag] = useState<
    | { hpId: string; offsetX: number; offsetY: number; curX: number; curY: number }
    | null
  >(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // ─── Defensive reads — old localStorage data may lack v2 fields ─────────
  // Read directly off `analysis` inside each memo so the dep arrays are
  // stable object references (plain `??` would produce new [] each render).
  const floors = useMemo(() => {
    const set = new Set<number>();
    for (const r of analysis.rooms ?? []) set.add(r.floor);
    for (const s of analysis.stairs ?? []) set.add(s.floor);
    if (set.size === 0) set.add(0);
    return [...set].sort((a, b) => a - b);
  }, [analysis.rooms, analysis.stairs]);

  const visibleRooms = useMemo(
    () => (analysis.rooms ?? []).filter((r) => r.floor === activeFloor),
    [analysis.rooms, activeFloor],
  );
  const visibleStairs = useMemo(
    () => (analysis.stairs ?? []).filter((s) => s.floor === activeFloor),
    [analysis.stairs, activeFloor],
  );
  const visibleZones = useMemo(
    // Outdoor zones only render on floor 0.
    () => (activeFloor === 0 ? analysis.outdoorZones ?? [] : []),
    [analysis.outdoorZones, activeFloor],
  );
  const visibleRadiators = useMemo(
    () =>
      (analysis.radiators ?? []).filter((r) =>
        visibleRooms.some((room) => room.id === r.roomId),
      ),
    [analysis.radiators, visibleRooms],
  );
  const visibleHps = useMemo(
    () =>
      (analysis.heatPumpLocations ?? []).filter((h) =>
        h.type === "outdoor"
          ? activeFloor === 0 // outdoor units only on ground floor
          : visibleRooms.some((r) => r.id === h.roomId),
      ),
    [analysis.heatPumpLocations, visibleRooms, activeFloor],
  );
  const visibleCylinders = useMemo(
    () =>
      (analysis.hotWaterCylinderCandidates ?? []).filter(
        (c) => c.roomId == null || visibleRooms.some((r) => r.id === c.roomId),
      ),
    [analysis.hotWaterCylinderCandidates, visibleRooms],
  );
  const selectedRoom = useMemo(
    () => visibleRooms.find((r) => r.id === selectedRoomId) ?? null,
    [visibleRooms, selectedRoomId],
  );

  // Translate DOM mouse event → viewport (0..1000) coordinates.
  function eventToViewport(e: React.MouseEvent<SVGSVGElement>): { vx: number; vy: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return { vx: local.x, vy: local.y };
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;

    if (mode === "move-hp") {
      // Pick up any HP we clicked on.
      const hit = visibleHps.find(
        (h) =>
          pos.vx >= h.x && pos.vx <= h.x + h.vWidth && pos.vy >= h.y && pos.vy <= h.y + h.vHeight,
      );
      if (hit) {
        setHpDrag({
          hpId: hit.id,
          offsetX: pos.vx - hit.x,
          offsetY: pos.vy - hit.y,
          curX: hit.x,
          curY: hit.y,
        });
      }
      return;
    }

    const room = findRoomAt(visibleRooms, pos.vx, pos.vy);

    if (mode === "extension") {
      setExtensionDrag({ startX: pos.vx, startY: pos.vy, curX: pos.vx, curY: pos.vy });
      setSelectedRoomId(null);
      return;
    }

    if (!room) {
      setSelectedRoomId(null);
      return;
    }

    if (mode === "radiator") {
      const { ux, uy } = pointInRoomNormalised(room, pos.vx, pos.vy);
      const next = addRadiator(analysis, room.id, ux, uy);
      const newId = next.radiators[next.radiators.length - 1]?.id ?? null;
      setPendingRadiatorId(newId);
      onChange(next);
    } else if (mode === "dimension") {
      setSelectedRoomId(room.id);
    }
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;
    if (extensionDrag) {
      setExtensionDrag({ ...extensionDrag, curX: pos.vx, curY: pos.vy });
    }
    if (hpDrag) {
      setHpDrag({
        ...hpDrag,
        curX: Math.max(0, Math.min(VIEWPORT, pos.vx - hpDrag.offsetX)),
        curY: Math.max(0, Math.min(VIEWPORT, pos.vy - hpDrag.offsetY)),
      });
    }
  }

  function handleSvgMouseUp() {
    if (extensionDrag) {
      const x = Math.min(extensionDrag.startX, extensionDrag.curX);
      const y = Math.min(extensionDrag.startY, extensionDrag.curY);
      const w = Math.abs(extensionDrag.curX - extensionDrag.startX);
      const h = Math.abs(extensionDrag.curY - extensionDrag.startY);
      setExtensionDrag(null);
      if (w >= 30 && h >= 30) {
        const newRoom: Room = {
          id: newRoomId(),
          label: "Extension",
          type: "other",
          category: "living",
          floor: activeFloor,
          rects: [{ x, y, vWidth: w, vHeight: h }],
          x,
          y,
          vWidth: w,
          vHeight: h,
          widthM: null,
          heightM: null,
          areaM2: null,
          source: "user_added",
        };
        const next = addRoom(analysis, newRoom);
        onChange(next);
        setSelectedRoomId(newRoom.id);
        setMode("dimension");
      }
    }
    if (hpDrag) {
      const next = moveHeatPump(analysis, hpDrag.hpId, hpDrag.curX, hpDrag.curY);
      onChange(next);
      setHpDrag(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      {/* Outdoor confirmation (only when satellite was inconclusive) */}
      {outdoorAsk && analysis.outdoorSpace.userConfirmed == null && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            We couldn&rsquo;t see your outdoor space clearly from satellite.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Do you have a garden, side return, or any outdoor wall where a 1m × 1m
            heat-pump unit could sit?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const next = setUserOutdoor(analysis, "yes");
                onChange(next);
                onOutdoorConfirm?.("yes");
              }}
              className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => {
                const next = setUserOutdoor(analysis, "no");
                onChange(next);
                onOutdoorConfirm?.("no");
              }}
              className="h-9 px-4 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-sm font-semibold"
            >
              No outdoor space
            </button>
          </div>
        </div>
      )}

      {/* Mode toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <ModeButton
          on={mode === "radiator"}
          onClick={() => setMode("radiator")}
          icon={<Flame className="w-3.5 h-3.5" />}
          label="Add radiators"
        />
        <ModeButton
          on={mode === "dimension"}
          onClick={() => setMode("dimension")}
          icon={<Move className="w-3.5 h-3.5" />}
          label="Edit dimensions"
        />
        <ModeButton
          on={mode === "extension"}
          onClick={() => {
            setMode("extension");
            setSelectedRoomId(null);
          }}
          icon={<Plus className="w-3.5 h-3.5" />}
          label="Add extension"
        />
        <ModeButton
          on={mode === "move-hp"}
          onClick={() => {
            setMode("move-hp");
            setSelectedRoomId(null);
          }}
          icon={<Target className="w-3.5 h-3.5" />}
          label="Move heat pump"
        />
        <div className="ml-auto flex items-center gap-3">
          {floors.length > 1 && (
            <div className="flex rounded-lg border border-[var(--border)] bg-slate-50 p-0.5">
              {floors.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFloor(f)}
                  className={`px-2.5 h-7 text-xs font-medium rounded ${
                    activeFloor === f
                      ? "bg-white text-navy shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {floorLabel(f)}
                </button>
              ))}
            </div>
          )}
          <span className="text-xs text-slate-500 hidden sm:inline">
            {modeHelp(mode)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        {/* Canvas */}
        <div
          className={`relative rounded-xl border border-slate-200 bg-slate-50/30 ${
            mode === "extension"
              ? "cursor-crosshair"
              : mode === "move-hp"
                ? "cursor-grab"
                : "cursor-pointer"
          }`}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWPORT} ${VIEWPORT}`}
            className="w-full h-auto block select-none"
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={() => {
              setExtensionDrag(null);
              setHpDrag(null);
            }}
          >
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              </pattern>
              <pattern
                id="stairs-hatch"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="10"
                  stroke={COLOURS.stairsStroke}
                  strokeWidth="2"
                />
              </pattern>
            </defs>
            <rect width={VIEWPORT} height={VIEWPORT} fill="url(#grid)" />

            {/* 1. Outdoor zones — render FIRST so rooms sit on top */}
            {visibleZones.map((z) => (
              <ZoneShape key={z.id} zone={z} />
            ))}

            {/* 2. Rooms — composite rects */}
            {visibleRooms.map((room) => (
              <RoomShape
                key={room.id}
                room={room}
                selected={selectedRoomId === room.id}
              />
            ))}

            {/* 3. Stairs */}
            {visibleStairs.map((s) => (
              <StairsShape key={s.id} stairs={s} />
            ))}

            {/* 4. Hot water cylinder candidates */}
            {visibleCylinders.map((cy) => (
              <g key={cy.id}>
                <rect
                  x={cy.x}
                  y={cy.y}
                  width={cy.vWidth}
                  height={cy.vHeight}
                  fill={COLOURS.cylFill}
                  stroke={COLOURS.cylStroke}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  rx={2}
                />
                <text
                  x={cy.x + cy.vWidth / 2}
                  y={cy.y - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={COLOURS.cylStroke}
                  pointerEvents="none"
                >
                  Cyl
                </text>
                <title>{cy.label} — {cy.notes}</title>
              </g>
            ))}

            {/* 5. Heat pump candidates */}
            {visibleHps.map((hp) => {
              const isDragging = hpDrag?.hpId === hp.id;
              const x = isDragging ? hpDrag!.curX : hp.x;
              const y = isDragging ? hpDrag!.curY : hp.y;
              const stroke = isDragging ? COLOURS.hpDragStroke : COLOURS.hpStroke;
              return (
                <g key={hp.id} className={mode === "move-hp" ? "cursor-grab" : undefined}>
                  <rect
                    x={x}
                    y={y}
                    width={hp.vWidth}
                    height={hp.vHeight}
                    fill={COLOURS.hpFill}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    rx={2}
                  />
                  <text
                    x={x + hp.vWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill={stroke}
                    pointerEvents="none"
                  >
                    HP
                  </text>
                  <title>{hp.label} — {hp.notes}</title>
                </g>
              );
            })}

            {/* 6. Radiators */}
            {visibleRadiators.map((rad) => {
              const room = visibleRooms.find((r) => r.id === rad.roomId);
              if (!room) return null;
              const cx = room.x + rad.ux * room.vWidth;
              const cy = room.y + rad.uy * room.vHeight;
              const condColour =
                rad.condition === "good"
                  ? "#10b981"
                  : rad.condition === "fair"
                    ? "#f59e0b"
                    : rad.condition === "poor"
                      ? "#ef4444"
                      : COLOURS.radiator;
              return (
                <g key={rad.id}>
                  <circle cx={cx} cy={cy} r={12} fill={condColour} stroke="white" strokeWidth={2} />
                  <text
                    x={cx}
                    y={cy + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fill="white"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    R
                  </text>
                </g>
              );
            })}

            {/* 7. Extension drag preview */}
            {extensionDrag && (
              <rect
                x={Math.min(extensionDrag.startX, extensionDrag.curX)}
                y={Math.min(extensionDrag.startY, extensionDrag.curY)}
                width={Math.abs(extensionDrag.curX - extensionDrag.startX)}
                height={Math.abs(extensionDrag.curY - extensionDrag.startY)}
                fill="rgba(239, 108, 79, 0.15)"
                stroke={COLOURS.selectedStroke}
                strokeWidth={2}
                strokeDasharray="4 4"
                rx={4}
              />
            )}
          </svg>

          {/* Empty state */}
          {visibleRooms.length === 0 && visibleStairs.length === 0 && visibleZones.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-slate-500 text-sm">
                <Wand2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                Nothing detected on this floor.
                {mode === "extension" && (
                  <p className="mt-1 text-xs">Click and drag to add a room.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <SidePanel
          analysis={analysis}
          mode={mode}
          selectedRoom={selectedRoom}
          pendingRadiatorId={pendingRadiatorId}
          onClearPendingRadiator={() => setPendingRadiatorId(null)}
          onChange={onChange}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <LegendSwatch colour={COLOURS.zoneFill} borderColour={COLOURS.zoneStroke} label="Outdoor zone" />
        <LegendSwatch colour={COLOURS.roomFillLiving} borderColour={COLOURS.roomStroke} label="Living room" />
        <LegendSwatch colour={COLOURS.roomFillCirculation} borderColour={COLOURS.roomStroke} label="Hallway" />
        <LegendSwatch colour={COLOURS.stairsFill} borderColour={COLOURS.stairsStroke} label="Stairs" hatched />
        <LegendDot colour={COLOURS.radiator} label="Radiator" />
        <LegendDot colour={COLOURS.hpStroke} dashed label="Heat pump (outdoor)" />
        <LegendDot colour={COLOURS.cylStroke} dashed label="Cylinder (indoor)" />
      </div>
    </div>
  );
}

// ─── SVG shape components ────────────────────────────────────────────────────

function RoomShape({ room, selected }: { room: Room; selected: boolean }) {
  const rects = roomRects(room);
  const fill =
    room.category === "circulation"
      ? COLOURS.roomFillCirculation
      : room.category === "service"
        ? COLOURS.roomFillService
        : COLOURS.roomFillLiving;
  const stroke = selected ? COLOURS.selectedStroke : COLOURS.roomStroke;
  const strokeWidth = selected ? 3 : 1.5;
  // Label sits at the bounding-box centre.
  const cx = room.x + room.vWidth / 2;
  const cy = room.y + room.vHeight / 2;
  return (
    <g>
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.vWidth}
          height={r.vHeight}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          rx={4}
        />
      ))}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill={COLOURS.roomLabel}
        pointerEvents="none"
      >
        {room.label}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fontSize="11"
        fill="#475569"
        pointerEvents="none"
      >
        {room.areaM2 != null ? `${room.areaM2} m²` : "size unknown"}
      </text>
    </g>
  );
}

function StairsShape({ stairs }: { stairs: Stairs }) {
  const arrow =
    stairs.direction === "up" ? "↑" : stairs.direction === "down" ? "↓" : "⇅";
  return (
    <g>
      <rect
        x={stairs.x}
        y={stairs.y}
        width={stairs.vWidth}
        height={stairs.vHeight}
        fill={COLOURS.stairsFill}
        stroke={COLOURS.stairsStroke}
        strokeWidth={1.5}
        rx={2}
      />
      <rect
        x={stairs.x}
        y={stairs.y}
        width={stairs.vWidth}
        height={stairs.vHeight}
        fill="url(#stairs-hatch)"
        opacity={0.5}
        rx={2}
      />
      <text
        x={stairs.x + stairs.vWidth / 2}
        y={stairs.y + stairs.vHeight / 2 + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill={COLOURS.stairsStroke}
        pointerEvents="none"
      >
        {arrow}
      </text>
      <title>{stairs.label}</title>
    </g>
  );
}

function ZoneShape({ zone }: { zone: OutdoorZone }) {
  return (
    <g>
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.vWidth}
        height={zone.vHeight}
        fill={COLOURS.zoneFill}
        stroke={COLOURS.zoneStroke}
        strokeWidth={1.5}
        strokeDasharray="8 4"
        rx={6}
      />
      <text
        x={zone.x + zone.vWidth / 2}
        y={zone.y + 16}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill={COLOURS.zoneLabel}
        pointerEvents="none"
      >
        {zone.label}
      </text>
      <title>{zone.notes || zone.label}</title>
    </g>
  );
}

// ─── Side panel ──────────────────────────────────────────────────────────────

function SidePanel({
  analysis,
  mode,
  selectedRoom,
  pendingRadiatorId,
  onClearPendingRadiator,
  onChange,
}: {
  analysis: FloorplanAnalysis;
  mode: EditorMode;
  selectedRoom: Room | null;
  pendingRadiatorId: string | null;
  onClearPendingRadiator: () => void;
  onChange: (next: FloorplanAnalysis) => void;
}) {
  if (pendingRadiatorId) {
    const rad = (analysis.radiators ?? []).find((r) => r.id === pendingRadiatorId);
    if (!rad) return null;
    const room = (analysis.rooms ?? []).find((r) => r.id === rad.roomId);
    return (
      <div className="rounded-xl border border-coral bg-coral-pale p-4">
        <p className="text-xs font-semibold text-navy">
          Radiator added in {room?.label ?? "room"}
        </p>
        <p className="mt-1 text-xs text-slate-700">How&rsquo;s its condition?</p>
        <div className="mt-3 flex flex-col gap-1.5">
          {(["good", "fair", "poor", "unsure"] as RadiatorCondition[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(setRadiatorCondition(analysis, rad.id, c));
                onClearPendingRadiator();
              }}
              className="h-9 px-3 rounded-lg border border-coral bg-white text-sm font-medium text-navy hover:bg-coral hover:text-white transition-colors text-left"
            >
              {conditionLabel(c)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange(removeRadiator(analysis, rad.id));
              onClearPendingRadiator();
            }}
            className="mt-1 h-9 px-3 rounded-lg text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>
      </div>
    );
  }

  if (mode === "dimension" && selectedRoom) {
    return (
      <RoomDetailsPanel analysis={analysis} room={selectedRoom} onChange={onChange} />
    );
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-600">
      <p className="font-semibold text-navy mb-2">Tips</p>
      {mode === "radiator" && (
        <ul className="space-y-1 list-disc pl-4">
          <li>Click on a room to drop a radiator pin.</li>
          <li>Choose its condition in the panel that appears.</li>
          <li>Skip rooms without radiators — that&rsquo;s fine.</li>
        </ul>
      )}
      {mode === "dimension" && (
        <ul className="space-y-1 list-disc pl-4">
          <li>Click any room to edit its name and dimensions.</li>
          <li>Dimensions in metres feed our heat-loss estimate.</li>
        </ul>
      )}
      {mode === "extension" && (
        <ul className="space-y-1 list-disc pl-4">
          <li>Click and drag in empty space to outline an extension.</li>
          <li>You&rsquo;ll be asked for its dimensions next.</li>
        </ul>
      )}
      {mode === "move-hp" && (
        <ul className="space-y-1 list-disc pl-4">
          <li>Click and drag any heat-pump box to reposition it.</li>
          <li>Aim for outdoor space away from neighbour windows.</li>
          <li>Remove a box via the room details panel (on HP candidates list below).</li>
        </ul>
      )}
      <div className="mt-4 pt-3 border-t border-slate-200">
        <p className="font-semibold text-navy mb-1">Across the property</p>
        <p>Rooms: {(analysis.rooms ?? []).length}</p>
        <p>Stairs: {(analysis.stairs ?? []).length}</p>
        <p>Outdoor zones: {(analysis.outdoorZones ?? []).length}</p>
        <p>Radiators: {(analysis.radiators ?? []).length}</p>
        <p>Heat-pump spots: {(analysis.heatPumpLocations ?? []).length}</p>
        <p>Cylinder spots: {(analysis.hotWaterCylinderCandidates ?? []).length}</p>
      </div>

      {/* HP list with remove for move-hp mode */}
      {mode === "move-hp" && (analysis.heatPumpLocations ?? []).length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="font-semibold text-navy mb-2">Heat-pump candidates</p>
          <ul className="space-y-1.5">
            {(analysis.heatPumpLocations ?? []).map((hp) => (
              <li key={hp.id} className="flex items-center gap-2">
                <span className="flex-1 truncate">{hp.label}</span>
                <button
                  type="button"
                  onClick={() => onChange(removeHeatPump(analysis, hp.id))}
                  className="text-slate-400 hover:text-red-600"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoomDetailsPanel({
  analysis,
  room,
  onChange,
}: {
  analysis: FloorplanAnalysis;
  room: Room;
  onChange: (next: FloorplanAnalysis) => void;
}) {
  return (
    <div className="rounded-xl border border-coral bg-coral-pale/40 p-4 text-xs">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-navy">Room details</p>
        <button
          type="button"
          onClick={() => onChange(removeRoom(analysis, room.id))}
          className="text-slate-500 hover:text-red-600 inline-flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      </div>
      <label className="block">
        <span className="text-[11px] text-slate-600">Name</span>
        <input
          type="text"
          value={room.label}
          onChange={(e) =>
            onChange(setRoomDimensions(analysis, room.id, { label: e.target.value }))
          }
          className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral/30"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-slate-600">Width (m)</span>
          <input
            type="number"
            step={0.1}
            value={room.widthM ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              onChange(setRoomDimensions(analysis, room.id, { widthM: v }));
            }}
            className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral/30"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-600">Length (m)</span>
          <input
            type="number"
            step={0.1}
            value={room.heightM ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              onChange(setRoomDimensions(analysis, room.id, { heightM: v }));
            }}
            className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral/30"
          />
        </label>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        {room.areaM2 != null ? `Area: ${room.areaM2} m²` : "Add both dimensions to compute area."}
      </p>
      {room.rects && room.rects.length > 1 && (
        <p className="mt-2 text-[11px] text-slate-500">
          Shape: {room.rects.length}-rect composite (L-shaped or similar).
        </p>
      )}
    </div>
  );
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

function ModeButton({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
        on
          ? "border-coral bg-coral text-white"
          : "border-[var(--border)] bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LegendSwatch({
  colour,
  borderColour,
  label,
  hatched,
}: {
  colour: string;
  borderColour: string;
  label: string;
  hatched?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{
          background: hatched
            ? `repeating-linear-gradient(45deg, ${borderColour}, ${borderColour} 1.5px, ${colour} 1.5px, ${colour} 4px)`
            : colour,
          border: `1px solid ${borderColour}`,
        }}
      />
      {label}
    </span>
  );
}

function LegendDot({
  colour,
  label,
  dashed,
}: {
  colour: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded"
        style={
          dashed
            ? { border: `2px dashed ${colour}`, background: `${colour}20` }
            : { background: colour }
        }
      />
      {label}
    </span>
  );
}

function modeHelp(mode: EditorMode): string {
  if (mode === "radiator") return "Click a room to drop a radiator.";
  if (mode === "dimension") return "Click a room to edit its dimensions.";
  if (mode === "extension") return "Drag to outline an extension.";
  return "Drag a heat-pump box to reposition it.";
}

function conditionLabel(c: RadiatorCondition): string {
  if (c === "good") return "Good — no rust, working fine";
  if (c === "fair") return "Fair — ageing but works";
  if (c === "poor") return "Poor — leaks or doesn't heat";
  return "Not sure";
}
