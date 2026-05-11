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
  /** Three-variant filter. solar hides the heat-pump row; heatpump
   *  hides solar + battery. 'all' or undefined shows every pill. */
  focus?: "all" | "solar" | "heatpump";
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

export function EligibilityChecklist({ analysis, focus = "all" }: Props) {
  const hp = analysis.eligibility.heatPump;
  const solar = analysis.eligibility.solar;
  const solarStrong = solar.rating === "Excellent" || solar.rating === "Good";

  // Verdict copy is deliberately plain English: "Compatible" /
  // "Requires investigation" / "Not compatible". The previous mix
  // ("Recommended", "Pairs well", "Good") was confusing — different
  // labels per row meant the user couldn't compare at a glance.
  const items: ItemDef[] = [
    {
      id: "heatpump",
      Icon: Flame,
      title: "Heat pump",
      detail: hp.recommendedSystemKW ? `${hp.recommendedSystemKW} kW` : null,
      verdict:
        hp.verdict === "eligible"
          ? "Compatible"
          : hp.verdict === "conditional"
            ? "Requires investigation"
            : "Not compatible",
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
      verdict: solarStrong
        ? "Compatible"
        : solar.rating === "Marginal"
          ? "Requires investigation"
          : "Not compatible",
      tone: solarStrong ? "green" : solar.rating === "Marginal" ? "amber" : "slate",
    },
    {
      id: "battery",
      Icon: Battery,
      title: "Battery",
      detail: null,
      verdict: solarStrong ? "Compatible" : "Requires investigation",
      tone: solarStrong ? "green" : "amber",
    },
  ];

  // Filter pills by focus variant. solar hides heat-pump (it's
  // not what they came for); heatpump hides solar + battery.
  const visibleItems = items.filter((item) => {
    if (focus === "solar" && item.id === "heatpump") return false;
    if (focus === "heatpump" && (item.id === "solar" || item.id === "battery"))
      return false;
    return true;
  });

  // Don't render the strip when there's nothing to show — defensive
  // against a future variant that excludes everything.
  if (visibleItems.length === 0) return null;

  // Inline strip — no card wrapper. Title on the left, three pills
  // on the right, all on one line on desktop. Renders directly under
  // the report H1 (replacing where the address line used to sit).
  // Wraps on narrow viewports.
  return (
    <section
      aria-label="What your home is eligible for"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
        What your home is eligible for
      </p>
      <ul className="flex flex-wrap gap-x-2 gap-y-2" role="list">
        {visibleItems.map((item) => (
          <Pill key={item.id} {...item} />
        ))}
      </ul>
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
