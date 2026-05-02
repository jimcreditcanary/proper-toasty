// /installer/pre-survey-requests
//
// Server-rendered list + new-request form. Status pills double as
// filters. Lazily flips status='pending' rows past their expires_at
// to 'expired' on read so the badge counts stay accurate without a
// cron.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  ArrowRight,
  CheckCircle2,
  Hourglass,
  MousePointerClick,
  Send,
  Zap,
} from "lucide-react";
import { PreSurveyForm } from "./form";
import { ResendButton } from "./resend-button";
import {
  PRE_SURVEY_REQUEST_COST_CREDITS,
  PRE_SURVEY_RESEND_COOLOFF_HOURS,
} from "@/lib/pre-survey-requests/schema";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type RequestRow =
  Database["public"]["Tables"]["installer_pre_survey_requests"]["Row"];

type StatusKey = "all" | "pending" | "clicked" | "completed" | "expired";

const TABS: { key: StatusKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Sent" },
  { key: "clicked", label: "Clicked" },
  { key: "completed", label: "Completed" },
  { key: "expired", label: "Expired" },
];

function isStatusKey(s: string | undefined): s is StatusKey {
  return TABS.some((t) => t.key === s);
}

interface PageProps {
  searchParams: Promise<{ status?: string; sent?: string }>;
}

export default async function PreSurveyRequestsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const status: StatusKey = isStatusKey(params.status) ? params.status : "all";
  const justSent = params.sent === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/pre-survey-requests");
  }

  const admin = createAdminClient();

  const [installerRes, profileRes] = await Promise.all([
    admin
      .from("installers")
      .select("id, company_name")
      .eq("user_id", user.id)
      .maybeSingle<{ id: number; company_name: string }>(),
    admin
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle<{ credits: number }>(),
  ]);
  const installer = installerRes.data;
  const balance = profileRes.data?.credits ?? 0;

  if (!installer) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Pre-survey requests"
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

  // Lazy expiry — flip pending rows past their expires_at so the
  // counts + filter results stay accurate. Cheap (single update,
  // partial index hit), cheaper than a cron job.
  await admin
    .from("installer_pre_survey_requests")
    .update({ status: "expired" })
    .eq("installer_id", installer.id)
    .in("status", ["pending", "clicked"])
    .lt("expires_at", new Date().toISOString());

  let listQuery = admin
    .from("installer_pre_survey_requests")
    .select("*")
    .eq("installer_id", installer.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") {
    listQuery = listQuery.eq("status", status);
  }
  const { data: rows } = await listQuery;
  const requests = (rows ?? []) as RequestRow[];
  // Capture once before render so the time used for relative labels
  // is stable across the tree. Server component + Date is "impure"
  // in the strict React-rules sense; we accept it because this page
  // re-renders on every request anyway.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  // Counts per status — single round-trip across all of this
  // installer's requests; we tally in memory.
  const { data: countRows } = await admin
    .from("installer_pre_survey_requests")
    .select("status")
    .eq("installer_id", installer.id);
  const counts: Record<StatusKey, number> = {
    all: 0,
    pending: 0,
    clicked: 0,
    completed: 0,
    expired: 0,
  };
  for (const r of countRows ?? []) {
    counts.all += 1;
    const s = r.status as StatusKey;
    if (s in counts) counts[s] += 1;
  }

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Pre-survey requests"
      pageSubtitle={`Email customers a personalised home check link. ${PRE_SURVEY_REQUEST_COST_CREDITS} credit per send.`}
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {justSent && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-5 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">Request sent.</p>
            <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
              Your customer just got the email. They&rsquo;ll appear in
              your leads inbox the moment they finish the check.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <PreSurveyForm balance={balance} costPerSend={PRE_SURVEY_REQUEST_COST_CREDITS} />

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-2 mt-8 mb-3">
        {TABS.map((t) => {
          const active = t.key === status;
          return (
            <Link
              key={t.key}
              href={`/installer/pre-survey-requests${t.key === "all" ? "" : `?status=${t.key}`}`}
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
                    : t.key === "completed" && counts[t.key] > 0
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t.key]}
              </span>
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <EmptyState />
      ) : (
        <RequestList requests={requests} nowMs={nowMs} />
      )}
    </PortalShell>
  );
}

function RequestList({
  requests,
  nowMs,
}: {
  requests: RequestRow[];
  nowMs: number;
}) {
  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id}>
          <RequestCard request={r} nowMs={nowMs} />
        </li>
      ))}
    </ul>
  );
}

function RequestCard({
  request,
  nowMs,
}: {
  request: RequestRow;
  nowMs: number;
}) {
  const hoursSinceLastSend =
    (nowMs - new Date(request.last_sent_at).getTime()) / (1000 * 60 * 60);
  const canResend =
    (request.status === "pending" || request.status === "clicked") &&
    hoursSinceLastSend >= PRE_SURVEY_RESEND_COOLOFF_HOURS;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-semibold text-navy leading-tight">
            {request.contact_name}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            <a
              href={`mailto:${request.contact_email}`}
              className="text-coral hover:text-coral-dark underline"
            >
              {request.contact_email}
            </a>
            {request.contact_postcode && (
              <span className="text-slate-400">
                {" · "}
                {request.contact_postcode}
              </span>
            )}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-3 flex-wrap">
          <span>
            {request.sends_count === 1
              ? `Sent ${formatRelative(request.last_sent_at, nowMs)}`
              : `Sent ${request.sends_count}× — last ${formatRelative(request.last_sent_at, nowMs)}`}
          </span>
          <span className="text-slate-400">
            · {request.total_credits_charged} credit
            {request.total_credits_charged === 1 ? "" : "s"} used
          </span>
          {request.completed_at && (
            <span className="text-emerald-700 font-medium">
              · Completed {formatRelative(request.completed_at, nowMs)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {request.status === "completed" && request.result_installer_lead_id && (
            <Link
              href={`/installer/leads`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] transition-colors"
            >
              View in leads inbox
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {canResend && (
            <ResendButton requestId={request.id} />
          )}
          {!canResend &&
            (request.status === "pending" || request.status === "clicked") && (
              <span
                className="text-[11px] text-slate-400 italic"
                title={`Resend allowed ${PRE_SURVEY_RESEND_COOLOFF_HOURS}h after last send`}
              >
                Resend in{" "}
                {Math.ceil(
                  PRE_SURVEY_RESEND_COOLOFF_HOURS - hoursSinceLastSend,
                )}
                h
              </span>
            )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestRow["status"] }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900">
        <Send className="w-3 h-3" />
        Sent
      </span>
    );
  }
  if (status === "clicked") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
        <MousePointerClick className="w-3 h-3" />
        Clicked
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
      <Hourglass className="w-3 h-3" />
      Expired
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 mb-3">
        <Zap className="w-5 h-5" />
      </span>
      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
        No requests yet. Use the form above to send your first
        customer a personalised home energy check link.
      </p>
    </div>
  );
}

function formatRelative(iso: string, nowMs: number): string {
  const ms = nowMs - new Date(iso).getTime();
  const mins = Math.floor(ms / (1000 * 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

