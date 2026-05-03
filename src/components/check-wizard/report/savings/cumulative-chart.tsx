"use client";

// Inline SVG line chart of cumulative cost across the 4 scenarios.
// Built inline instead of pulling a chart library so we don't add a
// ~50KB dep for one chart with 4 lines × 10 points. The data table
// rendered below this in the parent component serves as the
// accessible text alternative (this chart is `aria-hidden`).

interface SeriesDef {
  key: string;
  label: string;
  values: number[];
  /** Tailwind text-/stroke- compatible hex. */
  color: string;
}

interface Props {
  /** 1-indexed year labels: [1, 2, ..., 10]. */
  years: number[];
  series: SeriesDef[];
  /** Show as £X,XXX on the y-axis ticks. */
  yAxisLabel?: string;
}

const PAD_TOP = 16;
const PAD_RIGHT = 16;
const PAD_BOTTOM = 32;
const PAD_LEFT = 56;
const VIEW_W = 720;
const VIEW_H = 320;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

export function CumulativeCostChart({ years, series, yAxisLabel }: Props) {
  const allValues = series.flatMap((s) => s.values);
  const yMaxRaw = Math.max(0, ...allValues);
  // Round the top up to a nice number so the y-axis ticks read
  // cleanly (£10K, £20K, £30K rather than £19,847).
  const yMax = niceMax(yMaxRaw);
  const xCount = years.length;

  // Pixel transformers
  const xPx = (i: number) =>
    PAD_LEFT + (xCount === 1 ? 0 : (i / (xCount - 1)) * PLOT_W);
  const yPx = (v: number) =>
    PAD_TOP + PLOT_H - (yMax === 0 ? 0 : (v / yMax) * PLOT_H);

  // Generate 4 horizontal grid-lines + y-axis labels.
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((yMax * i) / yTickCount),
  );

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Cumulative cost chart — see comparison table below for full data"
        className="w-full h-auto"
      >
        {/* Y-axis grid + tick labels */}
        {yTicks.map((tick, i) => {
          const y = yPx(tick);
          return (
            <g key={`yt-${i}`}>
              <line
                x1={PAD_LEFT}
                x2={VIEW_W - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="#64748b"
                className="tabular-nums"
              >
                {fmtAxis(tick)}
              </text>
            </g>
          );
        })}

        {/* X-axis tick labels (year numbers) */}
        {years.map((yr, i) => (
          <text
            key={`xl-${i}`}
            x={xPx(i)}
            y={VIEW_H - PAD_BOTTOM + 16}
            textAnchor="middle"
            fontSize={11}
            fill="#64748b"
          >
            Yr {yr}
          </text>
        ))}

        {/* Series lines + endpoint dots */}
        {series.map((s) => {
          const path = s.values
            .map((v, i) => `${i === 0 ? "M" : "L"} ${xPx(i)} ${yPx(v)}`)
            .join(" ");
          return (
            <g key={s.key}>
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.values.map((v, i) => (
                <circle
                  key={`${s.key}-pt-${i}`}
                  cx={xPx(i)}
                  cy={yPx(v)}
                  r={i === s.values.length - 1 ? 4 : 2.5}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Y-axis caption */}
      {yAxisLabel && (
        <p className="text-[11px] text-slate-500 -mt-1 ml-14">{yAxisLabel}</p>
      )}

      {/* Legend */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {series.map((s) => (
          <li key={`legend-${s.key}`} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-1 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-slate-700 font-medium">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Round a max value up to a "nice" tick boundary — picks 1, 2, 5, 10
// times the appropriate power of ten so axis labels read cleanly.
function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const ratio = raw / base;
  let nice: number;
  if (ratio <= 1) nice = 1;
  else if (ratio <= 2) nice = 2;
  else if (ratio <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

function fmtAxis(n: number): string {
  if (n >= 1000) return `£${Math.round(n / 1000)}k`;
  return `£${n}`;
}
