"use client";

// Heat-pump tab — v2 extract-driven render.
//
// Inputs: a FloorplanExtract (the v2 upload pipeline output validated
// against src/lib/schemas/floorplan-extract.ts). Replaces the older
// inline ExtractDrivenHeatPump component that lived inside
// heat-pump-tab.tsx and tried to compose mockup-grade design out of
// the generic SectionCard / VerdictBadge atoms. Lifting it here lets
// the layout be expressive without growing the parent tab past 900
// lines.
//
// Design lineage: mocked up in /Desktop/heatpump-redesign.html (May
// 2026). The mockup's `moss` palette is our existing `coral` (forest
// green) token; `paper` is our `cream`; `ink` is our `navy`. The
// warm-amber grant panel and gold grant number are bespoke hex
// arbitrary values — they carry semantic meaning ("money / grant",
// not "eligible / proceed") so substituting green would lose the
// signal. Everything else maps to existing tokens.
//
// What we deliberately did NOT do:
//   - No risk severity chips on the watch list. The schema's
//     RiskFactor has `determinable_from_floorplan` but not a
//     severity field, and deriving one is more noise than signal.
//   - No Priority/Survey/Admin tags on next-steps. Same reason —
//     `recommended_next_steps` is plain string[], heuristics on
//     keywords would lie.
//   - No real geometry in the unit-placement diagram. The v2 path
//     has no walls/door geometry; the diagram is a stylised
//     illustration of "side or rear" with a recommended-position
//     marker, not a survey drawing.

import {
  ChevronDown,
  Compass,
  FileText,
  Flame,
  Lightbulb,
} from "lucide-react";
import type { FloorplanExtract } from "@/lib/schemas/floorplan-extract";

interface Props {
  extract: FloorplanExtract;
  /** Suppresses consumer-flavoured copy + reveals engineering
   *  numbers (peak kW, annual kWh, capacity range, footprint dims).
   *  Installer-mode is rendered on the site-brief surface. */
  audience: "homeowner" | "installer";
}

export function HeatPumpExtract({ extract, audience }: Props) {
  const hp = extract.heat_pump_eligibility;
  const score = hp.indicative_eligibility_score.score_out_of_10;
  const confidenceTier = parseConfidenceTier(hp.confidence);
  const verdictAdjective = scoreToAdjective(score);
  const verdictLabel = scoreToLabel(score);

  return (
    <div className="space-y-5">
      <VerdictCard
        score={score}
        verdictAdjective={verdictAdjective}
        verdictLabel={verdictLabel}
        rationale={hp.indicative_eligibility_score.rationale}
        overallAssessment={hp.overall_assessment}
        confidenceTier={confidenceTier}
        confidenceLabel={confidenceLabelFromTier(confidenceTier)}
        grantValue={hp.scheme_context.grant_value_gbp}
        grantName={hp.scheme_context.applicable_grant}
        systemType={hp.scheme_context.system_type_assumed}
      />

      {/* Engineering numbers — installer audience only. The
          homeowner gets the rationale on the verdict card and the
          all-in cost on the Savings tab; W/m² and peak-kW are
          installer concerns. */}
      {audience === "installer" && (
        <HeatDemandStrip demand={hp.heat_demand_estimate} />
      )}

      <FavourWatchCards
        favour={hp.positive_factors}
        watch={hp.risk_factors_and_unknowns.map((r) => ({
          factor: r.factor,
          impact: r.impact,
        }))}
      />

      <UnitPlacementCard
        recommended={hp.external_unit_siting.recommended_location}
        footprint={hp.external_unit_siting.approximate_footprint_required_m}
        alternatives={hp.external_unit_siting.alternative_locations}
        frontElevationNote={hp.external_unit_siting.front_elevation_siting}
        audience={audience}
      />

      {audience === "homeowner" && <HandoffStrip />}

      {hp.recommended_next_steps.length > 0 && (
        <NextStepsCard steps={hp.recommended_next_steps} />
      )}

      {extract.notes.length > 0 && <CaveatsCard notes={extract.notes} />}
    </div>
  );
}

// ─── Verdict card ───────────────────────────────────────────────────────
//
// Two-column band on desktop (stacks on mobile):
//   left  → property assessment headline + score gauge + verdict + confidence
//   right → "you're eligible for" + £ amount + scheme name
//
// The right column is intentionally amber/gold (not green) to read
// as "money" rather than "this is the eligible signal". The score
// gauge on the left carries the eligibility signal.

function VerdictCard({
  score,
  verdictAdjective,
  verdictLabel,
  rationale,
  overallAssessment,
  confidenceTier,
  confidenceLabel,
  grantValue,
  grantName,
  systemType,
}: {
  score: number;
  verdictAdjective: string;
  verdictLabel: string;
  rationale: string;
  overallAssessment: string;
  confidenceTier: 1 | 2 | 3;
  confidenceLabel: string;
  grantValue: number;
  grantName: string;
  systemType: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
        {/* Left — assessment */}
        <div className="border-b border-[var(--border)] p-6 md:border-b-0 md:border-r md:p-8">
          <p className="eyebrow mb-4">Property assessment</p>
          <h2
            className="mb-3 font-display text-3xl leading-[1.04] tracking-tight text-navy md:text-[2.75rem]"
            style={{ fontVariationSettings: '"opsz" 110, "SOFT" 50' }}
          >
            A{" "}
            <em
              className="not-italic"
              style={{
                fontStyle: "italic",
                color: "var(--coral)",
                fontVariationSettings: '"opsz" 144',
              }}
            >
              {verdictAdjective}
            </em>
            <br />
            candidate.
          </h2>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-600">
            {overallAssessment || rationale}
          </p>

          <div className="flex items-end gap-5">
            <ScoreGauge score={score} />
            <div className="pb-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Eligibility
              </p>
              <p
                className="mb-2 font-display text-xl italic leading-tight text-coral md:text-[1.4rem]"
                style={{ fontVariationSettings: '"opsz" 144' }}
              >
                {verdictLabel}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Confidence</span>
                <ConfidenceBars tier={confidenceTier} />
                <span>{confidenceLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — grant */}
        <div
          className="relative p-6 md:p-8"
          style={{
            background:
              "linear-gradient(180deg, #FAF3E0 0%, #F3E5B8 100%)",
          }}
        >
          {/* Top-right gold accent rule — subtle but ties the panel
              visually to the grant signal */}
          <span
            aria-hidden
            className="absolute right-8 top-0 hidden h-7 w-px md:block"
            style={{ background: "#B68A1F" }}
          />

          <p
            className="eyebrow mb-3"
            style={{ color: "#8A6612" }}
          >
            You&rsquo;re eligible for
          </p>
          <p className="mb-1 text-sm text-slate-700">{grantName}</p>

          <p
            className="my-2 font-display font-normal leading-[0.92] tracking-tight"
            style={{
              fontSize: "clamp(3.5rem, 8vw, 5.5rem)",
              color: "#8A6612",
              fontFeatureSettings: '"lnum", "tnum"',
              fontVariationSettings: '"opsz" 144',
            }}
          >
            <sup
              className="font-normal"
              style={{
                fontSize: "0.42em",
                verticalAlign: "0.85em",
                marginRight: "0.05em",
                opacity: 0.85,
              }}
            >
              £
            </sup>
            {Math.round(grantValue).toLocaleString("en-GB")}
          </p>

          <ul className="mt-4 space-y-2.5 text-[13px] text-slate-700">
            <li className="flex items-center gap-2.5">
              <svg
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "#8A6612" }}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8l3.5 3.5L13 4.5" />
              </svg>
              <span>
                Toward <strong className="font-semibold text-navy">{systemType}</strong>
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <svg
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: "#8A6612" }}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3l2 1.5" />
              </svg>
              <span>England &amp; Wales · current 2024–2025 rate</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Score gauge ────────────────────────────────────────────────────────
//
// SVG arc, stroke-dashoffset animated by score. Gradient stroke uses
// our coral (forest) tokens so it picks up the brand palette without
// needing to declare new colour stops.

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(10, score));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 10);
  return (
    <div
      className="relative h-[132px] w-[132px] shrink-0"
      role="img"
      aria-label={`Eligibility score ${score} out of 10`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="hpScoreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--coral-light)" />
            <stop offset="100%" stopColor="var(--coral-dark)" />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--coral-pale)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#hpScoreGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-display font-normal text-coral-dark"
          style={{
            fontSize: "3.4rem",
            letterSpacing: "-0.04em",
            fontFeatureSettings: '"lnum", "tnum"',
            fontVariationSettings: '"opsz" 144',
          }}
        >
          {score}
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          / 10
        </span>
      </div>
    </div>
  );
}

function ConfidenceBars({ tier }: { tier: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="block h-3 w-1 rounded-[1px]"
          style={{
            background: i <= tier ? "var(--coral-light)" : "rgba(40,45,38,0.18)",
          }}
        />
      ))}
    </span>
  );
}

// ─── Heat demand strip (installer-only) ─────────────────────────────────
//
// Hot strip of engineering numbers below the verdict. Designed to be
// scanned, not read — bold figures, units in muted small-caps. Sits
// between the verdict and the favour/watch dual cards so the installer
// has the sizing context before they read the risks.

function HeatDemandStrip({
  demand,
}: {
  demand: FloorplanExtract["heat_pump_eligibility"]["heat_demand_estimate"];
}) {
  const lo = demand.recommended_heat_pump_capacity_kw_range[0];
  const hi = demand.recommended_heat_pump_capacity_kw_range[1];
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-coral" />
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          Sizing — engineer view
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          value={`${demand.estimated_peak_heat_demand_kw.toFixed(1)} kW`}
          label="Peak demand"
        />
        <Stat
          value={`${Math.round(demand.estimated_annual_heat_demand_kwh).toLocaleString("en-GB")} kWh`}
          label="Annual"
        />
        <Stat value={`${lo}–${hi} kW`} label="Capacity range" />
        <Stat
          value={`${demand.assumed_specific_heat_loss_w_per_sq_m} W/m²`}
          label="Heat-loss basis"
        />
      </div>
      <p className="mt-3 text-[11px] italic leading-relaxed text-slate-500">
        {demand.caveat}
      </p>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p
        className="font-display text-2xl text-navy"
        style={{
          fontFeatureSettings: '"lnum", "tnum"',
          fontVariationSettings: '"opsz" 110',
        }}
      >
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

// ─── Favour + Watch dual cards ──────────────────────────────────────────
//
// Two side-by-side columns. Left: positive factors with checkmarks on
// a pale-sage swatch. Right: risk / unknown factors with the factor as
// a heading and the impact as a one-line subtitle. Dashed separators
// between watch items keep the column scannable without competing
// with the favour card's flat list.

function FavourWatchCards({
  favour,
  watch,
}: {
  favour: string[];
  watch: { factor: string; impact: string }[];
}) {
  if (favour.length === 0 && watch.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-[var(--border)] p-6 md:border-b-0 md:border-r md:p-7">
          <div className="mb-4 flex items-center gap-3">
            <h3
              className="m-0 font-display text-xl text-navy"
              style={{ fontVariationSettings: '"opsz" 110' }}
            >
              What works in your favour
            </h3>
            <span className="rounded-full bg-coral-pale px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-coral-dark">
              +{favour.length}
            </span>
          </div>
          {favour.length > 0 ? (
            <ul className="space-y-3">
              {favour.map((f, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[22px_1fr] items-start gap-3 text-[14.5px] leading-relaxed text-navy"
                >
                  <span
                    className="mt-[2px] inline-flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-coral-pale text-coral-dark"
                    aria-hidden
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 6.5l2.4 2.4L9.5 3.5" />
                    </svg>
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Nothing obvious from the floorplan alone — your installer will pick
              up positives on the site visit.
            </p>
          )}
        </div>

        <div className="p-6 md:p-7">
          <div className="mb-4 flex items-center gap-3">
            <h3
              className="m-0 font-display text-xl text-navy"
              style={{ fontVariationSettings: '"opsz" 110' }}
            >
              Worth a closer look
            </h3>
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{
                background: "var(--terracotta-pale, #F9E7D6)",
                color: "#8A6612",
              }}
            >
              {watch.length} flag{watch.length === 1 ? "" : "s"}
            </span>
          </div>
          {watch.length > 0 ? (
            <ul className="divide-y divide-dashed divide-[var(--border)]">
              {watch.map((w, i) => (
                <li key={i} className="py-3 first:pt-0 last:pb-0">
                  <h4 className="m-0 text-sm font-semibold leading-snug text-navy">
                    {w.factor}
                  </h4>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">
                    {w.impact}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No outstanding risks flagged.</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Outdoor unit placement ─────────────────────────────────────────────
//
// Text on the left, stylised plot diagram on the right. The diagram
// is a deliberately abstract illustration — rectangle plot, rounded
// rectangle house, marker dot at the recommended position — not a
// scale drawing. We have no v2 geometry to plot; the dot is fixed at
// the side/rear position that the model overwhelmingly recommends.
// Installer view adds the footprint dimensions + alternatives list.

function UnitPlacementCard({
  recommended,
  footprint,
  alternatives,
  frontElevationNote,
  audience,
}: {
  recommended: string;
  footprint: string;
  alternatives: string[];
  frontElevationNote: string;
  audience: "homeowner" | "installer";
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
        <div className="p-6 md:p-7">
          <div className="mb-2 flex items-center gap-2 text-coral">
            <Compass className="h-4 w-4" />
            <p className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Outdoor unit
            </p>
          </div>
          <h3
            className="mb-2 font-display text-xl text-navy"
            style={{ fontVariationSettings: '"opsz" 110' }}
          >
            Where it&rsquo;d live
          </h3>
          <p className="text-[14.5px] leading-relaxed text-slate-700">
            <strong className="font-semibold text-coral-dark">{recommended}</strong>
          </p>
          {audience === "installer" && (
            <div className="mt-4 space-y-2 border-t border-dashed border-[var(--border)] pt-4 text-xs text-slate-600">
              <p>
                <span className="font-mono uppercase tracking-[0.1em] text-slate-500">
                  Footprint:
                </span>{" "}
                {footprint}
              </p>
              {alternatives.length > 0 && (
                <p>
                  <span className="font-mono uppercase tracking-[0.1em] text-slate-500">
                    Alternatives:
                  </span>{" "}
                  {alternatives.join(" · ")}
                </p>
              )}
              <p className="italic text-slate-500">{frontElevationNote}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center bg-cream-deep p-5">
          <SitePlanIllustration />
        </div>
      </div>
    </section>
  );
}

function SitePlanIllustration() {
  return (
    <svg
      viewBox="0 0 240 180"
      className="h-auto w-full max-w-[320px]"
      aria-hidden
    >
      <defs>
        <pattern
          id="hpGrassPattern"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <rect width="6" height="6" fill="var(--coral-pale)" />
          <circle cx="3" cy="3" r="0.6" fill="var(--sage)" />
        </pattern>
      </defs>
      {/* plot */}
      <rect
        x="6"
        y="6"
        width="228"
        height="168"
        rx="10"
        fill="url(#hpGrassPattern)"
        stroke="var(--sage)"
        strokeWidth="1"
      />
      {/* house */}
      <rect
        x="38"
        y="44"
        width="120"
        height="92"
        rx="3"
        fill="#FBF7EE"
        stroke="var(--coral-dark)"
        strokeWidth="1.4"
      />
      <line
        x1="98"
        y1="44"
        x2="98"
        y2="136"
        stroke="var(--coral-dark)"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.5"
      />
      <line
        x1="38"
        y1="90"
        x2="158"
        y2="90"
        stroke="var(--coral-dark)"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.5"
      />
      <text
        x="98"
        y="34"
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="8"
        letterSpacing="1.2"
        fill="var(--muted-foreground)"
      >
        HOUSE
      </text>
      {/* unit marker */}
      <circle cx="178" cy="120" r="14" fill="var(--coral-dark)" opacity="0.10" />
      <circle cx="178" cy="120" r="8" fill="var(--coral-dark)" />
      <circle cx="178" cy="120" r="3.2" fill="#FBF7EE" />
      <circle
        cx="178"
        cy="120"
        r="16"
        fill="none"
        stroke="var(--coral-dark)"
        strokeWidth="0.8"
        strokeDasharray="2 3"
        opacity="0.5"
      />
      <line
        x1="178"
        y1="120"
        x2="206"
        y2="148"
        stroke="var(--coral-dark)"
        strokeWidth="1"
      />
      <text
        x="232"
        y="152"
        textAnchor="end"
        fontFamily="ui-monospace, monospace"
        fontSize="7.5"
        fontWeight="500"
        letterSpacing="0.6"
        fill="var(--coral-dark)"
      >
        RECOMMENDED
      </text>
      <text
        x="232"
        y="162"
        textAnchor="end"
        fontFamily="ui-monospace, monospace"
        fontSize="7.5"
        fontWeight="500"
        letterSpacing="0.6"
        fill="var(--coral-dark)"
      >
        UNIT POSITION
      </text>
    </svg>
  );
}

// ─── Handoff strip (homeowner-only) ─────────────────────────────────────
//
// One-line reassurance that the engineer-grade detail (sizing,
// radiators, planning) lives in the installer's brief — homeowners
// don't need to digest peak-kW numbers, but they do need to know the
// numbers exist and will reach their installer.

function HandoffStrip() {
  return (
    <section className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coral-pale text-coral-dark">
        <FileText className="h-4 w-4" />
      </span>
      <p className="text-[13.5px] leading-relaxed text-slate-700">
        <strong className="font-semibold text-navy">
          The full engineer&rsquo;s brief
        </strong>{" "}
        — peak heat demand, recommended pump capacity, radiator sizing, siting
        footprint and planning notes — goes to whichever installer you pick.
        They&rsquo;ll confirm everything on the site visit.
      </p>
    </section>
  );
}

// ─── Next steps ─────────────────────────────────────────────────────────

function NextStepsCard({ steps }: { steps: string[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-4 px-6 pt-6 md:px-8 md:pt-7">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-coral-pale text-coral">
            <Lightbulb className="h-4 w-4" />
          </span>
          <h3
            className="m-0 font-display text-xl text-navy md:text-2xl"
            style={{ fontVariationSettings: '"opsz" 110' }}
          >
            Recommended next steps
          </h3>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          {steps.length} action{steps.length === 1 ? "" : "s"}
        </span>
      </header>
      <ol className="m-0 list-none px-4 pb-5 pt-3 md:px-6 md:pb-6">
        {steps.map((s, i) => (
          <li
            key={i}
            className="grid grid-cols-[44px_1fr] items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-cream-deep md:gap-4"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(44,94,74,0.18)] bg-coral-pale font-display text-base font-normal text-coral-dark">
              {i + 1}
            </span>
            <p className="m-0 text-[14.5px] leading-snug text-navy">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Caveats ────────────────────────────────────────────────────────────
//
// Native <details> for the disclosure pattern — accessible by default,
// no JS needed. Dashed border to read as "supporting context, not
// primary content". Rotating + toggle via CSS sibling state ([open]).

function CaveatsCard({ notes }: { notes: string[] }) {
  return (
    <details className="group rounded-xl border border-dashed border-[var(--card-edge-hi,rgba(40,45,38,0.18))] px-5 py-4 open:bg-cream/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-600 [&::-webkit-details-marker]:hidden">
        <span>Caveats &amp; inferences · how this was put together</span>
        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 border-t border-[var(--border)] pt-3 text-[12.5px] leading-relaxed text-slate-600">
        <ul className="space-y-1.5">
          {notes.map((n, i) => (
            <li key={i}>· {n}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────
//
// `confidence` arrives as free text ("Medium — depends on site
// verification …"). Parse the first word for the 3-bar viz; fall back
// to medium when the leading word isn't recognisable. Strict on
// match — we'd rather show medium than mis-classify a long sentence.

function parseConfidenceTier(raw: string): 1 | 2 | 3 {
  const first = raw.trim().toLowerCase().match(/^(high|medium|low)/);
  if (!first) return 2;
  if (first[1] === "high") return 3;
  if (first[1] === "low") return 1;
  return 2;
}

function confidenceLabelFromTier(t: 1 | 2 | 3): string {
  return t === 3 ? "High" : t === 2 ? "Medium" : "Low";
}

// Score → headline adjective + verdict line. Tuned for the band of
// scores we actually see in production (most properties land 5-8;
// outliers either side are rarer). Adjectives stay neutral-positive
// at score 7 (don't oversell) and only become enthusiastic at 9-10.

function scoreToAdjective(score: number): string {
  if (score >= 9) return "standout";
  if (score >= 7) return "strong";
  if (score >= 5) return "promising";
  if (score >= 3) return "workable";
  return "tough";
}

function scoreToLabel(score: number): string {
  if (score >= 7) return "Recommend\nproceeding";
  if (score >= 5) return "Worth\npursuing";
  if (score >= 3) return "Possible,\nwith work";
  return "Significant\nbarriers";
}
