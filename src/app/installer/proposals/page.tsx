// /installer/proposals — every proposal this installer has created,
// across all leads. Server-rendered list with simple status filters.
//
// Status pills double as filters (`?status=`). Drafts surface
// prominently so the installer remembers to finish + send.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { formatGbp } from "@/lib/proposals/schema";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileEdit,
  Receipt,
  Send,
  XCircle,
} from "lucide-react";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type ProposalRow = Database["public"]["Tables"]["installer_proposals"]["Row"];
type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];

type StatusKey = "all" | "draft" | "sent" | "accepted" | "declined";

const TABS: { key: StatusKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
];

function isStatusKey(s: string | undefined): s is StatusKey {
  return TABS.some((t) => t.key === s);
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

interface RowWithLead {
  proposal: ProposalRow;
  lead: Pick<
    LeadRow,
    "id" | "contact_name" | "property_address" | "property_postcode"
  > | null;
}

export default async function ProposalsListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status: StatusKey = isStatusKey(params.status) ? params.status : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/proposals");
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Quotes"
        backLink={{ href: "/installer", label: "Back to installer portal" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            Your account isn&rsquo;t linked to an installer profile yet.
            Claim your profile from the installer signup page first.
          </p>
        </div>
      </PortalShell>
    );
  }

  // Pull the proposals + lead context in parallel — counts come from
  // the same set since we're capped at 100.
  let proposalQuery = admin
    .from("installer_proposals")
    .select("*")
    .eq("installer_id", installer.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (status !== "all") {
    proposalQuery = proposalQuery.eq("status", status);
  }

  const { data: proposals } = await proposalQuery;

  // Counts per status — single round-trip; we group in memory.
  const { data: countRows } = await admin
    .from("installer_proposals")
    .select("status")
    .eq("installer_id", installer.id);
  const counts: Record<StatusKey, number> = {
    all: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    declined: 0,
  };
  for (const r of countRows ?? []) {
    counts.all += 1;
    const s = r.status as StatusKey;
    if (s in counts) counts[s] += 1;
  }

  // Fetch lead context for each proposal in one query.
  const leadIds = Array.from(
    new Set((proposals ?? []).map((p) => p.installer_lead_id)),
  );
  const { data: leads } = leadIds.length
    ? await admin
        .from("installer_leads")
        .select("id, contact_name, property_address, property_postcode")
        .in("id", leadIds)
    : { data: [] as LeadRow[] };
  const leadById = new Map<string, RowWithLead["lead"]>();
  for (const l of leads ?? []) leadById.set(l.id, l);

  const rows: RowWithLead[] = (proposals ?? []).map((p) => ({
    proposal: p as ProposalRow,
    lead: leadById.get(p.installer_lead_id) ?? null,
  }));

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Quotes"
      pageSubtitle="Every quote you've created, across all leads."
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {TABS.map((t) => {
          const active = t.key === status;
          return (
            <Link
              key={t.key}
              href={`/installer/proposals${t.key === "all" ? "" : `?status=${t.key}`}`}
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-coral text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
              }`}
            >
              {t.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  active
                    ? "bg-white/20 text-white"
                    : t.key === "draft" && counts[t.key] > 0
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t.key]}
              </span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState status={status} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.proposal.id}>
              <ProposalCard row={r} />
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

function ProposalCard({ row }: { row: RowWithLead }) {
  const { proposal, lead } = row;
  const detailHref = `/installer/proposals/${proposal.id}`;
  const editHref = `/installer/leads/${proposal.installer_lead_id}/propose`;
  const itemCount = Array.isArray(proposal.line_items)
    ? proposal.line_items.length
    : 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-navy leading-tight">
            {lead?.property_address ??
              lead?.property_postcode ??
              "Unknown address"}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {lead?.contact_name ?? "Homeowner"}
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
          <span>
            <span className="font-bold text-navy text-sm mr-1">
              {formatGbp(proposal.total_pence)}
            </span>
            <span>
              ({proposal.vat_rate_bps === 0 ? "0%" : "20%"} VAT,{" "}
              {itemCount} item{itemCount === 1 ? "" : "s"})
            </span>
          </span>
          <span className="text-slate-400">
            {proposal.status === "draft" && (
              <>Last edited {formatRelative(proposal.updated_at)}</>
            )}
            {proposal.status === "sent" && proposal.sent_at && (
              <>Sent {formatRelative(proposal.sent_at)}</>
            )}
            {proposal.status === "accepted" && proposal.accepted_at && (
              <>Accepted {formatRelative(proposal.accepted_at)}</>
            )}
            {proposal.status === "declined" && proposal.declined_at && (
              <>Declined {formatRelative(proposal.declined_at)}</>
            )}
          </span>
        </div>
        {proposal.status === "draft" ? (
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs transition-colors"
          >
            <FileEdit className="w-3 h-3" />
            Continue editing
          </Link>
        ) : (
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            View
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProposalRow["status"] }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
        <FileEdit className="w-3 h-3" />
        Draft
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900">
        <Send className="w-3 h-3" />
        Sent
      </span>
    );
  }
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
        <CheckCircle2 className="w-3 h-3" />
        Accepted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
      <XCircle className="w-3 h-3" />
      Declined
    </span>
  );
}

function EmptyState({ status }: { status: StatusKey }) {
  const copy =
    status === "all"
      ? "You haven't sent any quotes yet. Open an accepted lead and click 'Send quote' to build your first one."
      : status === "draft"
        ? "No drafts. Drafts you save without sending land here so you can finish them later."
        : status === "sent"
          ? "No sent quotes yet. Once you send one, it'll appear here while waiting on the homeowner's response."
          : status === "accepted"
            ? "No accepted quotes yet. They'll show here once a homeowner says yes."
            : "No declined quotes — that's a good thing.";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 mb-3">
        <Receipt className="w-5 h-5" />
      </span>
      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
        {copy}
      </p>
      {status === "all" && (
        <Link
          href="/installer/leads?status=accepted"
          className="inline-flex items-center gap-1.5 h-10 px-4 mt-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors"
        >
          Open leads
          <Clock className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / (1000 * 60));
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
