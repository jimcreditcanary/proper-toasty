"use client";

// Shared atoms used across the report tabs. Extracted from the old
// monolithic step-6-report.tsx so each tab file can stay focused on its
// own narrative without re-defining the same row / badge / pill markup.

import type { ReactNode } from "react";

// ─── Section card ───────────────────────────────────────────────────────────

export function SectionCard({
  title,
  subtitle,
  icon,
  rightSlot,
  children,
  padded = true,
  tone = "default",
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  tone?: "default" | "navy";
}) {
  const wrapper =
    tone === "navy"
      ? "rounded-2xl bg-navy text-white shadow-sm"
      : "rounded-2xl border border-[var(--border)] bg-white shadow-sm";
  const titleColour = tone === "navy" ? "text-white" : "text-navy";
  const subColour = tone === "navy" ? "text-slate-300" : "text-slate-500";
  return (
    <section className={wrapper}>
      {(title || icon || rightSlot) && (
        <header
          className={`flex items-start gap-3 ${
            padded ? "px-5 sm:px-6 pt-5 sm:pt-6" : ""
          }`}
        >
          {icon && (
            <span
              className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${
                tone === "navy"
                  ? "bg-white/10 text-coral"
                  : "bg-coral-pale text-coral"
              }`}
            >
              {icon}
            </span>
          )}
          {(title || subtitle) && (
            <div className="min-w-0 flex-1">
              {title && (
                <h3
                  className={`text-base sm:text-lg font-semibold leading-tight ${titleColour}`}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={`mt-0.5 text-sm leading-relaxed ${subColour}`}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </header>
      )}
      <div className={padded ? "px-5 sm:px-6 pb-5 sm:pb-6 pt-4" : ""}>
        {children}
      </div>
    </section>
  );
}

// ─── Verdict pill (Recommended / Possible / Not now) ────────────────────────

export type VerdictTone = "green" | "amber" | "red" | "slate";

const VERDICT_TONE_CLASSES: Record<VerdictTone, string> = {
  green: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border border-amber-200",
  red: "bg-red-100 text-red-700 border border-red-200",
  slate: "bg-slate-100 text-slate-700 border border-slate-200",
};

export function VerdictBadge({
  tone,
  label,
}: {
  tone: VerdictTone;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-1 ${VERDICT_TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

// ─── DL Row ──────────────────────────────────────────────────────────────────

export function FactRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-right font-medium text-navy">{children}</dd>
    </div>
  );
}

// ─── Issue list (blockers / warnings) ───────────────────────────────────────

export function IssueList({
  kind,
  items,
}: {
  kind: "blocker" | "warning";
  items: string[];
}) {
  if (!items.length) return null;
  const cls =
    kind === "blocker"
      ? "bg-red-50 border-red-100 text-red-900"
      : "bg-amber-50 border-amber-100 text-amber-900";
  return (
    <ul className={`rounded-lg border ${cls} p-3 space-y-1.5 text-sm`}>
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 leading-relaxed">
          <span aria-hidden className="select-none">
            {kind === "blocker" ? "!" : "•"}
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Big stat tile ──────────────────────────────────────────────────────────
//
// Headline number with an uppercase label and an optional supporting
// sentence. The green tone is used for grant amounts / "money in your
// pocket" stats so the eye lands on them as positive signal.

export function BigStat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green";
}) {
  const valueColour = tone === "green" ? "text-emerald-700" : "text-navy";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${valueColour}`}>{value}</p>
      {sub && (
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{sub}</p>
      )}
    </div>
  );
}

// ─── GBP formatter ──────────────────────────────────────────────────────────

export function fmtGbp(n: number, options?: { compact?: boolean }): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: options?.compact || Math.abs(n) >= 1000 ? 0 : 2,
  }).format(n);
}

// Cardinal-direction label from azimuth degrees (0 = N).
export function describeAzimuth(az: number | undefined | null): string {
  if (az == null) return "—";
  const a = ((az % 360) + 360) % 360;
  const names: Array<[number, string]> = [
    [22.5, "North"],
    [67.5, "North-east"],
    [112.5, "East"],
    [157.5, "South-east"],
    [202.5, "South"],
    [247.5, "South-west"],
    [292.5, "West"],
    [337.5, "North-west"],
  ];
  for (const [threshold, name] of names) if (a < threshold) return name;
  return "North";
}
