"use client";

// EligibilityChecklist — the compact, display-only summary of what
// the property is eligible for. Replaces the bulky three-card
// RecommendationStrip at the shell level.
//
// Why split this out:
//   - The recommendation strip used to do TWO jobs in one block:
//       (a) tell the user what's eligible
//       (b) let them toggle items in / out of their plan
//   - Showing both at the very top of every tab burned vertical
//     real-estate the report didn't have to spare.
//   - Job (a) — eligibility status — is now this single-row pill
//     strip. Tiny, scannable, one glance.
//   - Job (b) — plan toggles — moved to the Savings tab where the
//     toggles live next to the cost figures they affect.
//
// No interaction here — this is a status indicator, not a control.

import { Battery, Flame, Sun, type LucideIcon } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";

interface Props {
  analysis: AnalyseResponse;
}

type Tone = "green" | "amber" | "slate";

interface ItemDef {
  // Internal identifier — not named `key` because that collides with
  // React's reserved `key` prop when spreading via `{...item}`.
  id: "heatpump" | "solar" | "battery";
  Icon: LucideIcon;
  title: string;
  detail: string | null;
  verdict: string;
  tone: Tone;
}

export function EligibilityChecklist({ analysis }: Props) {
  const hp = analysis.eligibility.heatPump;
  const solar = analysis.eligibility.solar;
  const solarStrong = solar.rating === "Excellent" || solar.rating === "Good";

  const items: ItemDef[] = [
    {
      id: "heatpump",
      Icon: Flame,
      title: "Heat pump",
      detail: hp.recommendedSystemKW ? `${hp.recommendedSystemKW} kW` : null,
      verdict:
        hp.verdict === "eligible"
          ? "Recommended"
          : hp.verdict === "conditional"
            ? "Possible"
            : "Not now",
      tone:
        hp.verdict === "eligible"
          ? "green"
          : hp.verdict === "conditional"
            ? "amber"
            : "slate",
    },
    {
      id: "solar",
      Icon: Sun,
      title: "Solar PV",
      detail: solar.recommendedKWp ? `${solar.recommendedKWp} kWp` : null,
      verdict: solar.rating,
      tone: solarStrong ? "green" : solar.rating === "Marginal" ? "amber" : "slate",
    },
    {
      id: "battery",
      Icon: Battery,
      title: "Battery",
      detail: null,
      verdict: solarStrong ? "Pairs well" : "Optional",
      tone: solarStrong ? "green" : "slate",
    },
  ];

  return (
    <section
      aria-label="What your home is eligible for"
      className="rounded-2xl border border-[var(--border)] bg-white shadow-sm px-4 py-3 sm:px-5 sm:py-4"
    >
      <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-coral">
          What your home is eligible for
        </span>
        <span className="text-xs text-slate-500 hidden sm:inline">
          · adjust your plan on the Savings tab
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-2 gap-y-2" role="list">
        {items.map((item) => (
          <Pill key={item.id} {...item} />
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500 sm:hidden">
        Adjust your plan on the Savings tab.
      </p>
    </section>
  );
}

function Pill({
  Icon,
  title,
  detail,
  verdict,
  tone,
}: ItemDef) {
  const verdictTone =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";

  const iconTone =
    tone === "green"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-slate-400";

  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-2.5 pr-1 py-1">
      <Icon className={`w-4 h-4 shrink-0 ${iconTone}`} aria-hidden="true" />
      <span className="text-sm font-semibold text-navy">{title}</span>
      {detail && (
        <span className="text-xs text-slate-500 tabular-nums">{detail}</span>
      )}
      <span
        className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${verdictTone}`}
      >
        {verdict}
      </span>
    </li>
  );
}
