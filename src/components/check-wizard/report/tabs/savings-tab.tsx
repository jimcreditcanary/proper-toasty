"use client";

// Savings tab — three-scenario cost breakdown.
//
// Spec (Apr 2026):
//   - Three scenarios side-by-side: Do nothing / Pay up front / Finance
//     at 6.9% over 10 years.
//   - Toggles for solar / battery / heat pump up top. Battery is a slave
//     to solar (handled at the shell level — disabled state shown here).
//   - Default scenario opened depends on Step 3 financingPreference:
//     "yes" / "unsure" → finance, "no" → pay up front, null → finance.
//   - Export earnings included (the calculator API already nets them
//     into Total_Monthly_Bill via Selected_ExportRevenue).
//   - Bigger charts than the old SavingsCalculator — see big-charts.tsx.
//   - No "Octopus" anywhere in user-facing copy. The API stays the same
//     (we still proxy through /api/savings/calculate which calls them
//     under the hood) but we describe it generically.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  PoundSterling,
  Sun,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { SavingsCalculateResult } from "@/lib/schemas/savings";
import { FINANCE_DEFAULTS } from "@/lib/config/finance";
import {
  deriveAnnualBills,
  deriveCurve,
  deriveHeadline,
} from "@/lib/savings/derive";
import type { YesNoUnsure } from "../../types";
import type { ReportSelection } from "../report-shell";
import { SectionCard, fmtGbp } from "../shared";
import { BigAnnualBillChart, BigSavingsCurveChart } from "../big-charts";

interface Props {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  selection: ReportSelection;
  setSelection: (s: ReportSelection) => void;
  financingPreference: YesNoUnsure | null;
}

// Battery cost benchmark: ~£700/kWh for a fully-installed lithium battery
// system in the UK (covers the cells, inverter, install, commissioning).
// Used for the "pay up front" upfront cost — finance scenarios use the
// loan payments straight from the calculator API.
const BATTERY_COST_PER_KWH = 700;

const DEBOUNCE_MS = 300;

type ScenarioKey = "donothing" | "payup" | "finance";

export function SavingsTab({
  analysis,
  electricityTariff,
  gasTariff,
  selection,
  setSelection,
  financingPreference,
}: Props) {
  const [years] = useState(FINANCE_DEFAULTS.defaultYears);
  const [batteryKwh, setBatteryKwh] = useState<number>(
    FINANCE_DEFAULTS.defaultBatteryKwh,
  );
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>(() =>
    financingPreference === "no" ? "payup" : "finance",
  );
  const [result, setResult] = useState<SavingsCalculateResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Re-fire calculator on any input change.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void run();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selection.hasSolar,
    selection.hasBattery,
    selection.hasHeatPump,
    batteryKwh,
    years,
  ]);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/savings/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          electricityTariff,
          gasTariff,
          inputs: {
            hasSolar: selection.hasSolar,
            hasBattery: selection.hasBattery,
            hasHeatPump: selection.hasHeatPump,
            batteryKwh,
            years,
            exportPrice: FINANCE_DEFAULTS.defaultExportPrice,
            solarLoanTermYears: FINANCE_DEFAULTS.defaultSolarLoanTermYears,
            batteryLoanTermYears:
              FINANCE_DEFAULTS.defaultBatteryLoanTermYears,
          },
        }),
      });
      const json = (await res.json()) as SavingsCalculateResult;
      setResult(json);
    } catch (err) {
      setResult({
        ok: false,
        request: result?.request ?? ({} as SavingsCalculateResult["request"]),
        response: null,
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  const rows = result?.response ?? null;
  const headline = useMemo(() => (rows ? deriveHeadline(rows) : null), [rows]);
  const annualBills = useMemo(
    () => (rows ? deriveAnnualBills(rows) : []),
    [rows],
  );
  const curve = useMemo(() => (rows ? deriveCurve(rows) : []), [rows]);

  // Derive the three scenarios from the API rows.
  const scenarios = useMemo(() => {
    if (!rows || !rows.length) return null;
    const year1 = rows.slice(0, 12);

    // Do nothing — sum BAU.
    const doNothingAnnual = year1.reduce((acc, r) => acc + r.BAU_Total, 0);

    // Finance scenario — already includes loan payments in Total_Monthly_Bill.
    const financeAnnual = year1.reduce(
      (acc, r) => acc + r.Total_Monthly_Bill,
      0,
    );

    // Pay up front — same as finance but back out the loan payments.
    const totalFinanceCostY1 = year1.reduce(
      (acc, r) => acc + r.Selected_TotalFinanceCost,
      0,
    );
    const payUpAnnual = financeAnnual - totalFinanceCostY1;

    // Export revenue — solar you generated but didn't use, sold to the grid.
    // Surfaced separately because it's the question users ask most often.
    const exportRevenueY1 = year1.reduce(
      (acc, r) => acc + r.Selected_ExportRevenue,
      0,
    );
    const exportKwhY1 = year1.reduce(
      (acc, r) => acc + r.ExportToGrid_kWh,
      0,
    );

    return {
      doNothingAnnual,
      financeAnnual,
      payUpAnnual,
      totalFinanceCostY1,
      exportRevenueY1,
      exportKwhY1,
    };
  }, [rows]);

  // Upfront cost — only matters for the Pay-up-front scenario, but we
  // surface it everywhere for clarity. Uses the midpoint of the heat-pump
  // post-grant range, the solar install cost, and a flat £/kWh battery
  // benchmark.
  const upfrontCost = useMemo(() => {
    let total = 0;
    if (selection.hasHeatPump) {
      const range = analysis.finance.heatPump.estimatedNetInstallCostRangeGBP;
      if (range) total += (range[0] + range[1]) / 2;
    }
    if (selection.hasSolar) {
      total += analysis.finance.solar.installCostGBP ?? 0;
    }
    if (selection.hasBattery) {
      total += batteryKwh * BATTERY_COST_PER_KWH;
    }
    return total;
  }, [
    selection.hasHeatPump,
    selection.hasSolar,
    selection.hasBattery,
    batteryKwh,
    analysis.finance.heatPump.estimatedNetInstallCostRangeGBP,
    analysis.finance.solar.installCostGBP,
  ]);

  const noTechSelected =
    !selection.hasSolar && !selection.hasBattery && !selection.hasHeatPump;

  return (
    <div className="space-y-6">
      {/* Tech toggles + battery slider used to live here. They're now
          redundant with the persistent recommendation strip in the
          report shell — keeping a duplicate set of toggles confused
          users about which one was source-of-truth. The battery sizing
          slider moved to the Solar & battery tab where the rest of the
          battery decision-making lives. */}

      {/* The three scenarios */}
      <SectionCard
        title="Three ways to think about it"
        subtitle="The same upgrades — three different ways to pay for them."
        icon={<PoundSterling className="w-5 h-5" />}
      >
        {noTechSelected ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Pick at least one upgrade above to see the numbers.
          </div>
        ) : !rows && loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-12 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Crunching the numbers…
          </div>
        ) : result?.ok === false ? (
          <div className="text-sm text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>
              Couldn&rsquo;t calculate live savings — {result.error}. The
              estimates on the Heat Pump and Solar tabs still apply.
            </span>
          </div>
        ) : scenarios && headline ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <ScenarioCard
              kind="donothing"
              active={activeScenario === "donothing"}
              onSelect={() => setActiveScenario("donothing")}
              title="Do nothing"
              tagline="Carry on with what you've got"
              annualBill={scenarios.doNothingAnnual}
              annualSavings={null}
              upfrontCost={null}
              monthlyFinance={null}
              loading={loading}
            />
            <ScenarioCard
              kind="payup"
              active={activeScenario === "payup"}
              onSelect={() => setActiveScenario("payup")}
              title="Pay up front"
              tagline="Lower bills from day one"
              annualBill={scenarios.payUpAnnual}
              annualSavings={
                scenarios.doNothingAnnual - scenarios.payUpAnnual
              }
              upfrontCost={upfrontCost}
              monthlyFinance={null}
              loading={loading}
            />
            <ScenarioCard
              kind="finance"
              active={activeScenario === "finance"}
              onSelect={() => setActiveScenario("finance")}
              title="Finance over 10 years"
              tagline="Spread the cost · 6.9% APR"
              annualBill={scenarios.financeAnnual}
              annualSavings={
                scenarios.doNothingAnnual - scenarios.financeAnnual
              }
              upfrontCost={null}
              monthlyFinance={scenarios.totalFinanceCostY1 / 12}
              loading={loading}
            />
          </div>
        ) : null}

        {!noTechSelected && headline && (
          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600 leading-relaxed">
            <p>
              <strong className="text-navy">Year 1 savings:</strong>{" "}
              {fmtGbp(headline.year1Savings)} — that&rsquo;s about{" "}
              <strong className="text-navy">
                {fmtGbp(headline.avgMonthlySavings)}
              </strong>{" "}
              less per month than carrying on as you are.
              {headline.paybackYears != null && (
                <>
                  {" "}
                  At this rate, the upgrades pay for themselves in around{" "}
                  <strong className="text-emerald-700">
                    {headline.paybackYears.toFixed(1)} years
                  </strong>
                  .
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Includes export earnings from solar you don&rsquo;t use
              yourself (called out below), energy-bill inflation, and
              supplier standing charges. Doesn&rsquo;t include planning
              fees or any electrical-panel upgrades — your installer
              will price those in the formal quote.
            </p>
          </div>
        )}

        {/* Export revenue callout — solar tech only. Answers the
            "do you account for selling back to the grid?" question
            with a hard number rather than a footnote. */}
        {!noTechSelected &&
          selection.hasSolar &&
          scenarios &&
          scenarios.exportRevenueY1 > 1 && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-emerald-600 border border-emerald-100">
                <Sun className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900">
                  Plus{" "}
                  <span className="text-base">
                    {fmtGbp(scenarios.exportRevenueY1, { compact: true })}
                  </span>{" "}
                  earned from selling unused solar back to the grid (year 1)
                </p>
                <p className="mt-1 text-xs text-emerald-800/80 leading-relaxed">
                  You&rsquo;d export roughly{" "}
                  <strong>
                    {Math.round(scenarios.exportKwhY1).toLocaleString()} kWh
                  </strong>{" "}
                  to the grid this year — that&rsquo;s solar you generated but
                  weren&rsquo;t home to use. Your supplier&rsquo;s SEG (Smart
                  Export Guarantee) tariff buys it from you. This is already
                  netted into the figures above.
                </p>
              </div>
            </div>
        )}
      </SectionCard>

      {/* Charts */}
      {!noTechSelected && rows && headline && (
        <>
          <SectionCard
            title="Your annual bill, year by year"
            subtitle="Slate bars = doing nothing. Coral bars = with the upgrades you've chosen. The gap is your saving."
          >
            <BigAnnualBillChart data={annualBills} />
          </SectionCard>

          <SectionCard
            title={`Cumulative savings over the next ${years} years`}
            subtitle={
              headline.paybackYears != null
                ? `Crosses break-even at ${headline.paybackYears.toFixed(1)} years.`
                : `Stays in the red across the full ${years} years for this combination — try changing the toggles.`
            }
          >
            <BigSavingsCurveChart data={curve} />
          </SectionCard>
        </>
      )}
    </div>
  );
}

// ─── Scenario card ──────────────────────────────────────────────────────────

function ScenarioCard({
  kind,
  active,
  onSelect,
  title,
  tagline,
  annualBill,
  annualSavings,
  upfrontCost,
  monthlyFinance,
  loading,
}: {
  kind: "donothing" | "payup" | "finance";
  active: boolean;
  onSelect: () => void;
  title: string;
  tagline: string;
  annualBill: number;
  annualSavings: number | null;
  upfrontCost: number | null;
  monthlyFinance: number | null;
  loading: boolean;
}) {
  const monthly = annualBill / 12;
  const monthlyPositive = monthlyFinance != null;
  const wrapper = active
    ? "border-coral bg-coral-pale/40 ring-2 ring-coral/30"
    : "border-slate-200 bg-white hover:border-slate-300";

  const accent =
    kind === "donothing"
      ? "text-slate-700"
      : kind === "payup"
        ? "text-emerald-700"
        : "text-coral-dark";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-2xl border p-5 transition-all ${wrapper} ${
        loading ? "opacity-60" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-sm text-slate-600 leading-relaxed">{tagline}</p>

      <p className={`mt-4 text-3xl font-bold tabular-nums ${accent}`}>
        {fmtGbp(monthly, { compact: true })}
        <span className="text-sm font-medium text-slate-500 ml-1">/mo</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">
        ~{fmtGbp(annualBill, { compact: true })}/year all-in
      </p>

      {annualSavings != null && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-1">
          <Row label="Saving vs. doing nothing">
            <span className="font-semibold text-emerald-700">
              {fmtGbp(annualSavings, { compact: true })}/year
            </span>
          </Row>
          {upfrontCost != null && (
            <Row label="Upfront cost (after grants)">
              <span className="font-semibold text-navy">
                {fmtGbp(upfrontCost, { compact: true })}
              </span>
            </Row>
          )}
          {monthlyPositive && (
            <Row label="Loan payment (incl. above)">
              <span className="font-medium text-coral-dark">
                {fmtGbp(monthlyFinance!, { compact: true })}/mo
              </span>
            </Row>
          )}
        </div>
      )}

      {kind === "donothing" && (
        <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
          Bills tend to drift up 4–6% a year. The chart below shows what that
          looks like over a decade.
        </div>
      )}
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

// ToggleTile removed — was duplicating the recommendation strip in the
// shell. Selection is owned at the shell level via RecommendationStrip.
