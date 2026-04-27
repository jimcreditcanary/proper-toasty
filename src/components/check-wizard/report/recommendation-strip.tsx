"use client";

// RecommendationStrip — the "What could your home benefit from?" card,
// extracted from the Overview tab so it lives at the shell level and
// stays visible across every report tab. Three big tiles (Heat pump /
// Solar / Battery) double as the master toggle for the rest of the
// report — every tab observes the same `selection` state from the
// shell.
//
// Tile is the toggle: tap anywhere on the card to add/remove from the
// plan. Selected = filled coral border + check chip. Unselected = grey
// outline. Battery is a slave to solar (deselect solar → battery off);
// shown disabled when solar is off, with a hint.

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

export function RecommendationStrip({
  analysis,
  selection,
  setSelection,
  onJumpTab,
}: Props) {
  const hp = analysis.eligibility.heatPump;
  const solar = analysis.eligibility.solar;
  const finance = analysis.finance;

  const hpCostLow = finance.heatPump.estimatedNetInstallCostRangeGBP?.[0] ?? null;
  const hpCostHigh = finance.heatPump.estimatedNetInstallCostRangeGBP?.[1] ?? null;
  const solarCost = finance.solar.installCostGBP ?? null;

  return (
    <SectionCard
      title="What could your home benefit from?"
      subtitle="Tap a card to add or remove it from your plan. The rest of the report updates with your choices."
      icon={<Sparkles className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        <RecTile
          kind="heatpump"
          title="Heat pump"
          headline={
            hp.recommendedSystemKW
              ? `${hp.recommendedSystemKW} kW system`
              : "Sized on site visit"
          }
          verdict={
            hp.verdict === "eligible"
              ? "Recommended"
              : hp.verdict === "conditional"
                ? "Possible"
                : "Not now"
          }
          tone={
            hp.verdict === "eligible"
              ? "green"
              : hp.verdict === "conditional"
                ? "amber"
                : "slate"
          }
          costLine={
            hpCostLow != null && hpCostHigh != null
              ? `${fmtGbp(hpCostLow)}–${fmtGbp(hpCostHigh)} after £${hp.estimatedGrantGBP.toLocaleString()} BUS grant`
              : `£${hp.estimatedGrantGBP.toLocaleString()} BUS grant available`
          }
          selected={selection.hasHeatPump}
          onToggle={() =>
            setSelection({ ...selection, hasHeatPump: !selection.hasHeatPump })
          }
          onSeeDetails={() => onJumpTab("heatpump")}
        />
        <RecTile
          kind="solar"
          title="Solar PV"
          headline={
            solar.recommendedKWp
              ? `${solar.recommendedKWp} kWp · ${solar.estimatedAnnualKWh?.toLocaleString() ?? "—"} kWh/yr`
              : "Roof not suitable"
          }
          verdict={solar.rating}
          tone={
            solar.rating === "Excellent" || solar.rating === "Good"
              ? "green"
              : solar.rating === "Marginal"
                ? "amber"
                : "slate"
          }
          costLine={
            solarCost != null
              ? `${fmtGbp(solarCost)} install`
              : "Install cost depends on roof access"
          }
          selected={selection.hasSolar}
          onToggle={() =>
            setSelection({ ...selection, hasSolar: !selection.hasSolar })
          }
          onSeeDetails={() => onJumpTab("solar")}
        />
        <RecTile
          kind="battery"
          title="Battery"
          headline="Stores midday solar for the evening"
          verdict={
            solar.rating === "Excellent" || solar.rating === "Good"
              ? "Pairs well"
              : "Optional"
          }
          tone={
            solar.rating === "Excellent" || solar.rating === "Good"
              ? "green"
              : "slate"
          }
          // No fixed cost line — sizing chosen on the Solar & battery tab.
          costLine={
            selection.hasBattery
              ? "Pick your size on the Solar & battery tab"
              : "Sized to match your usage"
          }
          selected={selection.hasBattery}
          onToggle={() =>
            setSelection({ ...selection, hasBattery: !selection.hasBattery })
          }
          onSeeDetails={() => onJumpTab("solar")}
          disabled={!selection.hasSolar}
          disabledHint="Battery needs solar to charge from"
        />
      </div>
    </SectionCard>
  );
}

// ─── Tile ───────────────────────────────────────────────────────────────────

function RecTile({
  kind,
  title,
  headline,
  verdict,
  tone,
  costLine,
  selected,
  disabled,
  disabledHint,
  onToggle,
  onSeeDetails,
}: {
  kind: "heatpump" | "solar" | "battery";
  title: string;
  headline: string;
  verdict: string;
  tone: "green" | "amber" | "slate";
  costLine: string;
  selected: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onToggle: () => void;
  onSeeDetails: () => void;
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
      ? "text-emerald-700 bg-emerald-100"
      : tone === "amber"
        ? "text-amber-800 bg-amber-100"
        : "text-slate-600 bg-slate-100";

  return (
    <div
      className={`relative rounded-2xl border-2 p-4 transition-all ${
        disabled
          ? "border-slate-200 bg-slate-50/40 opacity-60"
          : selected
            ? "border-coral bg-coral-pale/30"
            : "border-slate-200 bg-white"
      }`}
    >
      {/* Whole tile is the toggle. Big touch target — fills the card. */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`${selected ? "Remove" : "Add"} ${title} ${selected ? "from" : "to"} my plan`}
        title={disabled ? disabledHint : undefined}
        className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 disabled:cursor-not-allowed"
      >
        <span className="sr-only">
          {selected ? "Remove " : "Add "}
          {title}
          {selected ? " from my plan" : " to my plan"}
        </span>
      </button>

      {/* Visual content sits above the absolute button */}
      <div className="relative pointer-events-none">
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

        <p className="text-lg font-bold text-navy leading-tight">{headline}</p>
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          {costLine}
        </p>

        {/* Status chip: makes the selection state un-missable */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${
              disabled
                ? "bg-slate-100 text-slate-400"
                : selected
                  ? "bg-coral text-white"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {selected ? (
              <>
                <Check className="w-3.5 h-3.5" />
                In my plan
              </>
            ) : disabled ? (
              "Not available"
            ) : (
              "Tap to add"
            )}
          </span>
          {/* See details — pointer-events-auto so it can be clicked despite
              the absolute toggle button covering the tile. */}
          <span
            className="text-xs font-semibold text-coral hover:underline whitespace-nowrap pointer-events-auto cursor-pointer"
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSeeDetails();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onSeeDetails();
              }
            }}
          >
            See details →
          </span>
        </div>
        {disabled && disabledHint && (
          <p className="mt-2 text-[11px] text-slate-500 italic">
            {disabledHint}
          </p>
        )}
      </div>
    </div>
  );
}
