"use client";

// Bigger versions of the SVG charts used on the report's Savings tab.
//
// The originals in savings-charts.tsx are sized for embedding in narrower
// panels. The Savings tab now occupies the full-width content column,
// so we render at 960×360 — twice the visual real-estate, easier on the
// eye, and no chart library bloat.

import type { AnnualBillRow, CurvePoint } from "@/lib/savings/derive";

const COLOURS = {
  baseline: "#94a3b8",
  selected: "#ef6c4f",
  positive: "#10b981",
  negative: "#ef4444",
  axis: "#cbd5e1",
  grid: "#e2e8f0",
  text: "#475569",
} as const;

const PAD = { top: 32, right: 24, bottom: 44, left: 72 };

function fmtGbp(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Annual bill chart (big) ────────────────────────────────────────────────

export function BigAnnualBillChart({ data }: { data: AnnualBillRow[] }) {
  const W = 960;
  const H = 360;
  if (!data.length) return null;

  const max =
    Math.max(...data.map((d) => Math.max(d.baseline, d.selected))) * 1.1;
  const yScale = (v: number) =>
    H - PAD.bottom - (v / max) * (H - PAD.top - PAD.bottom);
  const groupWidth = (W - PAD.left - PAD.right) / data.length;
  const barWidth = Math.min(groupWidth / 2.5, 32);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => p * max);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      <title>Annual energy bill: do nothing vs. selected upgrades</title>

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
            x={PAD.left - 12}
            y={yScale(t) + 4}
            textAnchor="end"
            fontSize="13"
            fill={COLOURS.text}
          >
            {fmtGbp(t)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const cx = PAD.left + groupWidth * i + groupWidth / 2;
        const baselineX = cx - barWidth - 2;
        const selectedX = cx + 2;
        return (
          <g key={d.year}>
            <rect
              x={baselineX}
              y={yScale(d.baseline)}
              width={barWidth}
              height={H - PAD.bottom - yScale(d.baseline)}
              fill={COLOURS.baseline}
              rx={3}
            >
              <title>{`${d.year}: Do nothing — ${fmtGbp(d.baseline)}`}</title>
            </rect>
            <rect
              x={selectedX}
              y={yScale(d.selected)}
              width={barWidth}
              height={H - PAD.bottom - yScale(d.selected)}
              fill={COLOURS.selected}
              rx={3}
            >
              <title>{`${d.year}: With upgrade — ${fmtGbp(d.selected)}`}</title>
            </rect>
            <text
              x={cx}
              y={H - PAD.bottom + 20}
              textAnchor="middle"
              fontSize="13"
              fill={COLOURS.text}
            >
              {String(d.year).slice(-2)}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${PAD.left}, ${PAD.top - 18})`}>
        <rect width={14} height={14} fill={COLOURS.baseline} rx={3} />
        <text x={20} y={12} fontSize="13" fill={COLOURS.text}>
          Doing nothing
        </text>
        <rect x={140} width={14} height={14} fill={COLOURS.selected} rx={3} />
        <text x={160} y={12} fontSize="13" fill={COLOURS.text}>
          With your upgrades
        </text>
      </g>
    </svg>
  );
}

// ─── Cumulative savings curve (big) ─────────────────────────────────────────

export function BigSavingsCurveChart({ data }: { data: CurvePoint[] }) {
  const W = 960;
  const H = 360;
  if (!data.length) return null;

  const minY = Math.min(0, ...data.map((d) => d.cumulative));
  const maxY = Math.max(0, ...data.map((d) => d.cumulative));
  const padY = (maxY - minY) * 0.08 || 100;
  const lo = minY - padY;
  const hi = maxY + padY;

  const xScale = (idx: number) =>
    PAD.left +
    ((idx - 1) / Math.max(data.length - 1, 1)) * (W - PAD.left - PAD.right);
  const yScale = (v: number) =>
    PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const linePath = data
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${xScale(d.monthIdx)} ${yScale(d.cumulative)}`,
    )
    .join(" ");
  const zeroY = yScale(0);
  const areaPath = `M ${xScale(data[0]!.monthIdx)} ${zeroY} ${data
    .map((d) => `L ${xScale(d.monthIdx)} ${yScale(d.cumulative)}`)
    .join(
      " ",
    )} L ${xScale(data[data.length - 1]!.monthIdx)} ${zeroY} Z`;

  const yearTicks: { x: number; label: string }[] = [];
  let lastYear = "";
  data.forEach((d) => {
    if (d.yearLabel !== lastYear) {
      yearTicks.push({ x: xScale(d.monthIdx), label: d.yearLabel });
      lastYear = d.yearLabel;
    }
  });

  const yTicks = Array.from({ length: 5 }, (_, i) => lo + (i / 4) * (hi - lo));
  const paybackIdx = data.findIndex((d) => d.cumulative >= 0);
  const paybackPoint = paybackIdx > 0 ? data[paybackIdx] : null;
  const finalPoint = data[data.length - 1]!;
  const finalIsPositive = finalPoint.cumulative >= 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      <title>Cumulative savings over time</title>

      <defs>
        <linearGradient id="big-savings-area" x1="0" x2="0" y1="0" y2="1">
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
            x={PAD.left - 12}
            y={yScale(t) + 4}
            textAnchor="end"
            fontSize="13"
            fill={COLOURS.text}
          >
            {fmtGbp(t)}
          </text>
        </g>
      ))}

      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={zeroY}
        y2={zeroY}
        stroke={COLOURS.axis}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      <path d={areaPath} fill="url(#big-savings-area)" />
      <path
        d={linePath}
        fill="none"
        stroke={finalIsPositive ? COLOURS.positive : COLOURS.negative}
        strokeWidth={3}
      />

      {paybackPoint && (
        <g>
          <circle
            cx={xScale(paybackPoint.monthIdx)}
            cy={yScale(0)}
            r={6}
            fill={COLOURS.positive}
            stroke="white"
            strokeWidth={2.5}
          />
          <text
            x={xScale(paybackPoint.monthIdx) + 12}
            y={yScale(0) - 12}
            fontSize="13"
            fill={COLOURS.positive}
            fontWeight="600"
          >
            Pays for itself
          </text>
        </g>
      )}

      {yearTicks.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={H - PAD.bottom + 20}
          textAnchor="middle"
          fontSize="13"
          fill={COLOURS.text}
        >
          {t.label}
        </text>
      ))}

      <text
        x={W - PAD.right}
        y={yScale(finalPoint.cumulative) - 10}
        textAnchor="end"
        fontSize="14"
        fontWeight="700"
        fill={finalIsPositive ? COLOURS.positive : COLOURS.negative}
      >
        {fmtGbp(finalPoint.cumulative)}
      </text>
    </svg>
  );
}
