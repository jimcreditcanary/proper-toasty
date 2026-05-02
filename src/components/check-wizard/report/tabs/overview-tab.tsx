"use client";

// Overview tab — the front door of the report.
//
// Goal: warm, easy-to-skim summary that gives a curious consumer
// everything they need to decide whether to dig deeper. Two blocks:
//   1. Property snapshot — satellite, EPC, planning constraints
//   2. How to get the most out of installers — practical playbook
//      (3 quotes, what to look for, common myths)
//
// The "What could your home benefit from?" recommendation strip used
// to live here but moved up to the report shell so it's visible across
// every tab. The cost teaser also moved out — the real cost breakdown
// lives on the Savings tab and there's a tab nav right above the user.

import Image from "next/image";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Eye,
  Landmark,
  MapPin,
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
      />

      {/* Installer playbook — homeowner-only. Installers landing here
          via /installer/reports/[leadId] don't need the "how to vet
          us" advice. */}
      {audience === "homeowner" && (
      <SectionCard
        title="How to get the best out of installers"
        subtitle="A bit of prep goes a long way. Here&rsquo;s the playbook we&rsquo;d use ourselves."
        icon={<ShieldCheck className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PlaybookItem
            icon={<Award className="w-4 h-4" />}
            title="Get three MCS-certified quotes"
            body="Prices vary 20–30% between installers for the same kit. Three quotes is the sweet spot — enough to spot outliers, not so many that you can't compare."
          />
          <PlaybookItem
            icon={<MessageCircleQuestion className="w-4 h-4" />}
            title="Ask about heat-loss surveys"
            body="A real heat-loss survey takes hours, not minutes. If an installer skips it, walk away. The Heat Pump tab has the spec questions worth asking up front."
          />
          <PlaybookItem
            icon={<Eye className="w-4 h-4" />}
            title="Watch out for these red flags"
            body="Pressure to sign on the day. Vague kit specs (model + serial number should be on the quote). No mention of MCS or RECC. Promises of zero downtime."
          />
          <PlaybookItem
            icon={<CalendarDays className="w-4 h-4" />}
            title="Book a site visit when you're ready"
            body="The Book a site visit tab lets you pick from MCS-certified installers near you, sorted by distance. They'll measure up and confirm everything in person."
          />
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4 sm:p-5">
          <p className="text-sm font-semibold text-navy mb-3">
            Common myths, busted
          </p>
          <div className="space-y-3">
            <Myth
              myth="Heat pumps don&rsquo;t work in cold weather."
              truth="Modern air-source units run efficiently down to −15°C. The Nordic countries run on them."
            />
            <Myth
              myth="You need a south-facing roof for solar."
              truth="East and west work fine — you just generate at different times of day. South is best, but it&rsquo;s not the only game in town."
            />
            <Myth
              myth="Batteries pay for themselves in a few years."
              truth="Battery payback is 8–12 years for most homes. They make sense for resilience, time-of-use tariffs, and EV charging — less so as a pure savings play."
            />
          </div>
        </div>
      </SectionCard>
      )}
    </div>
  );
}

// ─── Property card ──────────────────────────────────────────────────────────

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
    <section className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-5">
        <div className="relative md:col-span-2 aspect-[16/10] md:aspect-auto bg-slate-100">
          <Image
            src={satelliteUrl}
            alt="Satellite view of your property"
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="md:col-span-3 p-5 sm:p-6">
          <div className="flex items-start gap-2 mb-4">
            <MapPin className="w-4 h-4 mt-1 text-coral shrink-0" />
            <p className="text-base font-medium text-navy leading-snug">
              {address}
            </p>
          </div>

          {epc.found && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Fact
                label="EPC rating"
                value={
                  epc.certificate.currentEnergyBand
                    ? `${epc.certificate.currentEnergyBand}${
                        epc.certificate.potentialEnergyBand
                          ? ` → ${epc.certificate.potentialEnergyBand}`
                          : ""
                      }`
                    : "—"
                }
              />
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
                <Fact
                  label="Built"
                  value={epc.certificate.constructionAgeBand}
                />
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
          )}
          {!epc.found && (
            <p className="text-sm text-slate-500">
              No EPC on file for this address — your installer will work from
              the on-site survey instead. ({epc.reason})
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
      <dt className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">
        {label}
      </dt>
      <dd className="text-sm font-medium text-navy">{value}</dd>
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

// RecCard removed — recommendation tiles are now rendered by the
// shell-level RecommendationStrip component (visible across every tab,
// not just Overview).

// ─── Playbook items ─────────────────────────────────────────────────────────

function PlaybookItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-coral-pale text-coral mt-0.5">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Myth({ myth, truth }: { myth: string; truth: string }) {
  // Pattern: the myth is shown clearly with a red X chip, then the truth
  // is shown alongside with a green check chip. The previous version
  // strikethrough'd the myth text at 50% opacity which made it
  // genuinely impossible to read for most users (it's also not a
  // safe pattern semantically — strikethrough has no consistent
  // meaning across screen readers).
  return (
    <div className="flex items-start gap-3 rounded-lg bg-white p-3 border border-slate-100">
      <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
          <X className="w-3.5 h-3.5" />
        </span>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">Myth: </span>
          &ldquo;
          <span dangerouslySetInnerHTML={{ __html: myth }} />
          &rdquo;
        </p>
        <p className="text-sm text-navy leading-relaxed">
          <span className="font-semibold text-emerald-700">Truth: </span>
          <span dangerouslySetInnerHTML={{ __html: truth }} />
        </p>
      </div>
    </div>
  );
}
