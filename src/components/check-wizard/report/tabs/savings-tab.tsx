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
import {
  BATTERY_COST_PER_KWH,
  computeCostBreakdown,
  monthlyLoanPayment,
} from "@/lib/savings/plan";
import type { YesNoUnsure } from "../../types";
import type { ReportSelection } from "../report-shell";
import { EnergyBreakdownCard, type BreakdownData } from "../breakdown-card";
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

const DEBOUNCE_MS = 300;

type ScenarioKey = "donothing" | "payup" | "finance";

export function SavingsTab({
  analysis,
  electricityTariff,
  gasTariff,
  selection,
  financingPreference,
}: Props) {
  const [years] = useState(FINANCE_DEFAULTS.defaultYears);
  // batteryKwh + panelCount come from the shell-level selection — the
  // Solar tab owns the sizing controls so changes propagate everywhere.
  const batteryKwh = selection.batteryKwh;
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

  // Derive everything we need from the API rows + a proper PMT-based
  // finance calculation we own end-to-end.
  //
  // The Octopus API includes its own finance maths in Total_Monthly_Bill
  // but we don't fully trust it (the heat-pump grant treatment is
  // opaque, and users were getting payback figures of "0.5 months"
  // which made no sense). So we use the API's BAU bills + export
  // revenue figures, and apply our own amortisation on the post-grant
  // upfront cost so the 6.9% / 10y promise is verifiable arithmetic.
  const scenarios = useMemo(() => {
    if (!rows || !rows.length) return null;
    const year1 = rows.slice(0, 12);

    // Do-nothing baseline — BAU bills.
    const doNothingAnnual = year1.reduce((acc, r) => acc + r.BAU_Total, 0);

    // Strip finance out of the API's "selected" bill so we have a pure
    // bill-after-upgrades figure (no double-counting our own loan calc).
    const billsOnlyAnnual = year1.reduce(
      (acc, r) => acc + (r.Total_Monthly_Bill - r.Selected_TotalFinanceCost),
      0,
    );

    // Export revenue is INSIDE Total_Monthly_Bill (it's already netted off).
    // Surface separately because users want to see it called out.
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
      billsOnlyAnnual,
      exportRevenueY1,
      exportKwhY1,
    };
  }, [rows]);

  // Cost breakdown — the user wants this as a transparent line-item
  // calculation, not buried in a black-box "post-grant range".
  //   Heat pump install (gross)
  //   Solar install
  //   Battery install (size × £/kWh)
  //   = Total install
  //   - BUS grant (heat pump only)
  //   = Net upfront cost
  // Single source of truth — same util that the Solar tab + recommendation
  // strip use, so changing battery size on the Solar tab updates the
  // breakdown here. `hpGrant` was renamed `busGrant` in the util; aliased
  // back below to keep the existing JSX rendering happy.
  const costBreakdownRaw = useMemo(
    () =>
      computeCostBreakdown(
        analysis,
        {
          hasSolar: selection.hasSolar,
          hasBattery: selection.hasBattery,
          hasHeatPump: selection.hasHeatPump,
          panelCount: selection.panelCount,
          batteryKwh,
        },
        scenarios?.exportRevenueY1 ?? 0,
        scenarios?.exportKwhY1 ?? 0,
      ),
    [
      analysis,
      selection.hasSolar,
      selection.hasBattery,
      selection.hasHeatPump,
      selection.panelCount,
      batteryKwh,
      scenarios?.exportRevenueY1,
      scenarios?.exportKwhY1,
    ],
  );
  const costBreakdown = {
    ...costBreakdownRaw,
    hpGrant: costBreakdownRaw.busGrant,
  };

  const financeMonthly = monthlyLoanPayment(
    costBreakdown.netUpfront,
    FINANCE_DEFAULTS.solarLoanAprPct, // 6.9%
    FINANCE_DEFAULTS.defaultSolarLoanTermYears, // 10y
  );
  const financeTotalCost = financeMonthly * 12 * FINANCE_DEFAULTS.defaultSolarLoanTermYears;

  // Per-scenario annual cost.
  const billsOnlyAnnual = scenarios?.billsOnlyAnnual ?? 0;
  const payUpAnnual = billsOnlyAnnual; // bills only; upfront paid at year 0
  const financeAnnual = billsOnlyAnnual + financeMonthly * 12;

  // Per-scenario payback.
  // Pay-up-front: year N where Σ(annual saving vs BAU) ≥ net upfront cost.
  // Annual saving = doNothing - billsOnly. Assume constant saving
  // (in reality it grows with energy inflation but the API gives us the
  // first-year figure; close enough for headline).
  const annualBillSaving = scenarios
    ? scenarios.doNothingAnnual - billsOnlyAnnual
    : 0;
  const payUpPaybackYears =
    annualBillSaving > 0 && costBreakdown.netUpfront > 0
      ? costBreakdown.netUpfront / annualBillSaving
      : null;

  // (upfront cost lives in costBreakdown.netUpfront — single source of truth)

  const noTechSelected =
    !selection.hasSolar && !selection.hasBattery && !selection.hasHeatPump;

  // Build the BreakdownData object the EnergyBreakdownCard consumes.
  // Same shape + values as the Solar tab's breakdown so the user sees
  // identical figures across both pages.
  const breakdownData = useMemo<BreakdownData | null>(() => {
    if (!rows || !rows.length) return null;
    const y1 = rows.slice(0, 12);
    const annualBill = y1.reduce((acc, r) => acc + r.BAU_Total, 0);
    const annualKwh = Math.round(
      y1.reduce(
        (acc, r) => acc + r.CurrentElectricityKwh + r.CurrentGasKwh,
        0,
      ),
    );
    const solarKwhYear = selection.hasSolar
      ? Math.round(y1.reduce((acc, r) => acc + r.SolarGeneration_kWh, 0))
      : null;
    const exportKwhYear = selection.hasSolar
      ? Math.round(y1.reduce((acc, r) => acc + r.ExportToGrid_kWh, 0))
      : null;
    const exportRevenueYear = selection.hasSolar
      ? y1.reduce((acc, r) => acc + r.Selected_ExportRevenue, 0)
      : null;
    return {
      annualBill,
      annualKwh,
      solarKwhYear,
      exportKwhYear,
      exportRevenueYear,
      postUpgradeAnnualBill: payUpAnnual,
      financeMonthly,
      financeAnnual: financeMonthly * 12,
      // Net annual position for whichever scenario the user is viewing.
      netAnnualPosition:
        activeScenario === "finance"
          ? financeAnnual - annualBill
          : payUpAnnual - annualBill,
    };
  }, [
    rows,
    selection.hasSolar,
    payUpAnnual,
    financeAnnual,
    financeMonthly,
    activeScenario,
  ]);

  return (
    <div className="space-y-6">
      {/* The plain-English breakdown — same component used on Solar tab.
          Shows whichever scenario the user has active in "Three ways to
          think about it" below. */}
      {!noTechSelected && breakdownData && (
        <EnergyBreakdownCard
          title="Your bill, in plain English"
          subtitle={
            activeScenario === "finance"
              ? "Read it top to bottom — finance scenario."
              : "Read it top to bottom — pay-up-front scenario."
          }
          data={breakdownData}
          showFinance={activeScenario === "finance"}
        />
      )}

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
        ) : scenarios ? (
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
              paybackYears={null}
              loading={loading}
            />
            <ScenarioCard
              kind="payup"
              active={activeScenario === "payup"}
              onSelect={() => setActiveScenario("payup")}
              title="Pay up front"
              tagline="Lower bills from day one"
              annualBill={payUpAnnual}
              annualSavings={annualBillSaving}
              upfrontCost={costBreakdown.netUpfront}
              monthlyFinance={null}
              paybackYears={payUpPaybackYears}
              loading={loading}
            />
            <ScenarioCard
              kind="finance"
              active={activeScenario === "finance"}
              onSelect={() => setActiveScenario("finance")}
              title="Finance over 10 years"
              tagline="Spread the cost · 6.9% APR"
              annualBill={financeAnnual}
              annualSavings={
                scenarios.doNothingAnnual - financeAnnual
              }
              upfrontCost={null}
              monthlyFinance={financeMonthly}
              paybackYears={null}
              financeTotalCost={financeTotalCost}
              loading={loading}
            />
          </div>
        ) : null}

        {!noTechSelected && scenarios && (
          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600 leading-relaxed">
            {activeScenario === "donothing" ? (
              <p>
                Carrying on as you are means about{" "}
                <strong className="text-navy">
                  {fmtGbp(scenarios.doNothingAnnual / 12)}/month
                </strong>{" "}
                in energy bills today, and that figure tends to drift up 4–6%
                a year. Pick another scenario to see what changes.
              </p>
            ) : activeScenario === "payup" ? (
              <p>
                Pay the{" "}
                <strong className="text-navy">
                  {fmtGbp(costBreakdown.netUpfront, { compact: true })}
                </strong>{" "}
                up front and your monthly bill drops to about{" "}
                <strong className="text-navy">
                  {fmtGbp(payUpAnnual / 12)}
                </strong>
                . You&rsquo;d save roughly{" "}
                <strong className="text-emerald-700">
                  {fmtGbp(annualBillSaving, { compact: true })}/year
                </strong>{" "}
                on bills.
                {payUpPaybackYears != null && (
                  <>
                    {" "}
                    The upgrades pay for themselves in about{" "}
                    <strong className="text-emerald-700">
                      {payUpPaybackYears.toFixed(1)} years
                    </strong>{" "}
                    of bill savings, then it&rsquo;s pure profit.
                  </>
                )}
              </p>
            ) : (
              <p>
                Spread the cost over 10 years at 6.9% APR — that&rsquo;s{" "}
                <strong className="text-navy">
                  {fmtGbp(financeMonthly)}/month
                </strong>{" "}
                in loan payments, on top of your post-upgrade bill of{" "}
                <strong className="text-navy">{fmtGbp(payUpAnnual / 12)}</strong>
                . Total monthly cost:{" "}
                <strong className="text-navy">
                  {fmtGbp(financeAnnual / 12)}
                </strong>{" "}
                vs your current{" "}
                <strong className="text-navy">
                  {fmtGbp(scenarios.doNothingAnnual / 12)}
                </strong>
                .{" "}
                {financeAnnual < scenarios.doNothingAnnual ? (
                  <>
                    You&rsquo;re{" "}
                    <strong className="text-emerald-700">
                      {fmtGbp(
                        (scenarios.doNothingAnnual - financeAnnual) / 12,
                      )}
                      /month better off
                    </strong>{" "}
                    from day one. After year 10 the loan&rsquo;s paid off and
                    you keep the full bill saving.
                  </>
                ) : (
                  <>
                    You&rsquo;re{" "}
                    <strong className="text-amber-700">
                      {fmtGbp(
                        (financeAnnual - scenarios.doNothingAnnual) / 12,
                      )}
                      /month worse off
                    </strong>{" "}
                    until the loan&rsquo;s paid off in year 10 — then you&rsquo;re
                    all upside.
                  </>
                )}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Includes export earnings from solar you don&rsquo;t use
              yourself, energy-bill inflation, and supplier standing
              charges. Doesn&rsquo;t include planning fees or any
              electrical-panel upgrades — your installer will price those
              in the formal quote.
            </p>
          </div>
        )}

        {/* Cost breakdown — explicit line-item view of what makes up
            the upfront figure. The user wanted transparent maths. */}
        {!noTechSelected && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              How the upfront cost adds up
            </p>
            <dl className="text-sm space-y-1.5">
              {selection.hasHeatPump && (
                <BreakdownRow
                  label="Heat pump install"
                  value={fmtGbp(costBreakdown.hpGross, { compact: true })}
                />
              )}
              {selection.hasSolar && (
                <BreakdownRow
                  label="Solar install"
                  value={fmtGbp(costBreakdown.solarCost, { compact: true })}
                />
              )}
              {selection.hasBattery && (
                <BreakdownRow
                  label={`Battery (${batteryKwh} kWh)`}
                  value={fmtGbp(costBreakdown.batteryCost, { compact: true })}
                />
              )}
              <div className="border-t border-slate-100 my-2" />
              {costBreakdown.hpGrant > 0 && (
                <BreakdownRow
                  label="BUS grant (heat pump)"
                  value={`−${fmtGbp(costBreakdown.hpGrant, { compact: true })}`}
                  positive
                />
              )}
              {scenarios && scenarios.exportRevenueY1 > 1 && (
                <BreakdownRow
                  label="Year-1 export earnings"
                  value={`−${fmtGbp(scenarios.exportRevenueY1, { compact: true })}`}
                  positive
                  hint="Solar you sell to the grid in year 1"
                />
              )}
              <div className="border-t border-slate-100 my-2" />
              <BreakdownRow
                label="Net upfront cost"
                value={fmtGbp(costBreakdown.netUpfront, { compact: true })}
                strong
              />
              {scenarios && scenarios.exportRevenueY1 > 1 && (
                <BreakdownRow
                  label="After year-1 export earnings"
                  value={fmtGbp(
                    Math.max(
                      0,
                      costBreakdown.netUpfront - scenarios.exportRevenueY1,
                    ),
                    { compact: true },
                  )}
                  hint="Roughly what you'd be out of pocket end of year 1 (pay-up-front scenario)"
                />
              )}
            </dl>
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
  paybackYears,
  financeTotalCost,
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
  paybackYears: number | null;
  financeTotalCost?: number;
  loading: boolean;
}) {
  const monthly = annualBill / 12;
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
          {paybackYears != null && (
            <Row label="Pays for itself in">
              <span className="font-semibold text-emerald-700">
                {paybackYears < 1
                  ? `${(paybackYears * 12).toFixed(0)} months`
                  : `${paybackYears.toFixed(1)} years`}
              </span>
            </Row>
          )}
          {monthlyFinance != null && (
            <Row label="Loan payment (in monthly)">
              <span className="font-medium text-coral-dark">
                {fmtGbp(monthlyFinance, { compact: true })}/mo
              </span>
            </Row>
          )}
          {financeTotalCost != null && (
            <Row label="Total cost over 10y">
              <span className="font-medium text-navy">
                {fmtGbp(financeTotalCost, { compact: true })}
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
