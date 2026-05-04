"use client";

// Financing options panel — always visible (was a collapsed
// <details> previously, but the user almost always wants to see /
// tweak these values, so hiding behind a chevron made the report
// feel incomplete).
//
// Two scenarios, each with their own checkbox: "Show personal loan"
// and "Show add to mortgage". Sliders (not number inputs) for APR
// and term so it's obvious they're adjustable without having to know
// the valid range. When a scenario is unchecked, its inputs collapse
// out of view — keeps the panel compact.

import { Coins, Home } from "lucide-react";
import type { FinancingInputs } from "@/lib/savings/build-request";
import { SectionCard } from "../shared";

interface Props {
  value: FinancingInputs;
  onChange: (next: FinancingInputs) => void;
}

export function FinancingControls({ value, onChange }: Props) {
  const set = (patch: Partial<FinancingInputs>) =>
    onChange({ ...value, ...patch });

  // The API's `loan_term_months` is the source of truth, but every UI
  // surface displays in years. Stored as a multiple of 12 so the
  // conversion is lossless.
  const loanTermYears = Math.round(value.loanTermMonths / 12);

  return (
    <SectionCard
      title="Financing options"
      subtitle="Tick the scenarios you want to compare. The chart and tables update with your settings."
      icon={<Coins className="w-5 h-5" />}
    >
      <div className="space-y-5">
        <ScenarioBlock
          icon={<Coins className="w-4 h-4" />}
          title="Personal loan"
          checked={value.wantFinance}
          onCheck={(c) => set({ wantFinance: c })}
        >
          {value.wantFinance && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <SliderField
                label="Loan APR"
                value={value.loanApr * 100}
                min={0}
                max={20}
                step={0.1}
                suffix="%"
                onChange={(v) => set({ loanApr: v / 100 })}
              />
              <SliderField
                label="Loan term"
                value={loanTermYears}
                min={1}
                max={30}
                step={1}
                suffix=" years"
                onChange={(v) => set({ loanTermMonths: v * 12 })}
              />
            </div>
          )}
        </ScenarioBlock>

        <ScenarioBlock
          icon={<Home className="w-4 h-4" />}
          title="Add to mortgage"
          checked={value.wantMortgage}
          onCheck={(c) => set({ wantMortgage: c })}
        >
          {value.wantMortgage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <SliderField
                label="Mortgage rate"
                value={value.mortgageRate * 100}
                min={0}
                max={15}
                step={0.1}
                suffix="%"
                onChange={(v) => set({ mortgageRate: v / 100 })}
              />
              <SliderField
                label="Mortgage term"
                value={value.mortgageTermYears}
                min={5}
                max={35}
                step={1}
                suffix=" years"
                onChange={(v) => set({ mortgageTermYears: v })}
              />
            </div>
          )}
        </ScenarioBlock>

        <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
          The mortgage scenario assumes a{" "}
          <strong>capital + interest repayment</strong> over the term shown —
          interest-only mortgages would have lower monthly payments but
          higher total cost. Illustrative figures only — we&rsquo;re not a
          lender or broker. Talk to a regulated mortgage adviser before
          adding upgrades to a real mortgage.
        </p>
      </div>
    </SectionCard>
  );
}

// ─── Scenario block ────────────────────────────────────────────────────
// Header row with the title + checkbox; body collapses out when the
// checkbox is off. We use a real <fieldset>/<legend> for screen-reader
// grouping — checking the box is logically a master toggle for the
// whole block.

function ScenarioBlock({
  icon,
  title,
  checked,
  onCheck,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  checked: boolean;
  onCheck: (c: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-2 -ml-2">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheck(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-coral focus:ring-coral"
          />
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
            <span className="text-coral">{icon}</span>
            Show {title.toLowerCase()} scenario
          </span>
        </label>
      </legend>
      {children}
    </fieldset>
  );
}

// ─── Slider field ──────────────────────────────────────────────────────
// Range input with the value tucked into the label so the user always
// sees the current setting. Uses `accent-coral` to colour the thumb +
// fill consistently with the rest of the report.

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  // 1-dp display for percentage sliders, integer for whole-number
  // ones. Avoid printing "0.10000000001" when step is 0.1.
  const display = step < 1 ? round1(value) : Math.round(value);
  return (
    <div>
      <label className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="text-sm font-bold text-navy tabular-nums">
          {display}
          {suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-coral cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 tabular-nums">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
