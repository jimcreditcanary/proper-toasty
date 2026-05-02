"use client";

// Heat Pump tab — plain-English deep-dive on whether a heat pump fits.
//
// Three sections:
//   1. The headline — "Yes / Maybe / Not now" plus the three numbers
//      that matter (system size, BUS grant, what you'd actually pay)
//   2. Where it'd live — read-only floorplan render. If the user drew
//      the annotations themselves we show the clean drawing. If the AI
//      auto-detected from the photo we show the photo with annotations
//      on top so the user can sanity-check the AI placements.
//   3. Things to ask the installer — short, direct bullets.
//
// Tone: short sentences, real words, no jargon. "BUS = the government
// grant that knocks £7,500 off the bill" rather than "Boiler Upgrade
// Scheme grant per Ofgem regulations".

import { Box, Droplet, Flame, Lightbulb, MapPin, Wand2 } from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import { FloorplanReadOnly } from "../floorplan-readonly";
import {
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
  /** Suppresses consumer-flavoured cards (the "Heat pump for your
   *  home" headline + the "Things to bring up with your installer"
   *  prep list) when the report is being viewed by an installer
   *  prepping for a site visit. */
  audience?: "homeowner" | "installer";
}

export function HeatPumpTab({
  analysis,
  floorplan,
  floorplanImageUrl,
  audience = "homeowner",
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
      ? "Yes — a great fit"
      : hp.verdict === "conditional"
        ? "Maybe — a few things to sort"
        : "Not right now";

  const grant = hp.estimatedGrantGBP;
  const sysKw = hp.recommendedSystemKW;
  const costRange = finance.estimatedNetInstallCostRangeGBP;

  return (
    <div className="space-y-6">
      {/* HEADLINE — the three numbers + verdict.
          Hidden in installer mode — they get the same numbers in the
          report-shell header + on the lead row, this card duplicates. */}
      {audience === "homeowner" && (
      <SectionCard
        title="Heat pump for your home"
        subtitle="Three numbers that tell you what to expect."
        icon={<Flame className="w-5 h-5" />}
        rightSlot={<VerdictBadge tone={tone} label={verdictLabel} />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5">
          <BigStat
            label="System size"
            value={sysKw != null ? `${sysKw} kW` : "TBC on visit"}
            sub="Sized to keep you warm even on the coldest UK day."
          />
          <BigStat
            label="Government grant"
            value={fmtGbp(grant, { compact: true })}
            sub="Knocked straight off the bill — your installer claims it for you."
            tone="green"
          />
          <BigStat
            label="What you'd actually pay"
            value={
              costRange
                ? `${fmtGbp(costRange[0], { compact: true })}–${fmtGbp(costRange[1], { compact: true })}`
                : "Quoted on visit"
            }
            sub="Range covers typical installer pricing for a property your size. Spread over 10 years at 6.9% if you finance it."
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
      </SectionCard>
      )}

      {/* FLOORPLAN — drawn vs AI-detected variant */}
      {floorplan && (
        <SectionCard
          title="Where it'd live in your home"
          subtitle={
            floorplan.aiAutorun
              ? "We've spotted likely places for the outdoor unit and hot-water tank from your floorplan photo. Shown over your photo so you can check our guesses."
              : "Based on your annotations. Your installer will measure up and confirm on the day."
          }
          icon={<MapPin className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              {/* canonical: false → keep photo visible (AI mode);
                  canonical: true → hide photo, show clean drawing
                  (user-drew mode). The component picks based on
                  aiAutorun by default but we're explicit here. */}
              <FloorplanReadOnly
                analysis={floorplan}
                imageUrl={floorplanImageUrl}
                canonical={!floorplan.aiAutorun}
              />
              {floorplan.aiAutorun && (
                <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-coral-dark">
                  <Wand2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    AI-detected from your photo. Pin positions are a starting
                    point — the installer will confirm everything in person.
                  </span>
                </p>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* Outdoor unit candidates — short, plain */}
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
                          Spot {i + 1} — {hp.label}
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

              {/* Hot water cylinder candidates */}
              {floorplan.hotWaterCylinderCandidates.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-navy mb-2 inline-flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-violet-600" />
                    Hot water tank
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

              {floorplan.hotWaterCylinderSpace.likelyPresent && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-900">
                  <p className="inline-flex items-start gap-1.5">
                    <Box className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      <strong>You&rsquo;ve already got tank space:</strong>{" "}
                      {floorplan.hotWaterCylinderSpace.location ??
                        "your floorplan suggests one's already plumbed in"}
                      .
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* THINGS TO ASK THE INSTALLER — homeowner-only. Installers
          don't need their own conversation prompts surfaced. */}
      {audience === "homeowner" &&
      (floorplan?.heatPumpInstallationConcerns?.length ||
        floorplan?.recommendedInstallerQuestions?.length ||
        hp.warnings.length ||
        hp.notes.length) && (
        <SectionCard
          title="Things to bring up with your installer"
          subtitle="What we'd ask if we were on the call."
          icon={<Lightbulb className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(floorplan?.heatPumpInstallationConcerns?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Things they&rsquo;ll want to check
                </p>
                <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5 leading-relaxed">
                  {floorplan?.heatPumpInstallationConcerns?.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {((floorplan?.recommendedInstallerQuestions?.length ?? 0) > 0 ||
              hp.warnings.length > 0) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Questions worth asking
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

          {hp.notes.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Useful background
              </p>
              <ul className="space-y-1.5 text-sm text-slate-600 list-disc pl-5 leading-relaxed">
                {hp.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
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
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{sub}</p>
      )}
    </div>
  );
}
