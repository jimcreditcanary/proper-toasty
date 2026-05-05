// /admin/reports/[id] — read-only drilldown for a single check.
//
// Operational view, not a re-render of the homeowner report. We
// surface what a support agent actually needs:
//   - Who the user is (email + role)
//   - What the property is (address / UPRN / coords)
//   - What state the wizard reached (status + timeline)
//   - The eligibility + finance summary (decoded from check_results)
//   - The raw provider blobs (EPC / Solar / floorplan analysis) inside
//     collapsibles so the page isn't a wall of JSON
//
// The full pixel-fidelity report uses the wizard context (client) and
// rebuilding that from a saved check is a separate job — punt to v2
// if support actually needs it. The structured view + raw JSON cover
// every debugging case I can think of.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  User as UserIcon,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type CheckRow = Database["public"]["Tables"]["checks"]["Row"];
type CheckResultsRow = Database["public"]["Tables"]["check_results"]["Row"];
type Status = CheckRow["status"];

interface PageProps {
  params: Promise<{ id: string }>;
}

interface LoadedReport {
  check: CheckRow;
  results: CheckResultsRow | null;
  user: { id: string; email: string | null; role: string | null } | null;
  floorplanSignedUrl: string | null;
}

async function loadReport(id: string): Promise<LoadedReport | null> {
  const admin = createAdminClient();

  // Accept either a full uuid or a 6-char short_id. Pick the lookup
  // column based on length — uuids are 36 chars with dashes.
  const isUuid = id.length >= 32 && id.includes("-");

  const { data: check, error } = await admin
    .from("checks")
    .select("*")
    .eq(isUuid ? "id" : "short_id", isUuid ? id : id.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error("[admin/reports/:id] check query failed", error);
  }
  if (!check) return null;

  // Fan out for the rest. All admin-client so RLS doesn't block.
  const [resultsRes, userRes, signedUrl] = await Promise.all([
    admin.from("check_results").select("*").eq("check_id", check.id).maybeSingle(),
    // user_id is nullable now (anonymous guest checks per migration 055)
    // — only run the user lookup when we have one.
    check.user_id
      ? admin
          .from("users")
          .select("id, email, role")
          .eq("id", check.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    check.floorplan_object_key
      ? admin.storage
          .from("floorplans")
          .createSignedUrl(check.floorplan_object_key, 60 * 10)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
  ]);

  return {
    check: check as CheckRow,
    results: (resultsRes.data ?? null) as CheckResultsRow | null,
    user: (userRes.data ?? null) as LoadedReport["user"],
    floorplanSignedUrl: signedUrl,
  };
}

export default async function ReportDrilldownPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadReport(id);
  if (!data) notFound();
  const { check, results, user, floorplanSignedUrl } = data;

  return (
    <PortalShell
      portalName="Admin"
      pageTitle={`Report ${check.short_id}`}
      pageSubtitle={check.address_formatted ?? check.postcode ?? "(no address)"}
    >
      <div className="mb-4">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-coral"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all reports
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ─── Status + timeline ─────────────────────────────────── */}
        <Card title="Status" className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={check.status} />
            <span className="text-xs text-slate-500">
              {check.credits_spent} credit{check.credits_spent === 1 ? "" : "s"} spent
            </span>
          </div>
          <Timeline check={check} />
        </Card>

        {/* ─── User ───────────────────────────────────────────────── */}
        <Card title="Customer" className="lg:col-span-1">
          {user ? (
            <>
              <div className="flex items-start gap-2">
                <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy truncate">
                    {user.email ?? "(no email)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Role: {user.role ?? "user"}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <Link
                  href={`/admin/reports?q=${encodeURIComponent(user.email ?? "")}`}
                  className="text-xs text-coral hover:underline"
                >
                  See all reports for this user →
                </Link>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">User profile not found</p>
          )}
        </Card>

        {/* ─── Property ───────────────────────────────────────────── */}
        <Card title="Property" className="lg:col-span-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-navy break-words">
                {check.address_formatted ?? "(no address)"}
              </p>
              <dl className="mt-2 text-xs text-slate-500 space-y-1">
                {check.postcode && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">Postcode</dt>
                    <dd className="font-mono text-slate-700">{check.postcode}</dd>
                  </div>
                )}
                {check.uprn && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">UPRN</dt>
                    <dd className="font-mono text-slate-700">{check.uprn}</dd>
                  </div>
                )}
                {check.country && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">Country</dt>
                    <dd className="text-slate-700">{check.country}</dd>
                  </div>
                )}
                {check.latitude != null && check.longitude != null && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">Coords</dt>
                    <dd className="font-mono text-slate-700">
                      {check.latitude.toFixed(5)}, {check.longitude.toFixed(5)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Wizard context ───────────────────────────────────────── */}
      <Card title="Wizard context" className="mt-4">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Field label="Tenure" value={check.tenure} />
          <Field label="Heating fuel" value={check.current_heating_fuel} />
          <Field label="Hot water tank" value={check.hot_water_tank_present} />
          <Field label="Outdoor space" value={check.outdoor_space_for_ashp} />
          <Field label="Hybrid pref" value={check.hybrid_preference} />
          <Field
            label="Floorplan"
            value={check.floorplan_object_key ? "uploaded" : "—"}
          />
        </dl>
      </Card>

      {/* ─── Floorplan ────────────────────────────────────────────── */}
      {floorplanSignedUrl && (
        <Card title="Floorplan" className="mt-4">
          <p className="text-xs text-slate-500 mb-3">
            Signed URL valid for 10 minutes.{" "}
            <ImageIcon className="inline w-3 h-3 align-[-2px]" />
          </p>
          {/* Native img — Next/Image needs a domain allowlist for
              Supabase signed URLs and we only show this rarely. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={floorplanSignedUrl}
            alt="Uploaded floorplan"
            className="max-w-full max-h-[60vh] rounded-lg border border-slate-200"
          />
          <p className="mt-2">
            <a
              href={floorplanSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-coral hover:underline"
            >
              Open in new tab
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </Card>
      )}

      {/* ─── Result summary ───────────────────────────────────────── */}
      {results ? (
        <>
          <Card title="Eligibility (decoded)" className="mt-4">
            <JsonBlock value={results.eligibility} />
          </Card>
          <Card title="Finance (decoded)" className="mt-4">
            <JsonBlock value={results.finance} />
          </Card>

          {/* Raw provider blobs — collapsed by default. */}
          <RawBlock title="EPC raw" value={results.epc_raw} />
          <RawBlock title="EPC recommendations" value={results.epc_recommendations_raw} />
          <RawBlock title="Solar (Google)" value={results.solar_raw} />
          <RawBlock title="PVGIS" value={results.pvgis_raw} />
          <RawBlock title="Flood" value={results.flood_raw} />
          <RawBlock title="Listed building" value={results.listed_raw} />
          <RawBlock title="Planning" value={results.planning_raw} />
          <RawBlock title="Floorplan analysis (Claude)" value={results.floorplan_analysis} />
        </>
      ) : (
        <Card title="Results" className="mt-4">
          <p className="text-sm text-slate-500">
            No results row yet — the analysis stage hasn&rsquo;t run for this check.
          </p>
        </Card>
      )}
    </PortalShell>
  );
}

// ─── Components ────────────────────────────────────────────────────

function Card({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl bg-white border border-slate-200 p-4 ${className}`}
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-navy mt-0.5">
        {value ?? <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const cfg =
    status === "complete"
      ? { Icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-800", label: "Complete" }
      : status === "running"
        ? { Icon: Clock, cls: "bg-amber-100 text-amber-800", label: "Running" }
        : status === "failed"
          ? { Icon: AlertTriangle, cls: "bg-rose-100 text-rose-800", label: "Failed" }
          : { Icon: XCircle, cls: "bg-slate-100 text-slate-600", label: "Draft" };
  const { Icon, cls, label } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function Timeline({ check }: { check: CheckRow }) {
  const events: { label: string; iso: string | null }[] = [
    { label: "Created", iso: check.created_at },
    { label: "Floorplan uploaded", iso: check.floorplan_uploaded_at },
    { label: "Last updated", iso: check.updated_at },
  ];
  return (
    <ul className="space-y-2 text-xs">
      {events.map((e) => (
        <li key={e.label} className="flex justify-between gap-2">
          <span className="text-slate-500">{e.label}</span>
          <span className="text-slate-700 font-mono">
            {e.iso ? formatDateTime(e.iso) : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
    return <p className="text-xs text-slate-400">No data</p>;
  }
  return (
    <pre className="text-[11px] leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function RawBlock({ title, value }: { title: string; value: unknown }) {
  if (!value) return null;
  return (
    <details className="mt-3 rounded-xl bg-white border border-slate-200">
      <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-700 hover:text-coral">
        {title}
      </summary>
      <div className="px-4 pb-4">
        <JsonBlock value={value} />
      </div>
    </details>
  );
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
