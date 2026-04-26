"use client";

// ReportShell — the new full-width report layout.
//
// Replaces the tabbed top-nav of the old step-6-report. The shell carries:
//   - A sticky left rail with the 5 tabs (collapses to a horizontal row on
//     small screens so it stays usable on mobile).
//   - A wide content column (max-w-6xl) — wider than the rest of the
//     wizard so the savings tab's bigger charts and the floorplan
//     read-only widget have room to breathe.
//   - A persistent address strip + verdict headline at the very top,
//     visible regardless of which tab is active. Below those, each tab
//     is a single self-contained component.
//
// Solar/Battery dependency is enforced HERE so every tab observes the
// same source-of-truth: when the user toggles solar off in the savings
// tab, battery flips off too and the Solar tab shows it as inactive.

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Flame,
  Home as HomeIcon,
  PoundSterling,
  Sun,
} from "lucide-react";
import { useCheckWizard } from "../context";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import { OverviewTab } from "./tabs/overview-tab";
import { SavingsTab } from "./tabs/savings-tab";
import { HeatPumpTab } from "./tabs/heat-pump-tab";
import { SolarTab } from "./tabs/solar-tab";
import { BookVisitTab } from "./tabs/book-visit-tab";

export type ReportTabKey =
  | "overview"
  | "savings"
  | "heatpump"
  | "solar"
  | "book";

interface TabDef {
  key: ReportTabKey;
  label: string;
  icon: ReactNode;
  blurb: string;
}

const TABS: TabDef[] = [
  {
    key: "overview",
    label: "Overview",
    icon: <HomeIcon className="w-4 h-4" />,
    blurb: "Your property at a glance",
  },
  {
    key: "savings",
    label: "Savings",
    icon: <PoundSterling className="w-4 h-4" />,
    blurb: "What it costs, what you save",
  },
  {
    key: "heatpump",
    label: "Heat pump",
    icon: <Flame className="w-4 h-4" />,
    blurb: "How it fits your home",
  },
  {
    key: "solar",
    label: "Solar & battery",
    icon: <Sun className="w-4 h-4" />,
    blurb: "Panels on your roof",
  },
  {
    key: "book",
    label: "Book a site visit",
    icon: <CalendarDays className="w-4 h-4" />,
    blurb: "Pick an installer",
  },
];

// Selection state for the "what should we cost up?" toggles. Lives at
// the shell level so the Overview / Savings / Solar tabs all read from
// the same source. Battery is a slave to solar (deselect solar → battery
// auto-off) per the spec.
export interface ReportSelection {
  hasSolar: boolean;
  hasBattery: boolean;
  hasHeatPump: boolean;
}

export function ReportShell() {
  const { state, reset, back, goTo } = useCheckWizard();
  const [tab, setTab] = useState<ReportTabKey>("overview");
  const a = state.analysis;
  const addr = state.address;

  // Lead-capture gate (belt-and-braces — the wizard step order normally
  // prevents this).
  if (a && addr && !state.leadCapturedAt) {
    if (typeof window !== "undefined") {
      setTimeout(() => goTo("lead_capture"), 0);
    }
  }

  const initialSelection: ReportSelection = useMemo(() => {
    if (!a) return { hasSolar: true, hasBattery: true, hasHeatPump: true };
    const solarOk = a.eligibility?.solar?.rating !== "Not recommended";
    const hpOk = a.eligibility?.heatPump?.verdict !== "blocked";
    return {
      hasSolar: solarOk,
      hasBattery: solarOk, // battery follows solar at startup
      hasHeatPump: hpOk,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selection, setSelectionState] = useState<ReportSelection>(initialSelection);

  // Setter that enforces the battery-as-slave-to-solar dependency so any
  // tab can call setSelection without having to remember the rule.
  const setSelection = (next: ReportSelection) => {
    if (!next.hasSolar) {
      setSelectionState({ ...next, hasBattery: false });
    } else {
      setSelectionState(next);
    }
  };

  if (!a || !addr || !a.eligibility || !a.finance) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-slate-600">We don&rsquo;t have analysis results yet.</p>
        <button
          onClick={back}
          className="mt-6 text-sm text-coral hover:underline font-medium"
        >
          Go back and run the analysis
        </button>
      </div>
    );
  }

  const headline = buildHeadline(a);
  const floorplan: FloorplanAnalysis | null =
    state.floorplanAnalysis ?? a.floorplan.analysis;
  const satelliteUrl = `/api/imagery/satellite?${new URLSearchParams({
    lat: String(addr.latitude),
    lng: String(addr.longitude),
    zoom: "20",
    w: "640",
    h: "360",
  }).toString()}`;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6">
      {/* Persistent header — address + verdict headline. Stays at the top
          regardless of which tab is active so the user never loses the
          context of what this report is about. */}
      <header className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-1.5">
          Your home
        </p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy leading-tight">
          {headline}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-navy">{addr.formattedAddress}</span>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">
        {/* Left rail nav (collapses to top tabs on mobile) */}
        <nav
          aria-label="Report sections"
          className="lg:sticky lg:top-20 lg:self-start"
        >
          <ul className="flex lg:flex-col gap-1 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto lg:overflow-visible">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <li key={t.key} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => setTab(t.key)}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                      active
                        ? "bg-coral-pale text-coral-dark"
                        : "text-slate-600 hover:bg-slate-100 hover:text-navy"
                    }`}
                  >
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                        active
                          ? "bg-white text-coral"
                          : "bg-slate-100 text-slate-500 group-hover:bg-white"
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold leading-tight ${
                          active ? "text-coral-dark" : "text-navy"
                        }`}
                      >
                        {t.label}
                      </span>
                      <span className="hidden lg:block text-[11px] text-slate-500 mt-0.5 leading-tight">
                        {t.blurb}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content column */}
        <div className="min-w-0 space-y-6">
          {tab === "overview" && (
            <OverviewTab
              analysis={a}
              address={addr.formattedAddress}
              satelliteUrl={satelliteUrl}
              electricityTariff={state.electricityTariff}
              gasTariff={state.gasTariff}
              selection={selection}
              setSelection={setSelection}
              financingPreference={state.financingPreference}
              onJumpTab={setTab}
            />
          )}
          {tab === "savings" && (
            <SavingsTab
              analysis={a}
              electricityTariff={state.electricityTariff}
              gasTariff={state.gasTariff}
              selection={selection}
              setSelection={setSelection}
              financingPreference={state.financingPreference}
            />
          )}
          {tab === "heatpump" && (
            <HeatPumpTab
              analysis={a}
              floorplan={floorplan}
              floorplanImageUrl={
                state.floorplanObjectKey
                  ? `/api/floorplan/image?key=${encodeURIComponent(
                      state.floorplanObjectKey,
                    )}`
                  : null
              }
            />
          )}
          {tab === "solar" && (
            <SolarTab
              analysis={a}
              satelliteUrl={satelliteUrl}
              selection={selection}
              setSelection={setSelection}
            />
          )}
          {tab === "book" && (
            <BookVisitTab
              analysis={a}
              postcode={addr.postcode}
              latitude={addr.latitude}
              longitude={addr.longitude}
              selection={selection}
            />
          )}

          {/* Footer controls — Back / Start over */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-8">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to floorplan
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              Start another check
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="pt-4 text-xs text-slate-500 leading-relaxed">
            A pre-survey indication based on public data, satellite imagery, and your
            floorplan — not a final quote. An MCS-certified installer will refine the
            numbers on a site visit. Solar yield via PVGIS v5.3 (EU JRC). BUS eligibility
            per Ofgem guidance — confirm against the current scheme version. Listed-
            building data from Historic England; planning areas from
            planning.data.gov.uk. Flood warnings from the Environment Agency. Report
            generated {new Date().toLocaleDateString("en-GB")}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Headline generator ─────────────────────────────────────────────────────

function buildHeadline(a: AnalyseResponse): string {
  const hp = a.eligibility.heatPump;
  const solar = a.eligibility.solar;
  const kwp = solar.recommendedKWp;
  const solarPhrase =
    solar.rating === "Excellent" || solar.rating === "Good"
      ? `${kwp ? `a ${kwp} kWp ` : ""}solar array`
      : null;

  if (hp.verdict === "eligible" && solarPhrase) {
    return `Your home looks like a strong candidate for an air source heat pump and ${solarPhrase}.`;
  }
  if (hp.verdict === "eligible") {
    return "Your home looks suitable for a heat pump. Solar is a less obvious win here.";
  }
  if (hp.verdict === "conditional" && solarPhrase) {
    return `Rooftop solar looks great. A heat pump is possible but a couple of things need sorting first.`;
  }
  if (hp.verdict === "conditional") {
    return "A heat pump is possible, but there are a few warnings to address before applying.";
  }
  if (solarPhrase) {
    return `Rooftop solar looks great, but a heat pump isn't a straightforward fit right now.`;
  }
  return "We've flagged the key things an installer would want to know about your property.";
}
