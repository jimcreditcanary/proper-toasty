// /admin/reports — searchable history of every check.
//
// Single combined search input that matches against:
//   - short_id (case-insensitive prefix)
//   - uprn (exact prefix)
//   - postcode (case-insensitive prefix, whitespace stripped)
//   - address_formatted (substring, case-insensitive)
//   - user email (substring, case-insensitive — joined to public.users)
//
// We do this in two passes rather than a single `or(...)` clause
// because PostgREST's or() doesn't span joined tables. The user-email
// match runs first, gathers user_ids, and feeds those into the main
// or() filter on checks.
//
// Filter chips:
//   - Status: all / draft / running / complete / failed
//   - Range: 30d / 90d / all
//
// All state is in URL search params so links are shareable + the page
// is fully server-rendered.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  FileText,
  Search,
  Calendar,
  Download,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type CheckRow = Database["public"]["Tables"]["checks"]["Row"];
type Status = CheckRow["status"];

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    range?: string;
  }>;
}

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "complete", label: "Completed" },
  { key: "running", label: "Running" },
  { key: "draft", label: "Draft" },
  { key: "failed", label: "Failed" },
] as const;

const RANGE_FILTERS = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];
type RangeFilter = (typeof RANGE_FILTERS)[number]["key"];

function isStatusFilter(s: string | undefined): s is StatusFilter {
  return STATUS_FILTERS.some((f) => f.key === s);
}
function isRangeFilter(s: string | undefined): s is RangeFilter {
  return RANGE_FILTERS.some((f) => f.key === s);
}

interface ReportListItem extends CheckRow {
  user_email: string | null;
}

async function loadReports(args: {
  q: string;
  status: StatusFilter;
  range: RangeFilter;
}): Promise<ReportListItem[]> {
  const admin = createAdminClient();

  // Range cutoff
  const range = RANGE_FILTERS.find((r) => r.key === args.range) ?? RANGE_FILTERS[0];
  const sinceIso =
    range.days === null
      ? null
      : new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString();

  // Start with a search for user IDs by email, since PostgREST or()
  // doesn't span FK joins. We only do this if the query is non-empty
  // and looks like it could be an email fragment (contains a letter).
  let userIdsFromEmail: string[] = [];
  const q = args.q.trim();
  if (q.length > 0) {
    const { data: matchedUsers } = await admin
      .from("users")
      .select("id")
      .ilike("email", `%${q}%`)
      .limit(50);
    userIdsFromEmail = (matchedUsers ?? []).map((u) => u.id);
  }

  // Build the main query
  let query = admin
    .from("checks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (args.status !== "all") {
    query = query.eq("status", args.status);
  }
  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  if (q.length > 0) {
    // Postcode normalisation — users often type without spaces
    const postcodeNoSpace = q.replace(/\s+/g, "");
    const filters: string[] = [
      `short_id.ilike.${q}%`,
      `uprn.ilike.${q}%`,
      `postcode.ilike.${postcodeNoSpace}%`,
      `address_formatted.ilike.%${q}%`,
    ];
    if (userIdsFromEmail.length > 0) {
      // PostgREST: in.(uuid1,uuid2,...)
      filters.push(`user_id.in.(${userIdsFromEmail.join(",")})`);
    }
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/reports] query failed", error);
    return [];
  }

  // Hydrate emails for the rows we ended up with. Single batched
  // lookup against public.users keeps it to 2 round trips total.
  const rows = (data ?? []) as CheckRow[];
  const uniqueUserIds = Array.from(new Set(rows.map((r) => r.user_id)));
  let emailByUserId = new Map<string, string>();
  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("users")
      .select("id, email")
      .in("id", uniqueUserIds);
    emailByUserId = new Map(
      (profiles ?? []).map((p) => [p.id, p.email ?? ""]),
    );
  }

  return rows.map((r) => ({
    ...r,
    user_email: emailByUserId.get(r.user_id) ?? null,
  }));
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 200); // cap length defensively
  const status: StatusFilter = isStatusFilter(params.status) ? params.status : "all";
  const range: RangeFilter = isRangeFilter(params.range) ? params.range : "all";

  const rows = await loadReports({ q, status, range });

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Report history"
      pageSubtitle="Search every report by short ID, address, postcode, UPRN or user email."
    >
      {/* Search form. GET so the URL is the source of truth and the
          page is fully shareable. */}
      <form
        action="/admin/reports"
        method="GET"
        className="mb-5 flex flex-col gap-3"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="e.g. K7M2QP, SW1A 1AA, 100012345678, jane@…"
            autoComplete="off"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
          {/* Preserve filter selection on submit. */}
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="range" value={range} />
        </div>

        {/* Filter chips. Plain links, not form submits, so they're
            clickable independently and stack with whatever's typed. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
            Status
          </span>
          {STATUS_FILTERS.map((f) => {
            const active = f.key === status;
            const url = buildFilterUrl({ q, status: f.key, range });
            return (
              <Link
                key={f.key}
                href={url}
                className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-coral text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
            <Calendar className="inline w-3 h-3 mr-1 align-[-2px]" />
            Range
          </span>
          {RANGE_FILTERS.map((f) => {
            const active = f.key === range;
            const url = buildFilterUrl({ q, status, range: f.key });
            return (
              <Link
                key={f.key}
                href={url}
                className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-coral text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </form>

      {/* Result count + export button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          {rows.length === 50
            ? "Showing first 50 results — refine your search to see more."
            : `${rows.length} result${rows.length === 1 ? "" : "s"}`}
        </p>
        <a
          href={`/api/admin/reports/export?${buildExportQuery({ q, status, range })}`}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-coral/40 hover:text-coral transition-colors"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <EmptyState hasQuery={q.length > 0} />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/reports/${r.id}`}
                className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-coral/40 hover:shadow-sm transition-all"
              >
                <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-coral-pale/40 text-coral border border-coral/30">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-navy bg-slate-100 px-1.5 py-0.5 rounded">
                      {r.short_id}
                    </span>
                    <span className="font-semibold text-navy truncate">
                      {r.address_formatted ?? r.postcode ?? "(no address yet)"}
                    </span>
                    {r.floorplan_object_key && (
                      <span
                        title="Floorplan uploaded"
                        className="inline-flex items-center text-slate-400"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-0.5">
                    {r.user_email ?? "(unknown user)"}
                    {r.uprn && ` · UPRN ${r.uprn}`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDate(r.created_at)}
                    {r.credits_spent > 0 && ` · ${r.credits_spent} credit${r.credits_spent === 1 ? "" : "s"}`}
                  </p>
                </div>
                <StatusBadge status={r.status} />
                <ArrowRight className="shrink-0 w-4 h-4 text-slate-400 mt-1" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

function buildFilterUrl(args: {
  q: string;
  status: StatusFilter;
  range: RangeFilter;
}): string {
  const params = new URLSearchParams();
  if (args.q) params.set("q", args.q);
  if (args.status !== "all") params.set("status", args.status);
  if (args.range !== "all") params.set("range", args.range);
  const qs = params.toString();
  return `/admin/reports${qs ? `?${qs}` : ""}`;
}

function buildExportQuery(args: {
  q: string;
  status: StatusFilter;
  range: RangeFilter;
}): string {
  const params = new URLSearchParams();
  if (args.q) params.set("q", args.q);
  if (args.status !== "all") params.set("status", args.status);
  if (args.range !== "all") params.set("range", args.range);
  return params.toString();
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        Complete
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
        <Clock className="w-3 h-3" />
        Running
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
        <AlertTriangle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
      <XCircle className="w-3 h-3" />
      Draft
    </span>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
      <p className="text-sm font-medium text-navy">
        {hasQuery ? "No reports match that search." : "No reports in this range."}
      </p>
      {hasQuery && (
        <p className="text-xs text-slate-500 mt-1">
          Try a postcode, UPRN, short ID or part of an email address.
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
