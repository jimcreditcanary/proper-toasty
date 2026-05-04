"use client";

// Overview tab — the front door of the report.
//
// Three blocks:
//   1. Property card — compact two-column tile: Energy Performance
//      (band tile + A→G rainbow scale + current/potential labels)
//      on the left, Property Details on the right. The previous
//      full-width satellite hero with address overlay was too
//      dominant; the satellite is no longer the focal point of the
//      report. Address now lives in the report-shell header only.
//   2. Working with installers — single checklist combining "what to
//      ask" and "what to share/have ready" so the homeowner has one
//      place to prep for the call. Was previously two cards (one
//      here, one on the Book tab); merged so both live up front.
//   3. Common myths — three myth/truth pairs, each row laid out as a
//      proper horizontal pair so the icons line up with the text.

import {
  CheckCircle2,
  Flame,
  Landmark,
  MessageCircleQuestion,
  ShieldCheck,
  Waves,
  X,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { YesNoUnsure } from "../../types";
import type { ReportSelection, ReportTabKey } from "../report-shell";
import { SectionCard } from "../shared";
import { EpcRatingBar } from "../epc-dual-badge";

interface Props {
  analysis: AnalyseResponse;
  address: string;
  satelliteUrl: string;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  selection: ReportSelection;
  setSelection: (s: ReportSelection) => void;
  financingPreference: YesNoUnsure | null;
  onJumpTab: (tab: ReportTabKey) => void;
  /** Suppresses consumer-facing cards when the report is being viewed
   *  by an installer prepping for a site visit. */
  audience?: "homeowner" | "installer";
}

export function OverviewTab({
  analysis,
  address,
  satelliteUrl,
  audience = "homeowner",
}: Props) {
  return (
    <div className="space-y-6">
      <PropertyCard
        epc={analysis.epc}
        enrichments={analysis.enrichments}
      />

      {audience === "homeowner" && <InstallerChecklist />}

      {audience === "homeowner" && <CommonMyths />}
    </div>
  );
}

// ─── Property card ─────────────────────────────────────────────────────
// Compact two-column tile: Energy Performance on the left (with the
// new EpcRatingBar showing current + potential bands on a single
// A→G scale), Property Details on the right. Replaced the earlier
// full-width satellite hero — the satellite was visually dominant
// but added little decision-making value, and the address overlay
// duplicated info that's already in the report-shell header.

function PropertyCard({
  epc,
  enrichments,
}: {
  epc: AnalyseResponse["epc"];
  enrichments: AnalyseResponse["enrichments"];
}) {
  const listedCount = enrichments.listed?.matches.length ?? 0;
  const floodCount = enrichments.flood?.activeWarnings.length ?? 0;
  const conservationCount =
    (enrichments.planning?.conservationAreas.length ?? 0) +
    (enrichments.planning?.aonb.length ?? 0) +
    (enrichments.planning?.nationalParks.length ?? 0);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white shadow-sm p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Energy performance
          </p>
          {epc.found ? (
            <EpcRatingBar
              currentBand={epc.certificate.currentEnergyBand}
              potentialBand={epc.certificate.potentialEnergyBand}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No EPC on file for this address — your installer will work
              from the on-site survey instead.
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Property details
          </p>
          {epc.found ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {epc.certificate.propertyType && (
                <Fact
                  label="Property"
                  value={`${epc.certificate.propertyType}${
                    epc.certificate.builtForm
                      ? ` · ${epc.certificate.builtForm}`
                      : ""
                  }`}
                />
              )}
              {epc.certificate.constructionAgeBand && (
                <Fact label="Built" value={epc.certificate.constructionAgeBand} />
              )}
              {epc.certificate.totalFloorAreaM2 != null && (
                <Fact
                  label="Floor area"
                  value={`${Math.round(epc.certificate.totalFloorAreaM2)} m²`}
                />
              )}
              {epc.certificate.mainFuel && (
                <Fact label="Main fuel" value={epc.certificate.mainFuel} />
              )}
              {epc.certificate.mainHeatingDescription && (
                <Fact
                  label="Heating"
                  value={epc.certificate.mainHeatingDescription}
                />
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              We&rsquo;ll work from your floorplan + satellite imagery.
            </p>
          )}

          {(listedCount > 0 || conservationCount > 0 || floodCount > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {listedCount > 0 && (
                <Chip tone="amber" icon={<Landmark className="w-3 h-3" />}>
                  Listed building
                </Chip>
              )}
              {conservationCount > 0 && (
                <Chip tone="amber" icon={<Landmark className="w-3 h-3" />}>
                  Conservation area
                </Chip>
              )}
              {floodCount > 0 && (
                <Chip tone="red" icon={<Waves className="w-3 h-3" />}>
                  Flood warning active
                </Chip>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy leading-tight">{value}</dd>
    </div>
  );
}

function Chip({
  tone,
  icon,
  children,
}: {
  tone: "amber" | "red";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls =
    tone === "red"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-800 border-amber-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border ${cls}`}
    >
      {icon}
      {children}
    </span>
  );
}

// ─── Working-with-installers checklist ────────────────────────────────
// Combines the previous "playbook" advice + the "what to ask" card
// that used to live on the Book tab. Two columns on desktop:
//   - Things to share (inputs you bring to the meeting)
//   - Questions to ask (outputs you want from the quote)
// Plain prose with leading checkmarks — easier to scan than the old
// icon-tile playbook design.

function InstallerChecklist() {
  return (
    <SectionCard
      title="Working with installers"
      subtitle="What to share, what to ask. Two minutes of prep saves you a bad quote."
      icon={<ShieldCheck className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <ChecklistColumn
          title="What to share with the installer"
          icon={<MessageCircleQuestion className="w-4 h-4" />}
          items={[
            <>
              <strong className="text-navy">This report</strong> — saves them
              measuring twice and means everyone&rsquo;s starting from the same
              numbers.
            </>,
            <>
              <strong className="text-navy">Your floorplan</strong> — even a
              rough sketch helps them size radiators, find pipework runs, and
              spot space for the cylinder.
            </>,
            <>
              <strong className="text-navy">A recent energy bill</strong> — the
              actual annual kWh figure helps them sanity-check the heat-loss
              calc against your real usage.
            </>,
            <>
              <strong className="text-navy">Photos of your boiler + meter
              cupboard</strong> — handy on a phone screen when they&rsquo;re
              quoting remotely.
            </>,
          ]}
        />

        <ChecklistColumn
          title="Questions to ask before booking"
          icon={<Flame className="w-4 h-4" />}
          items={[
            <>
              <strong className="text-navy">Your MCS certification number?</strong>{" "}
              Required for the BUS grant to pay out and for the export-tariff
              scheme.
            </>,
            <>
              <strong className="text-navy">Will you do a heat-loss survey on
              the day?</strong> For heat pumps, this is non-negotiable. Walk
              away if they&rsquo;re happy to quote without measuring.
            </>,
            <>
              <strong className="text-navy">What kit will you specify?</strong>{" "}
              Heat-pump model + serial, panel make + wattage, battery
              chemistry. &ldquo;A 5kW heat pump&rdquo; isn&rsquo;t enough.
            </>,
            <>
              <strong className="text-navy">What&rsquo;s the warranty?</strong>{" "}
              At least 5 years on labour, 7+ on the kit. Ask who you call if
              something breaks in year 3.
            </>,
            <>
              <strong className="text-navy">Got two or three local
              references?</strong> Properties similar to yours, with permission
              to ring those owners. Good installers volunteer this.
            </>,
          ]}
        />
      </div>
    </SectionCard>
  );
}

function ChecklistColumn({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: React.ReactNode[];
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy mb-3">
        <span className="text-coral">{icon}</span>
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
            <CheckCircle2
              className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Common myths ──────────────────────────────────────────────────────
// Restructured so each (icon, text) pair is its own horizontal row.
// Previous version stacked icons in a column and text in a column,
// which meant the icons drifted out of alignment with their text on
// any wrap.

function CommonMyths() {
  return (
    <SectionCard
      title="Common myths, busted"
      subtitle="What you've probably heard versus what's actually true."
    >
      <div className="space-y-4">
        <Myth
          myth="Heat pumps don't work in cold weather."
          truth="Modern air-source units run efficiently down to −15°C. The Nordic countries run on them."
        />
        <Myth
          myth="You need a south-facing roof for solar."
          truth="East and west work fine — you just generate at different times of day. South is best, but it's not the only game in town."
        />
        <Myth
          myth="Batteries pay for themselves in a few years."
          truth="Battery payback is 8–12 years for most homes. They make sense for resilience, time-of-use tariffs, and EV charging — less so as a pure savings play."
        />
      </div>
    </SectionCard>
  );
}

function Myth({ myth, truth }: { myth: string; truth: string }) {
  return (
    <div className="rounded-lg bg-white p-3 sm:p-4 border border-slate-100 space-y-2">
      <div className="flex items-start gap-2.5">
        <span
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600"
          aria-hidden="true"
        >
          <X className="w-3.5 h-3.5" />
        </span>
        <p className="text-sm text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">Myth: </span>
          &ldquo;{myth}&rdquo;
        </p>
      </div>
      <div className="flex items-start gap-2.5">
        <span
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600"
          aria-hidden="true"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </span>
        <p className="text-sm text-navy leading-relaxed">
          <span className="font-semibold text-emerald-700">Truth: </span>
          {truth}
        </p>
      </div>
    </div>
  );
}
