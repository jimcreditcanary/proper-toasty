"use client";

// Solar tab — visual + sizing controls.
//
// Hero: satellite image with the optimal solar panel layout drawn over
// the top. We TILE panels per roof segment (using the segment's
// bounding box + azimuth) rather than projecting Google's per-panel
// lat/lng coords — Google's per-panel data clusters multiple panels at
// near-identical positions so projecting them produces overlapping
// stacks of rectangles. Tiling within the segment bounds gives us a
// proper grid that matches what an installer would actually fit.
//
// Below the hero:
//   - Roof segments table (direction / pitch / area / sunshine)
//   - Battery sizing (3 / 5 / 10 kWh tiles)
//
// Sizing state (panelCount + batteryKwh) lives at the shell level so
// changes here propagate to the Savings tab and the persistent
// recommendation strip. Estimated install £ in the hero comes from the
// pure-front-end calc module (no API call).
//
// The "Your bill, in plain English" breakdown card was removed when
// the savings calculator API was retired (Apr 2026) — it'll come back
// once the new front-end calc engine ships.

import Image from "next/image";
import { useMemo } from "react";
import { Battery, Compass, Sun, Zap } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import { computeCost } from "@/lib/savings/calc";
import type { ReportSelection } from "../report-shell";
import {
  describeAzimuth,
  fmtGbp,
  SectionCard,
  VerdictBadge,
  type VerdictTone,
} from "../shared";

interface Props {
  analysis: AnalyseResponse;
  satelliteUrl: string;
  selection: ReportSelection;
  setSelection: (s: ReportSelection) => void;
  electricityTariff?: FuelTariff | null;
  gasTariff?: FuelTariff | null;
}

const STATIC_MAP_W = 640;
const STATIC_MAP_H = 360;
const STATIC_MAP_ZOOM = 20;

export function SolarTab({
  analysis,
  satelliteUrl,
  selection,
  setSelection,
  electricityTariff,
  gasTariff,
}: Props) {
  const solar = analysis.eligibility.solar;
  const finance = analysis.finance.solar;
  const tone: VerdictTone =
    solar.rating === "Excellent" || solar.rating === "Good"
      ? "green"
      : solar.rating === "Marginal"
        ? "amber"
        : "red";

  const recommendedPanels = solar.recommendedPanels ?? null;
  const panelCount = selection.panelCount;
  const batteryKwh = selection.batteryKwh;

  // Roof segment data for the panel overlay (used by PanelOverlay below).
  const segmentLayouts = useMemo(
    () => buildSegmentLayouts(analysis, panelCount),
    [analysis, panelCount],
  );

  // Maximum panels the roof can fit (cap on the slider).
  const maxPanels = useMemo(() => {
    if (analysis.solar.coverage !== true) return 24;
    return analysis.solar.data.solarPotential.maxArrayPanelsCount ?? 24;
  }, [analysis.solar]);

  // Estimated combined upfront cost (used in the hero callout) — same
  // source of truth as the Savings tab. Pure derivation from analysis +
  // selection, no API call.
  const totalUpfront = useMemo(
    () =>
      computeCost({
        analysis,
        electricityTariff: electricityTariff ?? null,
        gasTariff: gasTariff ?? null,
        selection,
      }).netUpfront,
    [
      analysis,
      electricityTariff,
      gasTariff,
      selection,
    ],
  );

  return (
    <div className="space-y-6">
      {/* HERO — satellite + panel overlay */}
      <SectionCard
        title="Your roof, with solar panels"
        subtitle="A scaled overlay of where panels would sit. Slide to try fewer panels if you're working to a tighter budget."
        icon={<Sun className="w-5 h-5" />}
        rightSlot={<VerdictBadge tone={tone} label={solar.rating} />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div
              className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              style={{ aspectRatio: `${STATIC_MAP_W} / ${STATIC_MAP_H}` }}
            >
              <Image
                src={satelliteUrl}
                alt="Satellite view of your property with solar panel layout"
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                unoptimized
              />
              {segmentLayouts.length > 0 ? (
                <PanelOverlay layouts={segmentLayouts} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-white text-sm">
                  Panel layout preview unavailable for this address.
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Final positions confirmed by your installer on the day.
            </p>
          </div>

          <div className="lg:col-span-1 space-y-5">
            {recommendedPanels && (
              <div className="rounded-xl bg-coral-pale/40 border border-coral/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-coral-dark">
                  Our recommendation
                </p>
                <p className="mt-1.5 text-2xl font-bold text-navy">
                  {recommendedPanels} panels
                </p>
                <p className="text-sm text-slate-600">
                  ≈ {solar.recommendedKWp} kWp ·{" "}
                  {solar.estimatedAnnualKWh?.toLocaleString()} kWh/yr
                </p>
              </div>
            )}

            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-sm font-medium text-navy">
                  Panel count
                </label>
                <span className="text-sm font-semibold text-coral-dark tabular-nums">
                  {panelCount} panels
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={maxPanels}
                step={1}
                value={panelCount}
                onChange={(e) =>
                  setSelection({
                    ...selection,
                    panelCount: Number(e.target.value),
                  })
                }
                className="w-full accent-coral"
                aria-label="Number of solar panels"
              />
              <p className="mt-1 text-xs text-slate-500">
                Roof can fit up to {maxPanels} panels.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-sm">
              <Row label="Estimated install">
                <strong className="text-navy">
                  {fmtGbp(totalUpfront, { compact: true })}
                </strong>
              </Row>
              {finance.paybackYearsRange && (
                <Row label="Pays for itself in">
                  <strong className="text-emerald-700">
                    {finance.paybackYearsRange[0]}–{finance.paybackYearsRange[1]}{" "}
                    years
                  </strong>
                </Row>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Roof segments table */}
      {analysis.solar.coverage === true &&
        analysis.solar.data.solarPotential.roofSegmentStats && (
          <SectionCard
            title="Your roof, segment by segment"
            subtitle="South-facing surfaces generate the most. East and west work too — they just generate at different times of day."
            icon={<Compass className="w-5 h-5" />}
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="text-left font-semibold py-2 px-3">
                      Direction
                    </th>
                    <th className="text-left font-semibold py-2 px-3">Pitch</th>
                    <th className="text-right font-semibold py-2 px-3">Area</th>
                    <th className="text-right font-semibold py-2 px-3">
                      Sunshine
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.solar.data.solarPotential.roofSegmentStats
                    .slice(0, 8)
                    .map((seg, i) => {
                      const sunshine =
                        seg.stats?.sunshineQuantiles?.[5] ?? null;
                      const area = seg.stats?.areaMeters2;
                      return (
                        <tr
                          key={i}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-2 px-3 font-medium text-navy">
                            {describeAzimuth(seg.azimuthDegrees)}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {seg.pitchDegrees != null
                              ? `${Math.round(seg.pitchDegrees)}°`
                              : "—"}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {area != null ? `${Math.round(area)} m²` : "—"}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {sunshine != null
                              ? `${Math.round(sunshine)} kWh/m²`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

      {/* Battery sizing */}
      <SectionCard
        title="How big a battery?"
        subtitle="Solar without a battery means you only use what you make during the day. A battery stores the rest for the evening."
        icon={<Battery className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <BatteryOption
            kwh={3}
            description="Light use — backup for evening lights and TV."
            active={batteryKwh === 3}
            onSelect={() => setSelection({ ...selection, batteryKwh: 3 })}
          />
          <BatteryOption
            kwh={5}
            description="Sweet spot for most UK homes — covers an evening and overnight standby."
            active={batteryKwh === 5}
            onSelect={() => setSelection({ ...selection, batteryKwh: 5 })}
            highlight="Most popular"
          />
          <BatteryOption
            kwh={10}
            description="EV chargers, heat pumps, or working from home — bigger draws all day."
            active={batteryKwh === 10}
            onSelect={() => setSelection({ ...selection, batteryKwh: 10 })}
          />
        </div>
      </SectionCard>

      {/* Reason / blocker explanation if not Excellent/Good */}
      {solar.reason && tone !== "green" && (
        <SectionCard
          title="Why we've rated solar this way"
          icon={<Zap className="w-5 h-5" />}
        >
          <p className="text-sm text-slate-700 leading-relaxed">
            {solar.reason}
          </p>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function BatteryOption({
  kwh,
  description,
  active,
  highlight,
  onSelect,
}: {
  kwh: number;
  description: string;
  active: boolean;
  highlight?: string;
  onSelect: () => void;
}) {
  // Battery cost benchmark — 5 kWh ≈ £3,500 installed.
  const cost = kwh * 700;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative text-left rounded-2xl border p-4 transition-all ${
        active
          ? "border-coral bg-coral-pale/40 ring-2 ring-coral/20"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {highlight && (
        <span className="absolute -top-2 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-coral text-white text-[10px] font-bold uppercase tracking-wider">
          {highlight}
        </span>
      )}
      <p className="text-2xl font-bold text-navy">{kwh} kWh</p>
      <p className="text-sm text-slate-500 mt-0.5">
        ~{fmtGbp(cost, { compact: true })} installed
      </p>
      <p className="mt-2 text-xs text-slate-600 leading-relaxed">
        {description}
      </p>
    </button>
  );
}

// ─── Panel overlay — segment-based grid tiling ──────────────────────────────
//
// Earlier version projected each Google panel's lat/lng to pixels, but
// the API returns multiple panels at near-identical coords (clustered
// at the segment centroid) which made them stack visually. This version
// derives a tidy grid PER SEGMENT from the segment's bounding box +
// azimuth + the panels-per-segment count for the chosen config.

interface SegmentLayout {
  // Top-left corner in image pixels
  x: number;
  y: number;
  // Width + height of the segment area in image pixels
  width: number;
  height: number;
  // Rotation in degrees (azimuth aligned)
  rotationDeg: number;
  panelCount: number;
  // Panel physical dims in metres
  panelWMeters: number;
  panelHMeters: number;
  // Pixels per metre at this zoom
  metresPerPixel: number;
}

function buildSegmentLayouts(
  analysis: AnalyseResponse,
  panelCount: number,
): SegmentLayout[] {
  if (analysis.solar.coverage !== true) return [];
  const sp = analysis.solar.data.solarPotential;
  const center = analysis.solar.data.center;
  if (!sp || !center) return [];

  const segments = sp.roofSegmentStats ?? [];
  const configs = sp.solarPanelConfigs ?? [];
  if (segments.length === 0) return [];

  // Pick the config whose panelsCount is closest to (but not above) the
  // user's chosen count. If none qualifies, take the smallest.
  const sorted = [...configs].sort((a, b) => a.panelsCount - b.panelsCount);
  const chosen =
    sorted
      .filter((c) => c.panelsCount <= panelCount)
      .sort((a, b) => b.panelsCount - a.panelsCount)[0] ??
    sorted[0] ??
    null;

  // Without a chosen config, distribute evenly across segments.
  // Schema marks segmentIndex/panelsCount as optional; filter + coerce.
  const perSegment: { segmentIndex: number; panelCount: number }[] = chosen
    ? (chosen.roofSegmentSummaries ?? [])
        .filter(
          (s): s is { segmentIndex: number; panelsCount: number } =>
            typeof s.segmentIndex === "number" &&
            typeof s.panelsCount === "number",
        )
        .map((s) => ({
          segmentIndex: s.segmentIndex,
          panelCount: s.panelsCount,
        }))
    : segments.slice(0, 2).map((_, i) => ({
        segmentIndex: i,
        panelCount: Math.ceil(panelCount / Math.min(segments.length, 2)),
      }));

  // Web Mercator metres-per-pixel at zoom 20.
  const metresPerPixel =
    (156543.03392 * Math.cos((center.latitude * Math.PI) / 180)) /
    Math.pow(2, STATIC_MAP_ZOOM);

  const project = (lat: number, lng: number) => {
    const dLat = lat - center.latitude;
    const dLng = lng - center.longitude;
    const yMeters = -dLat * 111_320;
    const xMeters = dLng * 111_320 * Math.cos((center.latitude * Math.PI) / 180);
    return {
      x: STATIC_MAP_W / 2 + xMeters / metresPerPixel,
      y: STATIC_MAP_H / 2 + yMeters / metresPerPixel,
    };
  };

  const panelW = sp.panelWidthMeters ?? 1.05;
  const panelH = sp.panelHeightMeters ?? 1.88;

  const layouts: SegmentLayout[] = [];
  for (const { segmentIndex, panelCount: segPanelCount } of perSegment) {
    const seg = segments[segmentIndex];
    if (!seg) continue;
    if (segPanelCount <= 0) continue;
    const bb = seg.boundingBox;
    if (!bb || !bb.sw || !bb.ne) continue;

    const sw = project(bb.sw.latitude, bb.sw.longitude);
    const ne = project(bb.ne.latitude, bb.ne.longitude);
    const x = Math.min(sw.x, ne.x);
    const y = Math.min(sw.y, ne.y);
    const width = Math.abs(ne.x - sw.x);
    const height = Math.abs(ne.y - sw.y);
    if (width < 5 || height < 5) continue; // too small to render

    layouts.push({
      x,
      y,
      width,
      height,
      // Azimuth is the roof's downhill direction in degrees from north
      // (0=N, 180=S). Panels point that direction. We rotate the grid
      // by (azimuth − 180) so on a south-facing roof rotation = 0.
      rotationDeg: ((seg.azimuthDegrees ?? 180) - 180) % 360,
      panelCount: segPanelCount,
      panelWMeters: panelW,
      panelHMeters: panelH,
      metresPerPixel,
    });
  }

  return layouts;
}

function PanelOverlay({ layouts }: { layouts: SegmentLayout[] }) {
  return (
    <svg
      viewBox={`0 0 ${STATIC_MAP_W} ${STATIC_MAP_H}`}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      {layouts.map((l, idx) => (
        <SegmentGrid key={idx} layout={l} />
      ))}
    </svg>
  );
}

function SegmentGrid({ layout }: { layout: SegmentLayout }) {
  const { x, y, width, height, panelCount, panelWMeters, panelHMeters, metresPerPixel } =
    layout;

  // Panel size in pixels.
  const panelW = panelWMeters / metresPerPixel; // short dim
  const panelH = panelHMeters / metresPerPixel; // long dim

  // Tile within the segment bounds. Try portrait first (panels with long
  // axis vertical = parallel to roof slope), and pack as many as fit.
  // Then trim to the requested panelCount.
  const gap = Math.max(1, panelW * 0.1); // 10% of panel width as inter-panel gap
  const stepX = panelW + gap;
  const stepY = panelH + gap;

  const cols = Math.max(1, Math.floor(width / stepX));
  const rows = Math.max(1, Math.floor(height / stepY));
  const fitTotal = cols * rows;
  const renderCount = Math.min(panelCount, fitTotal);

  // Centre the grid in the bounding box.
  const usedW = cols * stepX - gap;
  const usedH = Math.ceil(renderCount / cols) * stepY - gap;
  const startX = x + (width - usedW) / 2;
  const startY = y + (height - usedH) / 2;

  const panels: { px: number; py: number }[] = [];
  for (let i = 0; i < renderCount; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    panels.push({
      px: startX + c * stepX,
      py: startY + r * stepY,
    });
  }

  // Rotation pivot: centre of the bounding box.
  const cx = x + width / 2;
  const cy = y + height / 2;

  return (
    <g transform={`rotate(${layout.rotationDeg} ${cx} ${cy})`}>
      {panels.map((p, i) => (
        <rect
          key={i}
          x={p.px}
          y={p.py}
          width={panelW}
          height={panelH}
          fill="#1e3a8a"
          fillOpacity={0.85}
          stroke="#60a5fa"
          strokeWidth={0.5}
          rx={0.5}
        />
      ))}
    </g>
  );
}
