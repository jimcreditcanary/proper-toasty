"use client";

// FloorplanEditor v3 — user annotates the uploaded floorplan image.
//
// The flow:
//   1. walls      — click to add points, double-click / Enter to finish path
//   2. doors      — click near a wall; auto-snaps to the wall and drops a
//                   door marker
//   3. outdoor    — click to add polygon points, double-click / Enter to
//                   close (garden / side return / driveway)
//   4. stairs     — drag a rectangle
//   5. radiators  — click anywhere to drop a pin; condition popover appears
//   6. "Find heat pump & cylinder" button → AI call
//   7. adjust     — drag HP / cylinder pins to reposition

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  DoorOpen,
  Flame,
  Loader2,
  Minus,
  Sparkles,
  Target,
  Trash2,
  TreePine,
  Wand2,
} from "lucide-react";
import type {
  FloorplanAnalysis,
  Point,
  RadiatorCondition,
} from "@/lib/schemas/floorplan";
import type { EditorMode, FloorplanEditorProps } from "./types";
import {
  addDoor,
  addOutdoorZone,
  addRadiator,
  addStairs,
  addUserHeatPump,
  addWallPath,
  findNearestWall,
  moveCylinder,
  moveHeatPump,
  removeCylinder,
  removeDoor,
  removeHeatPump,
  removeOutdoorZone,
  removeRadiator,
  removeStairs,
  removeWallPath,
  setRadiatorCondition,
  setUserOutdoor,
} from "./utils";

const VIEWPORT = 1000;

const COLOURS = {
  wall: "#ef6c4f",
  wallPreview: "#ef6c4f80",
  door: "#f59e0b",
  zoneStroke: "#22c55e",
  zoneFill: "#86efac30",
  zonePreview: "#22c55e50",
  stairsFill: "#cbd5e1",
  stairsStroke: "#64748b",
  hpStroke: "#10b981",
  hpFill: "#10b98120",
  cylStroke: "#8b5cf6",
  cylFill: "#8b5cf620",
  radiator: "#ef6c4f",
  point: "#ef6c4f",
} as const;

const MODES: Array<{
  key: EditorMode;
  label: string;
  icon: React.ReactNode;
  tip: string;
}> = [
  {
    key: "walls",
    label: "Walls",
    icon: <Minus className="w-3.5 h-3.5" />,
    tip: "Click to add corners; double-click or hit Enter to finish a wall.",
  },
  {
    key: "doors",
    label: "Doors",
    icon: <DoorOpen className="w-3.5 h-3.5" />,
    tip: "Click near a wall to drop a door; it snaps to the nearest segment.",
  },
  {
    key: "outdoor",
    label: "Outdoor space",
    icon: <TreePine className="w-3.5 h-3.5" />,
    tip: "Outline garden / side return. Click points, double-click to close the shape.",
  },
  {
    key: "stairs",
    label: "Stairs",
    icon: <Wand2 className="w-3.5 h-3.5" />,
    tip: "Click and drag a rectangle where the stairs are.",
  },
  {
    key: "radiators",
    label: "Radiators",
    icon: <Flame className="w-3.5 h-3.5" />,
    tip: "Click anywhere to place a radiator; rate its condition in the popover.",
  },
  {
    key: "adjust",
    label: "Move pins",
    icon: <Target className="w-3.5 h-3.5" />,
    tip: "Drag heat pump / cylinder pins to where they actually go.",
  },
];

export function FloorplanEditor({
  analysis,
  onChange,
  imageUrl,
  outdoorAsk,
  onOutdoorConfirm,
  onRequestPlacements,
  placementsRunning,
  placementsError,
}: FloorplanEditorProps) {
  const [mode, setMode] = useState<EditorMode>("walls");
  const [currentWallPoints, setCurrentWallPoints] = useState<Point[]>([]);
  const [currentZonePoints, setCurrentZonePoints] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [stairsDrag, setStairsDrag] = useState<
    | { startX: number; startY: number; curX: number; curY: number }
    | null
  >(null);
  const [pinDrag, setPinDrag] = useState<
    | { id: string; kind: "hp" | "cyl"; offsetX: number; offsetY: number; curX: number; curY: number }
    | null
  >(null);
  // Pending radiator state stores container-relative click position so the
  // popover renders without touching refs during render (React strict-mode
  // safe).
  const [pendingRadiator, setPendingRadiator] = useState<
    | { id: string; relX: number; relY: number }
    | null
  >(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset in-flight draft state when mode changes so switching tools doesn't
  // leave a half-drawn wall lingering.
  useEffect(() => {
    setCurrentWallPoints([]);
    setCurrentZonePoints([]);
    setStairsDrag(null);
    setPendingRadiator(null);
  }, [mode]);

  // Keyboard: Enter finishes the active draft, Escape cancels it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        if (mode === "walls" && currentWallPoints.length >= 2) {
          onChange(addWallPath(analysis, currentWallPoints));
          setCurrentWallPoints([]);
          e.preventDefault();
        } else if (mode === "outdoor" && currentZonePoints.length >= 3) {
          onChange(addOutdoorZone(analysis, currentZonePoints));
          setCurrentZonePoints([]);
          e.preventDefault();
        }
      } else if (e.key === "Escape") {
        setCurrentWallPoints([]);
        setCurrentZonePoints([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analysis, mode, currentWallPoints, currentZonePoints, onChange]);

  // Translate a DOM mouse event into viewport (0..1000) coordinates.
  function eventToViewport(
    e: React.MouseEvent<SVGSVGElement>,
  ): { vx: number; vy: number } | null {
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

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;

    if (mode === "walls") {
      setCurrentWallPoints([...currentWallPoints, { x: pos.vx, y: pos.vy }]);
    } else if (mode === "outdoor") {
      setCurrentZonePoints([...currentZonePoints, { x: pos.vx, y: pos.vy }]);
    } else if (mode === "doors") {
      const snap = findNearestWall(analysis.walls, pos.vx, pos.vy, 40);
      if (snap) {
        onChange(addDoor(analysis, snap.x, snap.y, snap.wallPathId));
      } else {
        // Still allow placing without a wall; wallPathId = null.
        onChange(addDoor(analysis, pos.vx, pos.vy, null));
      }
    } else if (mode === "radiators") {
      const next = addRadiator(analysis, pos.vx, pos.vy);
      const last = next.radiators[next.radiators.length - 1];
      onChange(next);
      if (last && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPendingRadiator({
          id: last.id,
          relX: e.clientX - rect.left,
          relY: e.clientY - rect.top,
        });
      }
    } else if (mode === "adjust") {
      // Clicking empty space clears selection — drag handled in mousedown/move.
    }
  }

  function handleSvgDoubleClick() {
    if (mode === "walls" && currentWallPoints.length >= 2) {
      onChange(addWallPath(analysis, currentWallPoints));
      setCurrentWallPoints([]);
    } else if (mode === "outdoor" && currentZonePoints.length >= 3) {
      onChange(addOutdoorZone(analysis, currentZonePoints));
      setCurrentZonePoints([]);
    }
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;
    if (mode === "stairs") {
      setStairsDrag({ startX: pos.vx, startY: pos.vy, curX: pos.vx, curY: pos.vy });
    } else if (mode === "adjust") {
      // Find HP or cylinder under cursor.
      const hp = analysis.heatPumpLocations.find(
        (h) =>
          pos.vx >= h.x && pos.vx <= h.x + h.vWidth && pos.vy >= h.y && pos.vy <= h.y + h.vHeight,
      );
      if (hp) {
        setPinDrag({
          id: hp.id,
          kind: "hp",
          offsetX: pos.vx - hp.x,
          offsetY: pos.vy - hp.y,
          curX: hp.x,
          curY: hp.y,
        });
        return;
      }
      const cyl = analysis.hotWaterCylinderCandidates.find(
        (c) =>
          pos.vx >= c.x && pos.vx <= c.x + c.vWidth && pos.vy >= c.y && pos.vy <= c.y + c.vHeight,
      );
      if (cyl) {
        setPinDrag({
          id: cyl.id,
          kind: "cyl",
          offsetX: pos.vx - cyl.x,
          offsetY: pos.vy - cyl.y,
          curX: cyl.x,
          curY: cyl.y,
        });
      }
    }
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;
    setCursor({ x: pos.vx, y: pos.vy });
    if (stairsDrag) {
      setStairsDrag({ ...stairsDrag, curX: pos.vx, curY: pos.vy });
    }
    if (pinDrag) {
      setPinDrag({
        ...pinDrag,
        curX: Math.max(0, Math.min(VIEWPORT, pos.vx - pinDrag.offsetX)),
        curY: Math.max(0, Math.min(VIEWPORT, pos.vy - pinDrag.offsetY)),
      });
    }
  }

  function handleSvgMouseUp() {
    if (stairsDrag) {
      const x = Math.min(stairsDrag.startX, stairsDrag.curX);
      const y = Math.min(stairsDrag.startY, stairsDrag.curY);
      const w = Math.abs(stairsDrag.curX - stairsDrag.startX);
      const h = Math.abs(stairsDrag.curY - stairsDrag.startY);
      setStairsDrag(null);
      if (w >= 30 && h >= 30) {
        onChange(addStairs(analysis, { x, y, vWidth: w, vHeight: h }));
      }
    }
    if (pinDrag) {
      const next =
        pinDrag.kind === "hp"
          ? moveHeatPump(analysis, pinDrag.id, pinDrag.curX, pinDrag.curY)
          : moveCylinder(analysis, pinDrag.id, pinDrag.curX, pinDrag.curY);
      onChange(next);
      setPinDrag(null);
    }
  }

  // Preview line for walls/outdoor while the user is adding points.
  const wallPreview = useMemo(() => {
    if (mode !== "walls" || currentWallPoints.length === 0 || !cursor) return null;
    const last = currentWallPoints[currentWallPoints.length - 1]!;
    return { from: last, to: cursor };
  }, [mode, currentWallPoints, cursor]);

  const zonePreview = useMemo(() => {
    if (mode !== "outdoor" || currentZonePoints.length === 0 || !cursor) return null;
    const last = currentZonePoints[currentZonePoints.length - 1]!;
    return { from: last, to: cursor };
  }, [mode, currentZonePoints, cursor]);

  // Enough annotations to call the AI placement step?
  const canFindPlacements =
    analysis.walls.length > 0 || analysis.outdoorZones.length > 0;

  const totalPins =
    analysis.heatPumpLocations.length + analysis.hotWaterCylinderCandidates.length;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      {/* Outdoor confirmation (only when satellite was inconclusive AND user
          hasn't outlined an outdoor zone yet) */}
      {outdoorAsk &&
        analysis.outdoorSpace.userConfirmed == null &&
        analysis.outdoorZones.length === 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              We couldn&rsquo;t see your outdoor space clearly from satellite.
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Do you have a garden, side return, or any outdoor wall where a 1m × 1m
              heat-pump unit could sit? (Or skip this and outline it directly on the
              floorplan.)
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(setUserOutdoor(analysis, "yes"));
                  onOutdoorConfirm?.("yes");
                }}
                className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(setUserOutdoor(analysis, "no"));
                  onOutdoorConfirm?.("no");
                }}
                className="h-9 px-4 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-sm font-semibold"
              >
                No outdoor space
              </button>
            </div>
          </div>
        )}

      {/* Mode toolbar (top, full width — tips inline) */}
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {MODES.filter((m) => m.key !== "adjust" || analysis.placementsRequested).map((m) => {
            const on = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  on
                    ? "border-coral bg-coral text-white"
                    : "border-[var(--border)] bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">{MODES.find((m) => m.key === mode)?.tip}</p>
      </div>

      {/* Canvas — full width */}
      <div
        ref={containerRef}
        className={`relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden ${
          mode === "stairs" || mode === "outdoor" || mode === "walls"
            ? "cursor-crosshair"
            : mode === "adjust"
              ? "cursor-grab"
              : "cursor-pointer"
        }`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Your floorplan"
            className="block w-full h-auto select-none pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center text-sm text-slate-400">
            No floorplan image — upload one to start annotating.
          </div>
        )}
        {/* SVG overlay — viewBox 0..1000, preserveAspectRatio="none" so
            coords stretch to fill the image exactly. */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWPORT} ${VIEWPORT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          onClick={handleSvgClick}
          onDoubleClick={handleSvgDoubleClick}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={() => {
            setStairsDrag(null);
            setPinDrag(null);
            setCursor(null);
          }}
        >
          <defs>
            <pattern
              id="fe-stairs-hatch"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="10" stroke={COLOURS.stairsStroke} strokeWidth="2" />
            </pattern>
          </defs>

          {/* Outdoor zones (filled polygons) */}
          {analysis.outdoorZones.map((z) => (
            <g key={z.id}>
              <polygon
                points={z.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={COLOURS.zoneFill}
                stroke={COLOURS.zoneStroke}
                strokeWidth={2}
                strokeDasharray="8 4"
              />
              {/* Label at centroid */}
              <text
                x={z.points.reduce((s, p) => s + p.x, 0) / z.points.length}
                y={z.points.reduce((s, p) => s + p.y, 0) / z.points.length}
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
                fill={COLOURS.zoneStroke}
                pointerEvents="none"
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Walls (polylines) */}
          {analysis.walls.map((w) => (
            <polyline
              key={w.id}
              points={w.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={COLOURS.wall}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Stairs */}
          {analysis.userStairs.map((s) => (
            <g key={s.id}>
              <rect
                x={s.x}
                y={s.y}
                width={s.vWidth}
                height={s.vHeight}
                fill={COLOURS.stairsFill}
                stroke={COLOURS.stairsStroke}
                strokeWidth={1.5}
                rx={2}
              />
              <rect
                x={s.x}
                y={s.y}
                width={s.vWidth}
                height={s.vHeight}
                fill="url(#fe-stairs-hatch)"
                opacity={0.5}
              />
              <text
                x={s.x + s.vWidth / 2}
                y={s.y + s.vHeight / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={COLOURS.stairsStroke}
                pointerEvents="none"
              >
                {s.direction === "down" ? "↓" : s.direction === "both" ? "⇅" : "↑"}
              </text>
            </g>
          ))}

          {/* Doors */}
          {analysis.doors.map((d) => (
            <g key={d.id}>
              <circle cx={d.x} cy={d.y} r={10} fill="white" stroke={COLOURS.door} strokeWidth={2} />
              <path
                d={`M ${d.x - 7} ${d.y} A 7 7 0 0 1 ${d.x + 7} ${d.y}`}
                fill="none"
                stroke={COLOURS.door}
                strokeWidth={1.5}
              />
            </g>
          ))}

          {/* Radiators */}
          {analysis.radiators.map((r) => {
            const colour =
              r.condition === "good"
                ? "#10b981"
                : r.condition === "fair"
                  ? "#f59e0b"
                  : r.condition === "poor"
                    ? "#ef4444"
                    : COLOURS.radiator;
            return (
              <g key={r.id}>
                <circle cx={r.x} cy={r.y} r={12} fill={colour} stroke="white" strokeWidth={2} />
                <text
                  x={r.x}
                  y={r.y + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="white"
                  pointerEvents="none"
                >
                  R
                </text>
              </g>
            );
          })}

          {/* Heat pump pins */}
          {analysis.heatPumpLocations.map((hp) => {
            const isDragging = pinDrag?.id === hp.id && pinDrag.kind === "hp";
            const x = isDragging ? pinDrag!.curX : hp.x;
            const y = isDragging ? pinDrag!.curY : hp.y;
            return (
              <g key={hp.id}>
                <rect
                  x={x}
                  y={y}
                  width={hp.vWidth}
                  height={hp.vHeight}
                  fill={COLOURS.hpFill}
                  stroke={COLOURS.hpStroke}
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
                  fill={COLOURS.hpStroke}
                  pointerEvents="none"
                >
                  HP
                </text>
                <title>{hp.label} — {hp.notes}</title>
              </g>
            );
          })}

          {/* Cylinder pins */}
          {analysis.hotWaterCylinderCandidates.map((cy) => {
            const isDragging = pinDrag?.id === cy.id && pinDrag.kind === "cyl";
            const x = isDragging ? pinDrag!.curX : cy.x;
            const y = isDragging ? pinDrag!.curY : cy.y;
            return (
              <g key={cy.id}>
                <rect
                  x={x}
                  y={y}
                  width={cy.vWidth}
                  height={cy.vHeight}
                  fill={COLOURS.cylFill}
                  stroke={COLOURS.cylStroke}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  rx={2}
                />
                <text
                  x={x + cy.vWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={COLOURS.cylStroke}
                  pointerEvents="none"
                >
                  Cyl
                </text>
                <title>{cy.label} — {cy.notes}</title>
              </g>
            );
          })}

          {/* In-flight wall path */}
          {currentWallPoints.length > 0 && (
            <>
              <polyline
                points={currentWallPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={COLOURS.wall}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.6}
              />
              {currentWallPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill={COLOURS.point} />
              ))}
            </>
          )}
          {wallPreview && (
            <line
              x1={wallPreview.from.x}
              y1={wallPreview.from.y}
              x2={wallPreview.to.x}
              y2={wallPreview.to.y}
              stroke={COLOURS.wallPreview}
              strokeWidth={3}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}

          {/* In-flight outdoor zone */}
          {currentZonePoints.length > 0 && (
            <>
              <polyline
                points={currentZonePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={COLOURS.zoneFill}
                stroke={COLOURS.zoneStroke}
                strokeWidth={2}
                strokeOpacity={0.6}
              />
              {currentZonePoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill={COLOURS.zoneStroke} />
              ))}
            </>
          )}
          {zonePreview && (
            <line
              x1={zonePreview.from.x}
              y1={zonePreview.from.y}
              x2={zonePreview.to.x}
              y2={zonePreview.to.y}
              stroke={COLOURS.zonePreview}
              strokeWidth={2}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          )}

          {/* Stairs drag preview */}
          {stairsDrag && (
            <rect
              x={Math.min(stairsDrag.startX, stairsDrag.curX)}
              y={Math.min(stairsDrag.startY, stairsDrag.curY)}
              width={Math.abs(stairsDrag.curX - stairsDrag.startX)}
              height={Math.abs(stairsDrag.curY - stairsDrag.startY)}
              fill={COLOURS.stairsFill}
              fillOpacity={0.4}
              stroke={COLOURS.stairsStroke}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}
        </svg>

        {/* Radiator condition popover */}
        {pendingRadiator && (
          <RadiatorConditionPopover
            x={pendingRadiator.relX}
            y={pendingRadiator.relY}
            onPick={(c) => {
              onChange(setRadiatorCondition(analysis, pendingRadiator.id, c));
              setPendingRadiator(null);
            }}
            onRemove={() => {
              onChange(removeRadiator(analysis, pendingRadiator.id));
              setPendingRadiator(null);
            }}
          />
        )}
      </div>

      {/* "Find heat pump & cylinder" action + summary */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {analysis.walls.length} wall path(s) · {analysis.doors.length} door(s) ·{" "}
          {analysis.outdoorZones.length} outdoor zone(s) · {analysis.userStairs.length} stair(s) ·{" "}
          {analysis.radiators.length} radiator(s)
          {totalPins > 0 && ` · ${totalPins} AI pin${totalPins === 1 ? "" : "s"}`}
        </div>
        <button
          type="button"
          disabled={!canFindPlacements || placementsRunning}
          onClick={() => onRequestPlacements?.()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {placementsRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Finding placements…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {analysis.placementsRequested ? "Re-run placement" : "Find heat pump & cylinder"}
            </>
          )}
        </button>
      </div>

      {placementsError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{placementsError}</span>
        </div>
      )}

      {/* Concerns from the AI step */}
      {analysis.placementsRequested && analysis.heatPumpInstallationConcerns.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
          <p className="font-semibold text-navy mb-1">Install concerns</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {analysis.heatPumpInstallationConcerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Remove lists */}
      <RemoveLists analysis={analysis} onChange={onChange} />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <LegendRow colour={COLOURS.wall} label="Wall" thick />
        <LegendRow colour={COLOURS.door} label="Door" />
        <LegendRow colour={COLOURS.zoneStroke} label="Outdoor zone" />
        <LegendRow colour={COLOURS.stairsStroke} label="Stairs" />
        <LegendRow colour={COLOURS.radiator} label="Radiator" />
        <LegendRow colour={COLOURS.hpStroke} label="Heat pump (outdoor)" dashed />
        <LegendRow colour={COLOURS.cylStroke} label="Cylinder (indoor)" dashed />
      </div>
    </div>
  );
}

// ─── Radiator condition popover ──────────────────────────────────────────────

function RadiatorConditionPopover({
  x,
  y,
  onPick,
  onRemove,
}: {
  x: number;
  y: number;
  onPick: (c: RadiatorCondition) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="absolute z-10 rounded-xl border border-coral bg-white shadow-lg p-3 min-w-[180px]"
      style={{
        left: Math.max(8, Math.min(x + 12, 9999)),
        top: Math.max(8, y + 12),
      }}
    >
      <p className="text-xs font-semibold text-navy">Radiator condition?</p>
      <div className="mt-2 flex flex-col gap-1">
        {(["good", "fair", "poor", "unsure"] as RadiatorCondition[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className="h-8 px-3 rounded-lg border border-coral bg-white text-xs font-medium text-navy hover:bg-coral hover:text-white transition-colors text-left"
          >
            {conditionLabel(c)}
          </button>
        ))}
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 h-7 text-[11px] text-slate-500 hover:text-red-600 inline-flex items-center gap-1.5"
        >
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      </div>
    </div>
  );
}

// ─── Remove lists ────────────────────────────────────────────────────────────

function RemoveLists({
  analysis,
  onChange,
}: {
  analysis: FloorplanAnalysis;
  onChange: (next: FloorplanAnalysis) => void;
}) {
  const any =
    analysis.walls.length +
      analysis.doors.length +
      analysis.outdoorZones.length +
      analysis.userStairs.length +
      analysis.radiators.length +
      analysis.heatPumpLocations.length +
      analysis.hotWaterCylinderCandidates.length >
    0;
  if (!any) return null;
  return (
    <details className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
      <summary className="cursor-pointer font-semibold text-navy">
        Manage annotations ({
          analysis.walls.length +
            analysis.doors.length +
            analysis.outdoorZones.length +
            analysis.userStairs.length +
            analysis.radiators.length +
            analysis.heatPumpLocations.length +
            analysis.hotWaterCylinderCandidates.length
        })
      </summary>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {analysis.walls.length > 0 && (
          <ItemGroup title="Walls">
            {analysis.walls.map((w, i) => (
              <Item
                key={w.id}
                label={`Wall #${i + 1} (${w.points.length} points)`}
                onRemove={() => onChange(removeWallPath(analysis, w.id))}
              />
            ))}
          </ItemGroup>
        )}
        {analysis.doors.length > 0 && (
          <ItemGroup title="Doors">
            {analysis.doors.map((d, i) => (
              <Item
                key={d.id}
                label={`Door #${i + 1}`}
                onRemove={() => onChange(removeDoor(analysis, d.id))}
              />
            ))}
          </ItemGroup>
        )}
        {analysis.outdoorZones.length > 0 && (
          <ItemGroup title="Outdoor zones">
            {analysis.outdoorZones.map((z) => (
              <Item
                key={z.id}
                label={z.label}
                onRemove={() => onChange(removeOutdoorZone(analysis, z.id))}
              />
            ))}
          </ItemGroup>
        )}
        {analysis.userStairs.length > 0 && (
          <ItemGroup title="Stairs">
            {analysis.userStairs.map((s, i) => (
              <Item
                key={s.id}
                label={`Stairs #${i + 1}`}
                onRemove={() => onChange(removeStairs(analysis, s.id))}
              />
            ))}
          </ItemGroup>
        )}
        {analysis.radiators.length > 0 && (
          <ItemGroup title="Radiators">
            {analysis.radiators.map((r, i) => (
              <Item
                key={r.id}
                label={`Radiator #${i + 1}${r.condition ? ` · ${r.condition}` : ""}`}
                onRemove={() => onChange(removeRadiator(analysis, r.id))}
              />
            ))}
          </ItemGroup>
        )}
        {analysis.heatPumpLocations.length > 0 && (
          <ItemGroup title="Heat pump pins">
            {analysis.heatPumpLocations.map((h) => (
              <Item
                key={h.id}
                label={h.label}
                onRemove={() => onChange(removeHeatPump(analysis, h.id))}
              />
            ))}
          </ItemGroup>
        )}
        {analysis.hotWaterCylinderCandidates.length > 0 && (
          <ItemGroup title="Cylinder pins">
            {analysis.hotWaterCylinderCandidates.map((c) => (
              <Item
                key={c.id}
                label={c.label}
                onRemove={() => onChange(removeCylinder(analysis, c.id))}
              />
            ))}
          </ItemGroup>
        )}
      </div>
      {/* Let the user also add a custom HP pin. */}
      <div className="mt-3 text-[11px] text-slate-500">
        Tip: to add a heat-pump pin manually, switch to the Move pins mode and use
        the Add button below.
      </div>
      <button
        type="button"
        onClick={() => onChange(addUserHeatPump(analysis, 500, 500))}
        className="mt-2 h-8 px-3 rounded-lg border border-coral bg-white text-xs font-medium text-coral hover:bg-coral-pale inline-flex items-center gap-1.5"
      >
        <Target className="w-3 h-3" /> Add heat-pump pin at centre
      </button>
    </details>
  );
}

function ItemGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-navy text-[11px] uppercase tracking-wider mb-1.5">
        {title}
      </p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function Item({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex-1 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-slate-400 hover:text-red-600"
        title="Remove"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </li>
  );
}

function LegendRow({
  colour,
  label,
  thick,
  dashed,
}: {
  colour: string;
  label: string;
  thick?: boolean;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded"
        style={
          dashed
            ? { border: `2px dashed ${colour}`, background: `${colour}20` }
            : thick
              ? { background: colour, height: "3px", width: "12px", alignSelf: "center" }
              : { background: colour }
        }
      />
      {label}
    </span>
  );
}

function conditionLabel(c: RadiatorCondition): string {
  if (c === "good") return "Good — no rust, works fine";
  if (c === "fair") return "Fair — ageing but works";
  if (c === "poor") return "Poor — leaks or doesn't heat";
  return "Not sure";
}

// Unused import guard (keeps TS happy if Image is ever swapped in)
void Image;
