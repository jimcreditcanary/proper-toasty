"use client";

// Collapsible "advanced financing" panel for the Savings tab. Drives
// the loan / mortgage inputs that feed the savings-calc engine.
//
// Plain `<details>` element rather than a custom disclosure widget —
// it gets keyboard focus, screen-reader semantics, and Tab-cycling
// for free.

import { ChevronDown, Info } from "lucide-react";
import type { FinancingInputs } from "@/lib/savings/build-request";

interface Props {
  value: FinancingInputs;
  onChange: (next: FinancingInputs) => void;
}

export function FinancingControls({ value, onChange }: Props) {
  const set = (patch: Partial<FinancingInputs>) =>
    onChange({ ...value, ...patch });

  // Convert decimal ↔ % for the rate inputs. The API takes 0.069 for
  // 6.9%; the user thinks in percentages.
  const aprPct = round1(value.loanApr * 100);
  const mortgagePct = round1(value.mortgageRate * 100);

  return (
    <details className="group rounded-xl border border-slate-200 bg-white open:shadow-sm">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-3 select-none">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
          <Info className="w-4 h-4 text-slate-400" />
          Advanced: financing assumptions
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldRow label="Loan APR" hint="Personal-loan rate, %">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={50}
              step={0.1}
              value={aprPct}
              onChange={(e) =>
                set({ loanApr: clamp(Number(e.target.value), 0, 50) / 100 })
              }
              className="w-24 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
            />
            <span className="ml-1 text-sm text-slate-500">%</span>
          </FieldRow>

          <FieldRow label="Loan term">
            <select
              value={value.loanTermMonths}
              onChange={(e) =>
                set({ loanTermMonths: Number(e.target.value) })
              }
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
            >
              {LOAN_TERMS.map((m) => (
                <option key={m} value={m}>
                  {m / 12} years ({m} months)
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label="Mortgage rate" hint="Annual interest, %">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={20}
              step={0.1}
              value={mortgagePct}
              onChange={(e) =>
                set({
                  mortgageRate: clamp(Number(e.target.value), 0, 20) / 100,
                })
              }
              className="w-24 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
            />
            <span className="ml-1 text-sm text-slate-500">%</span>
          </FieldRow>

          <FieldRow label="Mortgage term">
            <select
              value={value.mortgageTermYears}
              onChange={(e) =>
                set({ mortgageTermYears: Number(e.target.value) })
              }
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
            >
              {MORTGAGE_TERMS.map((y) => (
                <option key={y} value={y}>
                  {y} years
                </option>
              ))}
            </select>
          </FieldRow>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.wantFinance}
            onChange={(e) => set({ wantFinance: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-coral focus:ring-coral"
          />
          Show personal-loan scenario
        </label>

        <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
          Illustrative figures only — we&rsquo;re not a lender or broker. Talk
          to a regulated mortgage adviser before adding upgrades to a real
          mortgage.
        </p>
      </div>
    </details>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
        {hint && (
          <span className="ml-2 font-normal normal-case text-slate-400 tracking-normal">
            — {hint}
          </span>
        )}
      </label>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

const LOAN_TERMS = [12, 24, 36, 48, 60, 84, 120, 180, 240, 300, 360];
const MORTGAGE_TERMS = [5, 10, 15, 20, 25, 30, 35];

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
