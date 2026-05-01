// /admin/installer-requests — F3 admin review queue.
//
// Lists all installer signup requests grouped by status. Click into
// a row to review + approve/reject. The middleware + admin layout
// already enforce role=admin, so this is just a server-side query.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type RequestRow = Database["public"]["Tables"]["installer_signup_requests"]["Row"];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

type StatusKey = (typeof STATUS_TABS)[number]["key"];

function isStatus(s: string | undefined): s is StatusKey {
  return s === "pending" || s === "approved" || s === "rejected";
}

async function loadCounts(): Promise<Record<StatusKey, number>> {
  const admin = createAdminClient();
  const counts: Record<StatusKey, number> = { pending: 0, approved: 0, rejected: 0 };
  await Promise.all(
    STATUS_TABS.map(async (t) => {
      const { count } = await admin
        .from("installer_signup_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", t.key);
      counts[t.key] = count ?? 0;
    }),
  );
  return counts;
}

async function loadRequests(status: StatusKey): Promise<RequestRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("installer_signup_requests")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin/installer-requests] query failed", error);
    return [];
  }
  return (data ?? []) as RequestRow[];
}

export default async function InstallerRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status: StatusKey = isStatus(params.status) ? params.status : "pending";

  const [counts, rows] = await Promise.all([loadCounts(), loadRequests(status)]);

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Installer requests"
      pageSubtitle="MCS-certified installers asking to be added to the directory."
    >
      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {STATUS_TABS.map((t) => {
          const active = t.key === status;
          return (
            <Link
              key={t.key}
              href={`/admin/installer-requests?status=${t.key}`}
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-coral text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
              }`}
            >
              {t.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t.key]}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <EmptyState status={status} />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/installer-requests/${r.id}`}
                className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-coral/40 hover:shadow-sm transition-all"
              >
                <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-coral-pale/40 text-coral border border-coral/30">
                  <Building2 className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy truncate">
                    {r.company_name}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {r.contact_name} · {r.contact_email}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDate(r.created_at)}
                    {r.company_number && ` · #${r.company_number}`}
                    {r.certification_pending && " · ⏳ pending cert"}
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

function StatusBadge({ status }: { status: RequestRow["status"] }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
      <XCircle className="w-3 h-3" />
      Rejected
    </span>
  );
}

function EmptyState({ status }: { status: StatusKey }) {
  const copy =
    status === "pending"
      ? "No pending requests. The queue's clear — nice."
      : status === "approved"
        ? "No approved requests yet."
        : "No rejected requests yet.";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-sm text-slate-500">{copy}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
