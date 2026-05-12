"use client";

// Heat-pump tab — v2 extract-driven render.
//
// Sister component to the legacy `analysis`-driven render in
// heat-pump-tab.tsx, used whenever the wizard came through
// Step 4 Upload and we have a FloorplanExtract in state.
//
// Design rule: this tab MUST match the look of every other report
// tab. Use `SectionCard`, `VerdictBadge`, `BigStat`, `IssueList`,
// `fmtGbp` from ../shared. No custom typography, no custom
// gradients, no display-axis font tricks — those belong in
// marketing pages, not the report. The earlier mockup-faithful
// build drifted too far from the rest of the wizard; this revision
// brings the same content back inside the design system.
//
// The audience split mirrors heat-pump-tab.tsx: homeowner gets the
// outcome-focused view; installer gets that plus the engineering
// sizing strip (peak kW / annual kWh / capacity range / W/m² basis)
// + the alternative-locations + front-elevation MCS 020 note.

import { Compass, Flame, Lightbulb } from "lucide-react";
import type {
  FloorplanExtract,
  ScoreAdjustment,
} from "@/lib/schemas/floorplan-extract";
import {
  BigStat,
  IssueList,
  SectionCard,
  VerdictBadge,
  fmtGbp,
  type VerdictTone,
} from "../shared";

interface Props {
  extract: FloorplanExtract;
  audience: "homeowner" | "installer";
}

export function HeatPumpExtract({ extract, audience }: Props) {
  const hp = extract.heat_pump_eligibility;
  const score = hp.indicative_eligibility_score.score_out_of_10;
  const tone: VerdictTone =
    score >= 7 ? "green" : score >= 4 ? "amber" : "red";
  const verdictLabel =
    score >= 7
      ? "Recommend proceeding"
      : score >= 4
        ? "Worth pursuing"
        : "Significant barriers";

  // System type often arrives as "Air Source Heat Pump (ASHP)" — split
  // before the parenthetical for the BigStat headline so it fits on
  // one line at most mobile widths. The full string still appears in
  // the assessment paragraph and the grant tile sub.
  const systemTypeShort = hp.scheme_context.system_type_assumed
    .split("(")[0]
    .trim();

  return (
    <div className="space-y-6">
      {/* HEADLINE — verdict + three numbers. Subtitle surfaces the
          model's confidence statement directly rather than generic
          "pre-survey indication" copy — homeowners read it once at
          the top instead of hunting for the small-print disclaimer
          further down the card. */}
      <SectionCard
        title="Heat pump for your home"
        subtitle={`Confidence: ${hp.confidence}`}
        icon={<Flame className="w-5 h-5" />}
        rightSlot={<VerdictBadge tone={tone} label={verdictLabel} />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-5">
          <ScoreBreakdownCard
            score={score}
            baseScore={hp.indicative_eligibility_score.base_score}
            adjustments={hp.indicative_eligibility_score.adjustments}
            rationale={hp.indicative_eligibility_score.rationale}
          />
          <div className="grid grid-cols-1 gap-4 content-start">
            <BigStat
              label="System type"
              value={systemTypeShort}
              sub={
                hp.scheme_context.ground_source_viable
                  ? "Ground-source loops are also viable on this plot — worth quoting both."
                  : "Standard outdoor unit + indoor controls. Your installer confirms on the day."
              }
            />
            <BigStat
              label="Government grant"
              value={fmtGbp(hp.scheme_context.grant_value_gbp, {
                compact: true,
              })}
              sub={`${hp.scheme_context.applicable_grant} — knocked straight off the bill by your installer.`}
              tone="green"
            />
          </div>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">
          {hp.overall_assessment}
        </p>
      </SectionCard>

      {/* HEAT DEMAND — installer audience only. The peak-kW, annual-
          kWh, capacity-range and W/m² basis numbers don't help a
          homeowner decide anything; their installer's site brief
          covers them in full. */}
      {audience === "installer" && (
        <SectionCard
          title="Sizing — engineer view"
          subtitle="Headline heat-loss numbers. The installer will refine on site with a BS EN 12831 calc."
          icon={<Flame className="w-5 h-5" />}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BigStat
              label="Peak demand"
              value={`${hp.heat_demand_estimate.estimated_peak_heat_demand_kw.toFixed(1)} kW`}
            />
            <BigStat
              label="Annual"
              value={`${Math.round(
                hp.heat_demand_estimate.estimated_annual_heat_demand_kwh,
              ).toLocaleString("en-GB")} kWh`}
            />
            <BigStat
              label="Capacity range"
              value={`${hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[0]}–${hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[1]} kW`}
            />
            <BigStat
              label="Heat-loss basis"
              value={`${hp.heat_demand_estimate.assumed_specific_heat_loss_w_per_sq_m} W/m²`}
              sub={hp.heat_demand_estimate.assumed_specific_heat_loss_basis}
            />
          </div>
          <p className="mt-4 text-xs text-slate-500 italic leading-relaxed">
            {hp.heat_demand_estimate.caveat}
          </p>
        </SectionCard>
      )}

      {/* WHAT WE SAW — favour + watch in two columns */}
      <SectionCard
        title="What we saw on the plan"
        subtitle="Things in your favour, and things worth a closer look."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {hp.positive_factors.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                In favour ({hp.positive_factors.length})
              </p>
              <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed">
                {hp.positive_factors.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-md bg-emerald-50/60 border border-emerald-100 px-3 py-2"
                  >
                    <span aria-hidden className="text-emerald-700 select-none">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hp.risk_factors_and_unknowns.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-2">
                Worth a closer look ({hp.risk_factors_and_unknowns.length})
              </p>
              <ul className="space-y-2">
                {hp.risk_factors_and_unknowns.map((r, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-amber-50/60 border border-amber-100 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-navy leading-snug">
                      {r.factor}
                    </p>
                    {r.impact && (
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {r.impact}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SectionCard>

      {/* OUTDOOR UNIT — recommended site + installer extras */}
      <SectionCard
        title="Where the outdoor unit goes"
        subtitle="A starting point — the installer measures up on the visit."
        icon={<Compass className="w-5 h-5" />}
      >
        <p className="text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold text-navy">Recommended:</span>{" "}
          {hp.external_unit_siting.recommended_location}
        </p>

        {audience === "installer" && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">Footprint:</span>{" "}
              {hp.external_unit_siting.approximate_footprint_required_m}
            </p>
            {hp.external_unit_siting.alternative_locations.length > 0 && (
              <p>
                <span className="font-semibold text-slate-700">
                  Alternatives:
                </span>{" "}
                {hp.external_unit_siting.alternative_locations.join(" · ")}
              </p>
            )}
            <p className="italic text-slate-500 leading-relaxed">
              {hp.external_unit_siting.front_elevation_siting}
            </p>
          </div>
        )}
      </SectionCard>

      {/* NEXT STEPS — numbered list */}
      {hp.recommended_next_steps.length > 0 && (
        <SectionCard
          title="Recommended next steps"
          subtitle="A short checklist to take into your first installer conversation."
          icon={<Lightbulb className="w-5 h-5" />}
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

      {/* HANDOFF — homeowner only. Mirrors the legacy path's
          engineer's-notes pointer so the homeowner knows the
          technical detail isn't being hidden from them; it just
          travels with the installer brief. */}
      {audience === "homeowner" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600 leading-relaxed">
          <p>
            <span className="font-semibold text-navy">
              Full engineer&rsquo;s notes
            </span>{" "}
            — peak heat demand, recommended pump capacity, radiator sizing,
            siting footprint and planning notes — are in the site brief we
            send the installer you pick. They&rsquo;ll confirm everything on
            the visit.
          </p>
        </div>
      )}

      {/* CAVEATS — small print, opt-in. Surfaced via IssueList so it
          shares styling with the legacy path's blockers/warnings. */}
      {extract.notes.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 open:bg-slate-50/40">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-500">
            Caveats &amp; inferences ({extract.notes.length})
          </summary>
          <div className="mt-3 pt-3 border-t border-slate-200">
            <IssueList kind="warning" items={extract.notes} />
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Score breakdown card ───────────────────────────────────────────────
//
// Replaces the old "Eligibility score" BigStat with a richer panel
// that surfaces the working: base score, every adjustment delta with
// its reason, and a footer total that MUST equal the headline (the
// schema refine guarantees it).
//
// Falls back to a simple score-only view when `baseScore` or
// `adjustments` are missing — older rows in floorplan_uploads were
// extracted before the breakdown landed and don't carry these
// fields. Once those rows age out (90-day retention), this branch
// becomes dead and can be removed.

function ScoreBreakdownCard({
  score,
  baseScore,
  adjustments,
  rationale,
}: {
  score: number;
  baseScore: number | undefined;
  adjustments: ScoreAdjustment[] | undefined;
  rationale: string;
}) {
  const hasBreakdown =
    baseScore != null && adjustments != null && adjustments.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Eligibility score
      </p>
      <p className="text-3xl sm:text-4xl font-bold text-navy mb-4 leading-none">
        {score}
        <span className="text-xl sm:text-2xl text-slate-400 font-semibold">
          {" "}
          / 10
        </span>
      </p>

      {hasBreakdown && (
        <>
          <p className="text-xs font-semibold text-navy mb-2">
            How this score is calculated
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <BreakdownRow delta={baseScore} reason="Base Score" emphasised />
            {adjustments.map((a, i) => (
              <BreakdownRow key={i} delta={a.delta} reason={a.reason} />
            ))}
            <BreakdownRow total={score} reason="Eligibility score" emphasised />
          </div>
        </>
      )}

      {rationale && (
        <div className="mt-4 rounded-md border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 leading-relaxed">
          {rationale}
        </div>
      )}
    </div>
  );
}

// One row of the score-breakdown table. `delta` shows a signed
// integer with positive/negative tinting; `total` shows the final
// footer with no sign. Emphasised rows (base + footer) drop the
// coloured chip and use plain text — they're structural, not deltas.

function BreakdownRow({
  delta,
  total,
  reason,
  emphasised = false,
}: {
  delta?: number;
  total?: number;
  reason: string;
  emphasised?: boolean;
}) {
  let chipClass = "bg-slate-100 text-slate-700";
  let chipText: string;
  if (total != null) {
    chipText = String(total);
    chipClass = "bg-slate-200 text-navy";
  } else if (delta != null) {
    chipText = delta > 0 ? `+${delta}` : String(delta);
    if (!emphasised) {
      chipClass =
        delta > 0
          ? "bg-emerald-100 text-emerald-800"
          : delta < 0
            ? "bg-amber-100 text-amber-900"
            : "bg-slate-100 text-slate-700";
    } else {
      chipClass = "bg-slate-200 text-navy";
    }
  } else {
    chipText = "";
  }
  return (
    <div className="grid grid-cols-[56px_1fr] items-center border-b border-slate-200 last:border-b-0">
      <div className="px-3 py-2 flex items-center justify-center">
        <span
          className={`inline-flex min-w-[36px] justify-center rounded px-2 py-0.5 text-xs font-semibold ${chipClass}`}
        >
          {chipText}
        </span>
      </div>
      <div
        className={`px-3 py-2 text-[13.5px] leading-snug ${
          emphasised ? "font-semibold text-navy" : "text-slate-700"
        }`}
      >
        {reason}
      </div>
    </div>
  );
}
