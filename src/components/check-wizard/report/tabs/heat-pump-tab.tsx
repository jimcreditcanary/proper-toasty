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

import {
  Box,
  Droplet,
  Flame,
  Lightbulb,
  MapPin,
  Wand2,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import type { FloorplanExtract } from "@/lib/schemas/floorplan-extract";
import { FloorplanReadOnly } from "../floorplan-readonly";
import {
  IssueList,
  SectionCard,
  VerdictBadge,
  fmtGbp,
  type VerdictTone,
} from "../shared";
import { HeatPumpExtract } from "./heat-pump-extract";

interface Props {
  analysis: AnalyseResponse;
  floorplan: FloorplanAnalysis | null;
  floorplanImageUrl: string | null;
  /** V2 upload-only flow output. When non-null, this tab renders the
   *  extract's heat-pump eligibility section instead of the legacy
   *  AnalyseResponse.eligibility.heatPump tree. Set by Step 4 of the
   *  wizard when the user came through the upload-only path. */
  extract?: FloorplanExtract | null;
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
  extract,
  audience = "homeowner",
}: Props) {
  // V2 path — when the wizard came through Step4Upload we have the
  // FloorplanExtract in state. Render the dedicated extract-driven
  // view (separate file, score-based layout). The legacy
  // BUS-eligibility-engine output below is only used when the wizard
  // came through the older analyse flow with no extract.
  if (extract) {
    return <HeatPumpExtract extract={extract} audience={audience} />;
  }

  const hp = analysis.eligibility.heatPump;
  const finance = analysis.finance.heatPump;

  const tone: VerdictTone =
    hp.verdict === "eligible"
      ? "green"
      : hp.verdict === "conditional"
        ? "amber"
        : "red";

  // Same verdict copy as the Overview eligibility checklist + the
  // Savings tab tile so a user clicking through the report doesn't
  // see the same status described three different ways.
  const verdictLabel =
    hp.verdict === "eligible"
      ? "Compatible"
      : hp.verdict === "conditional"
        ? "Requires investigation"
        : "Not compatible";

  const grant = hp.estimatedGrantGBP;
  // Fall back to UK-average estimates when the analysis didn't give us
  // a property-specific number — keeps the BigStats showing real
  // figures rather than "TBC" / "Quoted on visit", which read as
  // "we don't know anything" and are inconsistent with what the
  // savings tab shows. A site visit will refine.
  const sysKw = hp.recommendedSystemKW;
  const sysKwDisplay = sysKw != null ? `${sysKw} kW` : "~8 kW typical";
  const sysKwSub =
    sysKw != null
      ? "Sized to keep you warm even on the coldest UK day."
      : "Typical for a UK home this type — confirmed on a heat-loss survey.";

  const costRange = finance.estimatedNetInstallCostRangeGBP;
  // UK averages (after BUS grant): £4k–£5.5k typical for a standard
  // ASHP install for an average home. Same magnitude as the savings
  // calculator's £12k gross − £7.5k grant.
  const FALLBACK_NET_LOW = 4000;
  const FALLBACK_NET_HIGH = 5500;
  const baseCostLow = costRange?.[0] ?? FALLBACK_NET_LOW;
  const baseCostHigh = costRange?.[1] ?? FALLBACK_NET_HIGH;
  // Extra one-off costs (EPC renewal etc.) get folded into the
  // headline so the homeowner sees the all-in figure they'll pay,
  // and listed separately below the cost stat so they understand
  // *why* the figure is what it is.
  const extras = finance.additionalCostsGBP ?? [];
  const extrasTotal = extras.reduce((sum, e) => sum + e.gbp, 0);
  const costLow = baseCostLow + extrasTotal;
  const costHigh = baseCostHigh + extrasTotal;
  const costSub =
    costRange != null
      ? "Range covers typical installer pricing for a property your size. Spread over 10 years at 6.9% if you finance it."
      : "Typical UK installer pricing after the BUS grant. The Savings tab shows finance + payback options.";

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
            value={sysKwDisplay}
            sub={sysKwSub}
          />
          <BigStat
            label="Government grant"
            value={fmtGbp(grant, { compact: true })}
            sub="Knocked straight off the bill — your installer claims it for you."
            tone="green"
          />
          <BigStat
            label="What you'd actually pay"
            value={`${fmtGbp(costLow, { compact: true })}–${fmtGbp(costHigh, { compact: true })}`}
            sub={costSub}
          />
        </div>

        {/* Itemised extras — currently only EPC renewal but the
            structure scales. Shown only when something would otherwise
            be hidden inside the headline figure. */}
        {extras.length > 0 && (
          <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs">
            <p className="font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Includes
            </p>
            <ul className="space-y-1">
              {extras.map((e) => (
                <li key={e.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-slate-700">{e.label}</span>
                  <span className="font-mono text-navy">{fmtGbp(e.gbp)}</span>
                </li>
              ))}
            </ul>
            {extras[0]?.note && (
              <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                {extras[0].note}
              </p>
            )}
          </div>
        )}

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
              {/* Let FloorplanReadOnly's default pick (hide photo
                  whenever there's any drawn geometry). Removing the
                  explicit `canonical={!aiAutorun}` override fixed
                  the case where AI auto-ran AND produced refined
                  walls — the photo was kept underneath the drawing
                  and the two visibly drifted out of alignment. */}
              <FloorplanReadOnly
                analysis={floorplan}
                imageUrl={floorplanImageUrl}
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



