"use client";

// SavingsReport — the live, API-driven savings projection rendered
// inside the Savings tab. Sections from the spec:
//
//   A  Current spend                  → "What you spend today"
//   C  Consumer narrative             → "How it works"
//   D  10-year outlook + table        → cumulative chart + comparison
//   E  Monthly comparison             → 4 cards
//   F  Bottom line                    → 10yr cost, savings, payback,
//                                       bill reduction %
//   G  Your options                   → 3 cards (upfront / loan /
//                                       mortgage), best-value starred
//
// Section B (recommendations) is already rendered by the
// RecommendationStrip at the top of the Savings tab. Section H
// (disclaimer) is already in the report shell footer.
//
// All numbers come from the API response — this component is
// presentation-only.

import { AlertCircle, BadgeCheck, Loader2 } from "lucide-react";
import type {
  CalculateRequest,
  CalculateResponse,
} from "@/lib/savings/scenarios-schema";
import type { FinancingInputs } from "@/lib/savings/build-request";
import { SectionCard, fmtGbp } from "../shared";
import { CumulativeCostChart } from "./cumulative-chart";

type Scenario = "doNothing" | "finance" | "payUpfront" | "mortgage";

const SCENARIO_COLORS: Record<Scenario, string> = {
  doNothing: "#94a3b8", // slate — neutral baseline
  finance: "#0ea5e9", // sky — neutral finance hue
  payUpfront: "#f59e0b", // amber — front-loaded pain
  mortgage: "#10b981", // emerald — typically the best value
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  doNothing: "Do nothing",
  finance: "Personal loan",
  payUpfront: "Pay upfront",
  mortgage: "Add to mortgage",
};

interface Props {
  result: CalculateResponse | null;
  loading: boolean;
  error: string | null;
  request: CalculateRequest;
  financing: FinancingInputs;
}

export function SavingsReport({
  result,
  loading,
  error,
  request,
  financing,
}: Props) {
  // Show inline error banner; the cost-breakdown card below this in
  // the parent Savings tab is independent and stays rendered.
  if (error) {
    return (
      <SectionCard>
        <div className="flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-0.5 text-xs text-red-600">{error}</p>
          </div>
        </div>
      </SectionCard>
    );
  }

  // First-load: API request in flight, no prior result to fall back
  // to. Show a loader where the report would render.
  if (!result) {
    return (
      <SectionCard>
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Crunching the numbers&hellip;
        </div>
      </SectionCard>
    );
  }

  // Which scenarios to include in chart/table/cards/etc. — driven by
  // the Financing-options checkboxes in the panel above.
  const showFinance = financing.wantFinance;
  const showMortgage = financing.wantMortgage;

  return (
    <div className="space-y-6">
      <CurrentSpendSection result={result} />
      <NarrativeSection result={result} />
      <TenYearOutlookSection
        result={result}
        showFinance={showFinance}
        showMortgage={showMortgage}
      />
      <MonthlyComparisonSection
        result={result}
        showFinance={showFinance}
        showMortgage={showMortgage}
      />
      <BottomLineSection
        result={result}
        showFinance={showFinance}
        showMortgage={showMortgage}
      />
      <YourOptionsSection
        result={result}
        request={request}
        showFinance={showFinance}
        showMortgage={showMortgage}
      />
      {loading && (
        <p className="text-xs text-slate-400 inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Updating&hellip;
        </p>
      )}
    </div>
  );
}

// ─── Section A: Current spend ──────────────────────────────────────────

function CurrentSpendSection({ result }: { result: CalculateResponse }) {
  const cs = result.currentSpend;
  const tenYr = result.summary.tenYearCostDoNothing;

  return (
    <SectionCard
      title="What you spend today"
      subtitle="Your current annual energy bill at the rates you provided."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Annual gas" value={fmtGbp(cs.annualGasSpend)} />
        <Stat
          label="Annual electricity"
          value={fmtGbp(cs.annualElectricitySpend)}
        />
        <Stat
          label="Total / year"
          value={fmtGbp(cs.totalAnnualEnergySpend)}
          strong
        />
      </div>
      <p className="mt-3 text-xs text-slate-600">
        If energy prices keep rising (~4% per year), you&rsquo;ll have spent{" "}
        <strong className="text-navy">{fmtGbp(tenYr)}</strong> on energy over
        the next 10 years.
      </p>
    </SectionCard>
  );
}

// ─── Section C: Consumer narrative ─────────────────────────────────────

function NarrativeSection({ result }: { result: CalculateResponse }) {
  const n = result.consumerNarrative;
  const items: Array<[string, string, string | null]> = [
    ["☀️", "Solar generation", n.solarGenerationStatement],
    ["🔋", "Battery", n.batteryStatement],
    ["🌡️", "Heat pump", n.heatPumpStatement],
    ["💷", "Export earnings", n.exportStatement],
  ];

  return (
    <SectionCard
      title="How your plan works"
      subtitle="What changes about your energy use, in plain English."
    >
      <ul className="space-y-3">
        {items
          .filter(([, , body]) => body && !/^No /.test(body))
          .map(([icon, title, body]) => (
            <li key={title} className="flex items-start gap-3">
              <span aria-hidden="true" className="text-xl mt-0.5">
                {icon}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                  {title}
                </p>
                <p className="text-sm text-navy leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
      </ul>
    </SectionCard>
  );
}

// ─── Section D: 10-year outlook ────────────────────────────────────────

function TenYearOutlookSection({
  result,
  showFinance,
  showMortgage,
}: {
  result: CalculateResponse;
  showFinance: boolean;
  showMortgage: boolean;
}) {
  const proj = result.projections;
  const series: Array<{
    key: Scenario;
    label: string;
    color: string;
    cum: number[];
    annual: number[];
  }> = [
    {
      key: "doNothing",
      label: SCENARIO_LABELS.doNothing,
      color: SCENARIO_COLORS.doNothing,
      cum: proj.doNothing.cumulativeCost,
      annual: proj.doNothing.annualCost,
    },
    {
      key: "payUpfront",
      label: SCENARIO_LABELS.payUpfront,
      color: SCENARIO_COLORS.payUpfront,
      cum: proj.payUpfront.cumulativeCost,
      annual: proj.payUpfront.annualCost,
    },
  ];
  if (showFinance) {
    series.splice(1, 0, {
      key: "finance",
      label: SCENARIO_LABELS.finance,
      color: SCENARIO_COLORS.finance,
      cum: proj.finance.cumulativeCost,
      annual: proj.finance.annualCost,
    });
  }
  if (showMortgage) {
    series.push({
      key: "mortgage",
      label: SCENARIO_LABELS.mortgage,
      color: SCENARIO_COLORS.mortgage,
      cum: proj.mortgage.cumulativeCost,
      annual: proj.mortgage.annualCost,
    });
  }

  const tableYears = [1, 3, 5, 7, 10];
  const idxFromYear = (yr: number) => yr - 1;

  return (
    <SectionCard
      title="Your 10-year outlook"
      subtitle="Cumulative cost across each scenario — chart + table both show the same data."
    >
      <CumulativeCostChart
        years={proj.years}
        series={series.map((s) => ({
          key: s.key,
          label: s.label,
          values: s.cum,
          color: s.color,
        }))}
        yAxisLabel="Cumulative cost (£)"
      />

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Scenario
              </th>
              {tableYears.map((yr) => (
                <th
                  key={yr}
                  className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 tabular-nums"
                >
                  Yr {yr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.key} className="border-t border-slate-100">
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-sm font-medium text-navy">
                      {s.label}
                    </span>
                  </span>
                </td>
                {tableYears.map((yr) => (
                  <td
                    key={yr}
                    className="py-2 px-3 text-sm text-navy tabular-nums"
                  >
                    {fmtGbp(s.annual[idxFromYear(yr)])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          Annual cost (not cumulative) shown in the table — chart shows
          cumulative.
        </p>
      </div>
    </SectionCard>
  );
}

// ─── Section E: Monthly comparison ─────────────────────────────────────

function MonthlyComparisonSection({
  result,
  showFinance,
  showMortgage,
}: {
  result: CalculateResponse;
  showFinance: boolean;
  showMortgage: boolean;
}) {
  const m = result.monthlyComparison;
  const best = result.consumerNarrative.bestValueOption;

  const cards: Array<{
    key: Scenario;
    label: string;
    energy: number;
    payment: number;
    total: number;
  }> = [
    {
      key: "doNothing",
      label: SCENARIO_LABELS.doNothing,
      energy: m.doNothing.energyBills,
      payment: m.doNothing.payment,
      total: m.doNothing.totalMonthly,
    },
    {
      key: "payUpfront",
      label: SCENARIO_LABELS.payUpfront,
      energy: m.payUpfront.energyBills,
      payment: m.payUpfront.payment,
      total: m.payUpfront.totalMonthly,
    },
  ];
  if (showFinance) {
    cards.splice(1, 0, {
      key: "finance",
      label: SCENARIO_LABELS.finance,
      energy: m.finance.energyBills,
      payment: m.finance.payment,
      total: m.finance.totalMonthly,
    });
  }
  if (showMortgage) {
    cards.push({
      key: "mortgage",
      label: SCENARIO_LABELS.mortgage,
      energy: m.mortgage.energyBills,
      payment: m.mortgage.payment,
      total: m.mortgage.totalMonthly,
    });
  }

  return (
    <SectionCard
      title="What you pay each month"
      subtitle="Year-1 monthly outgoings — energy bills + finance/mortgage payment."
    >
      {/* Monthly cards have a top margin so the floating "Best value"
          badge (which extends above the card border) doesn't get
          clipped by the grid gap. Same badge style as the option
          cards below — single source of truth via <BestValueBadge>. */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-5">
        {cards.map((c) => (
          <div
            key={c.key}
            className={`relative rounded-xl border p-4 ${
              best === c.key
                ? "border-coral bg-coral-pale/30 shadow-sm"
                : "border-slate-200 bg-white"
            }`}
          >
            {best === c.key && <BestValueBadge />}
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-navy tabular-nums">
              {fmtGbp(c.total)}
              <span className="text-sm text-slate-500 font-medium">/mo</span>
            </p>
            <dl className="mt-3 space-y-1 text-xs">
              <RowKv label="Energy bills" value={fmtGbp(c.energy) + "/mo"} />
              <RowKv
                label="Loan / mortgage"
                value={c.payment > 0 ? `${fmtGbp(c.payment)}/mo` : "—"}
              />
            </dl>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section F: The bottom line ────────────────────────────────────────

function BottomLineSection({
  result,
  showFinance,
  showMortgage,
}: {
  result: CalculateResponse;
  showFinance: boolean;
  showMortgage: boolean;
}) {
  const s = result.summary;
  const reductionPct = Math.round(
    result.consumerNarrative.billReductionPercent * 100,
  );

  const rows: Array<{
    key: Scenario;
    label: string;
    tenYear: number;
    savings: number;
    payback: number | null;
  }> = [
    {
      key: "payUpfront",
      label: SCENARIO_LABELS.payUpfront,
      tenYear: s.tenYearCostPayUpfront,
      savings: s.savingsUpfrontVsDoNothing,
      payback: s.paybackYearUpfront,
    },
  ];
  if (showFinance) {
    rows.unshift({
      key: "finance",
      label: SCENARIO_LABELS.finance,
      tenYear: s.tenYearCostFinance,
      savings: s.savingsFinanceVsDoNothing,
      payback: s.paybackYearFinance,
    });
  }
  if (showMortgage) {
    rows.push({
      key: "mortgage",
      label: SCENARIO_LABELS.mortgage,
      tenYear: s.tenYearCostMortgage,
      savings: s.savingsMortgageVsDoNothing,
      payback: s.paybackYearMortgage,
    });
  }

  return (
    <SectionCard
      title="The bottom line"
      subtitle={`Bill reduction (year 1, energy only): ${reductionPct}%`}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Option
              </th>
              <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                10-year cost
              </th>
              <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Savings vs do-nothing
              </th>
              <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payback
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="py-2 pr-4 text-sm font-medium text-navy">
                Do nothing
              </td>
              <td className="py-2 px-3 text-sm text-navy tabular-nums">
                {fmtGbp(s.tenYearCostDoNothing)}
              </td>
              <td className="py-2 px-3 text-sm text-slate-400">—</td>
              <td className="py-2 px-3 text-sm text-slate-400">—</td>
            </tr>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-100">
                <td className="py-2 pr-4 text-sm font-medium text-navy">
                  {r.label}
                </td>
                <td className="py-2 px-3 text-sm text-navy tabular-nums">
                  {fmtGbp(r.tenYear)}
                </td>
                <td
                  className={`py-2 px-3 text-sm tabular-nums font-semibold ${
                    r.savings >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {r.savings >= 0 ? "+" : ""}
                  {fmtGbp(r.savings)}
                </td>
                <td className="py-2 px-3 text-sm text-navy tabular-nums">
                  {r.payback != null ? `Year ${r.payback}` : "Not within 10 yr"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Section G: Your options ───────────────────────────────────────────

function YourOptionsSection({
  result,
  request,
  showFinance,
  showMortgage,
}: {
  result: CalculateResponse;
  request: CalculateRequest;
  showFinance: boolean;
  showMortgage: boolean;
}) {
  const ic = result.improvementCosts;
  const proj = result.projections;
  const monthly = result.monthlyComparison;
  const best = result.consumerNarrative.bestValueOption;

  const upfrontYr1Energy =
    proj.payUpfront.annualCost[0] - proj.payUpfront.upfrontCapital[0];

  // Card count: pay-upfront is always shown. Finance and mortgage are
  // each opt-in via the Financing-options checkboxes. Pick the grid
  // template that fits.
  const cardCount = 1 + (showFinance ? 1 : 0) + (showMortgage ? 1 : 0);
  const gridCls =
    cardCount === 3
      ? "lg:grid-cols-3"
      : cardCount === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-1";

  return (
    <div className={`grid grid-cols-1 ${gridCls} gap-3`}>
      <OptionCard
        title="Pay upfront"
        starred={best === "payUpfront"}
        primary={fmtGbp(ic.totalImprovementCost)}
        primaryNote="One-off investment"
        rows={[
          {
            label: "Year-1 ongoing energy cost",
            value: fmtGbp(upfrontYr1Energy),
          },
          {
            label: "vs today",
            value: fmtGbp(result.currentSpend.totalAnnualEnergySpend),
          },
        ]}
      />

      {showFinance && (
        <OptionCard
          title="Personal loan"
          starred={best === "finance"}
          primary={`${fmtGbp(ic.monthlyLoanPayment)}/mo`}
          primaryNote="Loan payment"
          rows={[
            {
              label: "Term",
              value: `${request.financing.loanTermMonths / 12} years @ ${(
                request.financing.loanApr * 100
              ).toFixed(1)}% APR`,
            },
            {
              label: "No upfront cost",
              value: "—",
            },
          ]}
        />
      )}

      {showMortgage && (
        <OptionCard
          title="Add to mortgage"
          starred={best === "mortgage"}
          primary={`${fmtGbp(ic.monthlyMortgageAddition)}/mo`}
          primaryNote="Extra mortgage payment (capital + interest)"
          rows={[
            {
              label: "Term",
              value: `${request.financing.mortgageTermYears} years @ ${(
                request.financing.mortgageRate * 100
              ).toFixed(1)}%`,
            },
            {
              label: "Total monthly outgoings",
              value: `${fmtGbp(monthly.mortgage.totalMonthly)}/mo`,
              tone: "navy",
            },
            {
              label: "vs doing nothing",
              value: `${fmtGbp(monthly.doNothing.totalMonthly)}/mo`,
            },
            ...(result.summary.paybackYearMortgage != null
              ? [
                  {
                    label: "Pays for itself",
                    value: `Year ${result.summary.paybackYearMortgage}`,
                    tone: "good" as const,
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}

// ─── Atoms ─────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1 tabular-nums ${strong ? "text-2xl font-bold text-navy" : "text-lg font-semibold text-navy"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function RowKv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-navy font-medium tabular-nums">{value}</dd>
    </div>
  );
}

// Single source of truth for the "Best value" badge across the
// monthly-comparison cards and the option cards. Floats above the
// card border (-top-2) with a BadgeCheck icon — was inconsistent
// before (one used <Star> + sat inside, the other used <BadgeCheck>
// + floated).
function BestValueBadge() {
  return (
    <span className="absolute -top-2 right-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 bg-coral text-white shadow-sm">
      <BadgeCheck className="w-3 h-3" />
      Best value
    </span>
  );
}

function OptionCard({
  title,
  starred,
  primary,
  primaryNote,
  rows,
}: {
  title: string;
  starred?: boolean;
  primary: string;
  primaryNote: string;
  rows: Array<{
    label: string;
    value: string;
    tone?: "navy" | "good";
  }>;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-4 sm:p-5 ${
        starred
          ? "border-coral bg-coral-pale/30 shadow-sm"
          : "border-slate-200 bg-white"
      }`}
    >
      {starred && <BestValueBadge />}
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-navy tabular-nums">
        {primary}
      </p>
      <p className="text-xs text-slate-500">{primaryNote}</p>
      <dl className="mt-4 space-y-1.5 text-xs">
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-3 border-t border-slate-100 pt-1.5 first:border-0 first:pt-0"
          >
            <dt className="text-slate-600">{r.label}</dt>
            <dd
              className={`font-medium tabular-nums ${
                r.tone === "good"
                  ? "text-emerald-700 font-semibold"
                  : r.tone === "navy"
                    ? "text-navy font-semibold"
                    : "text-navy"
              }`}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
