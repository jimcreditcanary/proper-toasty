"use client";

// RecommendationStrip — the "Build your plan" card on the Savings tab.
// Three tiles, one per upgrade, each with:
//   - A discrete toggle (instead of "whole card is the button" — that
//     pattern was getting in the way of the inline sizing controls)
//   - Verdict pill on the right
//   - Inline sizing controls when ON:
//       Solar  → panel-count slider (drives selection.panelCount)
//       Battery → 3 / 5 / 10 kWh segmented control (drives
//                 selection.batteryKwh)
//       Heat pump → no sizing — shows the analysis's recommended
//                   system kW
//   - Live cost / generation summary line
//   - "See details →" jump-link to the relevant tab
//
// All inputs feed shell-level `selection` state — the Solar tab
// shows the same battery + panel values via separate (richer) UI.
// Battery tile is disabled when solar is off (battery needs solar
// to charge from).

import { Battery, Check, Flame, Sparkles, Sun } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import { SectionCard, fmtGbp } from "./shared";
import type { ReportSelection, ReportTabKey } from "./report-shell";

interface Props {
  analysis: AnalyseResponse;
  selection: ReportSelection;
  setSelection: (s: ReportSelection) => void;
  onJumpTab: (tab: ReportTabKey) => void;
}

const BATTERY_OPTIONS = [3, 5, 10] as const;

export function RecommendationStrip({
  analysis,
  selection,
  setSelection,
  onJumpTab,
}: Props) {
  const hp = analysis.eligibility.heatPump;
  const solar = analysis.eligibility.solar;
  const finance = analysis.finance;
  const solarStrong = solar.rating === "Excellent" || solar.rating === "Good";

  // Cost figures for each tile.
  const hpCostLow = finance.heatPump.estimatedNetInstallCostRangeGBP?.[0] ?? null;
  const hpCostHigh = finance.heatPump.estimatedNetInstallCostRangeGBP?.[1] ?? null;
  const apiSolarCost = finance.solar.installCostGBP ?? null;
  const recommendedPanels = solar.recommendedPanels ?? 0;
  // Hard cap on the panel slider — Google Solar API tells us the
  // most this roof can physically fit. Falls back to the recommended
  // count + 50% headroom when the API didn't cover the address.
  const maxPanels =
    analysis.solar.coverage === true
      ? (analysis.solar.data.solarPotential.maxArrayPanelsCount ??
        Math.max(1, Math.ceil(recommendedPanels * 1.5)))
      : Math.max(1, Math.ceil(recommendedPanels * 1.5));
  // Per-panel scaling — same logic as src/lib/savings/calc.ts so the
  // tile cost stays in sync with the cost-breakdown card below.
  const perPanelCost =
    apiSolarCost != null && recommendedPanels > 0
      ? apiSolarCost / recommendedPanels
      : 350;
  const liveSolarCost = perPanelCost * selection.panelCount;
  // Annual generation scales linearly with panels (the spec assumes a
  // fixed kWh/panel/yr; reasonable proxy at this fidelity).
  const liveSolarKwh =
    solar.estimatedAnnualKWh && recommendedPanels > 0
      ? Math.round(
          (solar.estimatedAnnualKWh / recommendedPanels) * selection.panelCount,
        )
      : null;

  return (
    <SectionCard
      title="Build your plan"
      subtitle="Toggle each upgrade and tweak the sizing — the report below updates instantly."
      icon={<Sparkles className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <PlanTile
          kind="heatpump"
          title="Heat pump"
          verdict={
            hp.verdict === "eligible"
              ? "Compatible"
              : hp.verdict === "conditional"
                ? "Requires investigation"
                : "Not compatible"
          }
          tone={
            hp.verdict === "eligible"
              ? "green"
              : hp.verdict === "conditional"
                ? "amber"
                : "slate"
          }
          selected={selection.hasHeatPump}
          onToggle={() =>
            setSelection({ ...selection, hasHeatPump: !selection.hasHeatPump })
          }
          onSeeDetails={() => onJumpTab("heatpump")}
          summaryLine={
            selection.hasHeatPump
              ? hpCostLow != null && hpCostHigh != null
                ? `${fmtGbp(hpCostLow, { compact: true })}–${fmtGbp(hpCostHigh, { compact: true })} after £${hp.estimatedGrantGBP.toLocaleString()} BUS grant`
                : `£${hp.estimatedGrantGBP.toLocaleString()} BUS grant available`
              : "Estimated install + BUS grant shown when added to plan"
          }
        >
          {selection.hasHeatPump && (
            <SizingReadout
              label="Estimated system size"
              value={
                hp.recommendedSystemKW
                  ? `${hp.recommendedSystemKW} kW`
                  : "TBC on site visit"
              }
            />
          )}
        </PlanTile>

        <PlanTile
          kind="solar"
          title="Solar PV"
          verdict={
            solarStrong
              ? "Compatible"
              : solar.rating === "Marginal"
                ? "Requires investigation"
                : "Not compatible"
          }
          tone={
            solarStrong ? "green" : solar.rating === "Marginal" ? "amber" : "slate"
          }
          selected={selection.hasSolar}
          onToggle={() =>
            setSelection({ ...selection, hasSolar: !selection.hasSolar })
          }
          onSeeDetails={() => onJumpTab("solar")}
          summaryLine={
            selection.hasSolar
              ? `${liveSolarKwh != null ? `~${liveSolarKwh.toLocaleString()} kWh/yr · ` : ""}${fmtGbp(liveSolarCost, { compact: true })} install`
              : "Pick a panel count to see install cost"
          }
        >
          {selection.hasSolar && (
            <PanelSlider
              value={Math.min(selection.panelCount, maxPanels)}
              recommended={recommendedPanels}
              max={maxPanels}
              onChange={(v) =>
                setSelection({ ...selection, panelCount: v })
              }
            />
          )}
        </PlanTile>

        <PlanTile
          kind="battery"
          title="Battery"
          verdict={solarStrong ? "Compatible" : "Requires investigation"}
          tone={solarStrong ? "green" : "amber"}
          selected={selection.hasBattery}
          onToggle={() =>
            setSelection({ ...selection, hasBattery: !selection.hasBattery })
          }
          onSeeDetails={() => onJumpTab("solar")}
          disabled={!selection.hasSolar}
          disabledHint="Battery needs solar to charge from"
          summaryLine={
            selection.hasBattery
              ? `Stores midday solar to use after dark`
              : "Pair with solar to shift generation into the evening"
          }
        >
          {selection.hasBattery && (
            <BatterySegmented
              value={selection.batteryKwh as 3 | 5 | 10}
              onChange={(v) =>
                setSelection({ ...selection, batteryKwh: v })
              }
            />
          )}
        </PlanTile>
      </div>
    </SectionCard>
  );
}

// ─── PlanTile shell ────────────────────────────────────────────────────

function PlanTile({
  kind,
  title,
  verdict,
  tone,
  selected,
  disabled,
  disabledHint,
  summaryLine,
  onToggle,
  onSeeDetails,
  children,
}: {
  kind: "heatpump" | "solar" | "battery";
  title: string;
  verdict: string;
  tone: "green" | "amber" | "slate";
  selected: boolean;
  disabled?: boolean;
  disabledHint?: string;
  summaryLine: string;
  onToggle: () => void;
  onSeeDetails: () => void;
  children?: React.ReactNode;
}) {
  const icon =
    kind === "heatpump" ? (
      <Flame className="w-5 h-5" />
    ) : kind === "solar" ? (
      <Sun className="w-5 h-5" />
    ) : (
      <Battery className="w-5 h-5" />
    );

  const verdictTone =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";

  const isOn = selected && !disabled;

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-colors ${
        disabled
          ? "border-slate-200 bg-slate-50/40 opacity-60"
          : isOn
            ? "border-coral bg-coral-pale/30"
            : "border-slate-200 bg-white"
      }`}
    >
      {/* Header row: icon + title on the left, verdict pill on the right */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-coral shadow-sm border border-slate-100">
            {icon}
          </span>
          <span className="text-sm font-semibold text-navy truncate">
            {title}
          </span>
        </span>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 whitespace-nowrap ${verdictTone}`}
        >
          {verdict}
        </span>
      </div>

      {/* Toggle row */}
      <div className="mb-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={selected}
          className={`w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
            disabled
              ? "bg-slate-100 text-slate-400"
              : isOn
                ? "bg-coral text-white hover:bg-coral-dark"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {isOn ? <Check className="w-4 h-4" /> : <Plus />}
            {isOn ? "In my plan" : "Add to my plan"}
          </span>
          <Switch on={isOn} />
        </button>
        {disabled && disabledHint && (
          <p className="mt-1.5 text-[11px] text-slate-500 italic">
            {disabledHint}
          </p>
        )}
      </div>

      {/* Sizing controls (children) — only when ON */}
      {children && <div className="mb-3">{children}</div>}

      {/* Footer: summary line + see details */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-600 leading-snug">{summaryLine}</p>
        <button
          type="button"
          onClick={onSeeDetails}
          className="shrink-0 text-xs font-semibold text-coral hover:underline whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded"
        >
          See details →
        </button>
      </div>
    </div>
  );
}

// Tiny "+" SVG so the off-state button doesn't import another lucide
// icon just for one role.
function Plus() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block w-8 h-4 rounded-full transition-colors ${
        on ? "bg-white/40" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </span>
  );
}

// ─── Sizing controls ───────────────────────────────────────────────────

function PanelSlider({
  value,
  recommended,
  max,
  onChange,
}: {
  value: number;
  recommended: number;
  /** Hard cap from Google Solar API's maxArrayPanelsCount. */
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Number of panels
        </span>
        <span className="text-sm font-bold text-navy tabular-nums">
          {value}
          {recommended > 0 && value === recommended && (
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              recommended
            </span>
          )}
        </span>
      </label>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Number of solar panels"
        className="w-full accent-coral cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 tabular-nums">
        <span>1</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function BatterySegmented({
  value,
  onChange,
}: {
  value: 3 | 5 | 10;
  onChange: (n: 3 | 5 | 10) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        Battery size
      </p>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Battery size">
        {BATTERY_OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt)}
              className={`px-2 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-1 ${
                active
                  ? "bg-coral text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-coral-pale/40"
              }`}
            >
              {opt} kWh
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SizingReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-sm font-bold text-navy mt-0.5">{value}</p>
    </div>
  );
}
