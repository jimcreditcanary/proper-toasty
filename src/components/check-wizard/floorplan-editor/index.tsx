"use client";

// FloorplanEditor v4 — conversational stage flow.
//
// The user is walked through each annotation type one stage at a time, with
// short prompts, a prominent Undo button, a per-stage Save, and optional
// Skip. After all stages, the AI places HP + cylinder and asks any follow-up
// questions it needs. Finally the editor flips to a canonical view where
// the uploaded image fades out and the user's drawing becomes the floorplan.
//
// Stages: welcome → walls → outdoor → doors → stairs → radiators
//         → placing (AI call) → adjust (drag pins + answer questions) → done

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  DoorOpen,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Minus,
  Rows,
  Sparkles,
  Target,
  TreePine,
  Undo2,
  Wand2,
} from "lucide-react";
import type {
  Point,
  RadiatorCondition,
  RadiatorOrientation,
  RadiatorSize,
} from "@/lib/schemas/floorplan";
import type { FloorplanEditorProps, Stage } from "./types";
import {
  addDoor,
  addOutdoorZone,
  addRadiator,
  addStairs,
  addWallPath,
  answerClarification,
  findNearestWall,
  moveCylinder,
  moveHeatPump,
  removeRadiator,
  setRadiatorMeta,
  setUserOutdoor,
  simplifyStroke,
  snapToGrid,
  undoLastDoor,
  undoLastOutdoorZone,
  undoLastRadiator,
  undoLastStairs,
  undoLastWall,
} from "./utils";

const VIEWPORT = 1000;

const STAGE_ORDER: Stage[] = [
  "welcome",
  "walls",
  "outdoor",
  "doors",
  "stairs",
  "radiators",
  "review",
  "placing",
  "adjust",
];

// Vibrant palette — meant to stand out against the white-overlaid
// floorplan image while in drawing stages, AND against the amber-wash
// canonical background when we hide the photo.
const COLOURS = {
  wall: "#ef6c4f",            // coral — walls match the brand and pop on the light overlay
  wallCurrent: "#dc2626",     // red-600 — extra vivid while in-progress
  door: "#f59e0b",
  zoneStroke: "#16a34a",      // green-600
  zoneFill: "#86efac55",
  zoneCurrent: "#15803d",
  stairsFill: "#cbd5e1",
  stairsStroke: "#334155",
  hpStroke: "#0f766e",        // teal-700 — more contrast than emerald
  hpFill: "#14b8a625",
  cylStroke: "#7c3aed",       // violet-600
  cylFill: "#8b5cf625",
  radiator: "#ef6c4f",
  radiatorSelected: "#dc2626",
  overlayOpacity: 0.55,
} as const;

// ─── Stage definitions ───────────────────────────────────────────────────────

interface StageConfig {
  key: Stage;
  title: string;
  body: string;
  skippable?: boolean;
  icon: React.ReactNode;
  example?: React.ReactNode;
}

const STAGE_CONFIG: Record<Stage, StageConfig | null> = {
  welcome: {
    key: "welcome",
    title: "Let's draw over your floorplan",
    body:
      "We'll walk you through it step by step. You'll trace the walls, outline your garden, mark doors, stairs and radiators. Takes about 2 minutes.",
    icon: <Sparkles className="w-5 h-5" />,
  },
  walls: {
    key: "walls",
    title: "Draw over your walls",
    body:
      "Use your mouse or finger like a marker pen. Trace every wall — windows count as walls. Draw RIGHT ACROSS doorways too; we'll add the doors as gaps in the next step. Lift and start again for each new wall.",
    icon: <Minus className="w-5 h-5" />,
  },
  outdoor: {
    key: "outdoor",
    title: "Mark your outdoor space",
    body:
      "Draw around your garden, side return, driveway — anywhere you could put a 1m × 1m heat-pump unit. No outdoor space? Skip this step.",
    skippable: true,
    icon: <TreePine className="w-5 h-5" />,
  },
  doors: {
    key: "doors",
    title: "Tap where your doors are",
    body: "Click once for each door. Don't worry about being exact — we'll snap them to the nearest wall for you.",
    icon: <DoorOpen className="w-5 h-5" />,
  },
  stairs: {
    key: "stairs",
    title: "Drag over your stairs",
    body: "Click and drag a rectangle over where the stairs are. If you've got more than one flight, draw each one separately.",
    skippable: true,
    icon: <Wand2 className="w-5 h-5" />,
  },
  radiators: {
    key: "radiators",
    title: "Mark your radiators",
    body:
      "Click where each radiator is. A quick popover will ask the size (small / medium / large), whether it's tall, and its condition.",
    icon: <Rows className="w-5 h-5" />,
  },
  review: {
    key: "review",
    title: "Here's what you've drawn",
    body:
      "This is your simplified floorplan. Take a look — go back if anything needs a tweak. When it looks right, we'll work out where the heat pump and cylinder can go.",
    icon: <Check className="w-5 h-5" />,
  },
  placing: {
    key: "placing",
    title: "Finding where everything fits…",
    body: "Comparing what you've drawn against your original floorplan to suggest where the heat pump and hot water cylinder can go.",
    icon: <Sparkles className="w-5 h-5" />,
  },
  adjust: {
    key: "adjust",
    title: "Adjust the heat pump and cylinder",
    body: "Drag either pin to where you'd actually put it. Answer any follow-up questions below if they appear, then hit Looks good.",
    icon: <Target className="w-5 h-5" />,
  },
};

// ─── Main component ──────────────────────────────────────────────────────────

export function FloorplanEditor({
  analysis,
  onChange,
  imageUrl,
  outdoorAsk,
  onOutdoorConfirm,
  onRequestPlacements,
  placementsRunning,
  placementsError,
  onComplete,
}: FloorplanEditorProps) {
  // Pick initial stage based on what's already in analysis (for back-and-
  // forth through the wizard).
  const initialStage: Stage = useMemo(() => {
    if (analysis.placementsRequested) return "adjust";
    if (analysis.radiators.length > 0) return "radiators";
    if (analysis.userStairs.length > 0) return "stairs";
    if (analysis.doors.length > 0) return "doors";
    if (analysis.outdoorZones.length > 0) return "outdoor";
    if (analysis.walls.length > 0) return "walls";
    return "welcome";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [stage, setStage] = useState<Stage>(initialStage);

  // Mouse vs finger drawing — only affects the freehand stages (walls,
  // outdoor). Mouse defaults to click-to-add-points polyline (each click
  // adds a corner; double-click or Enter finishes). Finger / stylus
  // defaults to continuous freehand (drag to trace, lift to commit).
  // Auto-detect: a touch-capable device defaults to finger; otherwise mouse.
  const [inputMode, setInputMode] = useState<"mouse" | "finger">(() => {
    if (typeof window === "undefined") return "mouse";
    return navigator.maxTouchPoints > 0 ? "finger" : "mouse";
  });

  // Auto-advance out of placing when AI returns (or if it errors — so the
  // user isn't stuck on the loading state).
  useEffect(() => {
    if (stage !== "placing") return;
    if (placementsRunning) return;
    if (analysis.placementsRequested) setStage("adjust");
  }, [stage, placementsRunning, analysis.placementsRequested]);

  // Show background image except during adjust/done — those are canonical.
  // Background visibility:
  //   - During drawing stages (walls..radiators): show image WITH a white
  //     overlay so the photo's colour doesn't drown out the annotations.
  //   - review / adjust: image hidden by default (canonical view of the
  //     drawing), but the user can toggle it back on.
  const [backgroundOverride, setBackgroundOverride] = useState<boolean | null>(null);
  const canonicalStage =
    stage === "review" || stage === "adjust" || stage === "placing";
  const showBackground = backgroundOverride ?? !canonicalStage;

  // ─── Drawing state (local; persisted on save) ───────────────────────────
  const [stroke, setStroke] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [dragRect, setDragRect] = useState<
    | { startX: number; startY: number; curX: number; curY: number }
    | null
  >(null);
  const [pinDrag, setPinDrag] = useState<
    | { id: string; kind: "hp" | "cyl"; offsetX: number; offsetY: number; curX: number; curY: number }
    | null
  >(null);
  const [pendingRadiator, setPendingRadiator] = useState<
    | { id: string; relX: number; relY: number }
    | null
  >(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear in-flight drawing state whenever stage changes.
  useEffect(() => {
    setStroke([]);
    setDragRect(null);
    setDrawing(false);
    setPendingRadiator(null);
  }, [stage]);

  function eventToViewport(
    e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>,
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

  // ─── Pointer handlers — behaviour depends on stage ──────────────────────

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;

    if (stage === "walls" || stage === "outdoor") {
      // Branch by input mode: in mouse mode, each pointerdown adds a
      // corner point to a click-and-click polyline (commit on
      // double-click / Enter). In finger mode, we capture the pointer
      // and trace continuously until release.
      if (inputMode === "mouse") {
        setStroke((s) => [...s, { x: pos.vx, y: pos.vy }]);
      } else {
        setStroke([{ x: pos.vx, y: pos.vy }]);
        setDrawing(true);
        // Capture pointer so drag stays inside the SVG even when fast.
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } else if (stage === "stairs") {
      setDragRect({ startX: pos.vx, startY: pos.vy, curX: pos.vx, curY: pos.vy });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (stage === "radiators") {
      // Radiators are pins in v4.1 — single click, popover for size +
      // condition. No drag.
      const next = addRadiator(analysis, pos.vx, pos.vy);
      const last = next.radiators[next.radiators.length - 1];
      onChange(next);
      if (last && containerRef.current && svgRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const svgCtm = svgRef.current.getScreenCTM();
        if (svgCtm) {
          const pt = svgRef.current.createSVGPoint();
          pt.x = last.x + last.vWidth;
          pt.y = last.y;
          const screen = pt.matrixTransform(svgCtm);
          setPendingRadiator({
            id: last.id,
            relX: screen.x - rect.left,
            relY: screen.y - rect.top,
          });
        }
      }
    } else if (stage === "adjust") {
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
        e.currentTarget.setPointerCapture(e.pointerId);
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
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;

    if (drawing && (stage === "walls" || stage === "outdoor")) {
      // Accumulate. Only add if moved > 2 units from last point (dedupe).
      const last = stroke[stroke.length - 1];
      if (!last || Math.hypot(pos.vx - last.x, pos.vy - last.y) > 2) {
        setStroke([...stroke, { x: pos.vx, y: pos.vy }]);
      }
    }
    if (dragRect) {
      setDragRect({ ...dragRect, curX: pos.vx, curY: pos.vy });
    }
    if (pinDrag) {
      setPinDrag({
        ...pinDrag,
        curX: Math.max(0, Math.min(VIEWPORT, pos.vx - pinDrag.offsetX)),
        curY: Math.max(0, Math.min(VIEWPORT, pos.vy - pinDrag.offsetY)),
      });
    }
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    // Release pointer capture.
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (drawing) {
      setDrawing(false);
      if (stroke.length < 2) {
        setStroke([]);
        return;
      }
      const simplified = snapToGrid(simplifyStroke(stroke, 6), 10);
      if (stage === "walls") {
        onChange(addWallPath(analysis, simplified));
      } else if (stage === "outdoor" && simplified.length >= 3) {
        onChange(addOutdoorZone(analysis, simplified, "Outdoor space"));
      }
      setStroke([]);
      return;
    }

    if (dragRect) {
      const x = Math.min(dragRect.startX, dragRect.curX);
      const y = Math.min(dragRect.startY, dragRect.curY);
      const w = Math.abs(dragRect.curX - dragRect.startX);
      const h = Math.abs(dragRect.curY - dragRect.startY);
      setDragRect(null);
      if (stage === "stairs" && w >= 30 && h >= 30) {
        onChange(addStairs(analysis, { x, y, vWidth: w, vHeight: h }));
      }
      return;
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

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const pos = eventToViewport(e);
    if (!pos) return;

    if (stage === "doors") {
      const snap = findNearestWall(analysis.walls, pos.vx, pos.vy, 60);
      if (snap) {
        onChange(addDoor(analysis, snap.x, snap.y, snap.wallPathId));
      } else {
        onChange(addDoor(analysis, pos.vx, pos.vy, null));
      }
    }
  }

  // Commit an in-progress mouse-mode polyline. Triggered by double-click
  // on the SVG canvas OR by Enter on the keyboard.
  const commitMousePolyline = useCallback(() => {
    if (inputMode !== "mouse") return;
    if (stroke.length < 2) return;
    const simplified = snapToGrid(stroke, 10);
    if (stage === "walls") {
      onChange(addWallPath(analysis, simplified));
    } else if (stage === "outdoor" && simplified.length >= 3) {
      onChange(addOutdoorZone(analysis, simplified, "Outdoor space"));
    }
    setStroke([]);
  }, [inputMode, stroke, stage, analysis, onChange]);

  function handleDoubleClick() {
    commitMousePolyline();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") commitMousePolyline();
      else if (e.key === "Escape") setStroke([]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commitMousePolyline]);

  // ─── Stage navigation ───────────────────────────────────────────────────

  // Static ordering — defined once so the useCallback deps stay stable.
  const stageOrder = STAGE_ORDER;
  const stageIdx = stageOrder.indexOf(stage);
  const totalInteractive = 6; // welcome..radiators

  const goBack = useCallback(() => {
    const prev = stageOrder[stageIdx - 1];
    if (prev && prev !== "placing") setStage(prev);
  }, [stageIdx, stageOrder]);

  const advance = useCallback(() => {
    // radiators → review (show canonical drawing before AI runs)
    if (stage === "radiators") {
      setStage("review");
      return;
    }
    // review → placing fires the AI call
    if (stage === "review") {
      setStage("placing");
      onRequestPlacements?.();
      return;
    }
    // adjust is the final stage — advancing means the user is done with
    // the floorplan step, so we call onComplete which the wizard wires
    // to next() (→ Step 5).
    if (stage === "adjust") {
      onComplete?.();
      return;
    }
    const nextStage = stageOrder[stageIdx + 1];
    if (nextStage) setStage(nextStage);
  }, [stage, stageIdx, onRequestPlacements, onComplete, stageOrder]);

  const undo = useCallback(() => {
    if (stage === "walls") onChange(undoLastWall(analysis));
    else if (stage === "outdoor") onChange(undoLastOutdoorZone(analysis));
    else if (stage === "doors") onChange(undoLastDoor(analysis));
    else if (stage === "stairs") onChange(undoLastStairs(analysis));
    else if (stage === "radiators") onChange(undoLastRadiator(analysis));
  }, [stage, analysis, onChange]);

  const undoCount = useMemo(() => {
    if (stage === "walls") return analysis.walls.length;
    if (stage === "outdoor") return analysis.outdoorZones.length;
    if (stage === "doors") return analysis.doors.length;
    if (stage === "stairs") return analysis.userStairs.length;
    if (stage === "radiators") return analysis.radiators.length;
    return 0;
  }, [stage, analysis]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const cfg = STAGE_CONFIG[stage]!;
  const showUndo =
    stage !== "welcome" &&
    stage !== "placing" &&
    stage !== "review" &&
    stage !== "adjust";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      {/* Progress dots */}
      {stage !== "welcome" && stage !== "placing" && (
        <div className="mb-4 flex items-center gap-1.5">
          {["walls", "outdoor", "doors", "stairs", "radiators", "review", "adjust"].map(
            (s) => {
              const idx = stageOrder.indexOf(s as Stage);
              const isActive = s === stage;
              const isDone = stageIdx > idx;
              return (
                <span
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    isActive ? "bg-coral" : isDone ? "bg-coral/50" : "bg-slate-200"
                  }`}
                  title={s}
                />
              );
            },
          )}
          <span className="ml-2 text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
            {Math.min(stageIdx, totalInteractive)} of {totalInteractive}
          </span>
        </div>
      )}

      {/* Conversational prompt */}
      <div className="mb-4 flex items-start gap-3">
        <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-coral-pale text-coral">
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-navy leading-snug">{cfg.title}</p>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">{cfg.body}</p>
          {/* Input-mode tip — only for the freehand stages */}
          {(stage === "walls" || stage === "outdoor") && (
            <p className="mt-2 text-[11px] text-slate-500">
              {inputMode === "mouse"
                ? "Click to add corner points; double-click or press Enter to finish a shape."
                : "Drag with your finger to trace; lift to finish a shape."}
            </p>
          )}
        </div>
        <StageExample stage={stage} />
      </div>

      {/* Input mode toggle — only useful in the drawing stages */}
      {(stage === "walls" || stage === "outdoor") && (
        <div className="mb-3 flex items-center justify-end gap-2 text-xs text-slate-500">
          <span>Drawing with</span>
          <div className="inline-flex rounded-lg border border-[var(--border)] bg-white p-0.5">
            <button
              type="button"
              onClick={() => {
                setInputMode("mouse");
                setStroke([]);
                setDrawing(false);
              }}
              className={`h-7 px-3 text-xs font-medium rounded ${
                inputMode === "mouse"
                  ? "bg-coral text-white"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              Mouse
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode("finger");
                setStroke([]);
                setDrawing(false);
              }}
              className={`h-7 px-3 text-xs font-medium rounded ${
                inputMode === "finger"
                  ? "bg-coral text-white"
                  : "text-slate-600 hover:text-navy"
              }`}
            >
              Finger
            </button>
          </div>
        </div>
      )}

      {/* Outdoor confirmation banner (optional, early in the flow) */}
      {outdoorAsk &&
        stage !== "welcome" &&
        analysis.outdoorSpace.userConfirmed == null &&
        analysis.outdoorZones.length === 0 &&
        stage === "outdoor" && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Satellite couldn&rsquo;t tell whether you have outdoor space. Answer below or
            just draw it on the floorplan above.
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(setUserOutdoor(analysis, "yes"));
                  onOutdoorConfirm?.("yes");
                }}
                className="h-8 px-3 rounded-lg bg-amber-600 text-white text-xs font-semibold"
              >
                I have outdoor space
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(setUserOutdoor(analysis, "no"));
                  onOutdoorConfirm?.("no");
                }}
                className="h-8 px-3 rounded-lg border border-amber-300 bg-white text-amber-900 text-xs font-semibold"
              >
                No outdoor space
              </button>
            </div>
          </div>
        )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden ${
          stage === "stairs" || stage === "radiators"
            ? "cursor-crosshair"
            : stage === "walls" || stage === "outdoor"
              ? "cursor-crosshair"
              : stage === "adjust"
                ? "cursor-grab"
                : "cursor-pointer"
        }`}
        style={{ touchAction: "none" }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Your floorplan"
            className={`block w-full h-auto select-none pointer-events-none transition-opacity ${
              showBackground ? "opacity-100" : "opacity-0"
            }`}
            draggable={false}
          />
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center text-sm text-slate-400">
            No floorplan image — upload one to start annotating.
          </div>
        )}

        {/* White wash over the photo so annotations pop. Opacity tuned so
            the floorplan is still visible as a guide but doesn't compete
            with the brightly-coloured sketches. */}
        {showBackground && imageUrl && (
          <div
            className="absolute inset-0 bg-white pointer-events-none"
            style={{ opacity: COLOURS.overlayOpacity }}
          />
        )}

        {/* Canonical backdrop (review / adjust stages when image is hidden) */}
        {!showBackground && imageUrl && (
          <div className="absolute inset-0 bg-amber-50/60" />
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWPORT} ${VIEWPORT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          <defs>
            <pattern
              id="fe4-stairs-hatch"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="10" stroke={COLOURS.stairsStroke} strokeWidth="2" />
            </pattern>
          </defs>

          {/* Geometry — switch to AI-refined version on canonical stages
              (review / placing / adjust). Falls back to user freehand if
              the AI didn't return refined geometry. */}
          {(() => {
            const useRefined = canonicalStage && analysis.refinedWalls.length > 0;
            const wallsToRender = useRefined ? analysis.refinedWalls : analysis.walls;
            const doorsToRender = useRefined ? analysis.refinedDoors : analysis.doors;
            const zonesToRender = useRefined ? analysis.refinedOutdoorZones : analysis.outdoorZones;
            const stairsToRender = useRefined ? analysis.refinedStairs : analysis.userStairs;
            // Door-gap mask: each door punches a hole in the wall stroke
            // so the wall visually breaks at the door, like a real
            // floorplan. The door arc is drawn ON TOP of the gap.
            const wallStrokeWidth = showBackground ? 8 : 12;
            const maskRadius = wallStrokeWidth + 6;
            return (
              <>
                <defs>
                  <mask id="fe4-door-mask">
                    <rect x={0} y={0} width={VIEWPORT} height={VIEWPORT} fill="white" />
                    {doorsToRender.map((d) => (
                      <circle key={d.id} cx={d.x} cy={d.y} r={maskRadius} fill="black" />
                    ))}
                  </mask>
                </defs>

                {/* Outdoor zones */}
                {zonesToRender.map((z) => (
                  <g key={z.id}>
                    <polygon
                      points={z.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill={COLOURS.zoneFill}
                      stroke={COLOURS.zoneStroke}
                      strokeWidth={2}
                      strokeDasharray="8 4"
                    />
                  </g>
                ))}

                {/* Walls — thicker in canonical view for a "real floorplan"
                    look. Wrapped in the door mask so doors break the line. */}
                <g mask="url(#fe4-door-mask)">
                  {wallsToRender.map((w) => (
                    <polyline
                      key={w.id}
                      points={w.points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={COLOURS.wall}
                      strokeWidth={wallStrokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>

                {/* Stairs */}
                {stairsToRender.map((s) => (
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
                      fill="url(#fe4-stairs-hatch)"
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
                {doorsToRender.map((d) => (
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
              </>
            );
          })()}

          {/* Radiators — rectangles */}
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
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.vWidth}
                  height={r.vHeight}
                  fill={colour}
                  stroke="white"
                  strokeWidth={1.5}
                  rx={3}
                />
                {/* Subtle internal hatching */}
                {[0.25, 0.5, 0.75].map((p, i) => (
                  <line
                    key={i}
                    x1={r.x + r.vWidth * p}
                    y1={r.y}
                    x2={r.x + r.vWidth * p}
                    y2={r.y + r.vHeight}
                    stroke="white"
                    strokeOpacity={0.5}
                    strokeWidth={1}
                  />
                ))}
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
                  Heat pump
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
                  Cylinder
                </text>
                <title>{cy.label} — {cy.notes}</title>
              </g>
            );
          })}

          {/* Current wall/outdoor stroke while drawing */}
          {stroke.length > 1 && (
            <polyline
              points={stroke.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={stage === "outdoor" ? COLOURS.zoneCurrent : COLOURS.wallCurrent}
              strokeWidth={stage === "outdoor" ? 4 : 6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.8}
            />
          )}

          {/* Rectangle drag preview */}
          {dragRect && (
            <rect
              x={Math.min(dragRect.startX, dragRect.curX)}
              y={Math.min(dragRect.startY, dragRect.curY)}
              width={Math.abs(dragRect.curX - dragRect.startX)}
              height={Math.abs(dragRect.curY - dragRect.startY)}
              fill={stage === "radiators" ? `${COLOURS.radiator}50` : `${COLOURS.stairsFill}80`}
              stroke={stage === "radiators" ? COLOURS.radiator : COLOURS.stairsStroke}
              strokeWidth={2}
              strokeDasharray="4 4"
              rx={3}
            />
          )}
        </svg>

        {/* Radiator size + condition popover */}
        {pendingRadiator &&
          (() => {
            const rad = analysis.radiators.find((r) => r.id === pendingRadiator.id);
            if (!rad) return null;
            return (
              <RadiatorPopover
                x={pendingRadiator.relX}
                y={pendingRadiator.relY}
                radiator={rad}
                onUpdate={(patch) => {
                  onChange(setRadiatorMeta(analysis, pendingRadiator.id, patch));
                }}
                onConfirm={() => setPendingRadiator(null)}
                onRemove={() => {
                  onChange(removeRadiator(analysis, pendingRadiator.id));
                  setPendingRadiator(null);
                }}
              />
            );
          })()}

        {/* Background toggle — bottom right, only when it's useful */}
        {(stage === "adjust" || stage === "review") && imageUrl && (
          <button
            type="button"
            onClick={() => setBackgroundOverride(!showBackground)}
            className="absolute bottom-3 right-3 h-8 px-3 rounded-lg bg-white/90 backdrop-blur border border-slate-200 text-xs font-medium text-navy hover:bg-white inline-flex items-center gap-1.5 shadow-sm"
          >
            {showBackground ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide uploaded floorplan
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Show uploaded floorplan
              </>
            )}
          </button>
        )}
      </div>

      {/* Placements error + concerns */}
      {placementsError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {placementsError}
        </div>
      )}

      {/* Clarification questions (adjust stage) */}
      {stage === "adjust" &&
        (analysis.clarificationQuestions ?? []).length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-navy mb-2">
              A couple of things worth confirming
            </p>
            <div className="space-y-3">
              {(analysis.clarificationQuestions ?? []).map((q) => (
                <div key={q.id}>
                  <p className="text-sm text-navy">{q.question}</p>
                  {q.context && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{q.context}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.options.map((opt) => {
                      const picked = q.answer === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            onChange(answerClarification(analysis, q.id, opt))
                          }
                          className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
                            picked
                              ? "bg-coral border-coral text-white"
                              : "bg-white border-[var(--border)] text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* AI concerns */}
      {stage === "adjust" && analysis.heatPumpInstallationConcerns.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          <p className="font-semibold mb-1">A note from the survey assistant</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {analysis.heatPumpInstallationConcerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {stageIdx > 0 && stage !== "welcome" && stage !== "placing" && (
          <button
            type="button"
            onClick={goBack}
            className="h-9 px-3 rounded-lg text-sm text-slate-500 hover:text-slate-900"
          >
            ← Back a step
          </button>
        )}

        {showUndo && (
          <button
            type="button"
            onClick={undo}
            disabled={undoCount === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
            {undoCount > 0 && (
              <span className="text-[11px] text-slate-500">({undoCount})</span>
            )}
          </button>
        )}

        <div className="flex-1" />

        {cfg.skippable && stage !== "welcome" && (
          <button
            type="button"
            onClick={advance}
            className="h-9 px-4 rounded-lg text-sm text-slate-500 hover:text-slate-900"
          >
            Skip this step
          </button>
        )}

        {stage !== "placing" && (
          <button
            type="button"
            onClick={advance}
            disabled={placementsRunning}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {stage === "welcome" && (
              <>
                Let&rsquo;s go <ArrowRight className="w-4 h-4" />
              </>
            )}
            {stage === "walls" && (
              <>
                Save walls <ArrowRight className="w-4 h-4" />
              </>
            )}
            {stage === "outdoor" && (
              <>
                Save outdoor space <ArrowRight className="w-4 h-4" />
              </>
            )}
            {stage === "doors" && (
              <>
                Save doors <ArrowRight className="w-4 h-4" />
              </>
            )}
            {stage === "stairs" && (
              <>
                Save stairs <ArrowRight className="w-4 h-4" />
              </>
            )}
            {stage === "radiators" && (
              <>
                Save radiators <ArrowRight className="w-4 h-4" />
              </>
            )}
            {stage === "review" && (
              <>
                <Sparkles className="w-4 h-4" /> Find heat pump &amp; cylinder
              </>
            )}
            {stage === "adjust" && (
              <>
                <Check className="w-4 h-4" /> Looks good — continue
              </>
            )}
          </button>
        )}

        {stage === "placing" && (
          <div className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-slate-200 text-slate-500 text-sm font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stage example visuals ───────────────────────────────────────────────────

function StageExample({ stage }: { stage: Stage }) {
  if (stage === "doors") {
    return (
      <div className="hidden sm:flex shrink-0 flex-col items-center gap-0.5">
        <svg viewBox="0 0 30 30" className="w-8 h-8">
          <circle cx="15" cy="15" r="10" fill="white" stroke="#f59e0b" strokeWidth="2" />
          <path d="M 8 15 A 7 7 0 0 1 22 15" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        </svg>
        <span className="text-[10px] text-slate-500">Door</span>
      </div>
    );
  }
  if (stage === "radiators") {
    return (
      <div className="hidden sm:flex shrink-0 flex-col items-center gap-0.5">
        <svg viewBox="0 0 40 14" className="w-12 h-4">
          <rect x="0" y="0" width="40" height="14" rx="2" fill="#ef6c4f" />
          {[10, 20, 30].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="14" stroke="white" strokeOpacity="0.5" />
          ))}
        </svg>
        <span className="text-[10px] text-slate-500">Radiator</span>
      </div>
    );
  }
  if (stage === "stairs") {
    return (
      <div className="hidden sm:flex shrink-0 flex-col items-center gap-0.5">
        <svg viewBox="0 0 30 30" className="w-8 h-8">
          <rect x="2" y="2" width="26" height="26" fill="#cbd5e1" stroke="#64748b" />
          {[8, 14, 20].map((y) => (
            <line key={y} x1="2" y1={y} x2="28" y2={y} stroke="#64748b" strokeWidth="1" />
          ))}
          <text x="15" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b">
            ↑
          </text>
        </svg>
        <span className="text-[10px] text-slate-500">Stairs</span>
      </div>
    );
  }
  if (stage === "walls") {
    return (
      <div className="hidden sm:flex shrink-0 flex-col items-center gap-0.5">
        <svg viewBox="0 0 30 16" className="w-10 h-5">
          <path d="M 2 8 L 28 8" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] text-slate-500">Wall</span>
      </div>
    );
  }
  if (stage === "outdoor") {
    return (
      <div className="hidden sm:flex shrink-0 flex-col items-center gap-0.5">
        <svg viewBox="0 0 30 20" className="w-10 h-6">
          <polygon
            points="2,18 8,4 22,4 28,18"
            fill="#86efac30"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
        </svg>
        <span className="text-[10px] text-slate-500">Outdoor</span>
      </div>
    );
  }
  return null;
}

// ─── Radiator popover (size + orientation + condition) ──────────────────────

function RadiatorPopover({
  x,
  y,
  radiator,
  onUpdate,
  onConfirm,
  onRemove,
}: {
  x: number;
  y: number;
  radiator: { size: RadiatorSize; orientation: RadiatorOrientation; condition: RadiatorCondition | null };
  onUpdate: (patch: {
    size?: RadiatorSize;
    orientation?: RadiatorOrientation;
    condition?: RadiatorCondition;
  }) => void;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  const sizeOpts: Array<{ v: RadiatorSize; label: string }> = [
    { v: "small", label: "Small" },
    { v: "medium", label: "Medium" },
    { v: "large", label: "Large" },
  ];
  const orientOpts: Array<{ v: RadiatorOrientation; label: string }> = [
    { v: "standard", label: "Standard" },
    { v: "tall", label: "Tall" },
  ];
  const condOpts: Array<{ v: RadiatorCondition; label: string }> = [
    { v: "good", label: "Good" },
    { v: "fair", label: "Fair" },
    { v: "poor", label: "Poor" },
    { v: "unsure", label: "Not sure" },
  ];
  return (
    <div
      className="absolute z-10 rounded-xl border-2 border-coral bg-white shadow-xl p-3 w-[240px]"
      style={{
        left: Math.max(8, Math.min(x + 8, 99999)),
        top: Math.max(8, y),
      }}
    >
      <PopRow label="Size">
        {sizeOpts.map((o) => (
          <PopPill
            key={o.v}
            on={radiator.size === o.v}
            onClick={() => onUpdate({ size: o.v })}
          >
            {o.label}
          </PopPill>
        ))}
      </PopRow>
      <PopRow label="Orientation">
        {orientOpts.map((o) => (
          <PopPill
            key={o.v}
            on={radiator.orientation === o.v}
            onClick={() => onUpdate({ orientation: o.v })}
          >
            {o.label}
          </PopPill>
        ))}
      </PopRow>
      <PopRow label="Condition">
        {condOpts.map((o) => (
          <PopPill
            key={o.v}
            on={radiator.condition === o.v}
            onClick={() => onUpdate({ condition: o.v })}
          >
            {o.label}
          </PopPill>
        ))}
      </PopRow>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 h-8 rounded-lg bg-coral text-white text-xs font-semibold hover:bg-coral-dark"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="h-8 px-2 text-[11px] text-slate-500 hover:text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function PopRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function PopPill({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2 rounded-md text-[11px] font-medium border transition-colors ${
        on
          ? "bg-coral border-coral text-white"
          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// Export Flame icon so the step-4 wrapper can match the editor's visual language.
export { Flame };
