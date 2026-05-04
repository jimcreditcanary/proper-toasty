// /installer/performance — at-a-glance dashboard for the last
// 3 calendar months. Server-rendered. Aggregations come from
// loadPerformance() — no DB writes anywhere on this page.
//
// Sections:
//   1. Headline KPI strip — leads / quotes sent / quotes accepted /
//      acceptance rate, with the 3-month total in big numbers.
//   2. Lead source breakdown — directory vs pre-survey horizontal
//      bars + per-source acceptance rate so the installer can see
//      which channel is converting.
//   3. Funnel — visual drop-off across the 4-stage pipeline (pre-
//      survey or directory in → quote sent → quote accepted).
//   4. Monthly trend — bar chart, count of {leads, quotes sent,
//      quotes accepted} per month. Plain SVG; no chart-library dep.
//   5. Quick-jump tiles to the leads inbox / quotes / pre-survey
//      page so the installer can dig in without navigating back.
//
// All money in pence at the data layer; formatGbp at render time.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileEdit,
  Inbox,
  Receipt,
  TrendingUp,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  loadPerformance,
  type MonthBucket,
  type PerformanceData,
} from "@/lib/installer-performance/queries";
import { formatGbp } from "@/lib/proposals/schema";

export const dynamic = "force-dynamic";

const PERFORMANCE_WINDOW_MONTHS = 3;

export default async function PerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/performance");
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
        pageTitle="Performance"
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

  const data = await loadPerformance(
    admin,
    installer.id,
    PERFORMANCE_WINDOW_MONTHS,
  );

  const hasAnyActivity =
    data.totals.leads.total > 0 ||
    data.totals.quotes.sent > 0 ||
    data.totals.preSurveyRequests.sent > 0;

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Performance"
      pageSubtitle={`Last ${PERFORMANCE_WINDOW_MONTHS} months at a glance — pipeline, conversion, and what's working.`}
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {!hasAnyActivity ? (
        <EmptyState />
      ) : (
        <>
          {/* Funnel section removed — the KPI strip already shows
              leads → sent → accepted as totals, and the Monthly
              trend visualises them over time. The dedicated Funnel
              with drop-off bars was duplicate information at a
              third viewing angle. */}
          <KpiStrip data={data} />
          <SourceBreakdown data={data} />
          <MonthlyTrend data={data} />
        </>
      )}

      <QuickJumps />
    </PortalShell>
  );
}

// ─── Headline KPI strip ────────────────────────────────────────────

function KpiStrip({ data }: { data: PerformanceData }) {
  const t = data.totals;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Kpi
        label="Leads received"
        value={t.leads.total.toLocaleString("en-GB")}
        sub={`${t.leads.preSurvey} from your sends · ${t.leads.directory} from homeowners`}
        icon={<Inbox className="w-4 h-4" />}
      />
      <Kpi
        label="Quotes sent"
        value={t.quotes.sent.toLocaleString("en-GB")}
        sub={
          t.quotes.sent > 0
            ? `${formatGbp(t.quotes.sentValuePence)} total value`
            : "No quotes yet"
        }
        icon={<FileEdit className="w-4 h-4" />}
      />
      <Kpi
        label="Quotes accepted"
        value={t.quotes.accepted.toLocaleString("en-GB")}
        sub={
          t.quotes.accepted > 0
            ? `${formatGbp(t.quotes.acceptedValuePence)} won`
            : "—"
        }
        accent="emerald"
        icon={<CheckCircle2 className="w-4 h-4" />}
      />
      <Kpi
        label="Acceptance rate"
        value={
          data.conversion.acceptanceRate === 0
            ? "—"
            : `${Math.round(data.conversion.acceptanceRate * 100)}%`
        }
        sub={
          t.quotes.sent === 0
            ? "Send your first quote"
            : `${t.quotes.accepted} of ${t.quotes.sent} accepted`
        }
        accent="coral"
        icon={<TrendingUp className="w-4 h-4" />}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  accent = "slate",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent?: "slate" | "coral" | "emerald";
}) {
  const accentClasses =
    accent === "coral"
      ? "bg-coral-pale text-coral-dark"
      : accent === "emerald"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-500";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${accentClasses}`}
        >
          {icon}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-navy leading-none">
        {value}
      </p>
      <p className="text-[11px] text-slate-500 mt-2 leading-snug">{sub}</p>
    </div>
  );
}

// ─── Lead source breakdown ─────────────────────────────────────────

function SourceBreakdown({ data }: { data: PerformanceData }) {
  const t = data.totals;
  if (t.leads.total === 0 && t.preSurveyRequests.sent === 0) return null;
  const max = Math.max(t.leads.directory, t.leads.preSurvey, 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-navy">Lead sources</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Where your leads came from over the last{" "}
            {PERFORMANCE_WINDOW_MONTHS} months.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <SourceBar
          label="From homeowners"
          tooltip="Homeowners who picked you from their pre-survey report"
          value={t.leads.directory}
          max={max}
          color="bg-sky-500"
        />
        <SourceBar
          label="From your sends"
          tooltip="Leads from pre-survey links you sent to your own customers"
          value={t.leads.preSurvey}
          max={max}
          color="bg-coral"
        />
      </div>

      {t.preSurveyRequests.sent > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <MicroStat
            label="Sends"
            value={t.preSurveyRequests.sent.toLocaleString("en-GB")}
            sub={`${t.preSurveyRequests.creditsCharged} credit${t.preSurveyRequests.creditsCharged === 1 ? "" : "s"} used`}
          />
          <MicroStat
            label="Clicks"
            value={t.preSurveyRequests.clicked.toLocaleString("en-GB")}
            sub={
              t.preSurveyRequests.sent > 0
                ? `${Math.round((t.preSurveyRequests.clicked / t.preSurveyRequests.sent) * 100)}% click-through`
                : "—"
            }
          />
          <MicroStat
            label="Completed"
            value={t.preSurveyRequests.completed.toLocaleString("en-GB")}
            sub={
              data.conversion.preSurveyCompletionRate > 0
                ? `${Math.round(data.conversion.preSurveyCompletionRate * 100)}% completion`
                : "Awaiting first"
            }
          />
        </div>
      )}
    </div>
  );
}

function SourceBar({
  label,
  tooltip,
  value,
  max,
  color,
}: {
  label: string;
  tooltip: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max === 0 ? 0 : (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-navy" title={tooltip}>
          {label}
        </span>
        <span className="font-bold text-slate-700">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, value > 0 ? 6 : 0)}%` }}
          aria-label={`${label}: ${value}`}
        />
      </div>
    </div>
  );
}

function MicroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-base font-semibold text-navy mt-0.5 leading-none">
        {value}
      </p>
      <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

// ─── Monthly trend ─────────────────────────────────────────────────

function MonthlyTrend({ data }: { data: PerformanceData }) {
  // Find the absolute max across the three series we plot — leads,
  // sent, accepted — so all bars share a common scale.
  const peak = data.months.reduce(
    (m, b) =>
      Math.max(m, b.leads.total, b.quotes.sent, b.quotes.accepted),
    0,
  );
  if (peak === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-navy">Monthly trend</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Leads, quotes sent + accepted, by month.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {data.months.map((b) => (
          <MonthColumn key={b.monthStart} bucket={b} peak={peak} />
        ))}
      </div>
      <Legend />
    </div>
  );
}

function MonthColumn({ bucket, peak }: { bucket: MonthBucket; peak: number }) {
  const series: { value: number; color: string; label: string }[] = [
    { value: bucket.leads.total, color: "bg-sky-500", label: "leads" },
    { value: bucket.quotes.sent, color: "bg-coral", label: "sent" },
    {
      value: bucket.quotes.accepted,
      color: "bg-emerald-500",
      label: "accepted",
    },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">
        {bucket.label}
      </p>
      <div className="flex items-end justify-center gap-1.5 h-24">
        {series.map((s) => {
          const heightPct = (s.value / peak) * 100;
          return (
            <div
              key={s.label}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <span className="text-[10px] font-bold text-slate-700 mb-1">
                {s.value > 0 ? s.value : ""}
              </span>
              <div
                className={`w-full ${s.color} rounded-t transition-all`}
                style={{
                  height: `${Math.max(heightPct, s.value > 0 ? 4 : 0)}%`,
                }}
                aria-label={`${s.label}: ${s.value}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
        Leads received
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-coral" />
        Quotes sent
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
        Accepted
      </span>
    </div>
  );
}

// ─── Empty state + quick jumps ─────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center mb-6">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 mb-3">
        <TrendingUp className="w-5 h-5" />
      </span>
      <h2 className="text-base font-semibold text-navy">
        Nothing to chart yet
      </h2>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-md mx-auto">
        Once you start receiving leads or sending quotes, this page
        fills up with conversion stats and a 3-month trend. Send your
        first pre-survey link to get the data flowing.
      </p>
      <Link
        href="/installer/pre-survey-requests"
        className="inline-flex items-center gap-1.5 h-10 px-4 mt-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors"
      >
        Send a check link
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function QuickJumps() {
  const tiles = [
    {
      title: "Leads inbox",
      body: "Open the inbox to accept, decline, or follow up.",
      icon: Inbox,
      href: "/installer/leads",
    },
    {
      title: "Quotes",
      body: "Build a quote, view sent ones, see acceptances.",
      icon: Receipt,
      href: "/installer/proposals",
    },
    {
      title: "Pre-survey requests",
      body: "Send personalised check links to your customers.",
      icon: Zap,
      href: "/installer/pre-survey-requests",
    },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.title}
            href={t.href}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-coral/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral-dark">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-navy">{t.title}</h3>
              <ArrowRight className="ml-auto w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{t.body}</p>
          </Link>
        );
      })}
    </div>
  );
}
