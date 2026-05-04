// Server-rendered SVG bar chart.
//
// Why hand-rolled rather than recharts/tremor: this is the only place
// charts appear, the shapes are simple, and it lets us keep the
// bundle small on a page that loads twice a week. Pure SVG also
// renders fine in print + email captures.
//
// Three knobs:
//   - data: array of { label, value, secondaryLabel? }
//   - height: px (default 160)
//   - format: how to format the y-axis tick labels + bar tooltips
//
// For accessibility: the chart has role="img" with an aria-label that
// summarises the highest bar, and each bar has a <title> child so
// hover gives the value.

interface ChartDatum {
  label: string;
  value: number;
  /** Optional secondary value for the tooltip (e.g. "£123.45"). */
  secondaryLabel?: string;
}

interface BarChartProps {
  data: ChartDatum[];
  height?: number;
  /** "Reports completed", "Revenue", etc. Used in the aria-label. */
  ariaTitle: string;
  /**
   * Format value for tick + tooltip display. Default: integer with
   * thousands separators. Pass a money formatter for revenue charts.
   */
  formatValue?: (n: number) => string;
  /** Empty-state message if data is empty or all zero. */
  emptyMessage?: string;
}

const DEFAULT_FORMAT = (n: number): string =>
  new Intl.NumberFormat("en-GB").format(n);

export function BarChart({
  data,
  height = 160,
  ariaTitle,
  formatValue = DEFAULT_FORMAT,
  emptyMessage = "No data in this range",
}: BarChartProps) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const allZero = max === 0;

  if (data.length === 0 || allZero) {
    return (
      <div
        className="rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xs text-slate-400"
        style={{ height }}
        role="img"
        aria-label={`${ariaTitle}: ${emptyMessage}`}
      >
        {emptyMessage}
      </div>
    );
  }

  // Layout — chart pad + bar geometry. Padding leaves room for the
  // y-axis tick label on the left and the x-axis tick label on the
  // bottom. We don't draw axis lines because they add noise; the
  // bars carry the data.
  const PAD_LEFT = 36;
  const PAD_RIGHT = 8;
  const PAD_TOP = 8;
  const PAD_BOTTOM = 24;
  const VIEW_W = 600; // logical units; svg scales to container
  const innerW = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;
  const gap = 2;
  const barW = Math.max(2, (innerW - gap * (data.length - 1)) / data.length);

  // Show 3 evenly-spaced tick labels: 0, max/2, max.
  const ticks = [0, Math.round(max / 2), max];

  // Decide which x-tick labels to render so we don't crowd. Aim for
  // ~6 labels regardless of bucket count.
  const labelStride = Math.max(1, Math.ceil(data.length / 6));

  // Find peak bucket for the aria-label.
  const peak = data.reduce(
    (acc, d) => (d.value > acc.value ? d : acc),
    data[0],
  );
  const summary = `${ariaTitle}, peak ${formatValue(peak.value)} on ${peak.label}`;

  return (
    <svg
      role="img"
      aria-label={summary}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      {/* Y-axis tick labels + horizontal grid lines */}
      {ticks.map((t, i) => {
        const y = PAD_TOP + innerH - (t / max) * innerH;
        return (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={VIEW_W - PAD_RIGHT}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text
              x={PAD_LEFT - 4}
              y={y + 3}
              fontSize={9}
              fill="#94A3B8"
              textAnchor="end"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {formatValue(t)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / max) * innerH;
        const x = PAD_LEFT + i * (barW + gap);
        const y = PAD_TOP + innerH - barH;
        const tooltip = d.secondaryLabel
          ? `${d.label}: ${d.secondaryLabel}`
          : `${d.label}: ${formatValue(d.value)}`;
        return (
          <g key={`${d.label}-${i}`}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, barH)}
              rx={1}
              fill="#2C5E4A"
            >
              <title>{tooltip}</title>
            </rect>
            {/* X-axis labels — only every Nth label to avoid crowding. */}
            {i % labelStride === 0 && (
              <text
                x={x + barW / 2}
                y={height - 6}
                fontSize={9}
                fill="#64748B"
                textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
