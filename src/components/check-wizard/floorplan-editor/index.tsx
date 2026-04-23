"use client";

// FloorplanEditor — interactive SVG editor for the analysed floorplan.
//
// Three modes (toolbar):
//   - radiator   : click a room → drop a pin → rate condition
//   - dimension  : click a room → side panel opens with metric dimensions
//   - extension  : click+drag empty space → create a new room
//
// All state changes are emitted via onChange. The editor is "controlled" so
// the wizard can persist updates straight to the analysis blob.
//
// Heat-pump candidate locations (from Claude) are rendered as ghosted
// dashed-border squares — read-only.

import { useMemo, useRef, useState } from "react";
import {
  Flame,
  Move,
  Plus,
  Sun,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type {
  FloorplanAnalysis,
  RadiatorCondition,
  Room,
} from "@/lib/schemas/floorplan";
import type { EditorMode, FloorplanEditorProps } from "./types";
import {
  addRadiator,
  addRoom,
  findRoomAt,
  floorLabel,
  floorsPresent,
  newRoomId,
  pointInRoomNormalised,
  removeRadiator,
  removeRoom,
  setRadiatorCondition,
  setRoomDimensions,
  setUserOutdoor,
} from "./utils";

const VIEWPORT = 1000;

// Tailwind palette in hex so SVG fill/stroke use the same brand colours.
const COLOURS = {
  roomFill: "#fff7ed",          // amber-50 — warm "toasty" canvas
  roomStroke: "#cbd5e1",        // slate-300
  roomLabel: "#0f172a",          // slate-900
  selectedStroke: "#ef6c4f",     // coral
  hpStroke: "#10b981",           // emerald-500 — outdoor heat pump
  hpFill: "#10b98120",
  cylStroke: "#8b5cf6",          // violet-500 — indoor cylinder
  cylFill: "#8b5cf620",
  radiator: "#ef6c4f",           // coral
  radiatorHole: "#ffffff",
  ghost: "#9ca3af",              // slate-400
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
  const [drag, setDrag] = useState<
    | { startX: number; startY: number; curX: number; curY: number }
    | null
  >(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const floors = floorsPresent(analysis);
  const visibleRooms = useMemo(
    () => analysis.rooms.filter((r) => r.floor === activeFloor),
    [analysis.rooms, activeFloor],
  );
  const visibleRadiators = useMemo(
    () =>
      analysis.radiators.filter((r) =>
        visibleRooms.some((room) => room.id === r.roomId),
      ),
    [analysis.radiators, visibleRooms],
  );
  const visibleHps = useMemo(
    () =>
      analysis.heatPumpLocations.filter(
        (h) => h.roomId == null || visibleRooms.some((r) => r.id === h.roomId),
      ),
    [analysis.heatPumpLocations, visibleRooms],
  );
  const visibleCylinders = useMemo(
    () =>
      // Defensive: localStorage state from before this field existed may
      // surface as undefined. Default to [].
      (analysis.hotWaterCylinderCandidates ?? []).filter(
        (c) => c.roomId == null || visibleRooms.some((r) => r.id === c.roomId),
      ),
    [analysis.hotWaterCylinderCandidates, visibleRooms],
  );
  const selectedRoom = useMemo(
    () => visibleRooms.find((r) => r.id === selectedRoomId) ?? null,
    [visibleRooms, selectedRoomId],
  );

  // Translate a DOM mouse event into viewport (0..1000) coordinates.
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
    const room = findRoomAt(visibleRooms, pos.vx, pos.vy);

    if (mode === "extension") {
      // Always start a drag — even if over a room (you can extend over an
      // existing room boundary; Step 4's "I had a kitchen extension" case).
      setDrag({ startX: pos.vx, startY: pos.vy, curX: pos.vx, curY: pos.vy });
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
    if (!drag) return;
    const pos = eventToViewport(e);
    if (!pos) return;
    setDrag({ ...drag, curX: pos.vx, curY: pos.vy });
  }

  function handleSvgMouseUp() {
    if (!drag) return;
    const x = Math.min(drag.startX, drag.curX);
    const y = Math.min(drag.startY, drag.curY);
    const w = Math.abs(drag.curX - drag.startX);
    const h = Math.abs(drag.curY - drag.startY);
    setDrag(null);
    if (w < 30 || h < 30) return; // ignore accidental clicks
    const newRoom: Room = {
      id: newRoomId(),
      label: "Extension",
      type: "other",
      floor: activeFloor,
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
    setMode("dimension"); // jump to dimension mode so the user can size it
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
          label="Edit room dimensions"
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
        <div className="ml-auto flex items-center gap-3">
          {/* Floor switcher */}
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
            mode === "extension" ? "cursor-crosshair" : "cursor-pointer"
          }`}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWPORT} ${VIEWPORT}`}
            className="w-full h-auto block select-none"
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={() => setDrag(null)}
          >
            {/* Light grid for orientation */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width={VIEWPORT} height={VIEWPORT} fill="url(#grid)" />

            {/* Rooms */}
            {visibleRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              return (
                <g key={room.id}>
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.vWidth}
                    height={room.vHeight}
                    fill={COLOURS.roomFill}
                    stroke={isSelected ? COLOURS.selectedStroke : COLOURS.roomStroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    rx={4}
                  />
                  {/* Label */}
                  <text
                    x={room.x + room.vWidth / 2}
                    y={room.y + room.vHeight / 2 - 6}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="600"
                    fill={COLOURS.roomLabel}
                    pointerEvents="none"
                  >
                    {room.label}
                  </text>
                  <text
                    x={room.x + room.vWidth / 2}
                    y={room.y + room.vHeight / 2 + 12}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                    pointerEvents="none"
                  >
                    {room.areaM2 != null ? `${room.areaM2} m²` : "size unknown"}
                  </text>
                </g>
              );
            })}

            {/* Heat pump candidate locations (outdoor, ~1m²) */}
            {visibleHps.map((hp) => (
              <g key={hp.id}>
                <rect
                  x={hp.x}
                  y={hp.y}
                  width={hp.vWidth}
                  height={hp.vHeight}
                  fill={COLOURS.hpFill}
                  stroke={COLOURS.hpStroke}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  rx={2}
                />
                <text
                  x={hp.x + hp.vWidth / 2}
                  y={hp.y - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={COLOURS.hpStroke}
                  pointerEvents="none"
                >
                  HP
                </text>
                <title>{hp.label} — {hp.notes}</title>
              </g>
            ))}

            {/* Hot water cylinder candidate locations (indoor, ~0.6m²) */}
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

            {/* Radiators */}
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
                <g key={rad.id} style={{ pointerEvents: "auto" }}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill={condColour}
                    stroke="white"
                    strokeWidth={2}
                  />
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

            {/* Drag preview for "add extension" */}
            {drag && (
              <rect
                x={Math.min(drag.startX, drag.curX)}
                y={Math.min(drag.startY, drag.curY)}
                width={Math.abs(drag.curX - drag.startX)}
                height={Math.abs(drag.curY - drag.startY)}
                fill="rgba(239, 108, 79, 0.15)"
                stroke={COLOURS.selectedStroke}
                strokeWidth={2}
                strokeDasharray="4 4"
                rx={4}
              />
            )}
          </svg>

          {/* Empty state */}
          {visibleRooms.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-slate-500 text-sm">
                <Wand2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No rooms detected on this floor.
                {mode === "extension" && (
                  <p className="mt-1 text-xs">Click and drag to add one.</p>
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
      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-500">
        <LegendDot colour={COLOURS.radiator} label="Radiator (tap to rate)" />
        <LegendDot colour={COLOURS.hpStroke} dashed label="Heat-pump (outdoor)" />
        <LegendDot colour={COLOURS.cylStroke} dashed label="Hot water cylinder (indoor)" />
        <LegendDot colour="#10b981" label="Good" />
        <LegendDot colour="#f59e0b" label="Fair" />
        <LegendDot colour="#ef4444" label="Poor" />
      </div>
    </div>
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
  // Radiator condition popover takes priority — it appears whenever a fresh
  // pin was just dropped, even in dimension mode.
  if (pendingRadiatorId) {
    const rad = analysis.radiators.find((r) => r.id === pendingRadiatorId);
    if (!rad) return null;
    const room = analysis.rooms.find((r) => r.id === rad.roomId);
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
                const next = setRadiatorCondition(analysis, rad.id, c);
                onChange(next);
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
              const next = removeRadiator(analysis, rad.id);
              onChange(next);
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
      <RoomDetailsPanel
        analysis={analysis}
        room={selectedRoom}
        onChange={onChange}
      />
    );
  }

  // Default panel: summary + tips for the active mode.
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
      <div className="mt-4 pt-3 border-t border-slate-200">
        <p className="font-semibold text-navy mb-1">Across the property</p>
        <p>Rooms: {analysis.rooms.length}</p>
        <p>Radiators: {analysis.radiators.length}</p>
        <p>Heat-pump spots: {analysis.heatPumpLocations.length}</p>
        <p>Cylinder spots: {analysis.hotWaterCylinderCandidates.length}</p>
      </div>
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
              onChange(
                setRoomDimensions(analysis, room.id, { widthM: v }),
              );
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
              onChange(
                setRoomDimensions(analysis, room.id, { heightM: v }),
              );
            }}
            className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-coral/30"
          />
        </label>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        {room.areaM2 != null ? `Area: ${room.areaM2} m²` : "Add both dimensions to compute area."}
      </p>
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
            ? {
                border: `2px dashed ${colour}`,
                background: `${colour}20`,
              }
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
  return "Drag to outline an extension.";
}

function conditionLabel(c: RadiatorCondition): string {
  if (c === "good") return "Good — no rust, working fine";
  if (c === "fair") return "Fair — ageing but works";
  if (c === "poor") return "Poor — leaks or doesn't heat";
  return "Not sure";
}

// Re-export icon used by parent for header consistency (not strictly needed).
export { Sun, Flame, X };
