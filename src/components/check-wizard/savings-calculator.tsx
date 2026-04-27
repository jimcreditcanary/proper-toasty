"use client";

// SavingsCalculator — interactive calculator on the report page.
//
// Inputs:
//   - Tech toggles: Solar / Battery / Heat pump (drives has_* flags)
//   - Battery size slider (default 5kWh)
//   - Time horizon slider (years; default 10)
//   - Export price input (editable; default £0.15/kWh)
//   - Loan term selectors (5/10/15 yr; APRs are fixed admin-side)
//
// Whenever any input changes we POST to /api/savings/calculate. The proxy
// builds the Octopus request from wizard state + these inputs and returns
// the response (a flat array of 12 × `years` monthly rows).
//
// Headline stats and charts are derived from those rows via lib/savings/derive.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Sun,
  Battery,
  Flame,
  ChevronDown,
  Info,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { SavingsCalculateResult } from "@/lib/schemas/savings";
import { FINANCE_DEFAULTS } from "@/lib/config/finance";
import { deriveAnnualBills, deriveCurve, deriveHeadline } from "@/lib/savings/derive";
import { AnnualBillChart, SavingsCurveChart } from "./savings-charts";

interface Props {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
}

interface CalcInputs {
  hasSolar: boolean;
  hasBattery: boolean;
  hasHeatPump: boolean;
  batteryKwh: number;
  years: number;
  exportPrice: number;
  solarLoanTermYears: number;
  batteryLoanTermYears: number;
}

const DEBOUNCE_MS = 300;

export function SavingsCalculator({ analysis, electricityTariff, gasTariff }: Props) {
  const [inputs, setInputs] = useState<CalcInputs>(() => ({
    hasSolar: analysis.eligibility?.solar?.rating !== "Not recommended",
    hasBattery: true,
    hasHeatPump: analysis.eligibility?.heatPump?.verdict !== "blocked",
    batteryKwh: FINANCE_DEFAULTS.defaultBatteryKwh,
    years: FINANCE_DEFAULTS.defaultYears,
    exportPrice: FINANCE_DEFAULTS.defaultExportPrice,
    solarLoanTermYears: FINANCE_DEFAULTS.defaultSolarLoanTermYears,
    batteryLoanTermYears: FINANCE_DEFAULTS.defaultBatteryLoanTermYears,
  }));

  const [result, setResult] = useState<SavingsCalculateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runCalculator();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inputs.hasSolar,
    inputs.hasBattery,
    inputs.hasHeatPump,
    inputs.batteryKwh,
    inputs.years,
    inputs.exportPrice,
    inputs.solarLoanTermYears,
    inputs.batteryLoanTermYears,
  ]);

  async function runCalculator() {
    setLoading(true);
    try {
      const res = await fetch("/api/savings/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          electricityTariff,
          gasTariff,
          inputs,
        }),
      });
      const json = (await res.json()) as SavingsCalculateResult;
      setResult(json);
    } catch (e) {
      setResult({
        ok: false,
        request: result?.request ?? ({} as SavingsCalculateResult["request"]),
        response: null,
        error: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  const rows = result?.response ?? null;
  const headline = useMemo(() => (rows ? deriveHeadline(rows) : null), [rows]);
  const annualBills = useMemo(() => (rows ? deriveAnnualBills(rows) : []), [rows]);
  const curve = useMemo(() => (rows ? deriveCurve(rows) : []), [rows]);

  const noTechSelected = !inputs.hasSolar && !inputs.hasBattery && !inputs.hasHeatPump;

  return (
    <section className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <header className="mb-5">
        <h3 className="text-xl font-semibold text-navy">Your savings calculator</h3>
        <p className="mt-1 text-sm text-slate-500">
          Powered live by the Octopus calculator. Toggle the technologies on or off and
          adjust the inputs — figures update instantly.
        </p>
      </header>

      {/* Tech toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
        <ToggleTile
          label="Solar PV"
          icon={<Sun className="w-4 h-4" />}
          on={inputs.hasSolar}
          onChange={(v) => setInputs((s) => ({ ...s, hasSolar: v }))}
        />
        <ToggleTile
          label="Battery"
          icon={<Battery className="w-4 h-4" />}
          on={inputs.hasBattery}
          onChange={(v) => setInputs((s) => ({ ...s, hasBattery: v }))}
        />
        <ToggleTile
          label="Heat pump"
          icon={<Flame className="w-4 h-4" />}
          on={inputs.hasHeatPump}
          onChange={(v) => setInputs((s) => ({ ...s, hasHeatPump: v }))}
        />
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <SliderRow
          label="Battery size"
          value={inputs.batteryKwh}
          min={FINANCE_DEFAULTS.batteryKwhMin}
          max={FINANCE_DEFAULTS.batteryKwhMax}
          step={FINANCE_DEFAULTS.batteryKwhStep}
          unit="kWh"
          disabled={!inputs.hasBattery}
          onChange={(v) => setInputs((s) => ({ ...s, batteryKwh: v }))}
        />
        <SliderRow
          label="Time horizon"
          value={inputs.years}
          min={FINANCE_DEFAULTS.yearsMin}
          max={FINANCE_DEFAULTS.yearsMax}
          step={1}
          unit={inputs.years === 1 ? "year" : "years"}
          onChange={(v) => setInputs((s) => ({ ...s, years: v }))}
        />
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 mb-5 min-h-[88px]">
        {noTechSelected ? (
          <div className="col-span-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
            <Info className="w-4 h-4" /> Pick at least one technology to see savings.
          </div>
        ) : loading && !result ? (
          <div className="col-span-full flex items-center justify-center py-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculating…
          </div>
        ) : result?.ok === false ? (
          <div className="col-span-full flex items-start gap-2 py-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{result.error ?? "Calculator unavailable"}</span>
          </div>
        ) : headline ? (
          <>
            <Stat
              label="Year-1 savings"
              value={formatGbp(headline.year1Savings)}
              tone={headline.year1Savings >= 0 ? "positive" : "negative"}
              loading={loading}
            />
            <Stat
              label="Avg / month"
              value={formatGbp(headline.avgMonthlySavings)}
              tone={headline.avgMonthlySavings >= 0 ? "positive" : "negative"}
              loading={loading}
            />
            <Stat
              label={`Total over ${inputs.years}y`}
              value={formatGbp(headline.totalSavings)}
              tone={headline.totalSavings >= 0 ? "positive" : "negative"}
              loading={loading}
            />
            <Stat
              label="Payback"
              value={
                headline.paybackYears != null
                  ? `${headline.paybackYears.toFixed(1)} yrs`
                  : `> ${inputs.years} yrs`
              }
              tone={headline.paybackYears != null ? "positive" : "neutral"}
              loading={loading}
            />
          </>
        ) : null}
      </div>

      {/* Charts */}
      {!noTechSelected && rows && headline && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Annual energy bill"
            sub="Do nothing vs. with the upgrades you've selected"
          >
            <AnnualBillChart data={annualBills} />
          </ChartCard>
          <ChartCard
            title="Cumulative savings"
            sub={
              headline.paybackYears != null
                ? `Crosses break-even at ${headline.paybackYears.toFixed(1)} years`
                : `Negative for the full ${inputs.years} years — try toggling tech`
            }
          >
            <SavingsCurveChart data={curve} />
          </ChartCard>
        </div>
      )}

      {/* Assumptions */}
      <button
        type="button"
        onClick={() => setShowAssumptions((v) => !v)}
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        Assumptions
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${showAssumptions ? "rotate-180" : ""}`}
        />
      </button>
      {showAssumptions && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <NumberInputRow
            label="SEG export price"
            value={inputs.exportPrice}
            min={0}
            step={0.01}
            unit="£/kWh"
            onChange={(v) => setInputs((s) => ({ ...s, exportPrice: v }))}
            help="What your supplier pays you per kWh you export."
          />
          <SelectRow
            label="Solar loan term"
            value={inputs.solarLoanTermYears}
            options={FINANCE_DEFAULTS.loanTermOptionsYears as unknown as number[]}
            onChange={(v) => setInputs((s) => ({ ...s, solarLoanTermYears: v }))}
            help={`APR ${FINANCE_DEFAULTS.solarLoanAprPct}% (fixed)`}
          />
          <SelectRow
            label="Battery loan term"
            value={inputs.batteryLoanTermYears}
            options={FINANCE_DEFAULTS.loanTermOptionsYears as unknown as number[]}
            onChange={(v) => setInputs((s) => ({ ...s, batteryLoanTermYears: v }))}
            help={`APR ${FINANCE_DEFAULTS.batteryLoanAprPct}% (fixed)`}
          />
          <ReadOnlyRow
            label="Off-peak elec price"
            value={`£${FINANCE_DEFAULTS.defaultOffPeakElecPrice.toFixed(2)}/kWh`}
            help="Default; we'll ask about TOU tariffs (Go / Cosy) in a future update."
          />
        </div>
      )}
    </section>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatGbp(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2,
  }).format(n);
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ChartCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="mb-2">
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleTile({
  label,
  icon,
  on,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
        on
          ? "border-coral bg-coral-pale text-coral-dark"
          : "border-[var(--border)] bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      <span className="inline-flex items-center gap-2 font-medium">
        {icon}
        {label}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          on ? "bg-coral" : "bg-slate-300"
        }`}
        aria-hidden
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            on ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-semibold text-navy">{label}</label>
        <span className="text-sm font-medium text-slate-700">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-coral"
      />
    </div>
  );
}

function NumberInputRow({
  label,
  value,
  min,
  step,
  unit,
  help,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  unit: string;
  help?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-navy">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 w-28 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        />
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      {help && <p className="mt-1 text-[11px] text-slate-500">{help}</p>}
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
  help?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-navy">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 w-28 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o} years
            </option>
          ))}
        </select>
      </div>
      {help && <p className="mt-1 text-[11px] text-slate-500">{help}</p>}
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-navy">{label}</label>
      <div className="mt-1 text-sm text-slate-700">{value}</div>
      {help && <p className="mt-1 text-[11px] text-slate-500">{help}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
  loading: boolean;
}) {
  const colour =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : "text-navy";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${colour} transition-opacity ${
          loading ? "opacity-50" : "opacity-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
