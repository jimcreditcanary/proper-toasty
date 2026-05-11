// /report/[id] — homeowner-facing v2 report.
//
// Server-rendered. Reads the floorplan_uploads row by id, validates
// the extract JSON one more time on the way in (defensive — the row
// was validated at write-time, but a future schema bump shouldn't
// crash the renderer on legacy rows), and lays out the spec sections
// in order:
//
//   1. Header                — total area, beds, baths, reception, garden
//   2. Floor-by-floor        — area, layout, room list per floor
//   3. Heat pump eligibility — score ring, factors, grant context
//   4. Recommended next steps — checklist
//   5. Notes / caveats       — small print

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  Flame,
  Home,
  Info,
  Layers,
  ListChecks,
  PoundSterling,
  Sparkles,
  TreePine,
  Trees,
  XCircle,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  FloorplanExtractSchema,
  type FloorplanExtract,
  type Floor,
} from "@/lib/schemas/floorplan-extract";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;

  // Cross-role access control: this is the homeowner-facing v2
  // report. Installers must not see it (they have their own dense
  // site-brief at /installer/reports/[leadId]). Admins are allowed
  // through for support. Anonymous viewers (no session) can view
  // by ID — same surface as the legacy /upload journey output.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();
    if (profile?.role === "installer") {
      // Send them somewhere useful rather than 404. /installer/leads
      // is their inbox — they likely clicked through from a stale
      // email or guessed a URL; if it's their lead, they can open it
      // from there and land on the right (installer) report surface.
      redirect("/installer/leads");
    }
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("floorplan_uploads")
    .select(
      "id, status, failure_reason, extract, created_at, image_object_key",
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  if (row.status === "extracting") {
    // Sync upload route shouldn't leave anything in this state on a
    // happy path, but if a route timed out mid-extract we'd land here.
    return (
      <ReportShellChrome>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Sparkles className="w-6 h-6 mx-auto text-amber-700 mb-3" />
          <h1 className="text-xl font-bold text-amber-900">
            Still working on this one…
          </h1>
          <p className="mt-2 text-sm text-amber-800 leading-relaxed max-w-md mx-auto">
            Refresh in a few seconds. If it&rsquo;s still loading after a
            minute, the extraction stalled — drop the file again from{" "}
            <Link href="/upload" className="underline font-semibold">
              the upload page
            </Link>
            .
          </p>
        </div>
      </ReportShellChrome>
    );
  }

  if (row.status === "failed") {
    return (
      <ReportShellChrome>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
          <AlertTriangle className="w-6 h-6 text-rose-700 mb-3" />
          <h1 className="text-xl font-bold text-rose-900">
            We couldn&rsquo;t extract this floorplan
          </h1>
          <p className="mt-2 text-sm text-rose-800 leading-relaxed">
            {row.failure_reason
              ? `Detail: ${row.failure_reason}`
              : "The image was too unclear or the layout was unusual."}
          </p>
          <p className="mt-3 text-sm text-rose-800 leading-relaxed">
            Sharper line-work + readable room labels usually do the
            trick. Mobile-phone photos of paper floorplans often
            don&rsquo;t — try the original PDF brochure if you have
            one (saved as a PNG/JPG).
          </p>
          <Link
            href="/upload"
            className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
          >
            Try another image
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </ReportShellChrome>
    );
  }

  // status === "complete"
  const parse = FloorplanExtractSchema.safeParse(row.extract);
  if (!parse.success) {
    // Should never happen — write path validated. If it does, the
    // schema has drifted; render a hard error rather than a half-
    // empty report.
    console.error("[report/[id]] extract schema mismatch", {
      uploadId: id,
      issues: parse.error.issues.slice(0, 3),
    });
    return (
      <ReportShellChrome>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
          <h1 className="text-lg font-bold text-rose-900">
            Report data couldn&rsquo;t be loaded
          </h1>
          <p className="mt-2 text-sm text-rose-800">
            The schema for this report has drifted. Re-upload the image
            from <Link href="/upload" className="underline font-semibold">/upload</Link>.
          </p>
        </div>
      </ReportShellChrome>
    );
  }

  return (
    <ReportShellChrome>
      <div className="space-y-8">
        <HeaderSection extract={parse.data} />
        <FloorsSection floors={parse.data.floors} />
        <HeatPumpSection extract={parse.data} />
        <NextStepsSection
          steps={parse.data.heat_pump_eligibility.recommended_next_steps}
        />
        <NotesSection notes={parse.data.notes} />
        <FooterCTA />
      </div>
    </ReportShellChrome>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────

function ReportShellChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <MarketingHeader active="home" />
      <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 sm:py-14 flex-1">
        {children}
      </main>
    </div>
  );
}

// ─── 1. Header ────────────────────────────────────────────────────────

function HeaderSection({ extract }: { extract: FloorplanExtract }) {
  const { property, summary } = extract;
  const hasOutdoor =
    summary.outdoor_space.length > 0 &&
    !/^no\b|^none\b/i.test(summary.outdoor_space.trim());

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
        Pre-survey report
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy leading-tight">
        {property.address_label || "Your property"}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-brand)]">
        {property.property_type} · {property.total_floors}{" "}
        floor{property.total_floors === 1 ? "" : "s"}
      </p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <HeaderTile
          icon={<Layers className="w-4 h-4" />}
          label="Total area"
          value={`${property.gross_internal_area.sq_m.toFixed(1)} m²`}
          sub={`${Math.round(property.gross_internal_area.sq_ft).toLocaleString("en-GB")} sq ft`}
        />
        <HeaderTile
          icon={<Home className="w-4 h-4" />}
          label="Bedrooms"
          value={summary.bedrooms_total}
        />
        <HeaderTile
          icon={<Home className="w-4 h-4" />}
          label="Bathrooms"
          value={summary.bathrooms_total}
        />
        <HeaderTile
          icon={<Building2 className="w-4 h-4" />}
          label="Reception"
          value={summary.reception_rooms}
          sub={
            summary.kitchen_diners > 0
              ? `+${summary.kitchen_diners} kitchen-diner${summary.kitchen_diners === 1 ? "" : "s"}`
              : undefined
          }
        />
        <HeaderTile
          icon={hasOutdoor ? <Trees className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          label="Outdoor"
          value={hasOutdoor ? "Yes" : "No"}
          sub={summary.outdoor_space.slice(0, 40)}
          tone={hasOutdoor ? "emerald" : "slate"}
        />
      </div>

      {summary.notable_features.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {summary.notable_features.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-coral-pale text-coral-dark"
            >
              <Sparkles className="w-3 h-3" />
              {f}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function HeaderTile({
  icon,
  label,
  value,
  sub,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "slate" | "emerald";
}) {
  const iconCls =
    tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${iconCls}`}
        >
          {icon}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold text-navy leading-none">{value}</p>
      {sub && (
        <p className="text-[11px] text-slate-500 mt-1.5 leading-snug truncate">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── 2. Floor by floor ────────────────────────────────────────────────

function FloorsSection({ floors }: { floors: Floor[] }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        Floor by floor
      </h2>
      <div className="space-y-4">
        {floors.map((f, i) => (
          <article
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-navy">
                {f.level} floor
              </h3>
              <p className="text-sm text-slate-600 tabular-nums">
                {f.gross_internal_area.sq_m.toFixed(1)} m² ·{" "}
                {Math.round(f.gross_internal_area.sq_ft).toLocaleString("en-GB")} sq ft
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              {f.layout_description}
            </p>

            {f.rooms.length > 0 && (
              <ul className="mt-4 space-y-2">
                {f.rooms.map((r, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md bg-white text-slate-500 border border-slate-200 text-[11px] font-bold">
                      {j + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy">
                        {r.name}
                        {r.location && (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            · {r.location}
                          </span>
                        )}
                      </p>
                      {r.features.length > 0 && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {r.features.join(" · ")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {f.external.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  External
                </p>
                <ul className="space-y-1.5">
                  {f.external.map((e, k) => (
                    <li
                      key={k}
                      className="text-sm text-slate-700 flex items-start gap-2"
                    >
                      <TreePine className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>
                        <span className="font-semibold text-navy">{e.name}</span>
                        {e.features.length > 0 && (
                          <span className="text-slate-600">
                            {" "}— {e.features.join(", ")}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── 3. Heat pump eligibility ─────────────────────────────────────────

function HeatPumpSection({ extract }: { extract: FloorplanExtract }) {
  const hp = extract.heat_pump_eligibility;
  const score = hp.indicative_eligibility_score.score_out_of_10;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Heat pump eligibility
          </h2>
          <p className="text-base text-navy leading-relaxed max-w-xl">
            {hp.overall_assessment}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Confidence: {hp.confidence}
          </p>
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Grant + heat-demand row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
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
            {!hp.scheme_context.ground_source_viable && (
              <>
                {" "}— {hp.scheme_context.ground_source_reason}
              </>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 inline-flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Heat demand estimate
          </p>
          <p className="text-2xl font-bold text-navy">
            {hp.heat_demand_estimate.estimated_peak_heat_demand_kw.toFixed(1)}{" "}
            <span className="text-sm font-medium text-slate-500">kW peak</span>
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            ~{Math.round(
              hp.heat_demand_estimate.estimated_annual_heat_demand_kwh,
            ).toLocaleString("en-GB")}{" "}
            kWh/yr · recommended HP{" "}
            {hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[0]}–
            {hp.heat_demand_estimate.recommended_heat_pump_capacity_kw_range[1]} kW
          </p>
          <p className="mt-2 text-[11px] text-slate-500 italic leading-relaxed">
            {hp.heat_demand_estimate.caveat}
          </p>
        </div>
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
                <li key={i} className="leading-relaxed">
                  · {p}
                </li>
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
                    <span className="block text-xs text-amber-800 mt-0.5">
                      {r.impact}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* External unit siting */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 inline-flex items-center gap-1">
          <Compass className="w-3 h-3" />
          External unit siting
        </p>
        <p className="text-sm text-navy leading-relaxed">
          <span className="font-semibold">Recommended:</span>{" "}
          {hp.external_unit_siting.recommended_location}
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Footprint: {hp.external_unit_siting.approximate_footprint_required_m}
        </p>
        {hp.external_unit_siting.alternative_locations.length > 0 && (
          <p className="mt-1 text-xs text-slate-600">
            Alternatives:{" "}
            {hp.external_unit_siting.alternative_locations.join(" · ")}
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-500 italic">
          {hp.external_unit_siting.front_elevation_siting}
        </p>
      </div>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  // SVG ring — circumference math gives us the dasharray for the
  // progress arc. 10 points = full circle.
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(10, score)) / 10;
  const offset = circumference * (1 - fraction);
  const tone =
    score >= 7 ? "text-emerald-600" : score >= 4 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="relative inline-flex items-center justify-center w-24 h-24 shrink-0">
      <svg className="absolute inset-0" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-slate-100"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className={tone}
        />
      </svg>
      <div className="text-center">
        <p className={`text-2xl font-bold ${tone} leading-none`}>
          {score}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
          /10
        </p>
      </div>
    </div>
  );
}

// ─── 4. Recommended next steps ────────────────────────────────────────

function NextStepsSection({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 inline-flex items-center gap-1.5">
        <ListChecks className="w-3.5 h-3.5" />
        Recommended next steps
      </h2>
      <ol className="space-y-2">
        {steps.map((s, i) => (
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
    </section>
  );
}

// ─── 5. Notes ─────────────────────────────────────────────────────────

function NotesSection({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 inline-flex items-center gap-1.5">
        <Info className="w-3 h-3" />
        Caveats + inferences
      </h3>
      <ul className="space-y-1 text-xs text-slate-500 leading-relaxed">
        {notes.map((n, i) => (
          <li key={i}>· {n}</li>
        ))}
      </ul>
    </section>
  );
}

// ─── Footer CTA ───────────────────────────────────────────────────────

function FooterCTA() {
  return (
    <section className="rounded-2xl border border-coral/20 bg-coral-pale/30 p-5 sm:p-6 text-center">
      <p className="text-sm text-navy">
        Want an MCS-certified installer to walk through this report on
        site?
      </p>
      <Link
        href="/check"
        className="mt-3 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Find local installers
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
