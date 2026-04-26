"use client";

// Book a site visit tab — placeholder while PR 3 wires up the real
// installer directory.
//
// Once PR 3 ships (Supabase `installers` table + the 5,630-row import
// + geo-distance ranking), this tab will replace the placeholder card
// with a paginated grid of installer tiles, each with a "Book a meeting"
// button that opens the lead form.
//
// For now we explain what's coming and surface the MCS public directory
// as a fallback so users aren't left empty-handed.

import {
  CalendarDays,
  ExternalLink,
  Filter,
  MapPin,
  Sparkles,
  Star,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { ReportSelection } from "../report-shell";
import { SectionCard } from "../shared";

interface Props {
  analysis: AnalyseResponse;
  postcode: string;
  latitude: number;
  longitude: number;
  selection: ReportSelection;
}

export function BookVisitTab({
  postcode,
  selection,
}: Props) {
  const wantsHp = selection.hasHeatPump;
  const wantsSolar = selection.hasSolar || selection.hasBattery;
  const techPhrase =
    wantsHp && wantsSolar
      ? "heat pump and solar PV"
      : wantsHp
        ? "heat pump"
        : wantsSolar
          ? "solar PV"
          : "the upgrades you've selected";

  return (
    <div className="space-y-6">
      <SectionCard
        title="Find an MCS-certified installer near you"
        subtitle={`We'll match you with installers near ${postcode} who specialise in ${techPhrase}, sorted by distance.`}
        icon={<MapPin className="w-5 h-5" />}
      >
        <div className="rounded-2xl border-2 border-dashed border-coral/40 bg-coral-pale/30 p-6 sm:p-8 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-coral shadow-sm mb-4">
            <Sparkles className="w-6 h-6" />
          </span>
          <p className="text-base sm:text-lg font-semibold text-navy">
            Installer directory landing soon
          </p>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            We&rsquo;re finalising our database of 5,630 MCS-certified
            installers across the UK. You&rsquo;ll be able to book a site visit
            directly from this tab — no phone tag, no waiting on quotes.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
            <PreviewFeature
              icon={<MapPin className="w-4 h-4" />}
              title="Closest to you"
              body="Sorted by distance from your address."
            />
            <PreviewFeature
              icon={<Filter className="w-4 h-4" />}
              title="Right specialism"
              body={`Filtered to ${techPhrase} fitters.`}
            />
            <PreviewFeature
              icon={<CalendarDays className="w-4 h-4" />}
              title="Book direct"
              body="Pick a slot, share your report, done."
            />
          </div>
        </div>

        {/* Fallback: MCS public directory link */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-semibold text-navy">
            In a hurry? Use the official MCS finder
          </p>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Same database we&rsquo;ll be using — just less filtering. Search by
            your postcode and they&rsquo;ll show installers in your area.
          </p>
          <a
            href={`https://www.mcscertified.com/find-an-installer/?postcode=${encodeURIComponent(postcode)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:underline"
          >
            Search MCS for installers near {postcode}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </SectionCard>

      {/* What to look for */}
      <SectionCard
        title="What to ask an installer when they call"
        subtitle="A quick checklist so you know you're getting the right kind of quote."
        icon={<Star className="w-5 h-5" />}
      >
        <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <Check>
            <strong className="text-navy">MCS certification number</strong> — every
            quote should reference it. It&rsquo;s required for the BUS grant to
            pay out and for the export-tariff scheme.
          </Check>
          <Check>
            <strong className="text-navy">Heat-loss survey on the day</strong> —
            for heat pumps, this is non-negotiable. If they&rsquo;re happy to
            quote without measuring radiators and walls, walk away.
          </Check>
          <Check>
            <strong className="text-navy">Specific kit on the quote</strong> —
            heat pump model and serial, panel make + wattage, battery
            chemistry. &ldquo;A 5kW heat pump&rdquo; isn&rsquo;t enough.
          </Check>
          <Check>
            <strong className="text-navy">Warranty and aftercare</strong> — at
            least 5 years on labour, 7+ on the kit itself. Ask who you call if
            something breaks in year 3.
          </Check>
          <Check>
            <strong className="text-navy">References from local jobs</strong> —
            two or three properties similar to yours, and the freedom to ring
            those owners. Good installers volunteer this.
          </Check>
        </ul>
      </SectionCard>
    </div>
  );
}

function PreviewFeature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-3">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral mb-2">
        {icon}
      </span>
      <p className="text-sm font-semibold text-navy">{title}</p>
      <p className="mt-0.5 text-xs text-slate-600 leading-snug">{body}</p>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="shrink-0 mt-1 inline-block w-1.5 h-1.5 rounded-full bg-coral" />
      <span>{children}</span>
    </li>
  );
}
