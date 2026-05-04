"use client";

// Savings tab — the live savings projection.
//
// Layout (top → bottom):
//   1. RecommendationStrip   — plan toggles (heat pump / solar / battery)
//   2. FinancingControls     — collapsible loan + mortgage inputs
//   3. SavingsReport         — full live report driven by
//                              POST /api/savings/calculate
//   4. Cost breakdown card   — line-item view of the upfront figure
//                              (independent of the API; kept here as a
//                              transparent itemised "where the £
//                              comes from" panel)
//
// Empty-state (no upgrades selected) skips the API call entirely and
// shows a "pick something to see numbers" hint.

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import { computeCalc } from "@/lib/savings/calc";
import {
  buildSavingsRequest,
  DEFAULT_FINANCING,
  type FinancingInputs,
} from "@/lib/savings/build-request";
import { useSavingsCalc } from "@/lib/savings/use-savings-calc";
import type { YesNoUnsure } from "../../types";
import type { ReportSelection, ReportTabKey } from "../report-shell";
import { SectionCard, fmtGbp } from "../shared";
import { RecommendationStrip } from "../recommendation-strip";
import { FinancingControls } from "../savings/financing-controls";
import { SavingsReport } from "../savings/savings-report";

interface Props {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  selection: ReportSelection;
  setSelection: (s: ReportSelection) => void;
  financingPreference: YesNoUnsure | null;
  /** Jump to another report tab — wired to the "See details" links
   *  on each plan-toggle tile. */
  onJumpTab: (tab: ReportTabKey) => void;
}

export function SavingsTab({
  analysis,
  electricityTariff,
  gasTariff,
  selection,
  setSelection,
  financingPreference,
  onJumpTab,
}: Props) {
  // Financing is local to this tab — no other tab consumes it. Seed
  // both scenarios off when the wizard captured "no, paying cash"
  // (no point showing finance/mortgage UI). Otherwise default both
  // on so the user sees the comparison without an extra click.
  const [financing, setFinancing] = useState<FinancingInputs>(() => {
    const wantsCash = financingPreference === "no";
    return {
      ...DEFAULT_FINANCING,
      wantFinance: wantsCash ? false : DEFAULT_FINANCING.wantFinance,
      wantMortgage: wantsCash ? false : DEFAULT_FINANCING.wantMortgage,
    };
  });

  const cost = computeCalc({
    analysis,
    electricityTariff,
    gasTariff,
    selection,
  }).cost;

  const noTechSelected =
    !selection.hasSolar && !selection.hasBattery && !selection.hasHeatPump;

  // Build the API request once per render so we can pass it to both
  // the hook (which fetches) and SavingsReport (which displays the
  // financing values it was computed against).
  const request = buildSavingsRequest({
    analysis,
    electricityTariff,
    gasTariff,
    selection,
    financing,
  });
  const { result, loading, error } = useSavingsCalc({
    analysis,
    electricityTariff,
    gasTariff,
    selection,
    financing,
  });

  return (
    <div className="space-y-6">
      {/* Plan-builder — drives both the cost breakdown below and the
          API request feeding SavingsReport. */}
      <RecommendationStrip
        analysis={analysis}
        selection={selection}
        setSelection={setSelection}
        onJumpTab={onJumpTab}
      />

      {/* Advanced financing — only useful once at least one upgrade
          is in the plan, but harmless to show always. */}
      <FinancingControls value={financing} onChange={setFinancing} />

      {/* The live report. Skipped when nothing's in the plan — the
          API would just return defaults that don't reflect the user's
          choice. */}
      {noTechSelected ? (
        <SectionCard>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertCircle className="w-4 h-4" />
            Pick at least one upgrade in the plan above to see the numbers.
          </div>
        </SectionCard>
      ) : (
        <SavingsReport
          result={result}
          loading={loading}
          error={error}
          request={request}
          financing={financing}
        />
      )}

      {/* Cost breakdown — line-item view of the upfront figure.
          Independent of the API; kept for transparency. */}
      {!noTechSelected && (
        <SectionCard
          title="How the upfront cost adds up"
          subtitle="A transparent line-item view of what you'd pay before any bill savings."
        >
          <dl className="text-sm space-y-1.5">
            {selection.hasHeatPump && cost.hpGross > 0 && (
              <BreakdownRow
                label="Heat pump install"
                value={fmtGbp(cost.hpGross, { compact: true })}
              />
            )}
            {selection.hasSolar && cost.solarCost > 0 && (
              <BreakdownRow
                label={`Solar install (${selection.panelCount} panels)`}
                value={fmtGbp(cost.solarCost, { compact: true })}
              />
            )}
            {selection.hasBattery && cost.batteryCost > 0 && (
              <BreakdownRow
                label={`Battery (${selection.batteryKwh} kWh)`}
                value={fmtGbp(cost.batteryCost, { compact: true })}
              />
            )}
            {cost.busGrant > 0 && (
              <>
                <div className="border-t border-slate-100 my-2" />
                <BreakdownRow
                  label="BUS grant (heat pump)"
                  value={`−${fmtGbp(cost.busGrant, { compact: true })}`}
                  positive
                />
              </>
            )}
            <div className="border-t border-slate-100 my-2" />
            <BreakdownRow
              label="Net upfront cost"
              value={fmtGbp(cost.netUpfront, { compact: true })}
              strong
            />
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Doesn&rsquo;t include planning fees or any electrical-panel
            upgrades — your installer will price those in the formal quote.
          </p>
        </SectionCard>
      )}
    </div>
  );
}

// One-line item in the cost breakdown card.
function BreakdownRow({
  label,
  value,
  hint,
  positive,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  strong?: boolean;
}) {
  const labelCls = strong ? "text-navy font-semibold" : "text-slate-600";
  const valueCls = strong
    ? "text-navy font-bold tabular-nums"
    : positive
      ? "text-emerald-700 font-semibold tabular-nums"
      : "text-navy font-medium tabular-nums";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <dt className={`text-sm ${labelCls}`}>{label}</dt>
        {hint && (
          <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>
        )}
      </div>
      <dd className={`text-sm ${valueCls}`}>{value}</dd>
    </div>
  );
}
