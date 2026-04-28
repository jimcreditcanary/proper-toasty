"use client";

// EnergyBreakdownCard — the simple "this is what you pay, this is what
// solar generates, this is what you save" line-by-line breakdown.
// Used on the Solar tab AND the Savings tab in identical format so the
// numbers are familiar across the report.
//
// Yearly ↔ Monthly toggle in the header — applies to all currency lines.
// (kWh values stay annual since "kWh per year" is the conventional unit.)

import { useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { fmtGbp, SectionCard } from "./shared";

export interface BreakdownData {
  // Current state
  annualBill: number;
  annualKwh: number;
  // Solar (only set if hasSolar)
  solarKwhYear: number | null;
  exportKwhYear: number | null;
  exportRevenueYear: number | null;
  // Bills after upgrades (excludes finance)
  postUpgradeAnnualBill: number;
  // Finance — only when financing
  financeMonthly: number | null;
  financeAnnual: number | null;
  // Net cash position per year (negative = better off)
  netAnnualPosition: number;
}

interface Props {
  title?: string;
  subtitle?: string;
  data: BreakdownData;
  // Whether to show the finance line. Defaults to false; when true we
  // also render a small finance-rate footnote.
  showFinance?: boolean;
}

export function EnergyBreakdownCard({
  title = "Your energy spend, simplified",
  subtitle,
  data,
  showFinance = false,
}: Props) {
  const [view, setView] = useState<"yearly" | "monthly">("yearly");
  const div = view === "yearly" ? 1 : 12;
  const suffix = view === "yearly" ? "/year" : "/month";
  const fmt = (n: number) => fmtGbp(n / div, { compact: view === "yearly" });

  const hasSolar = data.solarKwhYear != null;
  const exportRevenue = data.exportRevenueYear ?? 0;
  const billChange = data.postUpgradeAnnualBill - data.annualBill;

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {/* Yearly/Monthly toggle */}
      <div className="flex justify-end mb-4">
        <div
          role="tablist"
          aria-label="Show figures yearly or monthly"
          className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
        >
          {(["yearly", "monthly"] as const).map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(v)}
                className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors ${
                  active
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-600 hover:text-navy"
                }`}
              >
                {v === "yearly" ? "Yearly" : "Monthly"}
              </button>
            );
          })}
        </div>
      </div>

      {/* The breakdown — each line is a sentence the user can read top-down */}
      <ol className="space-y-3 text-sm">
        <Step
          number="1"
          tone="grey"
          left={
            <>
              You pay about{" "}
              <strong className="text-navy">{fmt(data.annualBill)}</strong>
              {" "}{suffix} for energy today.
            </>
          }
          right={`${data.annualKwh.toLocaleString()} kWh used per year`}
        />

        {hasSolar && data.solarKwhYear != null && (
          <Step
            number="2"
            tone="amber"
            left={
              <>
                Your solar panels would make about{" "}
                <strong className="text-navy">
                  {data.solarKwhYear.toLocaleString()} kWh per year
                </strong>
                .
              </>
            }
            right={`Free electricity straight from your roof`}
          />
        )}

        {hasSolar && data.exportKwhYear != null && exportRevenue > 0 && (
          <Step
            number="3"
            tone="green"
            left={
              <>
                What you don&rsquo;t use, you sell. Roughly{" "}
                <strong className="text-navy">
                  {data.exportKwhYear.toLocaleString()} kWh per year
                </strong>{" "}
                gets sold back, earning you{" "}
                <strong className="text-emerald-700">
                  {fmt(exportRevenue)}
                </strong>
                {" "}{suffix}.
              </>
            }
            right="From your supplier's export tariff (SEG)"
          />
        )}

        <Step
          number={
            hasSolar ? (data.exportKwhYear != null && exportRevenue > 0 ? "4" : "3") : "2"
          }
          tone="navy"
          left={
            <>
              So your new energy bill drops to about{" "}
              <strong className="text-navy">
                {fmt(data.postUpgradeAnnualBill)}
              </strong>
              {" "}{suffix}{" "}
              {billChange < 0 ? (
                <>
                  — that&rsquo;s{" "}
                  <strong className="text-emerald-700">
                    {fmt(Math.abs(billChange))} less
                  </strong>{" "}
                  than today.
                </>
              ) : (
                <>— roughly the same as today.</>
              )}
            </>
          }
          right={`Energy bill after upgrades`}
        />

        {showFinance && data.financeMonthly != null && data.financeAnnual != null && (
          <Step
            number={
              hasSolar
                ? data.exportKwhYear != null && exportRevenue > 0
                  ? "5"
                  : "4"
                : "3"
            }
            tone="coral"
            left={
              <>
                Your loan repayment is{" "}
                <strong className="text-navy">
                  {fmt(data.financeAnnual)}
                </strong>
                {" "}{suffix} for 10 years at 6.9% APR.
              </>
            }
            right="After year 10 you stop paying — pure savings"
          />
        )}

        <Step
          number="="
          tone={data.netAnnualPosition <= 0 ? "green-strong" : "amber-strong"}
          left={
            data.netAnnualPosition <= 0 ? (
              <>
                <strong className="text-emerald-700">
                  You&rsquo;re {fmt(Math.abs(data.netAnnualPosition))}{" "}
                  better off
                </strong>
                {" "}{suffix} than doing nothing.
              </>
            ) : (
              <>
                <strong className="text-amber-700">
                  You&rsquo;re paying {fmt(data.netAnnualPosition)} more
                </strong>
                {" "}{suffix} than doing nothing — but you keep the savings
                after the loan ends.
              </>
            )
          }
          right="Net change vs. doing nothing"
        />
      </ol>

      {showFinance && (
        <p className="mt-4 text-xs text-slate-500">
          Loan figures use a standard amortisation calculation at 6.9% APR
          over 10 years. Your actual offer will depend on the lender + your
          credit profile.
        </p>
      )}
    </SectionCard>
  );
}

// ─── Step row ───────────────────────────────────────────────────────────────

function Step({
  number,
  tone,
  left,
  right,
}: {
  number: string;
  tone:
    | "grey"
    | "amber"
    | "green"
    | "coral"
    | "navy"
    | "green-strong"
    | "amber-strong";
  left: React.ReactNode;
  right: string;
}) {
  const numberCls = {
    grey: "bg-slate-100 text-slate-600",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-700",
    coral: "bg-coral-pale text-coral-dark",
    navy: "bg-slate-200 text-navy",
    "green-strong": "bg-emerald-600 text-white",
    "amber-strong": "bg-amber-500 text-white",
  }[tone];

  const isResult = number === "=";

  return (
    <li
      className={`flex items-start gap-3 rounded-xl p-3.5 ${
        isResult
          ? tone === "green-strong"
            ? "bg-emerald-50 border-2 border-emerald-200"
            : "bg-amber-50 border-2 border-amber-200"
          : "bg-white border border-slate-100"
      }`}
    >
      <span
        className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${numberCls}`}
        aria-hidden="true"
      >
        {isResult ? "=" : number}
      </span>
      <div className="flex-1 min-w-0">
        <p className="leading-relaxed">{left}</p>
        <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
          {isResult ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowRight className="w-3 h-3" />
          )}
          {right}
        </p>
      </div>
    </li>
  );
}
