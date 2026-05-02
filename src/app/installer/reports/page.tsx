// /installer/reports — searchable list of every pre-survey report
// this installer has access to.
//
// "Has access to" = the lead has a `installer_report_url` set —
// which is stamped at accept time. So this page is effectively
// "reports for every lead I've accepted, current + historical".
//
// Search: a single text input that runs server-side against
// property_address / property_postcode / contact_name /
// contact_email / contact_phone via Postgres ilike OR. The
// filter URL-shape (`?q=…`) is bookmarkable.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

async function loadInstallerId(): Promise<
  | { ok: true; installerId: number; companyName: string }
  | { ok: false }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/reports");
  }
  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) return { ok: false };
  return {
    ok: true,
    installerId: installer.id,
    companyName: installer.company_name,
  };
}

async function loadReports(
  installerId: number,
  query: string | null,
): Promise<LeadRow[]> {
  const admin = createAdminClient();
  let q = admin
    .from("installer_leads")
    .select("*")
    .eq("installer_id", installerId)
    .not("installer_report_url", "is", null)
    .order("installer_acknowledged_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", { ascending: false })
    .limit(100);

  if (query && query.trim().length > 0) {
    // Single text input matches across the obvious columns. ilike
    // is case-insensitive; we escape % / _ so a stray symbol in the
    // search box doesn't blow up.
    const safe = query.trim().replace(/[%_]/g, (m) => `\\${m}`);
    const wild = `%${safe}%`;
    q = q.or(
      [
        `property_address.ilike.${wild}`,
        `property_postcode.ilike.${wild}`,
        `contact_name.ilike.${wild}`,
        `contact_email.ilike.${wild}`,
        `contact_phone.ilike.${wild}`,
      ].join(","),
    );
  }

  const { data, error } = await q;
  if (error) {
    console.error("[reports] query failed", error);
    return [];
  }
  return (data ?? []) as LeadRow[];
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? null;

  const auth = await loadInstallerId();
  if (!auth.ok) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Reports"
        pageSubtitle="Pre-survey reports for every lead you've accepted."
        backLink={{ href: "/installer", label: "Back to installer portal" }}
      >
        <UnboundState />
      </PortalShell>
    );
  }

  const reports = await loadReports(auth.installerId, query);

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Reports"
      pageSubtitle="Pre-survey reports for every lead you've accepted. Search by address, postcode, name, email or phone."
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {/* Search bar — GET form so filter is bookmarkable. */}
      <form
        method="get"
        action="/installer/reports"
        className="rounded-xl border border-slate-200 bg-white p-3 mb-5 flex items-center gap-2"
      >
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search address, postcode, name, email or phone…"
          className="flex-1 h-10 px-2 rounded-lg bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          autoFocus
        />
        {query && (
          <Link
            href="/installer/reports"
            className="inline-flex items-center justify-center h-9 px-3 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Clear
          </Link>
        )}
        <button
          type="submit"
          className="inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-semibold bg-coral hover:bg-coral-dark text-white transition-colors"
        >
          Search
        </button>
      </form>

      {reports.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <ul className="space-y-3">
          {reports.map((lead) => (
            <li key={lead.id}>
              <ReportCard lead={lead} />
            </li>
          ))}
        </ul>
      )}

      {reports.length === 100 && (
        <p className="text-[11px] text-slate-500 mt-4 text-center leading-relaxed">
          Showing the most recent 100 reports. Refine your search to
          narrow down further.
        </p>
      )}
    </PortalShell>
  );
}

// ─── Card ────────────────────────────────────────────────────────────

function ReportCard({ lead }: { lead: LeadRow }) {
  const wantsParts: string[] = [];
  if (lead.wants_heat_pump) wantsParts.push("Heat pump");
  if (lead.wants_solar) wantsParts.push("Solar PV");
  if (lead.wants_battery) wantsParts.push("Battery");
  const wants = wantsParts.length > 0 ? wantsParts.join(" + ") : "—";

  const accepted = lead.installer_acknowledged_at
    ? formatDate(lead.installer_acknowledged_at)
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-navy leading-tight">
            {lead.property_address ?? lead.property_postcode ?? "Unknown address"}
          </p>
          {lead.property_address && lead.property_postcode && (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {lead.property_postcode}
            </p>
          )}
          <p className="text-xs text-slate-600 mt-1">
            {lead.contact_name ?? "Homeowner"}
            {lead.contact_email && (
              <>
                {" · "}
                <a
                  href={`mailto:${lead.contact_email}`}
                  className="text-coral hover:text-coral-dark underline"
                >
                  {lead.contact_email}
                </a>
              </>
            )}
            {lead.contact_phone && (
              <>
                {" · "}
                <a
                  href={`tel:${lead.contact_phone}`}
                  className="text-coral hover:text-coral-dark underline"
                >
                  {lead.contact_phone}
                </a>
              </>
            )}
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{wants}</span>
          {accepted && (
            <span className="text-slate-400"> · Accepted {accepted}</span>
          )}
        </div>
        {lead.installer_report_url && (
          <Link
            href={lead.installer_report_url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs transition-colors"
          >
            Open report
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: LeadRow["status"] }) {
  if (status === "visit_booked") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
        <CheckCircle2 className="w-3 h-3" />
        Booked
      </span>
    );
  }
  if (status === "installer_acknowledged") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900">
        <Sparkles className="w-3 h-3" />
        Taken
      </span>
    );
  }
  if (status === "visit_completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </span>
    );
  }
  if (status === "closed_won") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
        <CheckCircle2 className="w-3 h-3" />
        Won
      </span>
    );
  }
  if (status === "closed_lost") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
        <XCircle className="w-3 h-3" />
        Lost
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
        <XCircle className="w-3 h-3" />
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

function EmptyState({ query }: { query: string | null }) {
  if (query) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <Search className="w-5 h-5" />
        </span>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          No reports matched &ldquo;<strong className="text-navy">{query}</strong>&rdquo;.{" "}
          <Link
            href="/installer/reports"
            className="text-coral hover:text-coral-dark underline font-medium"
          >
            Clear search
          </Link>{" "}
          to see them all.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 mb-3">
        <FileText className="w-5 h-5" />
      </span>
      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
        Reports show up here once you&rsquo;ve accepted leads. Each
        accepted lead unlocks the homeowner&rsquo;s pre-survey report
        so you can prep before the visit.
      </p>
      <Link
        href="/installer/leads"
        className="inline-flex items-center justify-center h-10 px-4 mt-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors"
      >
        Open leads inbox
      </Link>
    </div>
  );
}

function UnboundState() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 mb-3">
        <FileText className="w-5 h-5" />
      </span>
      <h2 className="text-lg font-semibold text-amber-900">
        Claim your installer profile first
      </h2>
      <p className="text-sm text-amber-900 mt-2 leading-relaxed max-w-md mx-auto">
        Your account isn&rsquo;t linked to an installer record yet, so we
        can&rsquo;t show your reports. Find your MCS profile and finish
        the claim, then come back here.
      </p>
      <Link
        href="/installer-signup"
        className="inline-flex items-center justify-center h-11 px-5 mt-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Claim your profile →
      </Link>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
