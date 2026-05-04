"use client";

// FloorplanReadOnly — a static SVG render of the user's floorplan with
// the AI-placed HP / cylinder pins overlaid. Used on the Heat Pump tab
// of the report. Re-uses the colour palette and viewport conventions of
// the FloorplanEditor, but strips out all interactivity (no draw, no
// drag, no popovers).

import Image from "next/image";
import { Flame, Wand2, Box } from "lucide-react";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";

const VIEWPORT = 1000;

const COLOURS = {
  wall: "#ef6c4f",
  door: "#f59e0b",
  zoneStroke: "#16a34a",
  zoneFill: "#86efac55",
  stairsFill: "#cbd5e1",
  stairsStroke: "#334155",
  hpStroke: "#0f766e",
  hpFill: "#14b8a625",
  cylStroke: "#7c3aed",
  cylFill: "#8b5cf625",
  radiator: "#ef6c4f",
} as const;

interface Props {
  analysis: FloorplanAnalysis;
  imageUrl: string | null;
  // When true, fades the underlying photo out and shows the canonical
  // drawing only. When false, the photo is fully visible underneath
  // the annotations (useful for AI-detected layouts where the user
  // hasn't drawn anything themselves and the photo is the source of
  // truth). If unset, picks based on whether the analysis was
  // AI-autorunned: drawn → canonical, AI'd → photo-visible.
  canonical?: boolean;
}

export function FloorplanReadOnly({ analysis, imageUrl, canonical }: Props) {
  // Default behaviour: hide the photo whenever the user (or Claude's
  // refinement step) has produced any drawn geometry — the drawing
  // becomes the canonical view and the photo just clutters it. Show
  // the photo only when there's nothing to overlay (rare edge case
  // where AI placed pins but we have no walls/doors/stairs at all).
  //
  // The previous heuristic was `!analysis.aiAutorun` — that broke when
  // a layout was AI-autorunned AND then the user drew on top: photo
  // stayed visible underneath the now-canonical drawing and the two
  // got out of sync.
  const hasDrawing =
    analysis.walls.length > 0 ||
    analysis.refinedWalls.length > 0 ||
    analysis.doors.length > 0 ||
    analysis.refinedDoors.length > 0 ||
    analysis.userStairs.length > 0 ||
    analysis.refinedStairs.length > 0 ||
    analysis.radiators.length > 0;
  const hidePhoto = canonical ?? hasDrawing;
  // Prefer refined geometry if Claude has cleaned things up — otherwise
  // fall back to the raw user-drawn shapes.
  const walls =
    analysis.refinedWalls.length > 0 ? analysis.refinedWalls : analysis.walls;
  const doors =
    analysis.refinedDoors.length > 0 ? analysis.refinedDoors : analysis.doors;
  const outdoorZones =
    analysis.refinedOutdoorZones.length > 0
      ? analysis.refinedOutdoorZones
      : analysis.outdoorZones;
  const stairs =
    analysis.refinedStairs.length > 0
      ? analysis.refinedStairs
      : analysis.userStairs;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-cream"
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* Show the photo only when there's no canonical drawing to
          replace it with. The previous version always rendered the
          photo and laid an 80%-opaque cream overlay on top — which
          left the photo visibly bleeding through (20% opacity)
          underneath the drawing. When the drawing doesn't perfectly
          align with the photo (common with AI-refined geometry),
          that bleed-through reads as the drawing being "out of sync"
          with the photo — the very bug we're trying to avoid. */}
      {imageUrl && !hidePhoto && (
        <Image
          src={imageUrl}
          alt="Your floorplan"
          fill
          className="object-contain"
          unoptimized
        />
      )}

      <svg
        viewBox={`0 0 ${VIEWPORT} ${VIEWPORT}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Outdoor zones */}
        {outdoorZones.map((z) => (
          <polygon
            key={z.id}
            points={z.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={COLOURS.zoneFill}
            stroke={COLOURS.zoneStroke}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        ))}

        {/* Walls */}
        {walls.map((w) => (
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
        {stairs.map((s) => (
          <rect
            key={s.id}
            x={s.x}
            y={s.y}
            width={s.vWidth}
            height={s.vHeight}
            fill={COLOURS.stairsFill}
            stroke={COLOURS.stairsStroke}
            strokeWidth={2}
            rx={2}
          />
        ))}

        {/* Doors */}
        {doors.map((d) => (
          <circle
            key={d.id}
            cx={d.x}
            cy={d.y}
            r={8}
            fill="white"
            stroke={COLOURS.door}
            strokeWidth={3}
          />
        ))}

        {/* Radiators */}
        {analysis.radiators.map((r) => (
          <rect
            key={r.id}
            x={r.x - r.vWidth / 2}
            y={r.y - r.vHeight / 2}
            width={r.vWidth}
            height={r.vHeight}
            fill={COLOURS.radiator}
            opacity={0.85}
            rx={2}
          />
        ))}

        {/* Heat pump candidates */}
        {analysis.heatPumpLocations.map((hp, i) => (
          <g key={hp.id}>
            <rect
              x={hp.x - hp.vWidth / 2}
              y={hp.y - hp.vHeight / 2}
              width={hp.vWidth}
              height={hp.vHeight}
              fill={COLOURS.hpFill}
              stroke={COLOURS.hpStroke}
              strokeWidth={3}
              rx={4}
            />
            <text
              x={hp.x}
              y={hp.y + 4}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill={COLOURS.hpStroke}
            >
              HP {i + 1}
            </text>
          </g>
        ))}

        {/* Cylinder candidates */}
        {analysis.hotWaterCylinderCandidates.map((c) => (
          <g key={c.id}>
            <rect
              x={c.x - c.vWidth / 2}
              y={c.y - c.vHeight / 2}
              width={c.vWidth}
              height={c.vHeight}
              fill={COLOURS.cylFill}
              stroke={COLOURS.cylStroke}
              strokeWidth={3}
              rx={4}
            />
            <text
              x={c.x}
              y={c.y + 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={COLOURS.cylStroke}
            >
              Cyl
            </text>
          </g>
        ))}
      </svg>

      {/* Legend — only show items actually present in the rendered
          floorplan so the key isn't misleading. */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 text-[11px]">
        {analysis.heatPumpLocations.length > 0 && (
          <LegendItem
            icon={<Flame className="w-3 h-3" />}
            label="Heat pump"
            colour={COLOURS.hpStroke}
          />
        )}
        {analysis.hotWaterCylinderCandidates.length > 0 && (
          <LegendItem
            icon={<Box className="w-3 h-3" />}
            label="Cylinder"
            colour={COLOURS.cylStroke}
          />
        )}
        {doors.length > 0 && (
          <LegendSwatch
            label="Door"
            swatch={
              <span
                className="inline-block w-3 h-3 rounded-full bg-white border-2"
                style={{ borderColor: COLOURS.door }}
              />
            }
          />
        )}
        {analysis.radiators.length > 0 && (
          <LegendSwatch
            label="Radiator"
            swatch={
              <span
                className="inline-block w-4 h-2 rounded-sm"
                style={{ backgroundColor: COLOURS.radiator }}
              />
            }
          />
        )}
        {stairs.length > 0 && (
          <LegendSwatch
            label="Stairs"
            swatch={
              <span
                className="inline-block w-4 h-3 rounded-sm border"
                style={{
                  backgroundColor: COLOURS.stairsFill,
                  borderColor: COLOURS.stairsStroke,
                }}
              />
            }
          />
        )}
        {analysis.aiAutorun && (
          <span className="ml-auto inline-flex items-center gap-1 text-coral-dark font-medium">
            <Wand2 className="w-3 h-3" />
            AI-detected
          </span>
        )}
      </div>
    </div>
  );
}

function LegendItem({
  icon,
  label,
  colour,
}: {
  icon: React.ReactNode;
  label: string;
  colour: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded"
        style={{ background: `${colour}25`, color: colour }}
      >
        {icon}
      </span>
      {label}
    </span>
  );
}

function LegendSwatch({
  label,
  swatch,
}: {
  label: string;
  swatch: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <span className="inline-flex items-center justify-center w-4 h-4">
        {swatch}
      </span>
      {label}
    </span>
  );
}
