"use client";

// Boiler-vs-heat-pump tab — the centrepiece of the /check/boiler flow.
//
// Answers the one question that flow exists for: "should I replace my
// gas boiler like-for-like, or switch to a heat pump?" — by putting the
// all-in cost of each side by side, then letting the user spread either
// onto monthly finance and see the difference in £/month + total.
//
// All figures derive from the analysis we already have (EPC property
// type + floor area + the BUS eligibility verdict) via the pure module
// src/lib/services/boiler-comparison.ts. The finance is interactive
// (product + term) and computed client-side from the same module.

import { useMemo, useState } from "react";
import { ArrowRightLeft, Flame, Info, PoundSterling, Zap } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import {
  buildBoilerVsHeatPump,
  financeQuote,
  HEATING_FINANCE,
} from "@/lib/services/boiler-comparison";
import { SectionCard, FactRow, IssueList, fmtGbp } from "../shared";

type FinanceProduct = "zero" | "spread";

export function BoilerTab({ analysis }: { analysis: AnalyseResponse }) {
  const cmp = useMemo(
    () =>
      buildBoilerVsHeatPump({
        epc: analysis.epc,
        eligibility: analysis.eligibility,
      }),
    [analysis],
  );

  const { boiler, heatPump } = cmp;

  // ── Finance controls ──
  const [product, setProduct] = useState<FinanceProduct>("spread");
  const termOptions =
    product === "zero"
      ? HEATING_FINANCE.zeroAprTermsMonths
      : HEATING_FINANCE.spreadTermsMonths;
  const [termMonths, setTermMonths] = useState<number>(
    HEATING_FINANCE.defaultTermMonths,
  );
  // Keep the selected term valid for the chosen product.
  const effectiveTerm = (termOptions as readonly number[]).includes(termMonths)
    ? termMonths
    : termOptions[0];
  const apr =
    product === "zero" ? HEATING_FINANCE.zeroAprPct : HEATING_FINANCE.spreadAprPct;

  const boilerQuote = financeQuote(boiler.installedCostGBP, apr, effectiveTerm);
  const hpQuote =
    heatPump.netMidpointGBP != null
      ? financeQuote(heatPump.netMidpointGBP, apr, effectiveTerm)
      : null;

  // Upfront difference (HP net midpoint − boiler installed). Positive =
  // heat pump costs more upfront after the grant.
  const upfrontDiff =
    heatPump.netMidpointGBP != null
      ? heatPump.netMidpointGBP - boiler.installedCostGBP
      : null;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <SectionCard
        icon={<ArrowRightLeft className="w-5 h-5" />}
        title="New boiler, or a heat pump?"
        subtitle="The all-in installed cost of each, side by side — then spread either onto monthly finance to see the real difference. Indicative figures for your property type, not a quote."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Boiler side */}
          <CostColumn
            tone="slate"
            icon={<Flame className="w-5 h-5" />}
            heading="New gas boiler"
            headlineLabel="Installed, all-in"
            headline={fmtGbp(boiler.installedCostGBP)}
            rows={[
              {
                label: "Your home",
                value: `${boiler.label} · ${boiler.spec}`,
              },
              {
                label: "Like-for-like swap",
                value: `${fmtGbp(boiler.cleanSwapRangeGBP[0])}–${fmtGbp(
                  boiler.cleanSwapRangeGBP[1],
                )}`,
              },
              {
                label: "Typical complexity",
                value: `+${fmtGbp(boiler.complexityUpliftGBP)}`,
              },
              { label: "Grant available", value: "None" },
              { label: "Installer", value: "Gas Safe registered" },
            ]}
          />

          {/* Heat pump side */}
          <CostColumn
            tone="coral"
            icon={<Zap className="w-5 h-5" />}
            heading="Air source heat pump"
            headlineLabel={
              heatPump.netMidpointGBP != null ? "After the grant" : "Before grant"
            }
            headline={
              heatPump.netMidpointGBP != null
                ? fmtGbp(heatPump.netMidpointGBP)
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
              {
                label: "Net upfront",
                value:
                  heatPump.netRangeGBP != null
                    ? `${fmtGbp(heatPump.netRangeGBP[0])}–${fmtGbp(
                        heatPump.netRangeGBP[1],
                      )}`
                    : "See note below",
              },
              { label: "Installer", value: "MCS-certified" },
            ]}
          />
        </div>

        {/* The difference callout */}
        {upfrontDiff != null && (
          <div className="mt-4 rounded-xl border border-coral/30 bg-coral-pale/30 p-4">
            <p className="text-sm font-semibold text-navy">
              {upfrontDiff > 0 ? (
                <>
                  After the £{heatPump.grantGBP.toLocaleString("en-GB")} grant, a
                  heat pump costs about{" "}
                  <span className="text-coral-dark">
                    {fmtGbp(upfrontDiff)} more upfront
                  </span>{" "}
                  than a new boiler.
                </>
              ) : (
                <>
                  After the £{heatPump.grantGBP.toLocaleString("en-GB")} grant, a
                  heat pump works out about{" "}
                  <span className="text-emerald-700">
                    {fmtGbp(Math.abs(upfrontDiff))} cheaper upfront
                  </span>{" "}
                  than a new boiler for your property type.
                </>
              )}
            </p>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              That&rsquo;s the upfront gap only. A heat pump also changes your
              running costs and removes gas-safety risk — an MCS installer will
              model your actual bills on a site visit.
            </p>
          </div>
        )}

        {/* Insulation-first / not-eligible notes */}
        {heatPump.insulationFirst && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              Your EPC still lists outstanding insulation work (loft / cavity /
              wall). The Boiler Upgrade Scheme expects that addressed first, so
              we&rsquo;ve held the net heat-pump figure back — insulation may be
              required before the grant applies.
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

      {/* Finance comparison */}
      <SectionCard
        icon={<PoundSterling className="w-5 h-5" />}
        title="Spread the cost — boiler vs heat pump"
        subtitle="Boiler-grade install finance: 0% over a short term, or a low-APR spread up to 10 years. Subject to status, credit check + affordability."
      >
        {/* Product toggle */}
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
        </div>

        {/* Term selector */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Term
          </p>
          <div className="flex flex-wrap gap-2">
            {termOptions.map((t) => (
              <ToggleButton
                key={t}
                active={effectiveTerm === t}
                onClick={() => setTermMonths(t)}
                label={`${t} mo`}
                sub={`${t / 12} yr${t === 12 ? "" : "s"}`}
              />
            ))}
          </div>
        </div>

        {/* Monthly + total, side by side */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FinanceColumn
            heading="New gas boiler"
            icon={<Flame className="w-5 h-5" />}
            quote={boilerQuote}
          />
          {hpQuote ? (
            <FinanceColumn
              heading="Heat pump (net of grant)"
              icon={<Zap className="w-5 h-5" />}
              quote={hpQuote}
              tone="coral"
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 flex items-center">
              <p className="text-sm text-slate-600 leading-relaxed">
                We&rsquo;ll show the heat-pump finance line once the grant path
                is clear for your property (see the note above).
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500 leading-relaxed">
          Finance is brokered through FCA-regulated lenders; the installer is a
          credit broker, not the lender. The agreement is written against the
          single supply-and-fit price — labour is financed in, not separately.
          Minimum loan {fmtGbp(HEATING_FINANCE.minLoanGBP)}. Representative APR;
          your rate depends on status. A pre-survey indication, not a credit
          offer or a quote.
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

function FinanceColumn({
  heading,
  icon,
  quote,
  tone = "slate",
}: {
  heading: string;
  icon: React.ReactNode;
  quote: ReturnType<typeof financeQuote>;
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
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Monthly
        </p>
        <p className="text-3xl font-bold text-navy">
          {fmtGbp(Math.round(quote.monthlyGBP))}
          <span className="text-base font-medium text-slate-500">/mo</span>
        </p>
      </div>
      <dl className="mt-3 divide-y divide-slate-100">
        <FactRow label="Amount financed">
          {fmtGbp(quote.principalGBP)}
        </FactRow>
        <FactRow label="Total repayable">
          {fmtGbp(Math.round(quote.totalRepayableGBP))}
        </FactRow>
        <FactRow label="Interest">
          {quote.totalInterestGBP <= 0
            ? "£0 (0% APR)"
            : fmtGbp(Math.round(quote.totalInterestGBP))}
        </FactRow>
      </dl>
    </div>
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
  sub: string;
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
      <span
        className={`text-[11px] ${active ? "text-white/80" : "text-slate-500"}`}
      >
        {sub}
      </span>
    </button>
  );
}
