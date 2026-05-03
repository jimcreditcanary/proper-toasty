"use client";

// Savings tab — three-scenario cost breakdown.
//
// ── Current state (Apr 2026) ──────────────────────────────────────────
// The savings calculator API was retired because the figures didn't
// add up. We've stripped the live bill / payback / scenario rendering
// and the charts. What's still live on this tab:
//   - Solar / Battery / Heat-pump toggles (drive shell-level selection
//     so the recommendation strip + Solar tab stay in sync)
//   - Cost breakdown — heat pump install, solar, battery, BUS grant,
//     net upfront. Pure derivation from analysis + selection, no API.
//   - "Calculations rebuilding" placeholder where scenarios + charts
//     used to be.
//
// The new front-end calc engine plugs in via `computeCalc().bills` —
// once that's non-null we can render the scenario cards + breakdown
// card again.

import { AlertCircle, PoundSterling } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import { computeCalc } from "@/lib/savings/calc";
import type { YesNoUnsure } from "../../types";
import type { ReportSelection, ReportTabKey } from "../report-shell";
import { SectionCard, fmtGbp } from "../shared";
import { RecommendationStrip } from "../recommendation-strip";

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
  onJumpTab,
}: Props) {
  const calc = computeCalc({
    analysis,
    electricityTariff,
    gasTariff,
    selection,
  });
  const cost = calc.cost;

  const noTechSelected =
    !selection.hasSolar && !selection.hasBattery && !selection.hasHeatPump;

  return (
    <div className="space-y-6">
      {/* Plan-builder — moved here from the shell-level recommendation
          strip. This is the right home for it: the toggles drive the
          cost figures + (soon) the savings calc engine that lives on
          this very tab. The shell now shows just an eligibility
          checklist instead — much tighter use of vertical space. */}
      <RecommendationStrip
        analysis={analysis}
        selection={selection}
        setSelection={setSelection}
        onJumpTab={onJumpTab}
      />

      {/* Three-scenario card — placeholder while the calc engine is
          rebuilt. The toggles above still drive selection so the
          cost breakdown below stays responsive. */}
      <SectionCard
        title="Three ways to think about it"
        subtitle="The same upgrades — three different ways to pay for them."
        icon={<PoundSterling className="w-5 h-5" />}
      >
        {noTechSelected ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pick at least one upgrade in the plan above to see the numbers.
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-navy">
              Savings calculation rebuilding
            </p>
            <p className="mt-2 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              We&rsquo;re reworking how we model your bills, payback and
              finance scenarios so the numbers are bulletproof. The cost
              breakdown below is live and accurate today.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Cost breakdown — line-item view of what makes up the upfront
          figure. Pure maths, no calc engine needed, so we keep this
          rendering today. */}
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
