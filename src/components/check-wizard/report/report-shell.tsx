"use client";

// ReportShell — full-width report layout.
//
// Layout (as of 2026-04-28):
//   1. Header — address + verdict headline (sticky context)
//   2. Recommendation strip — three big toggle tiles, always visible
//      regardless of tab so the user can change their plan at any time
//   3. Horizontal tab nav under the recommendation strip
//   4. Active tab body
//
// Previous version had a sticky LEFT-RAIL nav; we moved tabs back to
// horizontal because the rail was too prominent for a 5-tab structure
// and ate horizontal real-estate the report tabs (esp. Savings + Solar)
// needed for their wider charts and panels.
//
// Solar/Battery dependency is enforced HERE so every tab observes the
// same source-of-truth: when the user toggles solar off, battery flips
// off too and the Solar tab shows it as inactive.

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Flame,
  Home as HomeIcon,
  Mail,
  PoundSterling,
  Sun,
} from "lucide-react";
import { ShareReportModal } from "./share-modal";
import { useCheckWizard } from "../context";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import { OverviewTab } from "./tabs/overview-tab";
import { SavingsTab } from "./tabs/savings-tab";
import { HeatPumpTab } from "./tabs/heat-pump-tab";
import { SolarTab } from "./tabs/solar-tab";
import { BookVisitTab } from "./tabs/book-visit-tab";
import { RecommendationStrip } from "./recommendation-strip";

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
}

const TABS: TabDef[] = [
  { key: "overview", label: "Overview", icon: <HomeIcon className="w-4 h-4" /> },
  { key: "savings", label: "Savings", icon: <PoundSterling className="w-4 h-4" /> },
  { key: "heatpump", label: "Heat pump", icon: <Flame className="w-4 h-4" /> },
  { key: "solar", label: "Solar & battery", icon: <Sun className="w-4 h-4" /> },
  { key: "book", label: "Book a site visit", icon: <CalendarDays className="w-4 h-4" /> },
];

// Selection state — lives at the shell level so Overview / Savings /
// Solar tabs all read from + write to the same store. Battery is a
// slave to solar (deselect solar → battery auto-off) per the spec.
//
// `panelCount` and `batteryKwh` are sizing inputs that affect the cost
// breakdown across every tab. Changing battery from 5 to 10 kWh on the
// Solar tab updates the cost on the Savings tab and the recommendation
// strip — single source of truth.
export interface ReportSelection {
  hasSolar: boolean;
  hasBattery: boolean;
  hasHeatPump: boolean;
  panelCount: number;
  batteryKwh: number;
}

interface ReportShellProps {
  /** Switches the rendered surface between the homeowner-facing
   *  report (full advice / share / book-a-visit) and an installer-
   *  facing prep view (just the technical detail, no consumer
   *  cards, no email button). Defaults to "homeowner". */
  audience?: "homeowner" | "installer";
}

export function ReportShell({ audience = "homeowner" }: ReportShellProps = {}) {
  const isInstaller = audience === "installer";
  const { state, reset, back, goTo } = useCheckWizard();
  const [tab, setTab] = useState<ReportTabKey>("overview");
  const [shareOpen, setShareOpen] = useState(false);

  // Tabs filtered for the installer surface — drop Savings (consumer
  // ROI tiles) and Book a site visit (booking is the homeowner's job).
  const visibleTabs = isInstaller
    ? TABS.filter((t) => t.key !== "savings" && t.key !== "book")
    : TABS;
  const a = state.analysis;
  const addr = state.address;

  // Lead-capture gate (belt-and-braces — the wizard step order normally
  // prevents this).
  if (a && addr && !state.leadCapturedAt) {
    if (typeof window !== "undefined") {
      setTimeout(() => goTo("lead_capture"), 0);
    }
  }

  // Refs to each tab button so keyboard arrow nav can move focus to the
  // newly-selected tab as required by the ARIA tab pattern.
  const tabRefs = useRef<Record<ReportTabKey, HTMLButtonElement | null>>({
    overview: null,
    savings: null,
    heatpump: null,
    solar: null,
    book: null,
  });

  const initialSelection: ReportSelection = useMemo(() => {
    if (!a)
      return {
        hasSolar: true,
        hasBattery: true,
        hasHeatPump: true,
        panelCount: 12,
        batteryKwh: 5,
      };
    const solarOk = a.eligibility?.solar?.rating !== "Not recommended";
    const hpOk = a.eligibility?.heatPump?.verdict !== "blocked";
    return {
      hasSolar: solarOk,
      hasBattery: solarOk, // battery follows solar at startup
      hasHeatPump: hpOk,
      // Sizing defaults — recommended panel count from analysis, 5 kWh
      // battery (the most-popular size for UK homes).
      panelCount: a.eligibility?.solar?.recommendedPanels ?? 12,
      batteryKwh: 5,
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
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Persistent header — address + verdict headline. */}
      <header>
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

      {/* Persistent recommendation strip — visible across every tab
          so the user can adjust their plan at any time. Hidden in
          installer mode: the installer doesn't pick a config, they
          just see what the homeowner went with. */}
      {!isInstaller && (
        <RecommendationStrip
          analysis={a}
          selection={selection}
          setSelection={setSelection}
          onJumpTab={setTab}
        />
      )}

      {/* Horizontal tab nav — proper ARIA tab pattern.
          Arrow keys cycle between tabs; Home/End jump to first/last.
          Roving tabindex means Tab moves out of the tablist into the
          panel rather than cycling through all five tabs. */}
      <div
        role="tablist"
        aria-label="Report sections"
        aria-orientation="horizontal"
        className="-mx-1 px-1 overflow-x-auto border-b border-slate-200"
        onKeyDown={(e) => {
          const idx = visibleTabs.findIndex((t) => t.key === tab);
          if (idx < 0) return;
          let next = idx;
          if (e.key === "ArrowRight" || e.key === "ArrowDown")
            next = (idx + 1) % visibleTabs.length;
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
            next = (idx - 1 + visibleTabs.length) % visibleTabs.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = visibleTabs.length - 1;
          else return;
          e.preventDefault();
          const nextKey = visibleTabs[next].key;
          setTab(nextKey);
          tabRefs.current[nextKey]?.focus();
        }}
      >
        <div className="flex gap-1 min-w-max">
          {visibleTabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[t.key] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={active}
                aria-controls={`tabpanel-${t.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.key)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-coral text-coral-dark"
                    : "border-transparent text-slate-600 hover:text-navy hover:border-slate-300"
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab body */}
      <div
        className="min-w-0 space-y-6"
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
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
            audience={audience}
          />
        )}
        {tab === "savings" && !isInstaller && (
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
            audience={audience}
          />
        )}
        {tab === "solar" && (
          <SolarTab
            analysis={a}
            satelliteUrl={satelliteUrl}
            selection={selection}
            setSelection={setSelection}
            electricityTariff={state.electricityTariff}
            gasTariff={state.gasTariff}
          />
        )}
        {tab === "book" && !isInstaller && (
          <BookVisitTab
            analysis={a}
            postcode={addr.postcode}
            latitude={addr.latitude}
            longitude={addr.longitude}
            selection={selection}
          />
        )}

        {/* Footer controls. Installer mode hides everything except a
            spacer — the surrounding /installer/reports/[leadId] page
            wraps this in PortalShell which provides its own back link. */}
        {!isInstaller && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 mt-8">
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
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Email or share this report
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
        )}

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

      {shareOpen && (
        <ShareReportModal
          defaults={{
            homeownerEmail: state.leadEmail,
            homeownerName: state.leadName,
            homeownerLeadId: state.leadId,
            propertyAddress: addr.formattedAddress,
            propertyPostcode: addr.postcode,
            propertyUprn: addr.uprn,
            propertyLatitude: addr.latitude,
            propertyLongitude: addr.longitude,
            analysisSnapshot: {
              analysis: a,
              floorplanAnalysis: state.floorplanAnalysis,
              electricityTariff: state.electricityTariff,
              gasTariff: state.gasTariff,
            },
          }}
          onClose={() => setShareOpen(false)}
        />
      )}
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
