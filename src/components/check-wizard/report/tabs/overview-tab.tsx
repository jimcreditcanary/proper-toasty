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

import Image from "next/image";
import {
  CheckCircle2,
  Flame,
  Home as HomeIcon,
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
import { describeAzimuth, SectionCard } from "../shared";
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
        address={address}
        satelliteUrl={satelliteUrl}
        epc={analysis.epc}
        enrichments={analysis.enrichments}
        primaryRoofAzimuth={primaryRoofAzimuth(analysis)}
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
  address,
  satelliteUrl,
  epc,
  enrichments,
  primaryRoofAzimuth,
}: {
  address: string;
  satelliteUrl: string;
  epc: AnalyseResponse["epc"];
  enrichments: AnalyseResponse["enrichments"];
  /** Cardinal-direction string for the largest roof segment, e.g.
   *  "South-facing". `null` when the Solar API didn't cover the
   *  address. */
  primaryRoofAzimuth: string | null;
}) {
  const listedCount = enrichments.listed?.matches.length ?? 0;
  const floodCount = enrichments.flood?.activeWarnings.length ?? 0;
  const conservationCount =
    (enrichments.planning?.conservationAreas.length ?? 0) +
    (enrichments.planning?.aonb.length ?? 0) +
    (enrichments.planning?.nationalParks.length ?? 0);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white shadow-sm p-4 sm:p-6">
      {/* 1×3 grid — Property | Energy Performance | Property Details.
          Was previously a header row + 2-col grid; flattening to a
          single 3-col row uses the horizontal space better and keeps
          all three blocks visually balanced. Stacks on mobile. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Column 1: Property thumbnail + address */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 inline-flex items-center gap-1">
            <HomeIcon className="w-3 h-3" />
            Your property
          </p>
          <div
            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-3"
            aria-hidden="true"
          >
            <Image
              src={satelliteUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover"
              unoptimized
            />
          </div>
          <p className="text-sm sm:text-base font-semibold text-navy leading-snug">
            {address}
          </p>
        </div>

        {/* Column 2: Energy performance */}
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

        {/* Column 3: Property details */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Property details
          </p>
          {epc.found ? (
            <dl className="space-y-2.5 text-sm">
              {/* Property classification — house icon + built-form
                  string ("Semi-detached"), no "Property:" label.
                  Falls back to the broader propertyType ("House",
                  "Flat") when the cert has no builtForm. */}
              {(epc.certificate.builtForm || epc.certificate.propertyType) && (
                <div className="flex items-center gap-2">
                  <HomeIcon
                    className="w-4 h-4 text-slate-500"
                    aria-hidden="true"
                  />
                  <dd className="font-semibold text-navy">
                    {epc.certificate.builtForm ?? epc.certificate.propertyType}
                  </dd>
                </div>
              )}
              {epc.certificate.constructionAgeBand && (
                <LabelledFact
                  label="Built"
                  value={epc.certificate.constructionAgeBand}
                />
              )}
              {epc.certificate.totalFloorAreaM2 != null && (
                <LabelledFact
                  label="Floor area"
                  value={`~${Math.round(epc.certificate.totalFloorAreaM2)} m²`}
                />
              )}
              {primaryRoofAzimuth && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-slate-600">Roof:</dt>
                  <dd>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-navy">
                      {primaryRoofAzimuth}
                    </span>
                  </dd>
                </div>
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

// Inline "Label: value" row. Replaces the previous stacked
// label-over-value layout — the new design uses a label + value
// reading naturally as a sentence (e.g. "Built:  1930s").
function LabelledFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-slate-600">{label}:</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}

// Pick the cardinal-direction label for the property's largest
// (= dominant) roof segment. Used in the Property Details column on
// the Overview tab. Returns null when the Solar API didn't cover
// the address.
function primaryRoofAzimuth(analysis: AnalyseResponse): string | null {
  if (analysis.solar.coverage !== true) return null;
  const segments = analysis.solar.data.solarPotential.roofSegmentStats;
  if (!segments || segments.length === 0) return null;
  const biggest = segments
    .filter((s) => s.azimuthDegrees != null)
    .reduce<(typeof segments)[number] | null>((best, s) => {
      const area = s.stats?.areaMeters2 ?? 0;
      const bestArea = best?.stats?.areaMeters2 ?? 0;
      return area > bestArea ? s : best;
    }, null);
  if (!biggest || biggest.azimuthDegrees == null) return null;
  // describeAzimuth returns e.g. "South" — append "-facing" so the
  // chip reads naturally on the property card ("South-facing").
  return `${describeAzimuth(biggest.azimuthDegrees)}-facing`;
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
