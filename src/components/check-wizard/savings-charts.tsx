"use client";

// SVG charts for the savings calculator — hand-rolled to avoid pulling in a
// chart library (recharts ~150kB gzipped) for two simple shapes.
//
// AnnualBillChart: grouped bars per year (baseline vs selected).
// SavingsCurveChart: line of cumulative savings over time, with the X-axis
// crossing rendered prominently to highlight payback.

import type { AnnualBillRow, CurvePoint } from "@/lib/savings/derive";

const COLOURS = {
  baseline: "#94a3b8", // slate-400
  selected: "#ef6c4f", // coral
  positive: "#10b981", // emerald-500
  negative: "#ef4444", // red-500
  axis: "#cbd5e1",     // slate-300
  grid: "#f1f5f9",     // slate-100
  text: "#64748b",     // slate-500
} as const;

const PAD = { top: 24, right: 16, bottom: 32, left: 56 };

function formatGbp(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Annual bill chart ───────────────────────────────────────────────────────

export function AnnualBillChart({ data }: { data: AnnualBillRow[] }) {
  const W = 640;
  const H = 240;
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => Math.max(d.baseline, d.selected))) * 1.1;
  const yScale = (v: number) =>
    H - PAD.bottom - (v / max) * (H - PAD.top - PAD.bottom);
  const groupWidth = (W - PAD.left - PAD.right) / data.length;
  const barWidth = Math.min(groupWidth / 3, 18);

  // Y-axis ticks: 0, 25%, 50%, 75%, 100% of max
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => p * max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <title>Annual energy bill: do nothing vs. selected upgrades</title>

      {/* Grid + Y axis labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke={COLOURS.grid}
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={yScale(t) + 4}
            textAnchor="end"
            fontSize="10"
            fill={COLOURS.text}
          >
            {formatGbp(t)}
          </text>
        </g>
      ))}

      {/* Bars + year labels */}
      {data.map((d, i) => {
        const cx = PAD.left + groupWidth * i + groupWidth / 2;
        const baselineX = cx - barWidth - 1;
        const selectedX = cx + 1;
        return (
          <g key={d.year}>
            <rect
              x={baselineX}
              y={yScale(d.baseline)}
              width={barWidth}
              height={H - PAD.bottom - yScale(d.baseline)}
              fill={COLOURS.baseline}
              rx={2}
            >
              <title>{`${d.year}: Do nothing — ${formatGbp(d.baseline)}`}</title>
            </rect>
            <rect
              x={selectedX}
              y={yScale(d.selected)}
              width={barWidth}
              height={H - PAD.bottom - yScale(d.selected)}
              fill={COLOURS.selected}
              rx={2}
            >
              <title>{`${d.year}: With upgrade — ${formatGbp(d.selected)}`}</title>
            </rect>
            <text
              x={cx}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize="10"
              fill={COLOURS.text}
            >
              {String(d.year).slice(-2)}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${PAD.top - 12})`}>
        <rect width={10} height={10} fill={COLOURS.baseline} rx={2} />
        <text x={14} y={9} fontSize="10" fill={COLOURS.text}>
          Do nothing
        </text>
        <rect x={84} width={10} height={10} fill={COLOURS.selected} rx={2} />
        <text x={98} y={9} fontSize="10" fill={COLOURS.text}>
          With upgrade
        </text>
      </g>
    </svg>
  );
}

// ─── Savings curve ───────────────────────────────────────────────────────────

export function SavingsCurveChart({ data }: { data: CurvePoint[] }) {
  const W = 640;
  const H = 240;
  if (!data.length) return null;

  const minY = Math.min(0, ...data.map((d) => d.cumulative));
  const maxY = Math.max(0, ...data.map((d) => d.cumulative));
  const padY = (maxY - minY) * 0.08 || 50;
  const lo = minY - padY;
  const hi = maxY + padY;

  const xScale = (idx: number) =>
    PAD.left + ((idx - 1) / Math.max(data.length - 1, 1)) * (W - PAD.left - PAD.right);
  const yScale = (v: number) =>
    PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  // Build the line path — split at zero crossings would be ideal but
  // overkill; gradient fill below the curve handles the visual.
  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.monthIdx)} ${yScale(d.cumulative)}`)
    .join(" ");

  // Area under (or above) the curve, anchored at y=0.
  const zeroY = yScale(0);
  const areaPath = `M ${xScale(data[0]!.monthIdx)} ${zeroY} ${data
    .map((d) => `L ${xScale(d.monthIdx)} ${yScale(d.cumulative)}`)
    .join(" ")} L ${xScale(data[data.length - 1]!.monthIdx)} ${zeroY} Z`;

  // Year tick positions — find the first row of each year.
  const yearTicks: { x: number; label: string }[] = [];
  let lastYear = "";
  data.forEach((d) => {
    if (d.yearLabel !== lastYear) {
      yearTicks.push({ x: xScale(d.monthIdx), label: d.yearLabel });
      lastYear = d.yearLabel;
    }
  });

  // Y ticks — 5 evenly spaced
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + (i / 4) * (hi - lo));

  // Find the payback crossing month for the marker
  const paybackIdx = data.findIndex((d) => d.cumulative >= 0);
  const paybackPoint = paybackIdx > 0 ? data[paybackIdx] : null;

  const finalPoint = data[data.length - 1]!;
  const finalIsPositive = finalPoint.cumulative >= 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <title>Cumulative savings over time</title>

      <defs>
        <linearGradient id="savings-area" x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0%"
            stopColor={finalIsPositive ? COLOURS.positive : COLOURS.negative}
            stopOpacity="0.18"
          />
          <stop
            offset="100%"
            stopColor={finalIsPositive ? COLOURS.positive : COLOURS.negative}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke={COLOURS.grid}
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={yScale(t) + 4}
            textAnchor="end"
            fontSize="10"
            fill={COLOURS.text}
          >
            {formatGbp(t)}
          </text>
        </g>
      ))}

      {/* Zero line — emphasised */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={zeroY}
        y2={zeroY}
        stroke={COLOURS.axis}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* Area + line */}
      <path d={areaPath} fill="url(#savings-area)" />
      <path
        d={linePath}
        fill="none"
        stroke={finalIsPositive ? COLOURS.positive : COLOURS.negative}
        strokeWidth={2}
      />

      {/* Payback marker */}
      {paybackPoint && (
        <g>
          <circle
            cx={xScale(paybackPoint.monthIdx)}
            cy={yScale(0)}
            r={4}
            fill={COLOURS.positive}
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={xScale(paybackPoint.monthIdx) + 8}
            y={yScale(0) - 8}
            fontSize="10"
            fill={COLOURS.positive}
            fontWeight="600"
          >
            Payback
          </text>
        </g>
      )}

      {/* X-axis year ticks */}
      {yearTicks.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={H - PAD.bottom + 14}
          textAnchor="middle"
          fontSize="10"
          fill={COLOURS.text}
        >
          {t.label}
        </text>
      ))}

      {/* Final-value callout */}
      <text
        x={W - PAD.right}
        y={yScale(finalPoint.cumulative) - 6}
        textAnchor="end"
        fontSize="11"
        fontWeight="600"
        fill={finalIsPositive ? COLOURS.positive : COLOURS.negative}
      >
        {formatGbp(finalPoint.cumulative)}
      </text>
    </svg>
  );
}
