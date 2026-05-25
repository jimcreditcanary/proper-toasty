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
  ChevronDown,
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
  annualEnergyBillDelta,
  totalCostOfOwnership,
  financeQuote,
  HEATING_FINANCE,
  type PartnerConfig,
} from "@/lib/services/boiler-comparison";
import { SectionCard, FactRow, IssueList, fmtGbp } from "../shared";

type FinanceProduct = "zero" | "spread";
const YEAR_OPTIONS = [5, 10, 15] as const;
// Partner heat-pump finance: term choices 3 / 5 / 10 / 15 years, and an
// APR slider that starts at a typical market rate and tracks down to 0%
// (the partner's offer).
const PARTNER_TERM_OPTIONS = [36, 60, 120, 180] as const;
const PARTNER_APR_MAX = 9.9;
const PARTNER_HP_APR_DEFAULT = 4.9;
// Partner boiler finance: a fixed, realistic representative rate (a
// boiler wouldn't get the heat-pump deal). Editable after "I've got a
// quote". Term choices 3 / 5 / 10 years.
const BOILER_FINANCE_DEFAULT_APR = 9.9;
const BOILER_FINANCE_DEFAULT_TERM = 60;
const BOILER_TERM_OPTIONS = [36, 60, 120] as const;

export function BoilerTab({
  analysis,
  electricityTariff,
  gasTariff,
  partner = null,
  hasBoilerCare = false,
}: {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  /** Active brand partner (e.g. Octopus) — overrides heat-pump price,
   *  finance, the heat-pump tariff + energy inflation. */
  partner?: PartnerConfig | null;
  /** Whether the user said they pay for boiler cover (partner flows). */
  hasBoilerCare?: boolean;
}) {
  const cmp = useMemo(
    () =>
      buildBoilerVsHeatPump({
        epc: analysis.epc,
        eligibility: analysis.eligibility,
        partner,
      }),
    [analysis, partner],
  );
  // Boiler-care overage — only the gas boiler carries it; a heat pump
  // doesn't need an annual gas service / cover plan. Broken out so the
  // running-cost panel can show it as its own line.
  const boilerCareAnnual =
    partner && hasBoilerCare ? partner.boilerCareMonthlyGBP * 12 : 0;
  const rc = useMemo(
    () =>
      annualRunningCost({
        epc: analysis.epc,
        electricityTariff,
        gasTariff,
        heatPumpElecPenceOverride: partner?.heatPumpElecPencePerKwh,
        boilerCareAnnualGBP: boilerCareAnnual,
      }),
    [analysis, electricityTariff, gasTariff, partner, boilerCareAnnual],
  );
  // Gas-only portion of the boiler running cost (total minus cover).
  const boilerGasOnly = rc.boilerAnnualGBP - boilerCareAnnual;

  const { boiler, heatPump } = cmp;

  // ── Controls ──
  // Neutral flow: one 0%-vs-spread product toggle + term, applied to
  // both systems. Partner flow: the two systems finance on DIFFERENT
  // terms — a boiler wouldn't get the partner's heat-pump deal — so we
  // model them separately:
  //   • Heat pump: an APR slider that starts at a typical market rate
  //     and tracks down to 0% (the partner's offer).
  //   • Boiler: a fixed, realistic boiler-finance rate; editable (rate
  //     / term / amount) only after "I've got a quote".
  const [product, setProduct] = useState<FinanceProduct>("spread");
  const [termMonths, setTermMonths] = useState<number>(
    HEATING_FINANCE.defaultTermMonths,
  );
  const [years, setYears] = useState<number>(10);
  // Partner: heat-pump finance.
  const [hpAprPct, setHpAprPct] = useState<number>(
    partner ? PARTNER_HP_APR_DEFAULT : 0,
  );
  const [hpTermMonths, setHpTermMonths] = useState<number>(
    partner?.financeTermMonths ?? 120,
  );
  // Partner: boiler finance (fixed unless they've got a quote).
  const [gotQuote, setGotQuote] = useState(false);
  const [boilerAprPct, setBoilerAprPct] = useState<number>(
    BOILER_FINANCE_DEFAULT_APR,
  );
  const [boilerTermMonths, setBoilerTermMonths] = useState<number>(
    BOILER_FINANCE_DEFAULT_TERM,
  );
  const [boilerValueOverride, setBoilerValueOverride] = useState<number | null>(
    null,
  );

  const termOptions =
    product === "zero"
      ? HEATING_FINANCE.zeroAprTermsMonths
      : HEATING_FINANCE.spreadTermsMonths;
  const pickedTerm = (termOptions as readonly number[]).includes(termMonths)
    ? termMonths
    : termOptions[0];
  const neutralApr =
    product === "zero"
      ? HEATING_FINANCE.zeroAprPct
      : HEATING_FINANCE.spreadAprPct;
  const gasInflation = partner?.gasInflationPctPerYear ?? 0;
  const elecInflation = partner?.elecInflationPctPerYear ?? 0;

  const hpNet = heatPump.netMidpointGBP;

  // Per-system finance inputs — split on the partner flow, shared on the
  // neutral flow.
  const boilerValue = boilerValueOverride ?? boiler.installedCostGBP;
  const boilerApr = partner ? boilerAprPct : neutralApr;
  const boilerTerm = partner ? boilerTermMonths : pickedTerm;
  const hpApr = partner ? hpAprPct : neutralApr;
  const hpTerm = partner ? hpTermMonths : pickedTerm;

  const boilerQuote = financeQuote(boilerValue, boilerApr, boilerTerm);
  const hpQuote = hpNet != null ? financeQuote(hpNet, hpApr, hpTerm) : null;

  // Horizon for the totals. On the partner flow it follows the heat-pump
  // term (the Octopus deal); the neutral flow keeps a separate years
  // toggle.
  const horizonYears = partner ? hpTerm / 12 : years;

  // ── Totals over the horizon ── (gas inflates faster than electricity
  // on a partner page; both flat on the neutral flow)
  const boilerUpfrontTco = totalCostOfOwnership({
    upfrontGBP: boiler.installedCostGBP,
    annualEnergyGBP: rc.boilerAnnualGBP,
    years: horizonYears,
    energyInflationPctPerYear: gasInflation,
  });
  const boilerFinanceTco = totalCostOfOwnership({
    upfrontGBP: boilerQuote.totalRepayableGBP,
    annualEnergyGBP: rc.boilerAnnualGBP,
    years: horizonYears,
    energyInflationPctPerYear: gasInflation,
  });
  const hpUpfrontTco =
    hpNet != null
      ? totalCostOfOwnership({
          upfrontGBP: hpNet,
          annualEnergyGBP: rc.heatPumpAnnualGBP,
          years: horizonYears,
          energyInflationPctPerYear: elecInflation,
        })
      : null;
  const hpFinanceTco =
    hpQuote != null
      ? totalCostOfOwnership({
          upfrontGBP: hpQuote.totalRepayableGBP,
          annualEnergyGBP: rc.heatPumpAnnualGBP,
          years: horizonYears,
          energyInflationPctPerYear: elecInflation,
        })
      : null;

  // ── Monthly figures (the side-by-side table) ──
  // Finance £/mo applies during the term; energy £/mo runs forever.
  // Boiler cover (when paid) is its own table row, so the boiler energy
  // line is gas-only.
  const boilerMoFinance = boilerQuote.monthlyGBP;
  const boilerMoEnergy = boilerGasOnly / 12;
  const boilerMoCover = boilerCareAnnual / 12;
  const boilerMoTotal = boilerMoFinance + boilerMoEnergy + boilerMoCover;
  const hpMoFinance = hpQuote?.monthlyGBP ?? null;
  const hpMoEnergy = rc.heatPumpAnnualGBP / 12;
  const hpMoTotal = hpMoFinance != null ? hpMoFinance + hpMoEnergy : null;

  // Cheaper monthly total (during the finance term) — for highlight.
  const lowerMonthly =
    hpMoTotal != null ? Math.min(boilerMoTotal, hpMoTotal) : boilerMoTotal;
  // Cheaper financed total over the horizon.
  const lowerFinanceTco =
    hpFinanceTco != null
      ? Math.min(boilerFinanceTco, hpFinanceTco)
      : boilerFinanceTco;

  const upfrontDiff =
    hpNet != null ? hpNet - boiler.installedCostGBP : null;
  // Positive → heat pump saves £/yr on energy; negative → costs more.
  const energyDelta = annualEnergyBillDelta(rc);
  const hpRunsCheaper = energyDelta > 0;
  const lifetimeEnergyDelta = energyDelta * horizonYears;

  // Partner-aware labels.
  const hpName = partner ? `${partner.name} heat pump` : "Air source heat pump";
  const hpInstalledLabel = partner ? "Installed" : "Installed (MCS avg)";

  // Heat-pump glyph. In a brand-partner journey (e.g. Octopus) the bolt
  // becomes the octopus emoji 🐙; everywhere else it stays the lightning
  // bolt with its original classes (so non-partner reports are unchanged).
  const hpIcon = (zapClass: string, emojiSize: string) =>
    partner ? (
      <span
        className={`${emojiSize} leading-none shrink-0`}
        role="img"
        aria-label="Heat pump"
      >
        🐙
      </span>
    ) : (
      <Zap className={zapClass} />
    );

  return (
    <div className="space-y-6">
      {partner && (
        <div className="rounded-2xl border border-coral/30 bg-coral-pale/30 px-5 py-3.5 flex items-center gap-2.5">
          {hpIcon("w-4 h-4 text-coral shrink-0", "text-base")}
          <p className="text-sm text-navy">
            <span className="font-semibold">
              In partnership with {partner.name}.
            </span>{" "}
            The heat-pump price, the {partner.name} Cosy tariff and 0% finance
            over {partner.financeTermMonths / 12} years below are{" "}
            {partner.name}&rsquo;s.
          </p>
        </div>
      )}
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
            icon={hpIcon("w-5 h-5", "text-xl")}
            heading={hpName}
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
                label: hpInstalledLabel,
                value:
                  heatPump.grossRangeGBP[0] === heatPump.grossRangeGBP[1]
                    ? fmtGbp(heatPump.grossRangeGBP[0])
                    : `${fmtGbp(heatPump.grossRangeGBP[0])}–${fmtGbp(
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
                label: "Installer",
                value: partner ? `${partner.name} (MCS)` : "MCS-certified",
              },
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
        subtitle={
          partner
            ? `Heating + hot water energy. The heat pump runs on the ${partner.name} Cosy tariff (${rc.assumptions.elecUnitPencePerKwh}p/kWh), the boiler on gas at ${rc.assumptions.gasUnitPencePerKwh}p/kWh. Appliances + lighting cost the same either way, so they're left out.`
            : `Heating + hot water energy. At ${rc.assumptions.elecUnitPencePerKwh}p/kWh electricity and ${rc.assumptions.gasUnitPencePerKwh}p/kWh gas. Your appliances + lighting cost the same either way, so they're left out.`
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RunningStat
            icon={<Flame className="w-5 h-5" />}
            heading="New gas boiler"
            value={fmtGbp(rc.boilerAnnualGBP)}
            sub={
              boilerCareAnnual > 0
                ? `${fmtGbp(boilerGasOnly)} gas (incl. standing charge) + ${fmtGbp(
                    boilerCareAnnual,
                  )} boiler cover`
                : "gas for heating + hot water, incl. standing charge"
            }
          />
          <RunningStat
            icon={hpIcon("w-5 h-5", "text-xl")}
            heading={partner ? `${partner.name} heat pump` : "Heat pump"}
            value={fmtGbp(rc.heatPumpAnnualGBP)}
            sub={
              partner
                ? boilerCareAnnual > 0
                  ? `electricity on Cosy — no gas standing charge, no boiler cover`
                  : `electricity on Cosy — no gas standing charge`
                : "electricity only — no gas standing charge"
            }
            tone="coral"
          />
        </div>


        {/* The headline number: energy saving (or extra), sign-aware. */}
        <div
          className={`mt-4 rounded-xl border p-4 text-center ${
            hpRunsCheaper
              ? "border-emerald-300 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          {hpRunsCheaper ? (
            <p className="text-sm text-emerald-900">
              On this tariff a heat pump would{" "}
              <span className="font-bold">
                save about {fmtGbp(energyDelta)}/yr
              </span>{" "}
              on your energy bills vs a gas boiler.
            </p>
          ) : (
            <p className="text-sm text-amber-900">
              On this tariff a heat pump would cost about{" "}
              <span className="font-bold">{fmtGbp(-energyDelta)}/yr more</span>{" "}
              to run than a gas boiler — switch to a heat-pump tariff to flip
              that.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-coral" />
          {partner ? (
            <p className="leading-relaxed">
              Your heat pump is modelled on the{" "}
              <strong>{partner.name} Cosy tariff</strong>, where cheap off-peak
              windows bring its running cost below a gas boiler&rsquo;s. Your
              real figure depends on how much heating shifts into those windows
              — {partner.name} will confirm it on a home survey.
            </p>
          ) : (
            <p className="leading-relaxed">
              On a <strong>standard</strong> electricity tariff a heat pump can
              cost about the same — or a little more — to run than gas, because
              electricity is dearer per unit. The real saving comes from a{" "}
              <strong>heat-pump tariff</strong> (Octopus Cosy, an overnight
              rate, etc.), which can cut the running cost well below gas. An
              installer will model your actual tariff.
            </p>
          )}
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
        {/* Horizon — neutral flow only. On a partner flow the horizon
            is the finance term (one combined control below). */}
        {!partner && (
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
        )}

        {/* Finance controls (drive the "On finance" column). */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            If you spread it on finance
          </p>
          {partner ? (
            // Two separate configs: a boiler won't get the partner's
            // heat-pump deal, so each system finances on its own terms.
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* New gas boiler — fixed unless they've got a quote */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Flame className="w-4 h-4 text-coral" />
                  <p className="text-sm font-semibold text-navy">
                    New gas boiler
                  </p>
                </div>
                {!gotQuote ? (
                  <>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Typical boiler finance{" "}
                      <span className="font-semibold text-navy">
                        {boilerAprPct}% APR
                      </span>{" "}
                      over {boilerTermMonths / 12} years.
                    </p>
                    <button
                      type="button"
                      onClick={() => setGotQuote(true)}
                      className="mt-3 inline-flex items-center justify-center h-9 px-4 rounded-full border border-coral text-coral hover:bg-coral-pale font-semibold text-sm transition-colors"
                    >
                      I&rsquo;ve got a quote — edit
                    </button>
                  </>
                ) : (
                  <div className="space-y-3.5">
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <label
                          htmlFor="boiler-apr"
                          className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                        >
                          Rate (APR)
                        </label>
                        <span className="text-sm font-bold text-navy tabular-nums">
                          {boilerAprPct.toFixed(1)}%
                        </span>
                      </div>
                      <input
                        id="boiler-apr"
                        type="range"
                        min={0}
                        max={PARTNER_APR_MAX}
                        step={0.1}
                        value={boilerAprPct}
                        onChange={(e) =>
                          setBoilerAprPct(Number(e.target.value))
                        }
                        className="w-full accent-coral"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Term
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {BOILER_TERM_OPTIONS.map((t) => (
                          <ToggleButton
                            key={t}
                            active={boilerTermMonths === t}
                            onClick={() => setBoilerTermMonths(t)}
                            label={`${t / 12} yrs`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="boiler-value"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
                      >
                        Amount financed
                      </label>
                      <div className="relative w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                          £
                        </span>
                        <input
                          id="boiler-value"
                          type="number"
                          min={0}
                          value={boilerValue}
                          onChange={(e) =>
                            setBoilerValueOverride(Number(e.target.value) || 0)
                          }
                          className="w-full h-10 pl-6 pr-3 rounded-lg border border-slate-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-coral"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGotQuote(false);
                        setBoilerAprPct(BOILER_FINANCE_DEFAULT_APR);
                        setBoilerTermMonths(BOILER_FINANCE_DEFAULT_TERM);
                        setBoilerValueOverride(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 underline"
                    >
                      Use typical figures instead
                    </button>
                  </div>
                )}
              </div>

              {/* Heat pump — the partner calculator (slider tracks to 0%) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  {hpIcon("w-4 h-4 text-coral", "text-base")}
                  <p className="text-sm font-semibold text-navy">
                    {partner.name} heat pump
                  </p>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <label
                    htmlFor="hp-apr"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Interest rate (APR)
                  </label>
                  <span className="text-sm font-bold text-navy tabular-nums">
                    {hpApr.toFixed(1)}%
                    {hpApr === 0 && (
                      <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                        {partner.name} offer
                      </span>
                    )}
                  </span>
                </div>
                <input
                  id="hp-apr"
                  type="range"
                  min={0}
                  max={PARTNER_APR_MAX}
                  step={0.1}
                  value={hpAprPct}
                  onChange={(e) => setHpAprPct(Number(e.target.value))}
                  className="w-full accent-coral"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                  <span>0% ({partner.name})</span>
                  <span>{PARTNER_APR_MAX}%</span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Term
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PARTNER_TERM_OPTIONS.map((t) => (
                      <ToggleButton
                        key={t}
                        active={hpTermMonths === t}
                        onClick={() => setHpTermMonths(t)}
                        label={`${t / 12} yrs`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
                  active={pickedTerm === t}
                  onClick={() => setTermMonths(t)}
                  label={`${t} mo`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Monthly cost — side by side */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Per month
                </th>
                <th className="pb-3 px-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
                    <Flame className="w-4 h-4 text-coral" /> New gas boiler
                  </span>
                </th>
                <th className="pb-3 px-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
                    {hpIcon("w-4 h-4 text-coral", "text-base")}{" "}
                    {partner ? partner.name : "Heat pump"}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <MonthlyRow
                label={
                  partner
                    ? "Finance"
                    : `Finance (${pickedTerm} mo @ ${neutralApr}%)`
                }
                boiler={
                  `${fmtGbp(Math.round(boilerMoFinance))}/mo` +
                  (partner ? ` · ${boilerApr}% / ${boilerTerm / 12}yr` : "")
                }
                heatPump={
                  hpMoFinance != null
                    ? `${fmtGbp(Math.round(hpMoFinance))}/mo` +
                      (partner ? ` · ${hpApr}% / ${hpTerm / 12}yr` : "")
                    : "—"
                }
              />
              <MonthlyRow
                label="Energy (heating + hot water)"
                boiler={`${fmtGbp(Math.round(boilerMoEnergy))}/mo`}
                heatPump={`${fmtGbp(Math.round(hpMoEnergy))}/mo`}
              />
              {boilerCareAnnual > 0 && (
                <MonthlyRow
                  label="Boiler cover"
                  boiler={`${fmtGbp(Math.round(boilerMoCover))}/mo`}
                  heatPump="Not needed"
                />
              )}
              <MonthlyRow
                label="Total per month"
                emphasis
                boiler={`${fmtGbp(Math.round(boilerMoTotal))}/mo`}
                boilerLowest={
                  hpMoTotal != null && boilerMoTotal === lowerMonthly
                }
                heatPump={
                  hpMoTotal != null ? `${fmtGbp(Math.round(hpMoTotal))}/mo` : "—"
                }
                heatPumpLowest={hpMoTotal != null && hpMoTotal === lowerMonthly}
              />
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Each finance line runs for that system&rsquo;s term, then stops —
          after that it&rsquo;s just the energy line.{" "}
          {partner
            ? "The boiler and heat pump finance on their own rates + terms."
            : "Energy shown at today’s prices."}
        </p>

        {/* Horizon total */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Total over {horizonYears} years (finance + energy)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <HorizonTotal
              icon={<Flame className="w-4 h-4" />}
              label="New gas boiler"
              total={boilerFinanceTco}
              lowest={boilerFinanceTco === lowerFinanceTco}
            />
            <HorizonTotal
              icon={hpIcon("w-4 h-4", "text-base")}
              label={partner ? partner.name : "Heat pump"}
              total={hpFinanceTco}
              lowest={hpFinanceTco != null && hpFinanceTco === lowerFinanceTco}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Prefer to pay upfront? Over {horizonYears} years that&rsquo;s{" "}
            {fmtGbp(boilerUpfrontTco)} (boiler)
            {hpUpfrontTco != null ? ` vs ${fmtGbp(hpUpfrontTco)} (heat pump)` : ""}
            .
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-700 leading-relaxed">
          {lifetimeEnergyDelta >= 0 ? (
            <>
              Over {horizonYears} years, the heat pump&rsquo;s energy bills work out
              about{" "}
              <span className="font-semibold text-emerald-700">
                {fmtGbp(lifetimeEnergyDelta)} lower
              </span>{" "}
              than gas on this tariff — that&rsquo;s what offsets the higher
              fitting cost.
            </>
          ) : (
            <>
              Over {horizonYears} years, the heat pump&rsquo;s energy bills are about{" "}
              <span className="font-semibold text-amber-700">
                {fmtGbp(-lifetimeEnergyDelta)} higher
              </span>{" "}
              than gas on this tariff — a heat-pump tariff is what closes the
              gap.
            </>
          )}
        </p>

        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          Totals = the install (or total repayable on finance) plus {horizonYears}{" "}
          years of heating energy.{" "}
          {partner ? (
            <>
              Energy prices are projected forward at {gasInflation}%/yr for gas
              and {elecInflation}%/yr for electricity.
            </>
          ) : (
            <>At today&rsquo;s prices (no inflation modelled).</>
          )}{" "}
          Assumes a SCOP of {rc.assumptions.scop} for the heat pump and a{" "}
          {Math.round(rc.assumptions.boilerEfficiency * 100)}%-efficient gas
          boiler. Finance subject to status; minimum loan{" "}
          {fmtGbp(HEATING_FINANCE.minLoanGBP)}. A pre-survey indication — not a
          quote or a credit offer.
        </p>
      </SectionCard>

      {/* ── Assumptions (collapsible) — full, traceable breakdown ── */}
      <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 font-semibold text-navy">
            <Info className="w-5 h-5 text-coral" />
            Assumptions — how these numbers are worked out
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-5 px-5 pb-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Every figure comes from your EPC plus the constants below. Indicative
            — a home survey confirms the detail.
          </p>

          <AssumptionGroup title="Your property">
            <AssumptionRow
              k="Floor area"
              v={`${Math.round(rc.floorAreaM2)} m²${
                rc.floorAreaEstimated
                  ? " — national-average estimate (no EPC area found)"
                  : " — from your EPC"
              }`}
            />
          </AssumptionGroup>

          <AssumptionGroup title="Annual energy — built step by step">
            <AssumptionRow
              k="Heat-pump electricity"
              v={`${Math.round(rc.floorAreaM2)} m² × ${rc.assumptions.demandKwhPerM2} kWh/m² = ${rc.heatPumpElecKwh.toLocaleString()} kWh/yr`}
            />
            <AssumptionRow
              k="Heat demand (thermal)"
              v={`${rc.heatPumpElecKwh.toLocaleString()} kWh × ${rc.assumptions.scop} SCOP = ${rc.thermalDemandKwh.toLocaleString()} kWh/yr`}
            />
            <AssumptionRow
              k="Gas burned by the boiler"
              v={`${rc.thermalDemandKwh.toLocaleString()} kWh ÷ ${Math.round(
                rc.assumptions.boilerEfficiency * 100,
              )}% efficiency = ${rc.gasKwh.toLocaleString()} kWh/yr`}
            />
            <AssumptionRow
              strong
              k="Gas boiler bill / yr"
              v={`${fmtGbp(
                rc.boilerAnnualGBP -
                  rc.gasStandingAnnualGBP -
                  rc.boilerCareAnnualGBP,
              )} gas (${rc.gasKwh.toLocaleString()} kWh × ${rc.assumptions.gasUnitPencePerKwh}p) + ${fmtGbp(
                rc.gasStandingAnnualGBP,
              )} standing${
                rc.boilerCareAnnualGBP > 0
                  ? ` + ${fmtGbp(rc.boilerCareAnnualGBP)} cover`
                  : ""
              } = ${fmtGbp(rc.boilerAnnualGBP)}`}
            />
            <AssumptionRow
              strong
              k="Heat-pump bill / yr"
              v={`${rc.heatPumpElecKwh.toLocaleString()} kWh × ${rc.assumptions.elecUnitPencePerKwh}p${
                partner ? ` (${partner.name} Cosy)` : ""
              } = ${fmtGbp(rc.heatPumpAnnualGBP)}`}
            />
          </AssumptionGroup>

          <AssumptionGroup title="Upfront cost">
            <AssumptionRow
              k="New gas boiler"
              v={`${fmtGbp(boiler.installedCostGBP)} (${boiler.label})`}
            />
            <AssumptionRow
              k="Heat pump"
              v={
                hpNet != null
                  ? `${fmtGbp(heatPump.grossMidpointGBP)} − ${fmtGbp(
                      heatPump.grantGBP,
                    )} BUS grant = ${fmtGbp(hpNet)} net`
                  : `${fmtGbp(heatPump.grossRangeGBP[0])}–${fmtGbp(
                      heatPump.grossRangeGBP[1],
                    )} (grant path unconfirmed)`
              }
            />
          </AssumptionGroup>

          <AssumptionGroup title="Finance">
            <AssumptionRow
              k="New gas boiler"
              v={`${fmtGbp(boilerValue)} at ${boilerApr}% over ${
                boilerTerm / 12
              } yr → ${fmtGbp(
                Math.round(boilerQuote.monthlyGBP),
              )}/mo · ${fmtGbp(boilerQuote.totalRepayableGBP)} repayable`}
            />
            {hpQuote != null && hpNet != null && (
              <AssumptionRow
                k="Heat pump"
                v={`${fmtGbp(hpNet)} at ${hpApr}% over ${
                  hpTerm / 12
                } yr → ${fmtGbp(Math.round(hpQuote.monthlyGBP))}/mo · ${fmtGbp(
                  hpQuote.totalRepayableGBP,
                )} repayable`}
              />
            )}
          </AssumptionGroup>

          <AssumptionGroup
            title={`Total over ${horizonYears} years (on finance)`}
          >
            <AssumptionRow
              strong
              k="New gas boiler"
              v={`${fmtGbp(
                boilerQuote.totalRepayableGBP,
              )} finance + ${horizonYears} yrs energy${
                partner ? ` (gas +${gasInflation}%/yr)` : ""
              } = ${fmtGbp(boilerFinanceTco)}`}
            />
            {hpFinanceTco != null && (
              <AssumptionRow
                strong
                k="Heat pump"
                v={`${fmtGbp(
                  hpQuote!.totalRepayableGBP,
                )} finance + ${horizonYears} yrs energy${
                  partner ? ` (elec +${elecInflation}%/yr)` : ""
                } = ${fmtGbp(hpFinanceTco)}`}
              />
            )}
          </AssumptionGroup>

          <p className="border-t border-slate-100 pt-4 text-xs text-slate-500 leading-relaxed">
            Constants: SCOP {rc.assumptions.scop}, boiler efficiency{" "}
            {Math.round(rc.assumptions.boilerEfficiency * 100)}%, heat demand{" "}
            {rc.assumptions.demandKwhPerM2} kWh/m²/yr, BUS grant{" "}
            {fmtGbp(heatPump.grantGBP)}, electricity{" "}
            {rc.assumptions.elecUnitPencePerKwh}p/kWh, gas{" "}
            {rc.assumptions.gasUnitPencePerKwh}p/kWh.{" "}
            {partner
              ? `Energy projected up — gas +${gasInflation}%/yr, electricity +${elecInflation}%/yr.`
              : "Energy at today's prices (no inflation)."}{" "}
            Sources: your EPC, Energy Saving Trust + MCS Register averages
            {partner ? `, ${partner.name}` : ""}. A pre-survey indication, not a
            quote.
          </p>
        </div>
      </details>
    </div>
  );
}

function AssumptionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        {title}
      </p>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function AssumptionRow({
  k,
  v,
  strong,
}: {
  k: string;
  v: string;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="shrink-0 text-xs font-medium text-slate-500 sm:w-44">
        {k}
      </dt>
      <dd
        className={`text-sm tabular-nums ${
          strong ? "font-semibold text-navy" : "text-slate-700"
        }`}
      >
        {v}
      </dd>
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

function MonthlyRow({
  label,
  boiler,
  heatPump,
  emphasis = false,
  boilerLowest = false,
  heatPumpLowest = false,
}: {
  label: string;
  boiler: string;
  heatPump: string;
  emphasis?: boolean;
  boilerLowest?: boolean;
  heatPumpLowest?: boolean;
}) {
  const base = emphasis
    ? "border-t-2 border-slate-200 pt-3"
    : "border-t border-slate-100";
  const cellWeight = emphasis ? "text-base font-bold" : "text-sm";
  return (
    <tr>
      <td className={`py-2 pr-3 align-top ${base}`}>
        <span
          className={`${
            emphasis ? "font-semibold text-navy" : "text-slate-500"
          }`}
        >
          {label}
        </span>
      </td>
      <td className={`py-2 px-3 align-top ${base}`}>
        <span
          className={`${cellWeight} ${
            boilerLowest ? "text-emerald-700" : "text-navy"
          }`}
        >
          {boiler}
          {boilerLowest && (
            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              cheaper
            </span>
          )}
        </span>
      </td>
      <td className={`py-2 px-3 align-top ${base}`}>
        <span
          className={`${cellWeight} ${
            heatPumpLowest ? "text-emerald-700" : "text-navy"
          }`}
        >
          {heatPump}
          {heatPumpLowest && (
            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              cheaper
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}

function HorizonTotal({
  icon,
  label,
  total,
  lowest,
}: {
  icon: React.ReactNode;
  label: string;
  total: number | null;
  lowest: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        lowest ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <span className="text-coral">{icon}</span>
        {label}
      </div>
      <p
        className={`mt-1 text-xl font-bold ${
          lowest ? "text-emerald-700" : "text-navy"
        }`}
      >
        {total != null ? fmtGbp(total) : "—"}
      </p>
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
