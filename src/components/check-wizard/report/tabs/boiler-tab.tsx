"use client";

// Boiler-vs-heat-pump tab — the centrepiece of the /check/boiler flow.
//
// Answers the one question that flow exists for: "should I replace my
// gas boiler like-for-like, or switch to a heat pump?" — and answers it
// on TOTAL cost of ownership, not just the install price. Three layers:
//
//   1. Upfront cost      — new boiler vs heat pump net of the grant
//   2. Running cost/year — gas heating bill vs heat-pump electricity
//   3. The bottom line   — total cost over 5/10/15 years, for all four
//      scenarios (each system × pay-upfront vs on-finance)
//
// All figures derive from the analysis we already have (EPC + BUS
// verdict + tariffs) via the pure module
// src/lib/services/boiler-comparison.ts. Finance + years are
// interactive and computed client-side from the same module.
//
// Honesty: at a standard electricity tariff a heat pump's running cost
// is roughly level with gas — the real savings need a heat-pump tariff.
// The UI says so plainly; we never imply guaranteed savings.

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Flame,
  Info,
  PoundSterling,
  Scale,
  Zap,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import {
  buildBoilerVsHeatPump,
  annualRunningCost,
  totalCostOfOwnership,
  financeQuote,
  HEATING_FINANCE,
} from "@/lib/services/boiler-comparison";
import { SectionCard, FactRow, IssueList, fmtGbp } from "../shared";

type FinanceProduct = "zero" | "spread";
const YEAR_OPTIONS = [5, 10, 15] as const;

export function BoilerTab({
  analysis,
  electricityTariff,
  gasTariff,
}: {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
}) {
  const cmp = useMemo(
    () =>
      buildBoilerVsHeatPump({
        epc: analysis.epc,
        eligibility: analysis.eligibility,
      }),
    [analysis],
  );
  const rc = useMemo(
    () =>
      annualRunningCost({
        epc: analysis.epc,
        electricityTariff,
        gasTariff,
      }),
    [analysis, electricityTariff, gasTariff],
  );

  const { boiler, heatPump } = cmp;

  // ── Controls ──
  const [product, setProduct] = useState<FinanceProduct>("spread");
  const [termMonths, setTermMonths] = useState<number>(
    HEATING_FINANCE.defaultTermMonths,
  );
  const [years, setYears] = useState<number>(10);

  const termOptions =
    product === "zero"
      ? HEATING_FINANCE.zeroAprTermsMonths
      : HEATING_FINANCE.spreadTermsMonths;
  const effectiveTerm = (termOptions as readonly number[]).includes(termMonths)
    ? termMonths
    : termOptions[0];
  const apr =
    product === "zero" ? HEATING_FINANCE.zeroAprPct : HEATING_FINANCE.spreadAprPct;

  const boilerQuote = financeQuote(boiler.installedCostGBP, apr, effectiveTerm);
  const hpNet = heatPump.netMidpointGBP;
  const hpQuote = hpNet != null ? financeQuote(hpNet, apr, effectiveTerm) : null;

  // ── Totals over `years` ──
  const boilerUpfrontTco = totalCostOfOwnership({
    upfrontGBP: boiler.installedCostGBP,
    annualEnergyGBP: rc.boilerAnnualGBP,
    years,
  });
  const boilerFinanceTco = totalCostOfOwnership({
    upfrontGBP: boilerQuote.totalRepayableGBP,
    annualEnergyGBP: rc.boilerAnnualGBP,
    years,
  });
  const hpUpfrontTco =
    hpNet != null
      ? totalCostOfOwnership({
          upfrontGBP: hpNet,
          annualEnergyGBP: rc.heatPumpAnnualGBP,
          years,
        })
      : null;
  const hpFinanceTco =
    hpQuote != null
      ? totalCostOfOwnership({
          upfrontGBP: hpQuote.totalRepayableGBP,
          annualEnergyGBP: rc.heatPumpAnnualGBP,
          years,
        })
      : null;

  // Cheapest of whatever we can compute — for the highlight.
  const allTotals = [
    boilerUpfrontTco,
    boilerFinanceTco,
    hpUpfrontTco,
    hpFinanceTco,
  ].filter((n): n is number => n != null);
  const lowest = allTotals.length ? Math.min(...allTotals) : null;

  const upfrontDiff =
    hpNet != null ? hpNet - boiler.installedCostGBP : null;
  const hpRunsCheaper = rc.heatPumpAnnualGBP < rc.boilerAnnualGBP;

  return (
    <div className="space-y-6">
      {/* ── 1. Upfront cost ── */}
      <SectionCard
        icon={<ArrowRightLeft className="w-5 h-5" />}
        title="What it costs to fit"
        subtitle="The all-in installed price of each, side by side. Indicative figures for your property type — not a quote."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CostColumn
            tone="slate"
            icon={<Flame className="w-5 h-5" />}
            heading="New gas boiler"
            headlineLabel="Installed, all-in"
            headline={fmtGbp(boiler.installedCostGBP)}
            rows={[
              { label: "Your home", value: `${boiler.label} · ${boiler.spec}` },
              {
                label: "Like-for-like swap",
                value: `${fmtGbp(boiler.cleanSwapRangeGBP[0])}–${fmtGbp(
                  boiler.cleanSwapRangeGBP[1],
                )}`,
              },
              { label: "Grant available", value: "None" },
            ]}
          />
          <CostColumn
            tone="coral"
            icon={<Zap className="w-5 h-5" />}
            heading="Air source heat pump"
            headlineLabel={hpNet != null ? "After the grant" : "Before grant"}
            headline={
              hpNet != null
                ? fmtGbp(hpNet)
                : `${fmtGbp(heatPump.grossRangeGBP[0])}–${fmtGbp(
                    heatPump.grossRangeGBP[1],
                  )}`
            }
            rows={[
              {
                label: "Installed (MCS avg)",
                value: `${fmtGbp(heatPump.grossRangeGBP[0])}–${fmtGbp(
                  heatPump.grossRangeGBP[1],
                )}`,
              },
              {
                label: "Boiler Upgrade Scheme",
                value: heatPump.busEligible
                  ? `−${fmtGbp(heatPump.grantGBP)}`
                  : "Not eligible",
                tone: heatPump.busEligible ? "green" : undefined,
              },
              { label: "Installer", value: "MCS-certified" },
            ]}
          />
        </div>

        {upfrontDiff != null && (
          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            {upfrontDiff > 0 ? (
              <>
                After the £{heatPump.grantGBP.toLocaleString("en-GB")} grant, a
                heat pump costs about{" "}
                <span className="font-semibold text-navy">
                  {fmtGbp(upfrontDiff)} more upfront
                </span>{" "}
                than a new boiler. The running costs below are where that gap
                narrows — or doesn&rsquo;t.
              </>
            ) : (
              <>
                After the £{heatPump.grantGBP.toLocaleString("en-GB")} grant, a
                heat pump is about{" "}
                <span className="font-semibold text-emerald-700">
                  {fmtGbp(Math.abs(upfrontDiff))} cheaper upfront
                </span>{" "}
                than a new boiler for your property type.
              </>
            )}
          </p>
        )}

        {heatPump.insulationFirst && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              Your EPC still lists outstanding insulation work. The Boiler
              Upgrade Scheme expects that addressed first, so we&rsquo;ve held
              the net heat-pump figure back — insulation may be required before
              the grant applies.
            </p>
          </div>
        )}
        {!heatPump.busEligible && heatPump.blockers.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Why the grant doesn&rsquo;t apply
            </p>
            <IssueList kind="blocker" items={heatPump.blockers} />
          </div>
        )}
      </SectionCard>

      {/* ── 2. Running cost / year ── */}
      <SectionCard
        icon={<PoundSterling className="w-5 h-5" />}
        title="What it costs to run, each year"
        subtitle={`Heating + hot water energy. At ${rc.assumptions.elecUnitPencePerKwh}p/kWh electricity and ${rc.assumptions.gasUnitPencePerKwh}p/kWh gas. Your appliances + lighting cost the same either way, so they're left out.`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RunningStat
            icon={<Flame className="w-5 h-5" />}
            heading="New gas boiler"
            value={fmtGbp(rc.boilerAnnualGBP)}
            sub="gas for heating + hot water, incl. standing charge"
          />
          <RunningStat
            icon={<Zap className="w-5 h-5" />}
            heading="Heat pump"
            value={fmtGbp(rc.heatPumpAnnualGBP)}
            sub="electricity only — no gas standing charge"
            tone="coral"
          />
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-coral" />
          <p className="leading-relaxed">
            {hpRunsCheaper ? (
              <>
                On the tariff we&rsquo;ve assumed, the heat pump already runs
                cheaper than gas.
              </>
            ) : (
              <>
                On a <strong>standard</strong> electricity tariff a heat pump can
                cost about the same — or a little more — to run than gas, because
                electricity is dearer per unit.
              </>
            )}{" "}
            The real saving comes from a <strong>heat-pump tariff</strong> (Octopus
            Cosy, an overnight rate, etc.), which can cut the heat pump&rsquo;s
            running cost well below gas. An installer will model your actual
            tariff.
          </p>
        </div>
        {rc.floorAreaEstimated && (
          <p className="mt-2 text-xs text-slate-500">
            We didn&rsquo;t find a floor area on your EPC, so running costs use a
            national-average {rc.floorAreaM2} m² home — treat them as a rough
            guide.
          </p>
        )}
      </SectionCard>

      {/* ── 3. The bottom line: total over time ── */}
      <SectionCard
        icon={<Scale className="w-5 h-5" />}
        title="The bottom line"
        subtitle="Fit + running costs added up over time. Pick a horizon, and choose whether you'd pay upfront or spread it on finance."
      >
        {/* Years */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Over
          </p>
          <div className="flex gap-2">
            {YEAR_OPTIONS.map((y) => (
              <ToggleButton
                key={y}
                active={years === y}
                onClick={() => setYears(y)}
                label={`${y} yrs`}
              />
            ))}
          </div>
        </div>

        {/* Finance controls (drive the "On finance" column) */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            If you spread it on finance
          </p>
          <div className="flex flex-wrap gap-2">
            <ToggleButton
              active={product === "zero"}
              onClick={() => setProduct("zero")}
              label="0% APR"
              sub="up to 2 yrs"
            />
            <ToggleButton
              active={product === "spread"}
              onClick={() => setProduct("spread")}
              label={`${HEATING_FINANCE.spreadAprPct}% APR`}
              sub="up to 10 yrs"
            />
            <span className="mx-1 self-center text-slate-300">|</span>
            {termOptions.map((t) => (
              <ToggleButton
                key={t}
                active={effectiveTerm === t}
                onClick={() => setTermMonths(t)}
                label={`${t} mo`}
              />
            ))}
          </div>
        </div>

        {/* 2×2 total grid */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 pr-3" />
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 px-3">
                  Pay upfront
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 px-3">
                  On finance
                </th>
              </tr>
            </thead>
            <tbody>
              <TcoRow
                heading="New gas boiler"
                icon={<Flame className="w-4 h-4" />}
                upfrontTotal={boilerUpfrontTco}
                financeTotal={boilerFinanceTco}
                upfrontSub={`${fmtGbp(boiler.installedCostGBP)} fit + ${fmtGbp(
                  rc.boilerAnnualGBP,
                )}/yr`}
                financeSub={`${fmtGbp(
                  Math.round(boilerQuote.monthlyGBP),
                )}/mo + ${fmtGbp(rc.boilerAnnualGBP)}/yr`}
                lowest={lowest}
              />
              <TcoRow
                heading="Heat pump"
                icon={<Zap className="w-4 h-4" />}
                upfrontTotal={hpUpfrontTco}
                financeTotal={hpFinanceTco}
                upfrontSub={
                  hpNet != null
                    ? `${fmtGbp(hpNet)} fit + ${fmtGbp(
                        rc.heatPumpAnnualGBP,
                      )}/yr`
                    : "grant path unconfirmed"
                }
                financeSub={
                  hpQuote != null
                    ? `${fmtGbp(
                        Math.round(hpQuote.monthlyGBP),
                      )}/mo + ${fmtGbp(rc.heatPumpAnnualGBP)}/yr`
                    : "—"
                }
                lowest={lowest}
              />
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500 leading-relaxed">
          Totals = the install (or total repayable on finance) plus {years}{" "}
          years of heating energy at today&rsquo;s prices (no inflation
          modelled). Assumes a SCOP of {rc.assumptions.scop} for the heat pump
          and a {Math.round(rc.assumptions.boilerEfficiency * 100)}%-efficient
          gas boiler. Finance is brokered through FCA-regulated lenders, subject
          to status; minimum loan {fmtGbp(HEATING_FINANCE.minLoanGBP)}. A
          pre-survey indication — not a quote or a credit offer.
        </p>
      </SectionCard>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function CostColumn({
  tone,
  icon,
  heading,
  headlineLabel,
  headline,
  rows,
}: {
  tone: "slate" | "coral";
  icon: React.ReactNode;
  heading: string;
  headlineLabel: string;
  headline: string;
  rows: Array<{ label: string; value: string; tone?: "green" }>;
}) {
  const accent =
    tone === "coral"
      ? "border-coral/30 bg-coral-pale/20"
      : "border-slate-200 bg-slate-50/50";
  const iconWrap =
    tone === "coral" ? "bg-coral text-white" : "bg-slate-200 text-slate-700";
  return (
    <div className={`rounded-2xl border ${accent} p-5`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconWrap}`}
        >
          {icon}
        </span>
        <h4 className="text-base font-semibold text-navy">{heading}</h4>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {headlineLabel}
        </p>
        <p className="text-3xl font-bold text-navy">{headline}</p>
      </div>
      <dl className="mt-3 divide-y divide-slate-100">
        {rows.map((r) => (
          <FactRow key={r.label} label={r.label}>
            <span className={r.tone === "green" ? "text-emerald-700" : ""}>
              {r.value}
            </span>
          </FactRow>
        ))}
      </dl>
    </div>
  );
}

function RunningStat({
  icon,
  heading,
  value,
  sub,
  tone = "slate",
}: {
  icon: React.ReactNode;
  heading: string;
  value: string;
  sub: string;
  tone?: "slate" | "coral";
}) {
  const accent =
    tone === "coral"
      ? "border-coral/30 bg-coral-pale/20"
      : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border ${accent} p-5`}>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-coral-pale text-coral">
          {icon}
        </span>
        <h4 className="text-base font-semibold text-navy">{heading}</h4>
      </div>
      <p className="mt-4 text-3xl font-bold text-navy">
        {value}
        <span className="text-base font-medium text-slate-500">/yr</span>
      </p>
      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{sub}</p>
    </div>
  );
}

function TcoRow({
  heading,
  icon,
  upfrontTotal,
  financeTotal,
  upfrontSub,
  financeSub,
  lowest,
}: {
  heading: string;
  icon: React.ReactNode;
  upfrontTotal: number | null;
  financeTotal: number | null;
  upfrontSub: string;
  financeSub: string;
  lowest: number | null;
}) {
  return (
    <tr>
      <td className="py-2 pr-3 align-top">
        <div className="flex items-center gap-2 font-semibold text-navy">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral">
            {icon}
          </span>
          {heading}
        </div>
      </td>
      <TcoCell total={upfrontTotal} sub={upfrontSub} lowest={lowest} />
      <TcoCell total={financeTotal} sub={financeSub} lowest={lowest} />
    </tr>
  );
}

function TcoCell({
  total,
  sub,
  lowest,
}: {
  total: number | null;
  sub: string;
  lowest: number | null;
}) {
  const isLowest = total != null && lowest != null && total === lowest;
  return (
    <td className="py-2 px-3 align-top">
      <div
        className={`rounded-xl border p-3 ${
          isLowest
            ? "border-emerald-300 bg-emerald-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <p
          className={`text-xl font-bold ${
            isLowest ? "text-emerald-700" : "text-navy"
          }`}
        >
          {total != null ? fmtGbp(total) : "—"}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{sub}</p>
        {isLowest && (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Lowest total
          </p>
        )}
      </div>
    </td>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start rounded-xl border px-4 py-2.5 transition-colors ${
        active
          ? "border-coral bg-coral text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-coral/40 hover:bg-coral-pale/30"
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      {sub && (
        <span
          className={`text-[11px] ${active ? "text-white/80" : "text-slate-500"}`}
        >
          {sub}
        </span>
      )}
    </button>
  );
}
