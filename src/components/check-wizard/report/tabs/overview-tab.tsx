"use client";

// Overview tab — the front door of the report.
//
// Goal: warm, easy-to-skim summary that gives a curious consumer
// everything they need to decide whether to dig deeper. Three blocks:
//   1. Property snapshot — satellite, EPC, planning constraints
//   2. What could your home benefit from? — three big recommendation
//      cards (heat pump / solar / battery) with verdict + cost line
//   3. How to get the most out of installers — practical playbook
//      (3 quotes, what to look for, common myths)

import Image from "next/image";
import {
  Award,
  Battery,
  CalendarDays,
  CheckCircle2,
  Eye,
  Flame,
  Landmark,
  MapPin,
  MessageCircleQuestion,
  PoundSterling,
  ShieldCheck,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { YesNoUnsure } from "../../types";
import type { ReportSelection, ReportTabKey } from "../report-shell";
import { SectionCard, fmtGbp } from "../shared";

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
}

export function OverviewTab({
  analysis,
  address,
  satelliteUrl,
  selection,
  setSelection,
  onJumpTab,
}: Props) {
  const hp = analysis.eligibility.heatPump;
  const solar = analysis.eligibility.solar;
  const finance = analysis.finance;

  const hpCostLow = finance.heatPump.estimatedNetInstallCostRangeGBP?.[0] ?? null;
  const hpCostHigh = finance.heatPump.estimatedNetInstallCostRangeGBP?.[1] ?? null;
  const solarCost = finance.solar.installCostGBP ?? null;
  const solarSavingsLow = finance.solar.annualSavingsRangeGBP?.[0] ?? null;
  const solarSavingsHigh = finance.solar.annualSavingsRangeGBP?.[1] ?? null;

  return (
    <div className="space-y-6">
      <PropertyCard
        address={address}
        satelliteUrl={satelliteUrl}
        epc={analysis.epc}
        enrichments={analysis.enrichments}
      />

      {/* Recommendations */}
      <SectionCard
        title="What could your home benefit from?"
        subtitle="Three quick reads — pick the ones you want to dig into."
        icon={<Sparkles className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <RecCard
            kind="heatpump"
            title="Heat pump"
            verdict={
              hp.verdict === "eligible"
                ? "Recommended"
                : hp.verdict === "conditional"
                  ? "Possible"
                  : "Not now"
            }
            tone={
              hp.verdict === "eligible"
                ? "green"
                : hp.verdict === "conditional"
                  ? "amber"
                  : "red"
            }
            headline={
              hp.recommendedSystemKW
                ? `${hp.recommendedSystemKW} kW system`
                : "Sizing pending"
            }
            costLine={
              hpCostLow != null && hpCostHigh != null
                ? `${fmtGbp(hpCostLow)}–${fmtGbp(hpCostHigh)} after the £${hp.estimatedGrantGBP.toLocaleString()} BUS grant`
                : `£${hp.estimatedGrantGBP.toLocaleString()} BUS grant available`
            }
            selected={selection.hasHeatPump}
            onToggle={(on) => setSelection({ ...selection, hasHeatPump: on })}
            onJump={() => onJumpTab("heatpump")}
          />
          <RecCard
            kind="solar"
            title="Solar PV"
            verdict={solar.rating}
            tone={
              solar.rating === "Excellent" || solar.rating === "Good"
                ? "green"
                : solar.rating === "Marginal"
                  ? "amber"
                  : "red"
            }
            headline={
              solar.recommendedKWp
                ? `${solar.recommendedKWp} kWp · ${solar.estimatedAnnualKWh?.toLocaleString() ?? "—"} kWh/year`
                : "Roof not suitable"
            }
            costLine={
              solarCost != null
                ? `${fmtGbp(solarCost)} install${
                    solarSavingsLow != null && solarSavingsHigh != null
                      ? ` · ${fmtGbp(solarSavingsLow)}–${fmtGbp(solarSavingsHigh)}/yr saved`
                      : ""
                  }`
                : "Install cost depends on roof access"
            }
            selected={selection.hasSolar}
            onToggle={(on) => setSelection({ ...selection, hasSolar: on })}
            onJump={() => onJumpTab("solar")}
          />
          <RecCard
            kind="battery"
            title="Battery"
            verdict={
              solar.rating === "Excellent" || solar.rating === "Good"
                ? "Pairs well"
                : "Optional"
            }
            tone={
              solar.rating === "Excellent" || solar.rating === "Good"
                ? "green"
                : "slate"
            }
            headline="Stores midday solar for evening"
            costLine="From £3,500 for a 5kWh unit"
            selected={selection.hasBattery}
            onToggle={(on) =>
              setSelection({ ...selection, hasBattery: on })
            }
            disabled={!selection.hasSolar}
            disabledHint="Battery needs solar to charge from"
            onJump={() => onJumpTab("solar")}
          />
        </div>
      </SectionCard>

      {/* Cost / savings teaser → savings tab */}
      <SectionCard
        title="What's it going to cost — and what could you save?"
        subtitle="See the full breakdown across pay-up-front and finance scenarios in the Savings tab."
        icon={<PoundSterling className="w-5 h-5" />}
      >
        <button
          type="button"
          onClick={() => onJumpTab("savings")}
          className="w-full text-left rounded-xl border border-coral/30 bg-coral-pale/40 hover:bg-coral-pale/60 transition-colors p-4 flex items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-semibold text-coral-dark">
              See your monthly bill comparison
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              We&rsquo;ll compare what you pay today vs. what you&rsquo;d pay with the
              upgrades you&rsquo;ve selected — bills, finance payments and export
              earnings all included.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-coral border border-coral/30">
            →
          </span>
        </button>
      </SectionCard>

      {/* Installer playbook */}
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

        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4">
          <p className="text-sm font-semibold text-navy">
            Common myths, busted
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600 leading-relaxed">
            <Myth>
              <span className="line-through opacity-50">
                &ldquo;Heat pumps don&rsquo;t work in cold weather.&rdquo;
              </span>{" "}
              Modern air-source units run efficiently down to −15°C. The Nordic
              countries run on them.
            </Myth>
            <Myth>
              <span className="line-through opacity-50">
                &ldquo;You need a south-facing roof for solar.&rdquo;
              </span>{" "}
              East and west work fine — you just generate at different times of
              day. South is best, but it&rsquo;s not the only game in town.
            </Myth>
            <Myth>
              <span className="line-through opacity-50">
                &ldquo;Batteries pay for themselves in a few years.&rdquo;
              </span>{" "}
              Battery payback is 8–12 years for most homes. They make sense for
              resilience, time-of-use tariffs, and EV charging — less so as a
              pure savings play.
            </Myth>
          </ul>
        </div>
      </SectionCard>
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

// ─── Recommendation card ────────────────────────────────────────────────────

function RecCard({
  kind,
  title,
  verdict,
  tone,
  headline,
  costLine,
  selected,
  onToggle,
  onJump,
  disabled,
  disabledHint,
}: {
  kind: "heatpump" | "solar" | "battery";
  title: string;
  verdict: string;
  tone: "green" | "amber" | "red" | "slate";
  headline: string;
  costLine: string;
  selected: boolean;
  onToggle: (on: boolean) => void;
  onJump?: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const icon =
    kind === "heatpump" ? (
      <Flame className="w-5 h-5" />
    ) : kind === "solar" ? (
      <Sun className="w-5 h-5" />
    ) : (
      <Battery className="w-5 h-5" />
    );

  const verdictTone =
    tone === "green"
      ? "text-emerald-700 bg-emerald-100"
      : tone === "amber"
        ? "text-amber-800 bg-amber-100"
        : tone === "red"
          ? "text-red-700 bg-red-100"
          : "text-slate-600 bg-slate-100";

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        disabled
          ? "border-slate-200 bg-slate-50/40 opacity-60"
          : selected
            ? "border-coral/40 bg-coral-pale/30"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-coral shadow-sm border border-slate-100">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">{title}</p>
          <p className="mt-0.5 text-base font-bold text-navy leading-tight">
            {headline}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${verdictTone}`}
        >
          {verdict}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-600 leading-relaxed">{costLine}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <label
          className={`inline-flex items-center gap-2 text-xs font-medium ${
            disabled ? "text-slate-400 cursor-not-allowed" : "text-navy cursor-pointer"
          }`}
          title={disabled ? disabledHint : undefined}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-coral accent-coral disabled:cursor-not-allowed"
          />
          Include in my plan
        </label>
        {onJump && (
          <button
            type="button"
            onClick={onJump}
            className="text-xs font-semibold text-coral hover:underline"
          >
            See details →
          </button>
        )}
      </div>
      {disabled && disabledHint && (
        <p className="mt-2 text-[11px] text-slate-500 italic">{disabledHint}</p>
      )}
    </div>
  );
}

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

function Myth({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
