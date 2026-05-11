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
  AlertTriangle,
  Box,
  CheckCircle2,
  Compass,
  Droplet,
  Flame,
  Lightbulb,
  MapPin,
  PoundSterling,
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
  // FloorplanExtract in state. Render the extract-driven view, which
  // has a different (simpler, score-based) shape than the legacy
  // BUS-eligibility-engine output below.
  if (extract) {
    return <ExtractDrivenHeatPump extract={extract} audience={audience} />;
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


// ─── V2 upload-only render path ──────────────────────────────────────
//
// When the wizard came through Step4Upload, we have a FloorplanExtract
// — much richer than the legacy eligibility-engine output (per-floor
// rooms, AI-derived score, siting plan, recommended next steps).
// This render replaces the entire legacy tab content.
//
// Mirrors the layout from the standalone /report/[id] page so the
// homeowner sees the same heat-pump narrative whether they came
// through /upload (the throw-away surface) or /check (the wizard).

function ExtractDrivenHeatPump({
  extract,
  audience,
}: {
  extract: FloorplanExtract;
  audience: "homeowner" | "installer";
}) {
  const hp = extract.heat_pump_eligibility;
  const score = hp.indicative_eligibility_score.score_out_of_10;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Heat pump eligibility"
        subtitle={hp.overall_assessment}
        icon={<Flame className="w-5 h-5" />}
      >
        {/* Headline tiles — homeowner sees Score + Grant only. The
            engineering Heat-demand tile (peak kW, annual kWh, capacity
            range, W/m² basis) is installer-only because none of those
            numbers tell a homeowner anything actionable; their
            installer's site brief covers them. */}
        <div
          className={`grid grid-cols-1 gap-4 mb-5 ${
            audience === "installer" ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {/* Score */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-center gap-4">
            <ScoreRing score={score} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Score
              </p>
              <p className="text-sm text-navy mt-1 leading-snug">
                {hp.indicative_eligibility_score.rationale}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Confidence: {hp.confidence}
              </p>
            </div>
          </div>

          {/* Grant */}
          <div className="rounded-xl border border-coral/20 bg-coral-pale/30 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-coral-dark mb-1 inline-flex items-center gap-1">
              <PoundSterling className="w-3 h-3" />
              Grant
            </p>
            <p className="text-sm font-semibold text-navy">
              {hp.scheme_context.applicable_grant}
            </p>
            <p className="text-2xl font-bold text-coral-dark mt-1">
              £{hp.scheme_context.grant_value_gbp.toLocaleString("en-GB")}
            </p>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {hp.scheme_context.system_type_assumed}
            </p>
          </div>

          {/* Heat demand — installer-only. */}
          {audience === "installer" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 inline-flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Heat demand
              </p>
              <p className="text-2xl font-bold text-navy">
                {hp.heat_demand_estimate.estimated_peak_heat_demand_kw.toFixed(1)}{" "}
                <span className="text-sm font-medium text-slate-500">kW peak</span>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                ~{Math.round(
                  hp.heat_demand_estimate.estimated_annual_heat_demand_kwh,
                ).toLocaleString("en-GB")}{" "}
                kWh/yr · {hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[0]}–
                {hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[1]} kW HP
              </p>
              <p className="mt-2 text-[11px] text-slate-500 italic leading-relaxed">
                {hp.heat_demand_estimate.caveat}
              </p>
            </div>
          )}
        </div>

        {/* Positive vs risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {hp.positive_factors.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-2 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                In favour
              </p>
              <ul className="space-y-1.5 text-sm text-emerald-900">
                {hp.positive_factors.map((p, i) => (
                  <li key={i} className="leading-relaxed">· {p}</li>
                ))}
              </ul>
            </div>
          )}
          {hp.risk_factors_and_unknowns.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Worth watching
              </p>
              <ul className="space-y-2 text-sm text-amber-900">
                {hp.risk_factors_and_unknowns.map((r, i) => (
                  <li key={i} className="leading-relaxed">
                    <span className="font-semibold">{r.factor}</span>
                    {r.impact && (
                      <span className="block text-xs text-amber-800 mt-0.5">{r.impact}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Siting — homeowner gets the plain recommended-location
            sentence only; the footprint dimension, alternative spots
            and MCS 020 / front-elevation planning notes are
            installer-only (the site brief renders them in full). */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 inline-flex items-center gap-1">
            <Compass className="w-3 h-3" />
            Where the outdoor unit goes
          </p>
          <p className="text-sm text-navy leading-relaxed">
            <span className="font-semibold">Recommended:</span>{" "}
            {hp.external_unit_siting.recommended_location}
          </p>
          {audience === "installer" && (
            <>
              <p className="mt-2 text-xs text-slate-600">
                Footprint: {hp.external_unit_siting.approximate_footprint_required_m}
              </p>
              {hp.external_unit_siting.alternative_locations.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  Alternatives: {hp.external_unit_siting.alternative_locations.join(" · ")}
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-500 italic">
                {hp.external_unit_siting.front_elevation_siting}
              </p>
            </>
          )}
        </div>
      </SectionCard>

      {/* Floor-by-floor — dropped from the homeowner view. It's
          a reference for the engineer (room layout, GIA per floor)
          and reads as filler to a homeowner who already saw their
          own floorplan in the upload step. Still surfaced on the
          installer site brief at /installer/reports/[leadId]. */}

      {/* Engineer's-notes pointer — explains where the technical
          sizing detail went so the homeowner doesn't feel the
          information's been hidden from them; reinforces that the
          installer they pick has the full picture. */}
      {audience === "homeowner" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
          <p>
            <span className="font-semibold text-navy">
              Full engineer&rsquo;s notes
            </span>{" "}
            — peak heat demand, recommended pump capacity, radiator
            sizing, siting footprint and planning notes — are in the
            site brief we send the installer you pick. They&rsquo;ll
            confirm everything on the site visit.
          </p>
        </div>
      )}

      {/* Next steps — checklist */}
      {hp.recommended_next_steps.length > 0 && (
        <SectionCard
          title="Recommended next steps"
          icon={<Wand2 className="w-5 h-5" />}
        >
          <ol className="space-y-2">
            {hp.recommended_next_steps.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-coral-pale text-coral-dark text-[11px] font-bold">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-800 leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      {/* Notes / caveats — small print */}
      {extract.notes.length > 0 && (
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold">Caveats + inferences:</span>{" "}
          {extract.notes.join(" · ")}
        </p>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(10, score)) / 10;
  const offset = circumference * (1 - fraction);
  const tone =
    score >= 7 ? "text-emerald-600" : score >= 4 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="relative inline-flex items-center justify-center w-20 h-20 shrink-0">
      <svg className="absolute inset-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-100" />
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" className={tone} />
      </svg>
      <div className="text-center">
        <p className={`text-xl font-bold ${tone} leading-none`}>{score}</p>
        <p className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">/10</p>
      </div>
    </div>
  );
}

