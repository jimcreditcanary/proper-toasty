// /admin/performance — KPI tiles + check funnel + MCS approval health.
//
// V1 is numbers only — no charts yet. The intent is to give the team
// a one-glance read on volume, conversion, revenue, and the health of
// the installer signup pipeline. Everything is filtered by a single
// date-range selector that lives in URL params for shareability.

import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileText,
  Handshake,
  PoundSterling,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wrench,
} from "lucide-react";
import {
  RANGE_OPTIONS,
  resolveRange,
  loadCoreKpis,
  loadFunnel,
  loadApprovalHealth,
  type RangeKey,
} from "@/lib/admin/metrics";
import {
  loadReportsCompletedSeries,
  loadRevenueSeries,
  loadApprovalRateSeries,
} from "@/lib/admin/charts";
import {
  loadStaleInstallers,
  loadFailingRechargeInstallers,
} from "@/lib/admin/at-risk";
import { BarChart } from "@/components/admin/bar-chart";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

function isRangeKey(k: string | undefined): k is RangeKey {
  return RANGE_OPTIONS.some((r) => r.key === k);
}

export default async function PerformancePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rangeKey: RangeKey = isRangeKey(params.range) ? params.range : "this_month";
  const range = resolveRange(rangeKey);

  const [
    kpis,
    funnel,
    approval,
    reportsSeries,
    revenueSeries,
    approvalRateSeries,
    staleInstallers,
    failingRecharges,
  ] = await Promise.all([
    loadCoreKpis(range),
    loadFunnel(range),
    loadApprovalHealth(range),
    loadReportsCompletedSeries(range),
    loadRevenueSeries(range),
    loadApprovalRateSeries(),
    loadStaleInstallers(),
    loadFailingRechargeInstallers(),
  ]);

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Performance"
      pageSubtitle={`${range.label} — volume, conversion, and approval health.`}
    >
      {/* ─── Range selector ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {RANGE_OPTIONS.map((r) => {
          const active = r.key === rangeKey;
          return (
            <Link
              key={r.key}
              href={`/admin/performance?range=${r.key}`}
              className={`inline-flex items-center h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-coral text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      {/* ─── Headline KPI tiles ──────────────────────────────────── */}
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Volume
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile
          label="Reports completed"
          value={kpis.reports_completed}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          accent="emerald"
        />
        <KpiTile
          label="Reports started"
          value={kpis.reports_started}
          sub={`${kpis.reports_failed} failed`}
          icon={<FileText className="w-4 h-4 text-slate-500" />}
        />
        <KpiTile
          label="New users"
          value={kpis.new_users}
          icon={<UserPlus className="w-4 h-4 text-slate-500" />}
        />
        <KpiTile
          label="Installers claimed"
          value={kpis.new_installers_claimed}
          icon={<Wrench className="w-4 h-4 text-slate-500" />}
        />
      </div>

      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Revenue + usage
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile
          label="Revenue"
          value={`£${(kpis.revenue_pence / 100).toFixed(2)}`}
          icon={<PoundSterling className="w-4 h-4 text-coral" />}
          accent="coral"
        />
        <KpiTile
          label="Credits consumed"
          value={kpis.credits_consumed}
          icon={<Coins className="w-4 h-4 text-slate-500" />}
        />
        <KpiTile
          label="Leads released"
          value={kpis.leads_released}
          icon={<Sparkles className="w-4 h-4 text-slate-500" />}
        />
        <KpiTile
          label="Leads accepted"
          value={kpis.leads_accepted}
          sub={
            kpis.leads_released === 0
              ? "no releases"
              : `${Math.round((kpis.leads_accepted / kpis.leads_released) * 100)}% accept rate`
          }
          icon={<Handshake className="w-4 h-4 text-slate-500" />}
        />
      </div>

      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Site visits
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiTile
          label="Visits booked"
          value={kpis.visits_booked}
          icon={<Building2 className="w-4 h-4 text-slate-500" />}
        />
        <KpiTile
          label="Visits completed"
          value={kpis.visits_completed}
          icon={<CheckCircle2 className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {/* ─── Trend charts ────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <section className="rounded-xl bg-white border border-slate-200 p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-base font-semibold text-navy">Reports completed</h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {reportsSeries.granularity === "day"
                ? "by day"
                : reportsSeries.granularity === "week"
                  ? "by week"
                  : "by month"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Bucket size adapts to range length.
          </p>
          <BarChart
            ariaTitle="Reports completed"
            data={reportsSeries.buckets.map((b) => ({
              label: b.label,
              value: b.count,
            }))}
            emptyMessage="No completed reports in range"
          />
        </section>

        <section className="rounded-xl bg-white border border-slate-200 p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-base font-semibold text-navy">Revenue</h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {revenueSeries.granularity === "day"
                ? "by day"
                : revenueSeries.granularity === "week"
                  ? "by week"
                  : "by month"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Successful Stripe purchases only.
          </p>
          <BarChart
            ariaTitle="Revenue"
            data={revenueSeries.buckets.map((b) => ({
              label: b.label,
              value: b.sum,
              secondaryLabel: `£${(b.sum / 100).toFixed(2)}`,
            }))}
            formatValue={(n) => `£${(n / 100).toFixed(0)}`}
            emptyMessage="No revenue in range"
          />
        </section>
      </div>

      {/* ─── Funnel ──────────────────────────────────────────────── */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-navy">Check funnel</h2>
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Of every check started in this range, how many made it to each stage.
        </p>
        <ul className="space-y-2">
          {funnel.map((stage, idx) => (
            <li key={stage.key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-navy font-medium">
                  {idx + 1}. {stage.label}
                </span>
                <span className="text-slate-500">
                  {stage.count}{" "}
                  <span className="text-slate-400">({stage.pct_of_first}%)</span>
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-coral transition-all"
                  style={{ width: `${stage.pct_of_first}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── MCS approval health ─────────────────────────────────── */}
      <section className="rounded-xl bg-white border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-navy flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-coral" />
            MCS approval health
          </h2>
          <Link
            href="/admin/installer-requests"
            className="text-xs text-coral hover:underline inline-flex items-center gap-1"
          >
            Open queue
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Pending reflects the live queue; approval rate + claimed counts are scoped to {range.label.toLowerCase()}.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MiniTile
            label="In queue"
            value={approval.pending_count}
            sub={
              approval.pending_median_age_days === null
                ? "—"
                : `median ${approval.pending_median_age_days}d old`
            }
            warn={
              approval.pending_median_age_days !== null &&
              approval.pending_median_age_days >= 3
            }
          />
          <MiniTile
            label="Approved"
            value={approval.approved_in_range}
          />
          <MiniTile
            label="Rejected"
            value={approval.rejected_in_range}
          />
          <MiniTile
            label="Approval rate"
            value={
              approval.approval_rate_pct === null
                ? "—"
                : `${approval.approval_rate_pct}%`
            }
            sub={`${approval.claimed_in_range} claimed`}
          />
        </div>

        {/* Approval rate trend — fixed 6-month window so the trend
            is comparable across range filter selections. */}
        <div className="mb-5 rounded-lg bg-slate-50 border border-slate-200 p-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Approval rate, last 6 months
            </span>
          </div>
          <BarChart
            ariaTitle="Approval rate by month"
            height={120}
            data={approvalRateSeries.map((b) => {
              const pct = b.sum === 0 ? 0 : Math.round((b.count / b.sum) * 100);
              return {
                label: b.label,
                value: pct,
                secondaryLabel: `${pct}% (${b.count}/${b.sum} reviewed)`,
              };
            })}
            formatValue={(n) => `${n}%`}
            emptyMessage="No reviewed requests"
          />
        </div>

        {/* Oldest pending — call out for action. */}
        {approval.recent_pending.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Oldest in queue
            </h3>
            <ul className="space-y-1.5">
              {approval.recent_pending.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/installer-requests/${r.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Clock
                      className={`w-4 h-4 shrink-0 ${
                        r.age_days >= 3 ? "text-rose-500" : "text-slate-400"
                      }`}
                    />
                    <span className="flex-1 text-sm text-navy truncate">
                      {r.company_name}
                    </span>
                    <span className="text-xs text-slate-500 truncate hidden sm:inline">
                      {r.contact_email}
                    </span>
                    <span
                      className={`text-[10px] font-bold shrink-0 ${
                        r.age_days >= 3 ? "text-rose-600" : "text-slate-400"
                      }`}
                    >
                      {r.age_days === 0 ? "today" : `${r.age_days}d`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ─── At-risk installers ──────────────────────────────────── */}
      <section className="mt-6 rounded-xl bg-white border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h2 className="text-base font-semibold text-navy">At-risk installers</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Live signals — independent of the range filter above.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Stale */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                No acceptances in 30 days
              </h3>
              <span className="text-[10px] text-slate-400">
                {staleInstallers.length} installer{staleInstallers.length === 1 ? "" : "s"}
              </span>
            </div>
            {staleInstallers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Nobody&rsquo;s gone quiet — every claimed installer accepted in the last 30 days.
              </p>
            ) : (
              <ul className="space-y-1">
                {staleInstallers.slice(0, 8).map((s) => (
                  <li
                    key={s.installer_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="flex-1 text-sm text-navy truncate">
                      {s.company_name}
                    </span>
                    {s.user_email && (
                      <span className="text-[11px] text-slate-500 truncate hidden md:inline">
                        {s.user_email}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-amber-700 shrink-0">
                      {s.last_acceptance_at
                        ? `${s.days_since_acceptance}d`
                        : "never"}
                    </span>
                  </li>
                ))}
                {staleInstallers.length > 8 && (
                  <li className="text-[11px] text-slate-400 italic px-3">
                    + {staleInstallers.length - 8} more
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Failing recharges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Failing auto-recharges
              </h3>
              <span className="text-[10px] text-slate-400">
                {failingRecharges.length} installer{failingRecharges.length === 1 ? "" : "s"}
              </span>
            </div>
            {failingRecharges.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                All recent auto-recharge attempts succeeded.
              </p>
            ) : (
              <ul className="space-y-1">
                {failingRecharges.slice(0, 8).map((f) => (
                  <li
                    key={f.installer_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-navy truncate">
                        {f.company_name}
                      </span>
                      {f.last_failure_message && (
                        <span className="block text-[10px] text-rose-600 truncate">
                          {f.last_failure_message}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 shrink-0">
                      {f.consecutive_failures}× failed
                    </span>
                  </li>
                ))}
                {failingRecharges.length > 8 && (
                  <li className="text-[11px] text-slate-400 italic px-3">
                    + {failingRecharges.length - 8} more
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </section>
    </PortalShell>
  );
}

// ─── Components ────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "coral" | "emerald";
}) {
  const ring =
    accent === "coral"
      ? "ring-1 ring-coral/30"
      : accent === "emerald"
        ? "ring-1 ring-emerald-200"
        : "";
  return (
    <div className={`rounded-xl bg-white border border-slate-200 p-4 ${ring}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div className="text-2xl font-semibold text-navy tabular-nums">
        {value}
      </div>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniTile({
  label,
  value,
  sub,
  warn = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 border ${
        warn
          ? "bg-rose-50 border-rose-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`text-xl font-semibold tabular-nums mt-0.5 ${
          warn ? "text-rose-700" : "text-navy"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-[10px] mt-0.5 ${
            warn ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

