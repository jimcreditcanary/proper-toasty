"use client";

// Solar tab — visual sell + battery sizing.
//
// Hero: the satellite image of the property with the optimal solar panel
// layout drawn over the top. We use Google Solar API's per-panel data
// (lat/lng + orientation) and project to pixels via the same
// lat/lng → static-map pixel maths the editor uses. A slider underneath
// lets the curious consumer see the layout for fewer panels too — useful
// when budget is tight.
//
// (PR 2.5 will layer Google's DataLayers TIFF as a richer "wow" image
// behind the SVG overlay. For now the static satellite + clean SVG
// overlay is shippable and free of extra API costs.)
//
// Below the hero: roof segment table, generation chart, simple battery
// comparison ("how big should I go?").

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Battery,
  Compass,
  Info,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { ReportSelection } from "../report-shell";
import {
  FactRow,
  SectionCard,
  VerdictBadge,
  describeAzimuth,
  fmtGbp,
  type VerdictTone,
} from "../shared";

interface Props {
  analysis: AnalyseResponse;
  satelliteUrl: string;
  selection: ReportSelection;
  setSelection: (s: ReportSelection) => void;
}

// Google Static Maps tile size — must match the imagery API call in
// report-shell.tsx so panel coords project into the right pixel space.
const STATIC_MAP_W = 640;
const STATIC_MAP_H = 360;
const STATIC_MAP_ZOOM = 20;

export function SolarTab({
  analysis,
  satelliteUrl,
  selection,
  setSelection,
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
  const [panelCount, setPanelCount] = useState<number>(
    recommendedPanels ?? 12,
  );
  const [batteryKwh, setBatteryKwh] = useState<number>(5);

  // Pull per-panel positions from Google Solar API (only available when
  // the building has coverage). The API returns a panel for each layout
  // permutation it considered; we pick the slice for the user's chosen
  // panel count.
  //
  // Defensive — Google sometimes returns panels without orientation/center
  // (the schema marks both as optional). We coerce them through a strict
  // SolarPanelLite shape and skip any malformed rows up front.
  const panelData = useMemo(() => {
    if (analysis.solar.coverage !== true) return null;
    const sp = analysis.solar.data.solarPotential;
    const center = analysis.solar.data.center;
    if (!sp || !center) return null;
    const cleaned: SolarPanelLite[] = (sp.solarPanels ?? [])
      .filter(
        (
          p,
        ): p is { center: { latitude: number; longitude: number }; orientation?: "LANDSCAPE" | "PORTRAIT" } =>
          p.center != null &&
          typeof p.center.latitude === "number" &&
          typeof p.center.longitude === "number",
      )
      .map((p) => ({
        center: { latitude: p.center.latitude, longitude: p.center.longitude },
        orientation: p.orientation,
      }));
    return {
      panels: cleaned,
      panelW: sp.panelWidthMeters ?? 1.05,
      panelH: sp.panelHeightMeters ?? 1.88,
      centerLat: center.latitude,
      centerLng: center.longitude,
      maxPanels: sp.maxArrayPanelsCount ?? 0,
    };
  }, [analysis.solar]);

  const panelsToRender = useMemo(() => {
    if (!panelData) return [];
    return panelData.panels.slice(0, panelCount);
  }, [panelData, panelCount]);

  return (
    <div className="space-y-6">
      {/* HERO — satellite + panel overlay */}
      <SectionCard
        title="Your roof, with solar panels"
        subtitle="A scaled overlay of the optimal layout. Slide to see fewer panels if you're working to a tighter budget."
        icon={<Sun className="w-5 h-5" />}
        rightSlot={<VerdictBadge tone={tone} label={solar.rating} />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Visual */}
          <div className="lg:col-span-2">
            <div
              className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              style={{ aspectRatio: `${STATIC_MAP_W} / ${STATIC_MAP_H}` }}
            >
              <Image
                src={satelliteUrl}
                alt="Satellite view with solar panel layout"
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                unoptimized
              />
              {panelData ? (
                <PanelOverlay
                  panels={panelsToRender}
                  panelWMeters={panelData.panelW}
                  panelHMeters={panelData.panelH}
                  centerLat={panelData.centerLat}
                  centerLng={panelData.centerLng}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-white text-sm">
                  Panel layout preview unavailable for this address.
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Layout from satellite imagery analysis. Final positions confirmed
              by your installer on the day.
            </p>
          </div>

          {/* Sizing controls */}
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
                  Try a different size
                </label>
                <span className="text-sm font-semibold text-coral-dark tabular-nums">
                  {panelCount} panels
                </span>
              </div>
              <input
                type="range"
                min={4}
                max={panelData?.maxPanels ?? 24}
                step={1}
                value={panelCount}
                onChange={(e) => setPanelCount(Number(e.target.value))}
                className="w-full accent-coral"
              />
              <p className="mt-1 text-xs text-slate-500">
                Roof can fit up to {panelData?.maxPanels ?? "—"} panels at the
                installer&rsquo;s default spacing.
              </p>
            </div>

            {finance.installCostGBP != null && (
              <dl className="space-y-1 pt-3 border-t border-slate-200">
                <FactRow label="Estimated install cost">
                  {fmtGbp(finance.installCostGBP, { compact: true })}
                </FactRow>
                {finance.annualSavingsRangeGBP && (
                  <FactRow label="Year 1 saving">
                    {fmtGbp(finance.annualSavingsRangeGBP[0], {
                      compact: true,
                    })}
                    –
                    {fmtGbp(finance.annualSavingsRangeGBP[1], {
                      compact: true,
                    })}
                  </FactRow>
                )}
                {finance.paybackYearsRange && (
                  <FactRow label="Payback">
                    {finance.paybackYearsRange[0]}–{finance.paybackYearsRange[1]}{" "}
                    years
                  </FactRow>
                )}
              </dl>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Roof segments */}
      {analysis.solar.coverage === true &&
        analysis.solar.data.solarPotential.roofSegmentStats && (
          <SectionCard
            title="Your roof, segment by segment"
            subtitle="South-facing surfaces generate the most. East and west work fine — they just generate at different times of day."
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
        title="Add a battery?"
        subtitle="Solar without a battery means you only use what you make during the day. A battery stores the rest for the evening."
        icon={<Battery className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <BatteryOption
            kwh={3}
            cost={2100}
            description="Light use — backup for evening lights and TV."
            active={batteryKwh === 3}
            onSelect={() => setBatteryKwh(3)}
          />
          <BatteryOption
            kwh={5}
            cost={3500}
            description="Sweet spot for most UK homes — covers an evening and overnight standby."
            active={batteryKwh === 5}
            onSelect={() => setBatteryKwh(5)}
            highlight="Most popular"
          />
          <BatteryOption
            kwh={10}
            cost={6500}
            description="EV chargers, heat pumps, or working from home — bigger draws all day."
            active={batteryKwh === 10}
            onSelect={() => setBatteryKwh(10)}
          />
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600 leading-relaxed">
          <p className="inline-flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
            <span>
              Battery payback is long — typically 8–12 years on its own. Most
              buyers add one for resilience (power cuts, EV charging) or to
              soak up overnight off-peak rates. The Savings tab models the
              numbers if you want to play with the inputs.
            </span>
          </p>
        </div>

        {!selection.hasBattery && (
          <button
            type="button"
            onClick={() =>
              setSelection({
                ...selection,
                hasSolar: true,
                hasBattery: true,
              })
            }
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-coral hover:underline"
          >
            <TrendingUp className="w-4 h-4" />
            Add a battery to my plan
          </button>
        )}
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

// ─── Panel overlay ──────────────────────────────────────────────────────────

interface SolarPanelLite {
  center: { latitude: number; longitude: number };
  orientation?: "LANDSCAPE" | "PORTRAIT";
}

function PanelOverlay({
  panels,
  panelWMeters,
  panelHMeters,
  centerLat,
  centerLng,
}: {
  panels: SolarPanelLite[];
  panelWMeters: number;
  panelHMeters: number;
  centerLat: number;
  centerLng: number;
}) {
  // Web Mercator metres-per-pixel at the static-map zoom level. At zoom 20
  // and the building's latitude this is roughly 0.15 m/pixel. Formula:
  //   metresPerPixel = 156543.03392 * cos(lat) / 2^zoom
  const metresPerPixel = useMemo(
    () =>
      (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) /
      Math.pow(2, STATIC_MAP_ZOOM),
    [centerLat],
  );

  // Project a panel's lat/lng to pixel offsets from the image centre.
  const project = (lat: number, lng: number) => {
    const dLat = lat - centerLat;
    const dLng = lng - centerLng;
    const yMeters = -dLat * 111_320; // 1° lat ≈ 111.32 km
    const xMeters = dLng * 111_320 * Math.cos((centerLat * Math.PI) / 180);
    return {
      x: STATIC_MAP_W / 2 + xMeters / metresPerPixel,
      y: STATIC_MAP_H / 2 + yMeters / metresPerPixel,
    };
  };

  const panelW = panelWMeters / metresPerPixel;
  const panelH = panelHMeters / metresPerPixel;

  return (
    <svg
      viewBox={`0 0 ${STATIC_MAP_W} ${STATIC_MAP_H}`}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      {panels.map((p, i) => {
        const { x, y } = project(p.center.latitude, p.center.longitude);
        const isPortrait = p.orientation === "PORTRAIT";
        const w = isPortrait ? panelW : panelH;
        const h = isPortrait ? panelH : panelW;
        return (
          <rect
            key={i}
            x={x - w / 2}
            y={y - h / 2}
            width={w}
            height={h}
            fill="#1e3a8a"
            fillOpacity={0.85}
            stroke="#60a5fa"
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}

// ─── Battery option ─────────────────────────────────────────────────────────

function BatteryOption({
  kwh,
  cost,
  description,
  active,
  highlight,
  onSelect,
}: {
  kwh: number;
  cost: number;
  description: string;
  active: boolean;
  highlight?: string;
  onSelect: () => void;
}) {
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
