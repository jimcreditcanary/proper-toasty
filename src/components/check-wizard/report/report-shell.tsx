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
  CalendarCheck2,
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
import { EligibilityChecklist } from "./eligibility-checklist";

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
  { key: "overview", label: "Overview", icon: <HomeIcon className="w-5 h-5" /> },
  { key: "savings", label: "Savings", icon: <PoundSterling className="w-5 h-5" /> },
  { key: "heatpump", label: "Heat pump", icon: <Flame className="w-5 h-5" /> },
  { key: "solar", label: "Solar & battery", icon: <Sun className="w-5 h-5" /> },
  { key: "book", label: "Book a site visit", icon: <CalendarDays className="w-5 h-5" /> },
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

// Three-way audience type derived from the prop + wizard state. The
// `audience` prop is set by the calling page (installer = "installer";
// everything else = "homeowner"), but a homeowner viewing a report
// they got from a specific installer (preSurveyRequestId set) is a
// distinct surface — they're committed to that installer, so:
//   - the "Working with installers" prep card is rephrased for the
//     upcoming visit with that specific installer
//   - the Book-a-site-visit tab swaps the nearby-installers grid for
//     a focused "your visit with X is the next step" card
//   - the Savings chart defaults to cumulative (best for a meeting
//     conversation) instead of the homeowner's preferred monthly
type EffectiveAudience = "homeowner" | "presurvey" | "installer";

export function ReportShell({ audience = "homeowner" }: ReportShellProps = {}) {
  const { state, reset, back, goTo } = useCheckWizard();
  const [tab, setTab] = useState<ReportTabKey>("overview");
  const [shareOpen, setShareOpen] = useState(false);

  const effectiveAudience: EffectiveAudience =
    audience === "installer"
      ? "installer"
      : state.preSurveyRequestId
        ? "presurvey"
        : "homeowner";
  const isInstaller = effectiveAudience === "installer";
  const isPreSurvey = effectiveAudience === "presurvey";

  // Pre-survey + meeting already booked → the Book tab has nothing
  // useful to offer. Hide it entirely + surface the meeting in a
  // banner above the tab nav.
  const meetingBooked =
    isPreSurvey && state.preSurveyMeetingStatus === "booked";

  // Tabs filtered:
  //   - installer surface: drop Savings + Book (booking is the
  //     homeowner's job; consumer ROI tiles are noise)
  //   - presurvey + meeting booked: drop Book (the meeting's already
  //     in the diary)
  //   - everything else: all five tabs
  // Three-variant focus filter (state.focus, default "all"):
  //   solar    → drop the Heat-pump tab (the focused user is here
  //              for solar, not heat pump verdicts)
  //   heatpump → drop Solar tab. Savings stays — the SavingsTab
  //              detects the focus + renders a simplified heat-
  //              pump-only view (install cost - BUS grant + finance).
  //   all      → no extra filtering
  const focus = state.focus ?? "all";
  const focusFilter = (t: TabDef): boolean => {
    if (focus === "solar" && t.key === "heatpump") return false;
    if (focus === "heatpump" && t.key === "solar") return false;
    return true;
  };

  const visibleTabs = (isInstaller
    ? TABS.filter((t) => t.key !== "savings" && t.key !== "book")
    : meetingBooked
      ? TABS.filter((t) => t.key !== "book")
      : TABS
  ).filter(focusFilter);
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

  const headline = buildHeadline(a, focus);
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
      {/* Persistent header — verdict headline + inline eligibility
          chips. Address used to render here; removed because the
          property card on the Overview tab + the page title carry
          the same info, and the duplicate cluttered the headline.
          Installer-mode skips the eligibility chips (the installer
          just sees what the homeowner chose, no eligibility summary
          needed). */}
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-1.5">
            Your home
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-navy leading-tight">
            {headline}
          </h1>
        </div>
        {!isInstaller && <EligibilityChecklist analysis={a} focus={focus} />}
        {/* Hide the banner while the user is still sitting on the
            Book tab — that surface already renders its own "visit
            booked" success card after a fresh booking, so two green
            blocks on the same screen reads as a duplicate. The
            moment they hop to Overview / Savings / Heat pump /
            Solar (or come back in a later session, where the Book
            tab is hidden so the default tab is Overview) the
            banner reappears as the persistent confirmation. */}
        {meetingBooked &&
          state.preSurveyMeetingAt &&
          tab !== "book" && (
            <MeetingBanner
              installerName={state.preSurveyInstallerName ?? "your installer"}
              meetingAt={state.preSurveyMeetingAt}
            />
          )}
      </header>

      {/* Tab nav — promoted from a thin underlined bar to a proper
          pill-button container so it's unmissable. Active state is
          a filled coral chip, not just a text colour change.
          Still a proper ARIA tab pattern: arrow keys cycle, Home/End
          jump to first/last, roving tabindex keeps Tab moving out
          of the tablist into the panel. */}
      <div
        role="tablist"
        aria-label="Report sections"
        aria-orientation="horizontal"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm p-1.5 sm:p-2 overflow-x-auto"
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
        <div className="flex gap-1.5 sm:gap-2 min-w-max">
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
                className={`shrink-0 inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
                  active
                    ? "bg-coral text-white shadow-sm"
                    : "text-slate-700 hover:bg-coral-pale/40 hover:text-coral-dark"
                }`}
              >
                <span aria-hidden="true" className={active ? "" : "text-coral"}>
                  {t.icon}
                </span>
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
            audience={effectiveAudience}
            preSurveyInstallerName={state.preSurveyInstallerName}
          />
        )}
        {tab === "savings" && !isInstaller && (
          <SavingsTab
            analysis={a}
            electricityTariff={state.electricityTariff}
            gasTariff={state.gasTariff}
            selection={
              // Heat-pump variant — force the selection to HP-only
              // so the SavingsTab's existing solar-aware math
              // collapses to the install-cost-minus-grant case.
              focus === "heatpump"
                ? { ...selection, hasSolar: false, hasBattery: false }
                : selection
            }
            setSelection={setSelection}
            financingPreference={state.financingPreference}
            onJumpTab={setTab}
            audience={effectiveAudience}
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
            // V2 upload-only path: when present, the tab renders the
            // FloorplanExtract's heat_pump_eligibility content
            // instead of the legacy AnalyseResponse.eligibility.heatPump
            // tree. Solar tab + EPC etc. keep their existing inputs.
            extract={state.floorplanExtract}
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
            audience={effectiveAudience}
            preSurveyInstallerName={state.preSurveyInstallerName}
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

function buildHeadline(
  a: AnalyseResponse,
  focus: "all" | "solar" | "heatpump" = "all",
): string {
  const hp = a.eligibility.heatPump;
  const solar = a.eligibility.solar;
  const kwp = solar.recommendedKWp;
  const solarPhrase =
    solar.rating === "Excellent" || solar.rating === "Good"
      ? `${kwp ? `a ${kwp} kWp ` : ""}solar array`
      : null;

  // Heat-pump-only variant: only talk about heat pumps. The Solar
  // tab is hidden + we didn't even fetch the solar API.
  if (focus === "heatpump") {
    if (hp.verdict === "eligible") {
      return "Your home looks like a strong candidate for an air source heat pump.";
    }
    if (hp.verdict === "conditional") {
      return "A heat pump is possible, but there are a few warnings to address before applying.";
    }
    return "A heat pump isn't a straightforward fit for this property right now.";
  }

  // Solar-only variant: only talk about solar.
  if (focus === "solar") {
    if (solarPhrase) {
      return `Rooftop solar looks great for your property — ${solarPhrase}.`;
    }
    if (solar.rating === "Marginal") {
      return "Rooftop solar is possible, but the roof orientation + shading need careful sizing.";
    }
    return "Rooftop solar isn't a straightforward fit for this property right now.";
  }

  // Default 'all' — same combined narrative as before.
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

// Meeting-already-booked banner. Appears on the pre-survey homeowner
// report when the installer ticked "site visit booked" + supplied a
// date/time at send time. Replaces the Book-a-site-visit tab (which
// is hidden in this state — there's nothing left to book).
function MeetingBanner({
  installerName,
  meetingAt,
}: {
  installerName: string;
  meetingAt: string;
}) {
  // Format the ISO string into something readable in the user's
  // locale (Saturday 4 May 2026, 14:30). Falls back to the raw
  // ISO if Date parsing fails — better than crashing the page.
  let formatted: string;
  try {
    const d = new Date(meetingAt);
    formatted = d.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    formatted = meetingAt;
  }
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
      <CalendarCheck2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-900">
          Site visit booked with {installerName}
        </p>
        <p className="mt-0.5 text-sm text-emerald-800">{formatted}</p>
      </div>
    </div>
  );
}
