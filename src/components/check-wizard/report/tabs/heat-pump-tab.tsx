"use client";

// Heat Pump tab — the deep-dive on whether a heat pump fits this home.
//
// Three big sections:
//   1. Verdict + key facts (system size, BUS grant, post-grant cost,
//      blockers / warnings).
//   2. Read-only annotated floorplan with the AI-placed HP and cylinder
//      pins, alongside the AI write-up of WHY they ended up there.
//   3. What an installer will look at — concerns the AI flagged, plus
//      the questions worth asking on the site visit.
//
// Tone: warm + plain English. Avoid acronyms without explanation
// ("BUS = Boiler Upgrade Scheme", "MCS = the certification body").

import { Box, Droplet, Flame, Info, Lightbulb, MapPin } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import { FloorplanReadOnly } from "../floorplan-readonly";
import {
  FactRow,
  IssueList,
  SectionCard,
  VerdictBadge,
  fmtGbp,
  type VerdictTone,
} from "../shared";

interface Props {
  analysis: AnalyseResponse;
  floorplan: FloorplanAnalysis | null;
  floorplanImageUrl: string | null;
}

export function HeatPumpTab({
  analysis,
  floorplan,
  floorplanImageUrl,
}: Props) {
  const hp = analysis.eligibility.heatPump;
  const finance = analysis.finance.heatPump;

  const tone: VerdictTone =
    hp.verdict === "eligible"
      ? "green"
      : hp.verdict === "conditional"
        ? "amber"
        : "red";

  const verdictLabel =
    hp.verdict === "eligible"
      ? "Recommended"
      : hp.verdict === "conditional"
        ? "Possible"
        : "Not now";

  const grant = hp.estimatedGrantGBP;
  const sysKw = hp.recommendedSystemKW;
  const costRange = finance.estimatedNetInstallCostRangeGBP;

  return (
    <div className="space-y-6">
      {/* 1. Verdict + key numbers */}
      <SectionCard
        title="Heat pump for your home"
        subtitle="What it would cost, what you'd get, and what to watch out for."
        icon={<Flame className="w-5 h-5" />}
        rightSlot={<VerdictBadge tone={tone} label={verdictLabel} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-5">
          <BigStat
            label="System size"
            value={sysKw != null ? `${sysKw} kW` : "TBC"}
            sub="Sized to keep your home warm at the coldest UK design temperature (−2°C)."
          />
          <BigStat
            label="BUS grant"
            value={fmtGbp(grant, { compact: true })}
            sub="The Boiler Upgrade Scheme knocks this off the bill at the point of sale — your installer applies for it on your behalf."
            tone="green"
          />
          <BigStat
            label="Cost after grant"
            value={
              costRange
                ? `${fmtGbp(costRange[0], { compact: true })}–${fmtGbp(costRange[1], { compact: true })}`
                : "Quote on site"
            }
            sub="Range covers typical installer pricing for a property of this size + complexity. Finance available at 6.9% over 10 years."
          />
        </div>

        {hp.blockers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-1.5">
              Showstoppers
            </p>
            <IssueList kind="blocker" items={hp.blockers} />
          </div>
        )}
        {hp.warnings.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1.5">
              Worth knowing
            </p>
            <IssueList kind="warning" items={hp.warnings} />
          </div>
        )}

        {hp.notes.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-slate-600 list-disc pl-5 leading-relaxed">
            {hp.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 2. Floorplan + write-up */}
      {floorplan && (
        <SectionCard
          title="Where it'd live in your home"
          subtitle="We've marked the most sensible spots for the outdoor unit and the hot-water cylinder. Your installer will measure up and confirm on the site visit."
          icon={<MapPin className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <FloorplanReadOnly
                analysis={floorplan}
                imageUrl={floorplanImageUrl}
              />
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* HP locations */}
              {floorplan.heatPumpLocations.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-navy mb-2 inline-flex items-center gap-2">
                    <Flame className="w-4 h-4 text-coral" />
                    Outdoor unit
                  </p>
                  <ul className="space-y-2">
                    {floorplan.heatPumpLocations.map((hp, i) => (
                      <li
                        key={hp.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <p className="text-sm font-medium text-navy">
                          HP {i + 1} — {hp.label}
                        </p>
                        {hp.notes && (
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {hp.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cylinder */}
              {floorplan.hotWaterCylinderCandidates.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-navy mb-2 inline-flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-violet-600" />
                    Hot water cylinder
                  </p>
                  <ul className="space-y-2">
                    {floorplan.hotWaterCylinderCandidates.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <p className="text-sm font-medium text-navy">
                          {c.label}
                        </p>
                        {c.notes && (
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {c.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cylinder space note */}
              {floorplan.hotWaterCylinderSpace.likelyPresent && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-900">
                  <p className="inline-flex items-start gap-1.5">
                    <Box className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      <strong>Existing cylinder space:</strong>{" "}
                      {floorplan.hotWaterCylinderSpace.location ??
                        "your floorplan suggests one is already plumbed in"}
                      .
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {floorplan.aiAutorun && (
            <div className="mt-4 rounded-lg bg-coral-pale/40 border border-coral/30 p-3 text-xs text-slate-700 leading-relaxed">
              <p>
                <strong className="text-coral-dark">AI-detected layout.</strong>{" "}
                We&rsquo;ve worked out the geometry from your floorplan image
                rather than from your hand-drawing. Treat it as a strong starting
                point — your installer will confirm everything in person.
              </p>
            </div>
          )}
        </SectionCard>
      )}

      {/* 3. Concerns + installer questions */}
      {(floorplan?.heatPumpInstallationConcerns?.length ||
        floorplan?.recommendedInstallerQuestions?.length ||
        hp.warnings.length) && (
        <SectionCard
          title="What an installer will look at"
          subtitle="Things we'd flag if we were the surveyor — and questions worth asking when they visit."
          icon={<Lightbulb className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(floorplan?.heatPumpInstallationConcerns ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Things to check on site
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5 leading-relaxed">
                  {floorplan?.heatPumpInstallationConcerns?.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {((floorplan?.recommendedInstallerQuestions ?? []).length > 0 ||
              hp.warnings.length > 0) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Questions to ask
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5 leading-relaxed">
                  {(floorplan?.recommendedInstallerQuestions ?? [])
                    .concat(hp.warnings)
                    .slice(0, 8)
                    .map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {!floorplan && (
        <SectionCard
          title="No floorplan to show"
          icon={<Info className="w-5 h-5" />}
        >
          <p className="text-sm text-slate-500">
            We don&rsquo;t have a floorplan on file for this property — your
            installer will assess everything on the site visit.
          </p>
        </SectionCard>
      )}

      {hp.recommendedSystemKW != null && (
        <SectionCard>
          <FactRow label="System size">{hp.recommendedSystemKW} kW</FactRow>
          <FactRow label="BUS grant">
            {fmtGbp(hp.estimatedGrantGBP, { compact: true })}
          </FactRow>
          {costRange && (
            <FactRow label="Cost after grant">
              {fmtGbp(costRange[0], { compact: true })}–{fmtGbp(costRange[1], { compact: true })}
            </FactRow>
          )}
          {hp.heatLossPlanningEstimateW != null && (
            <FactRow label="Estimated heat loss">
              {Math.round(hp.heatLossPlanningEstimateW).toLocaleString()} W
            </FactRow>
          )}
          <FactRow label="Outdoor unit candidates">
            {floorplan?.heatPumpLocations?.length ?? 0}
          </FactRow>
          <FactRow label="Cylinder candidates">
            {floorplan?.hotWaterCylinderCandidates?.length ?? 0}
          </FactRow>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Big stat tile ──────────────────────────────────────────────────────────

function BigStat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green";
}) {
  const valueColour = tone === "green" ? "text-emerald-700" : "text-navy";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${valueColour}`}>{value}</p>
      {sub && (
        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{sub}</p>
      )}
    </div>
  );
}
