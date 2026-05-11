// Site Visit Prep — installer-facing section driven by the v2
// upload-only flow's FloorplanExtract. Renders only when the
// installer_lead carries a floorplan_upload_id (otherwise the brief
// falls back to the legacy EPC + manual-floorplan sections).
//
// Spec sections (3.1 At-a-glance, 3.2 Siting plan, 3.3 Pre-survey
// checklist, 3.4 Room-by-room reference, 3.5 Print/export) — laid
// out in that order. Print/export uses native browser print + a
// print-friendly CSS pass; no separate PDF dep in v1.

import {
  AlertTriangle,
  Compass,
  Flame,
  Home,
  Layers,
  ListChecks,
  MapPin,
  PoundSterling,
  TreePine,
  Wand2,
} from "lucide-react";
import type {
  FloorplanExtract,
  RiskFactor,
} from "@/lib/schemas/floorplan-extract";
import { PrintButton } from "./print-button";

interface Props {
  extract: FloorplanExtract;
}

export function SiteVisitPrep({ extract }: Props) {
  const hp = extract.heat_pump_eligibility;
  return (
    <section className="rounded-2xl border border-coral/30 bg-white p-5 sm:p-6 print:border-0 print:p-0 print:break-inside-avoid">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-coral mb-1">
            v2 floorplan extract
          </p>
          <h2 className="text-xl font-bold text-navy leading-tight inline-flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-coral" />
            Site Visit Prep
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Generated from the homeowner&rsquo;s uploaded floorplan. Numbers
            are pre-survey indicative — always verify on site.
          </p>
        </div>
        <PrintButton>Print / save PDF</PrintButton>
      </div>

      <AtAGlance extract={extract} />
      <SitingPlan extract={extract} />
      <PreSurveyChecklist factors={hp.risk_factors_and_unknowns} />
      <RoomByRoom extract={extract} />
    </section>
  );
}

// ─── 3.1 At-a-glance ───────────────────────────────────────────────────

function AtAGlance({ extract }: { extract: FloorplanExtract }) {
  const hp = extract.heat_pump_eligibility;
  const score = hp.indicative_eligibility_score.score_out_of_10;
  const tone =
    score >= 7 ? "emerald" : score >= 4 ? "amber" : "rose";
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : tone === "amber"
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-rose-50 border-rose-200 text-rose-900";

  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
        At a glance
      </h3>
      <div className={`rounded-xl border p-4 mb-3 ${toneCls}`}>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-4xl font-bold leading-none tabular-nums">
              {score}
              <span className="text-lg font-medium opacity-60">/10</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider mt-1 opacity-80">
              Eligibility
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{hp.overall_assessment}</p>
          </div>
        </div>
      </div>

      {/* Score breakdown — parse the rationale prose into a table.
          The model emits the rationale as a single string with
          comma-separated adjustments ("Base score 5. +1 for outdoor
          space. +1 for mid-terrace..."). A table reads better at a
          glance than a wall of text. */}
      <ScoreBreakdown
        rationale={hp.indicative_eligibility_score.rationale}
        total={score}
      />


      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile
          icon={<Flame className="w-3.5 h-3.5" />}
          label="Peak heat demand"
          value={`${hp.heat_demand_estimate.estimated_peak_heat_demand_kw.toFixed(1)} kW`}
        />
        <Tile
          icon={<Wand2 className="w-3.5 h-3.5" />}
          label="HP capacity"
          value={`${hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[0]}–${hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[1]} kW`}
        />
        <Tile
          icon={<Layers className="w-3.5 h-3.5" />}
          label="Annual demand"
          value={`${(hp.heat_demand_estimate.estimated_annual_heat_demand_kwh / 1000).toFixed(1)}k kWh`}
        />
        <Tile
          icon={<Home className="w-3.5 h-3.5" />}
          label="Property"
          value={`${extract.property.gross_internal_area.sq_m.toFixed(0)} m²`}
          sub={`${extract.property.total_floors} floor${extract.property.total_floors === 1 ? "" : "s"} · ${extract.property.property_type}`}
        />
      </div>

      {/* Mandatory caveat — must surface anywhere we render the
          peak/capacity/annual numbers. */}
      <p className="mt-3 text-[11px] text-slate-500 italic leading-relaxed">
        {hp.heat_demand_estimate.caveat}
      </p>

      {/* Grant context — small, but worth surfacing because the
          installer's job is to design the system that qualifies. */}
      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-coral-pale text-coral-dark">
        <PoundSterling className="w-3 h-3" />
        {hp.scheme_context.applicable_grant} · £
        {hp.scheme_context.grant_value_gbp.toLocaleString("en-GB")}
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1 mb-1.5">
        {icon}
        {label}
      </p>
      <p className="text-base font-bold text-navy leading-tight">{value}</p>
      {sub && (
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{sub}</p>
      )}
    </div>
  );
}

// ─── 3.2 Siting plan ───────────────────────────────────────────────────

function SitingPlan({ extract }: { extract: FloorplanExtract }) {
  const s = extract.heat_pump_eligibility.external_unit_siting;
  // Conservation / boundary risks get pulled out as amber callouts so
  // they don't drown in the generic risk list further down.
  const sensitive = extract.heat_pump_eligibility.risk_factors_and_unknowns.filter(
    (r) =>
      /conservation|article 4|listed|boundary|setback|neighbour/i.test(
        r.factor + " " + r.impact,
      ),
  );

  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 inline-flex items-center gap-1.5">
        <Compass className="w-3.5 h-3.5" />
        Siting plan
      </h3>
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
            Recommended location
          </p>
          <p className="text-sm font-semibold text-navy leading-relaxed">
            {s.recommended_location}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              Footprint required
            </p>
            <p>{s.approximate_footprint_required_m}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              Front siting
            </p>
            <p className="leading-relaxed">{s.front_elevation_siting}</p>
          </div>
        </div>
        {s.alternative_locations.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Alternatives
            </p>
            <ul className="text-sm text-slate-700 space-y-0.5">
              {s.alternative_locations.map((alt, i) => (
                <li key={i} className="leading-relaxed">
                  · {alt}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {sensitive.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 print:break-inside-avoid">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-2 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Sensitive context — verify before quoting
          </p>
          <ul className="text-sm text-amber-900 space-y-1.5">
            {sensitive.map((r, i) => (
              <li key={i} className="leading-relaxed">
                <span className="font-semibold">{r.factor}</span>: {r.impact}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── 3.3 Pre-survey checklist ──────────────────────────────────────────

function PreSurveyChecklist({ factors }: { factors: RiskFactor[] }) {
  // Items that can't be confirmed from the floorplan alone become
  // checklist entries the installer ticks off on site. Items where
  // the floorplan IS definitive (true) skip the checklist — no need
  // to walk a floorplan-determinable risk.
  const items = factors.filter(
    (r) => r.determinable_from_floorplan !== true,
  );
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 inline-flex items-center gap-1.5">
        <ListChecks className="w-3.5 h-3.5" />
        Pre-survey checklist (verify on site)
      </h3>
      <ul className="space-y-2 print:break-inside-avoid">
        {items.map((r, i) => {
          const partial = r.determinable_from_floorplan === "Partial";
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              {/* Native checkbox so the installer can tick on screen
                  before printing. Unchecked by default; print CSS keeps
                  the box visible so the printed copy is also useful. */}
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-coral focus:ring-coral shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy leading-snug">
                  {r.factor}
                  {partial && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider align-middle">
                      Partial signal
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {r.impact}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── 3.4 Room-by-room reference ────────────────────────────────────────

function RoomByRoom({ extract }: { extract: FloorplanExtract }) {
  return (
    <div className="mb-2 print:break-before-page">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 inline-flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5" />
        Room-by-room reference
      </h3>
      <div className="space-y-4">
        {extract.floors.map((f, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4 print:break-inside-avoid"
          >
            <div className="flex items-baseline justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <p className="text-sm font-bold text-navy">
                {f.level} floor
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {f.gross_internal_area.sq_m.toFixed(1)} m²
              </p>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {f.layout_description}
            </p>
            {f.rooms.length > 0 && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="text-left py-2 pr-3">Room</th>
                    <th className="text-left py-2 pr-3 hidden sm:table-cell">
                      Location
                    </th>
                    <th className="text-left py-2">Features / cylinder candidate?</th>
                  </tr>
                </thead>
                <tbody>
                  {f.rooms.map((r, j) => {
                    // Highlight rooms that look like potential cylinder
                    // homes — installer needs to know on first scan.
                    const cylinderCandidate =
                      /airing|cupboard|utility|small bedroom|storage/i.test(
                        r.name + " " + r.features.join(" "),
                      );
                    return (
                      <tr
                        key={j}
                        className={`border-t border-slate-100 align-top ${
                          cylinderCandidate ? "bg-coral-pale/30" : ""
                        }`}
                      >
                        <td className="py-2 pr-3 font-medium text-navy">
                          {r.name}
                          {cylinderCandidate && (
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-coral-dark mt-0.5">
                              ⚑ cylinder candidate
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-slate-600 hidden sm:table-cell">
                          {r.location || "—"}
                        </td>
                        <td className="py-2 text-slate-700 leading-relaxed">
                          {r.features.length > 0 ? r.features.join(" · ") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {f.external.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  External
                </p>
                <ul className="text-sm text-slate-700 space-y-1">
                  {f.external.map((e, k) => (
                    <li key={k} className="flex items-start gap-2">
                      <TreePine className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-semibold">{e.name}</span>
                        {e.features.length > 0 &&
                          ` — ${e.features.join(", ")}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 3.5 Print/export — handled by the shared PrintButton component
// imported above + the print: Tailwind classes scattered through the
// other sections. No separate PDF dependency in v1.

// ─── Score breakdown table ─────────────────────────────────────────────
//
// The model returns the eligibility-score rationale as a single
// prose string with adjustments expressed inline:
//
//   "Base score 5. +1 for private outdoor space (rear garden
//    confirmed). +1 for mid-terrace configuration (reduced heat
//    loss). -1 for no obvious dedicated cylinder location. Total: 8/10."
//
// For installer triage that's a wall of text. We split on sentence
// boundaries and pull out the sign + magnitude with a regex, then
// render a table with a running total in the rightmost column.
//
// Defensive parsing — if the prose doesn't match the expected shape
// we fall back to rendering the original text below the table.

function ScoreBreakdown({
  rationale,
  total,
}: {
  rationale: string;
  total: number;
}) {
  const lines = parseRationale(rationale);
  // If we couldn't extract any adjustments, render the prose as-is.
  if (lines.length === 0) {
    return (
      <p className="text-xs text-slate-600 italic leading-relaxed mb-3">
        {rationale}
      </p>
    );
  }

  // Running total + check that our parsing matches the model's total.
  let running = 0;
  const rows = lines.map((line) => {
    running += line.delta;
    return { ...line, running };
  });
  const parseMatches = running === total;

  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="text-left px-3 py-2">Factor</th>
            <th className="text-center px-3 py-2 w-16">Δ</th>
            <th className="text-right px-3 py-2 w-16">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t border-slate-100 align-top"
            >
              <td className="px-3 py-2 text-navy leading-relaxed">
                {r.factor}
              </td>
              <td className="px-3 py-2 text-center tabular-nums font-semibold">
                <span
                  className={
                    r.delta > 0
                      ? "text-emerald-700"
                      : r.delta < 0
                        ? "text-rose-700"
                        : "text-slate-500"
                  }
                >
                  {r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? "—" : r.delta}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                {r.running}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 bg-slate-50/50">
            <td className="px-3 py-2.5 font-bold text-navy">Total</td>
            <td className="px-3 py-2.5" />
            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-navy">
              {total}/10
            </td>
          </tr>
        </tbody>
      </table>
      {!parseMatches && (
        // Rare — our parsed running total didn't match the model's
        // declared total. Surface a small disclaimer rather than
        // silently misrepresent the math.
        <p className="px-3 py-2 text-[10px] text-amber-700 bg-amber-50 border-t border-amber-100">
          Parsed adjustments sum to {running}, model declared {total}. Some
          nuance may be in the original rationale.
        </p>
      )}
    </div>
  );
}

interface ParsedRationale {
  factor: string;
  delta: number;
}

function parseRationale(rationale: string): ParsedRationale[] {
  // Match sentences. Each line ends with a period, sometimes an
  // exclamation/question mark. Split, trim, drop empties.
  const segments = rationale
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const out: ParsedRationale[] = [];
  for (const seg of segments) {
    // Skip "Total: X/10" closing summary — surface as the table's
    // total row instead.
    if (/^total\s*[:=]/i.test(seg)) continue;

    // "Base score 5" / "Base 5"
    const baseMatch = seg.match(/^base(?:\s+score)?\s+(\d+)/i);
    if (baseMatch) {
      out.push({
        factor: "Base score",
        delta: Number.parseInt(baseMatch[1], 10),
      });
      continue;
    }

    // "+1 for outdoor space..." / "-2 for conservation area..."
    const deltaMatch = seg.match(/^([+-]?\d+)\s+(?:for\s+)?(.+?)\.?$/);
    if (deltaMatch) {
      const delta = Number.parseInt(deltaMatch[1], 10);
      const factor = deltaMatch[2].replace(/^for\s+/, "").trim();
      if (Number.isFinite(delta) && factor.length > 0) {
        out.push({ factor, delta });
        continue;
      }
    }

    // Sometimes the rationale starts with a verb: "No deduction for
    // conservation area..." → treat as 0 delta with factor copy.
    const noDeductMatch = seg.match(/^no\s+deduction\s+(?:for\s+)?(.+?)\.?$/i);
    if (noDeductMatch) {
      out.push({ factor: noDeductMatch[1], delta: 0 });
    }
  }
  return out;
}
