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

import React from "react";
import Image from "next/image";
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
import { titleCaseAddress } from "@/lib/format/address";

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
  /**
   * - "homeowner"  : standard self-serve report
   * - "presurvey"  : homeowner who arrived via /check?presurvey=<token>;
   *                  the report is contextualised around their upcoming
   *                  visit with the requesting installer
   * - "installer"  : installer prepping for a site visit
   */
  audience?: "homeowner" | "presurvey" | "installer";
  /** Set when audience === "presurvey". Drives the prep-card copy. */
  preSurveyInstallerName?: string | null;
}

export function OverviewTab({
  analysis,
  address,
  satelliteUrl,
  audience = "homeowner",
  preSurveyInstallerName,
}: Props) {
  // Both homeowner-facing audiences see the installer checklist + the
  // common-myths card; just the copy of the checklist is contextualised
  // for presurvey.
  const showHomeownerCards = audience !== "installer";
  return (
    <div className="space-y-6">
      <PropertyCard
        address={titleCaseAddress(address)}
        satelliteUrl={satelliteUrl}
        epc={analysis.epc}
        enrichments={analysis.enrichments}
      />

      {showHomeownerCards && (
        <InstallerChecklist
          audience={audience}
          preSurveyInstallerName={preSurveyInstallerName}
        />
      )}

      {showHomeownerCards && <CommonMyths />}
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
  address,
  satelliteUrl,
  epc,
  enrichments,
}: {
  address: string;
  satelliteUrl: string;
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
      {/* 1×3 grid — Your Property | Energy Performance | Property Details.
          Mirrors the design reference: satellite tile with address
          overlay, vertical EPC band ladder with current + potential
          arrows, and a tidy key/value table on the right. Stacks on
          mobile.

          items-stretch (the grid default) ensures all three columns
          take the height of the tallest one — the EPC ladder column
          drives that height. Each column is then flex-col so the
          satellite image and the property-details list can flex-1
          to fill the column vertically rather than pinning to a
          fixed aspect ratio. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Column 1: Property thumbnail with address overlay. The image
            container uses flex-1 so it grows to match the EPC column's
            height instead of forcing a 16:9 letterbox that left a
            visual gap below it. min-h-[220px] keeps the image sensibly
            sized when it stacks on mobile (no flex stretching there). */}
        <div className="flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Your property
          </p>
          <div className="relative w-full flex-1 min-h-[220px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <Image
              src={satelliteUrl}
              alt={`Satellite view of ${address}`}
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover"
              unoptimized
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
            />
            <p className="absolute inset-x-0 bottom-0 p-3 text-sm sm:text-base font-semibold text-white leading-snug">
              {address}
            </p>
          </div>
        </div>

        {/* Column 2: Energy performance — vertical A→G ladder with
            current + potential arrows. Visual matches the GOV.UK
            EPC certificate page itself. */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Energy performance
          </p>
          {epc.found ? (
            <EpcRatingBar
              currentBand={epc.certificate.currentEnergyBand}
              potentialBand={epc.certificate.potentialEnergyBand}
              currentRating={epc.certificate.currentEnergyRating}
              potentialRating={epc.certificate.potentialEnergyRating}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No EPC on file for this address — your installer will work
              from the on-site survey instead.
            </div>
          )}
        </div>

        {/* Column 3: Property details — denormalised EPC fields. */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Property details
          </p>
          {epc.found ? (
            <PropertyDetailsList epc={epc.certificate} />
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

// ─── Property details list ────────────────────────────────────────────
// Two grouped sections: property facts on top, emissions footprint
// below — separated by a hairline + extra spacing so they read as
// distinct semantic groups rather than one long list. Each row
// gracefully omits when the EPC didn't carry that field, so a sparse
// cert doesn't leave a column of "—"s.

function PropertyDetailsList({
  epc,
}: {
  epc: NonNullable<AnalyseResponse["epc"] & { found: true }>["certificate"];
}) {
  const validUntil = formatDateDDMMYYYY(epc.validUntil);
  const propertyType = epc.dwellingType ?? epc.propertyType ?? null;
  const floorArea =
    epc.totalFloorAreaM2 != null
      ? `${Math.round(epc.totalFloorAreaM2)} square metres`
      : null;
  const habitableRooms = epc.numberHabitableRooms;
  const heatedRooms = epc.numberHeatedRooms;
  const mainsGas = formatYesNoFlag(epc.mainsGasFlag);
  const co2Current = formatTonnesPerYear(epc.co2EmissionsCurrent);
  const co2Potential = formatTonnesPerYear(epc.co2EmissionsPotential);

  const propertyRows: Array<[string, React.ReactNode]> = [];
  if (validUntil) {
    propertyRows.push([
      "Valid Until",
      <span
        key="valid-until-value"
        className={
          epc.expired ? "font-semibold text-red-700" : "font-semibold text-navy"
        }
      >
        {validUntil}
        {epc.expired && (
          <span className="ml-1 text-xs font-normal">(expired)</span>
        )}
      </span>,
    ]);
  }
  if (propertyType) propertyRows.push(["Property Type", propertyType]);
  if (floorArea) propertyRows.push(["Total Floor Area", floorArea]);
  if (habitableRooms != null)
    propertyRows.push(["Habitable Rooms", habitableRooms]);
  if (heatedRooms != null) propertyRows.push(["Heated Rooms", heatedRooms]);
  if (mainsGas) propertyRows.push(["Mains Gas", mainsGas]);

  // Emissions group rendered as its own block when either value is
  // present. Both omitted = no group, no separator — keeps the panel
  // tidy on certs that didn't carry CO2 figures.
  const emissionsRows: Array<[string, React.ReactNode]> = [];
  if (co2Current)
    emissionsRows.push(["CO₂ Emissions (tonnes/yr) Actual", co2Current]);
  if (co2Potential)
    emissionsRows.push([
      "CO₂ Emissions (tonnes/yr) Potential",
      co2Potential,
    ]);

  if (propertyRows.length === 0 && emissionsRows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        EPC found, but the certificate didn&rsquo;t carry the usual
        property-detail fields.
      </p>
    );
  }

  return (
    <div>
      {propertyRows.length > 0 && <DetailsGrid rows={propertyRows} />}
      {emissionsRows.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <DetailsGrid rows={emissionsRows} />
        </div>
      )}
    </div>
  );
}

function DetailsGrid({
  rows,
}: {
  rows: Array<[string, React.ReactNode]>;
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm items-baseline">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="font-semibold text-navy whitespace-nowrap">{label}</dt>
          <dd className="text-right text-navy">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** Format a CO₂ figure (already in tonnes/yr per the EPC API) for
 *  display. One decimal place — the certificate publishes one too,
 *  matching that lets the homeowner cross-reference the GOV.UK page.
 *  Returns null on null/non-finite so the row is omitted entirely. */
function formatTonnesPerYear(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)} tonnes`;
}

/** EPC API ships mainsGasFlag as "Y" / "N" / null. Render as Yes / No
 *  (or null to skip the row entirely). */
function formatYesNoFlag(flag: string | null | undefined): string | null {
  if (!flag) return null;
  const f = flag.trim().toUpperCase();
  if (f === "Y" || f === "YES" || f === "1") return "Yes";
  if (f === "N" || f === "NO" || f === "0") return "No";
  return null;
}

/** Format an ISO date string as DD/MM/YYYY (UK convention). Returns
 *  null when the input is empty or unparseable so the caller can
 *  omit the row. */
function formatDateDDMMYYYY(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
// Two-column checklist: "what to share" + "what to ask". Both columns
// reword for the presurvey audience — the homeowner is committed to a
// specific installer, so prompting them to "ask three for quotes" is
// off-message. Instead we prep them to make the most of the upcoming
// visit with the installer who sent the report.

function InstallerChecklist({
  audience,
  preSurveyInstallerName,
}: {
  audience: "homeowner" | "presurvey" | "installer";
  preSurveyInstallerName?: string | null;
}) {
  const isPreSurvey = audience === "presurvey";
  const installerLabel = preSurveyInstallerName ?? "your installer";

  const shareItems = isPreSurvey
    ? [
        <>
          <strong className="text-navy">This report</strong> — share it with{" "}
          {installerLabel} ahead of the visit so they&rsquo;re working from the
          same numbers.
        </>,
        <>
          <strong className="text-navy">Your floorplan</strong> — even a rough
          sketch helps them confirm radiator sizing, pipework runs, and
          cylinder space without re-measuring twice.
        </>,
        <>
          <strong className="text-navy">A recent energy bill</strong> — the
          annual kWh figure gives a sanity-check against the heat-loss calc
          they&rsquo;ll do on the day.
        </>,
        <>
          <strong className="text-navy">Photos of your boiler + meter
          cupboard</strong> — useful for any pre-visit questions, and saves
          the engineer a wasted journey if something obvious would block
          install.
        </>,
      ]
    : [
        <>
          <strong className="text-navy">This report</strong> — saves them
          measuring twice and means everyone&rsquo;s starting from the same
          numbers.
        </>,
        <>
          <strong className="text-navy">Your floorplan</strong> — even a rough
          sketch helps them size radiators, find pipework runs, and spot space
          for the cylinder.
        </>,
        <>
          <strong className="text-navy">A recent energy bill</strong> — the
          actual annual kWh figure helps them sanity-check the heat-loss calc
          against your real usage.
        </>,
        <>
          <strong className="text-navy">Photos of your boiler + meter
          cupboard</strong> — handy on a phone screen when they&rsquo;re
          quoting remotely.
        </>,
      ];

  const askItems = isPreSurvey
    ? [
        <>
          <strong className="text-navy">Heat-loss survey on the visit?</strong>{" "}
          For heat pumps this is non-negotiable — walls + radiators measured,
          not eyeballed.
        </>,
        <>
          <strong className="text-navy">What kit will you specify?</strong>{" "}
          Heat-pump model + serial, panel make + wattage, battery chemistry.
          &ldquo;A 5kW heat pump&rdquo; isn&rsquo;t enough.
        </>,
        <>
          <strong className="text-navy">What&rsquo;s the warranty?</strong> At
          least 5 years on labour, 7+ on the kit. Worth confirming who you
          call if something breaks in year 3.
        </>,
        <>
          <strong className="text-navy">Timeline + disruption?</strong> Most
          full installs are 2–5 days. Confirm what the install week looks like
          — heating offline, scaffolding, electrical work — so you can plan.
        </>,
      ]
    : [
        <>
          <strong className="text-navy">Your MCS certification number?</strong>{" "}
          Required for the BUS grant to pay out and for the export-tariff
          scheme.
        </>,
        <>
          <strong className="text-navy">Will you do a heat-loss survey on
          the day?</strong> For heat pumps, this is non-negotiable. Walk away
          if they&rsquo;re happy to quote without measuring.
        </>,
        <>
          <strong className="text-navy">What kit will you specify?</strong>{" "}
          Heat-pump model + serial, panel make + wattage, battery chemistry.
          &ldquo;A 5kW heat pump&rdquo; isn&rsquo;t enough.
        </>,
        <>
          <strong className="text-navy">What&rsquo;s the warranty?</strong> At
          least 5 years on labour, 7+ on the kit. Ask who you call if
          something breaks in year 3.
        </>,
        <>
          <strong className="text-navy">Got two or three local
          references?</strong> Properties similar to yours, with permission to
          ring those owners. Good installers volunteer this.
        </>,
      ];

  return (
    <SectionCard
      title={
        isPreSurvey
          ? `Prepping for your visit with ${installerLabel}`
          : "Working with installers"
      }
      subtitle={
        isPreSurvey
          ? "A bit of prep makes the visit short, sharp, and useful."
          : "What to share, what to ask. Two minutes of prep saves you a bad quote."
      }
      icon={<ShieldCheck className="w-5 h-5" />}
    >
      {/* Single column layout. The two checklists used to sit
          side-by-side, but at narrow widths the items wrapped
          awkwardly and the subheadings got lost. Stacking them gives
          each checklist the full row to breathe and lets the
          subheadings carry their own visual weight. */}
      <div className="space-y-7">
        <ChecklistSection
          title={isPreSurvey ? "What to share before the visit" : "What to share with the installer"}
          icon={<MessageCircleQuestion className="w-4 h-4" />}
          items={shareItems}
        />
        <ChecklistSection
          title={isPreSurvey ? "Questions worth asking on the day" : "Questions to ask before booking"}
          icon={<Flame className="w-4 h-4" />}
          items={askItems}
        />
      </div>
    </SectionCard>
  );
}

function ChecklistSection({
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
      {/* Bumped subheading from text-sm font-semibold to a chunkier
          treatment: text-base font-bold + a coral icon chip + a
          hairline rule under it that anchors the subhead to the list
          beneath. Reads as a proper section header rather than a
          column label. */}
      <div className="flex items-center gap-2.5 pb-2 mb-3 border-b border-slate-200">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-coral-pale text-coral">
          {icon}
        </span>
        <h4 className="text-base font-bold text-navy">{title}</h4>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed"
          >
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
