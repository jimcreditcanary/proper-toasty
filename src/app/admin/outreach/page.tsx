// /admin/outreach — read-mostly dashboard for the installer outreach
// engine. Six sections:
//
//   1. Campaign header — status badge + pause/resume controls
//   2. Live funnel — counts at each lifecycle state with conversion %
//   3. Founder claims — 12×4 tier matrix showing filled vs open
//   4. Recent replies — inbound classifications, last 20
//   5. Today's batch — what got enqueued/sent today
//   6. Suppression list — searchable, manual-add form
//
// Server-rendered. Auth handled by the parent /admin/layout.tsx.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  Sparkles,
  Pause,
  Play,
  CheckCircle2,
  Inbox,
  TrendingUp,
  Ban,
  AlertCircle,
} from "lucide-react";
import { CampaignControls } from "./pause-button";
import { DailyLimitEditor } from "./daily-limit-editor";
import { SuppressionForm } from "./suppression-form";
import {
  regionDisplayName,
  techBucketDisplayName,
  type Region,
  type TechBucket,
} from "@/lib/outreach/tier-preview";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

type CampaignRow = Database["public"]["Tables"]["outreach_campaigns"]["Row"];
type RecipientRow = Database["public"]["Tables"]["outreach_recipients"]["Row"];
type ClaimsRow = Database["public"]["Tables"]["outreach_founder_claims"]["Row"];
type EventRow = Database["public"]["Tables"]["outreach_events"]["Row"];
type SuppressionRow = Database["public"]["Tables"]["outreach_suppression"]["Row"];

const FUNNEL_STATES: Array<{
  state: RecipientRow["state"];
  label: string;
}> = [
  { state: "queued", label: "Queued" },
  { state: "sent", label: "Sent" },
  { state: "delivered", label: "Delivered" },
  { state: "opened", label: "Opened" },
  { state: "clicked", label: "Clicked" },
  { state: "signed_up", label: "Signed up" },
  { state: "completed", label: "Completed" },
];

const TERMINAL_STATES: RecipientRow["state"][] = [
  "bounced",
  "unsubscribed",
  "complained",
  "replied",
  "failed",
];

export default async function AdminOutreachPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const suppressionQuery = params.q?.trim() ?? "";

  const admin = createAdminClient();

  // ── Most-recent / active campaign ──
  const { data: campaigns } = await admin
    .from("outreach_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  const campaign: CampaignRow | undefined = campaigns?.[0];

  if (!campaign) {
    // No campaign yet — render an empty-state instead of failing.
    return (
      <PortalShell
        portalName="Admin"
        pageTitle="Outreach"
        pageSubtitle="No campaign configured yet."
        backLink={{ href: "/admin", label: "Back to admin" }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            The m065 migration seeds a draft campaign on first run. If
            you&rsquo;re seeing this in production, run m065.
          </p>
        </div>
      </PortalShell>
    );
  }

  // ── Parallel data fetch ──
  const [
    funnelCounts,
    terminalCounts,
    claimsRowsRes,
    repliesRes,
    todayBatchRes,
    suppressionRes,
  ] = await Promise.all([
    Promise.all(
      FUNNEL_STATES.map(async (f) => {
        const { count } = await admin
          .from("outreach_recipients")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("state", f.state);
        return { ...f, count: count ?? 0 };
      }),
    ),
    Promise.all(
      TERMINAL_STATES.map(async (state) => {
        const { count } = await admin
          .from("outreach_recipients")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("state", state);
        return { state, count: count ?? 0 };
      }),
    ),
    admin
      .from("outreach_founder_claims")
      .select("*")
      .order("region")
      .order("tech_bucket"),
    admin
      .from("outreach_events")
      .select("*")
      .eq("event_type", "inbound_reply")
      .order("occurred_at", { ascending: false })
      .limit(20),
    todayBatch(admin, campaign.id),
    suppressionList(admin, suppressionQuery),
  ]);

  const total = funnelCounts.reduce((s, f) => s + f.count, 0);
  const totalIncludingTerminal =
    total + terminalCounts.reduce((s, t) => s + t.count, 0);

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Outreach"
      pageSubtitle="Live state of the installer outreach engine."
      backLink={{ href: "/admin", label: "Back to admin" }}
    >
      <CampaignHeader campaign={campaign} totalRecipients={totalIncludingTerminal} />

      <FunnelSection
        funnel={funnelCounts}
        terminal={terminalCounts}
        total={totalIncludingTerminal}
      />

      <FounderClaimsSection rows={(claimsRowsRes.data ?? []) as ClaimsRow[]} />

      <TwoColumnSection>
        <RecentRepliesSection
          rows={(repliesRes.data ?? []) as EventRow[]}
        />
        <TodayBatchSection rows={todayBatchRes} />
      </TwoColumnSection>

      <SuppressionSection
        query={suppressionQuery}
        rows={suppressionRes}
      />
    </PortalShell>
  );
}

// ─── Campaign header ─────────────────────────────────────────────

function CampaignHeader({
  campaign,
  totalRecipients,
}: {
  campaign: CampaignRow;
  totalRecipients: number;
}) {
  const statusStyles: Record<CampaignRow["status"], string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    paused: "bg-amber-100 text-amber-800 border-amber-200",
    complete: "bg-slate-200 text-slate-700 border-slate-300",
  };
  const statusIcon: Record<CampaignRow["status"], React.ReactNode> = {
    draft: <Pause className="w-3.5 h-3.5" />,
    active: <Play className="w-3.5 h-3.5" />,
    paused: <Pause className="w-3.5 h-3.5" />,
    complete: <CheckCircle2 className="w-3.5 h-3.5" />,
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-6">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusStyles[campaign.status]}`}
            >
              {statusIcon[campaign.status]}
              {campaign.status}
            </span>
            <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              {totalRecipients} recipients enrolled ·{" "}
              <DailyLimitEditor
                campaignId={campaign.id}
                current={campaign.daily_send_limit}
              />
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-navy leading-tight">
            {campaign.name}
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Window {campaign.daily_send_window_start_hour_local}:00–
            {campaign.daily_send_window_end_hour_local}:00{" "}
            {campaign.send_window_timezone}{" "}
            ({campaign.weekdays_only ? "weekdays only" : "every day"}).
            Auto-pause at bounce rate ≥
            {(campaign.bounce_rate_pause_threshold * 100).toFixed(1)}%
            or complaint rate ≥
            {(campaign.complaint_rate_pause_threshold * 100).toFixed(2)}%.
          </p>
        </div>
        <CampaignControls
          campaignId={campaign.id}
          status={campaign.status}
        />
      </div>
    </section>
  );
}

// ─── Funnel ───────────────────────────────────────────────────────

function FunnelSection({
  funnel,
  terminal,
  total,
}: {
  funnel: Array<{ label: string; count: number }>;
  terminal: Array<{ state: string; count: number }>;
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-6">
      <header className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-navy">Funnel</h2>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {funnel.map((f) => {
          const pct = total > 0 ? Math.round((f.count / total) * 100) : 0;
          return (
            <div
              key={f.label}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {f.label}
              </p>
              <p className="text-2xl font-bold text-navy mt-1 leading-none">
                {f.count}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">{pct}%</p>
            </div>
          );
        })}
      </div>
      {terminal.some((t) => t.count > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {terminal.map((t) => (
            <div key={t.state} className="text-slate-500">
              <span className="font-semibold text-navy">{t.count}</span>{" "}
              {t.state.replace("_", " ")}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Founder claims matrix ────────────────────────────────────────

function FounderClaimsSection({ rows }: { rows: ClaimsRow[] }) {
  // Pivot into a region×tech matrix.
  const regions: Region[] = [
    "london",
    "south_east",
    "south_west",
    "eastern",
    "wales",
    "north_west",
    "yorkshire_humberside",
    "west_midlands",
    "east_midlands",
    "north_east",
    "scotland",
    "northern_ireland",
  ];
  const buckets: TechBucket[] = [
    "heat_pump",
    "solar_pv",
    "battery_storage",
    "solar_thermal",
  ];

  const byKey = new Map<string, ClaimsRow>();
  for (const r of rows) byKey.set(`${r.region}|${r.tech_bucket}`, r);

  const totalFilled = rows.filter((r) => r.tier_1_filled).length;
  const totalTier2 = rows.reduce((s, r) => s + r.tier_2_claimed_count, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-6">
      <header className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-coral" />
        <h2 className="text-sm font-semibold text-navy">Founder claims</h2>
      </header>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        {totalFilled} of 48 founder slots claimed · {totalTier2} early-access
        spots taken (out of 240). Cell shows tier-1 status + tier-2 count.
      </p>
      <div className="overflow-x-auto -mx-5 sm:mx-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-600 sticky left-0 bg-white">
                Region
              </th>
              {buckets.map((b) => (
                <th
                  key={b}
                  className="px-3 py-2 text-left font-semibold text-slate-600"
                >
                  {techBucketDisplayName(b)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regions.map((region) => (
              <tr key={region} className="border-b border-slate-100">
                <td className="px-3 py-2 text-navy font-medium sticky left-0 bg-white">
                  {regionDisplayName(region)}
                </td>
                {buckets.map((b) => {
                  const cell = byKey.get(`${region}|${b}`);
                  return (
                    <td key={b} className="px-3 py-2">
                      <ClaimsCell row={cell} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClaimsCell({ row }: { row: ClaimsRow | undefined }) {
  if (!row) return <span className="text-slate-300">—</span>;
  const filled = row.tier_1_filled;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${
          filled
            ? "bg-coral text-white"
            : "bg-slate-100 text-slate-400 border border-slate-200"
        }`}
        title={filled ? "Founder filled" : "Founder open"}
      >
        F
      </span>
      <span className="text-slate-500" title={`${row.tier_2_claimed_count} of 5 early-access claimed`}>
        {row.tier_2_claimed_count}/5
      </span>
    </div>
  );
}

// ─── Two-column wrapper ───────────────────────────────────────────

function TwoColumnSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">{children}</div>
  );
}

// ─── Recent replies ───────────────────────────────────────────────

interface InboundMetadata {
  sender?: string;
  subject?: string;
  intent?: string;
  confidence?: string;
  excerpt?: string;
}

function RecentRepliesSection({ rows }: { rows: EventRow[] }) {
  const intentStyles: Record<string, string> = {
    interested: "bg-emerald-100 text-emerald-700",
    question: "bg-emerald-100 text-emerald-700",
    unsubscribe: "bg-slate-200 text-slate-700",
    out_of_office: "bg-slate-100 text-slate-600",
    complaint: "bg-rose-100 text-rose-700",
    unknown: "bg-amber-100 text-amber-700",
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex items-center gap-2 mb-3">
        <Inbox className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-navy">
          Recent replies ({rows.length})
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">
          No inbound replies yet.
        </p>
      ) : (
        <ol className="space-y-2.5 text-xs">
          {rows.slice(0, 20).map((r) => {
            const meta = (r.metadata ?? {}) as InboundMetadata;
            const intent = meta.intent ?? "unknown";
            return (
              <li
                key={r.id}
                className="rounded-xl border border-slate-100 bg-slate-50/40 p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${intentStyles[intent] ?? intentStyles.unknown}`}
                  >
                    {intent.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatTimeAgo(r.occurred_at)}
                  </span>
                </div>
                {meta.sender && (
                  <p className="text-navy font-medium truncate">
                    {meta.sender}
                  </p>
                )}
                {meta.subject && (
                  <p className="text-slate-600 italic truncate">
                    {meta.subject}
                  </p>
                )}
                {meta.excerpt && (
                  <p className="text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {meta.excerpt}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ─── Today's batch ────────────────────────────────────────────────

interface TodayBatchRow {
  id: string;
  state: string;
  current_step: number;
  next_action_at: string;
  last_sent_at: string | null;
  company_name: string;
}

async function todayBatch(
  admin: ReturnType<typeof createAdminClient>,
  campaignId: string,
): Promise<TodayBatchRow[]> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data } = await admin
    .from("outreach_recipients")
    .select(
      "id, state, current_step, next_action_at, last_sent_at, installer_id",
    )
    .eq("campaign_id", campaignId)
    .gte("created_at", startOfDay.toISOString())
    .order("next_action_at", { ascending: true })
    .limit(50);
  if (!data || data.length === 0) return [];

  // Hydrate company names.
  const ids = data.map((d) => d.installer_id);
  const { data: installers } = await admin
    .from("installers")
    .select("id, company_name")
    .in("id", ids);
  const nameById = new Map<number, string>();
  for (const i of installers ?? []) nameById.set(i.id, i.company_name);

  return data.map((d) => ({
    id: d.id,
    state: d.state,
    current_step: d.current_step,
    next_action_at: d.next_action_at,
    last_sent_at: d.last_sent_at,
    company_name: nameById.get(d.installer_id) ?? `#${d.installer_id}`,
  }));
}

function TodayBatchSection({ rows }: { rows: TodayBatchRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-navy">
          Today&rsquo;s batch ({rows.length})
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">
          Nothing enqueued today.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 text-xs">
          {rows.map((r) => (
            <li
              key={r.id}
              className="py-2 flex items-center gap-2 justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="text-navy font-medium truncate">
                  {r.company_name}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Step {r.current_step} ·{" "}
                  {r.last_sent_at
                    ? `last sent ${formatTimeAgo(r.last_sent_at)}`
                    : `scheduled ${formatTimeAgo(r.next_action_at)}`}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${stateColor(r.state)}`}
              >
                {r.state.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Suppression list ─────────────────────────────────────────────

async function suppressionList(
  admin: ReturnType<typeof createAdminClient>,
  query: string,
): Promise<SuppressionRow[]> {
  let q = admin
    .from("outreach_suppression")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (query) {
    q = q.ilike("email", `%${query}%`);
  }
  const { data } = await q;
  return (data ?? []) as SuppressionRow[];
}

function SuppressionSection({
  query,
  rows,
}: {
  query: string;
  rows: SuppressionRow[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex items-center gap-2 mb-3">
        <Ban className="w-4 h-4 text-rose-600" />
        <h2 className="text-sm font-semibold text-navy">
          Suppression list ({rows.length}
          {rows.length === 50 ? "+" : ""})
        </h2>
      </header>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 text-xs text-amber-900 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Adding an email here ALSO flips any active recipient row for
          that email to <code>unsubscribed</code> so the running
          campaign stops trying to send. Irreversible from the UI —
          if a row needs removing, do it in Supabase directly.
        </span>
      </div>

      <SuppressionForm />

      <form
        method="get"
        className="mt-5 mb-3 flex gap-2"
      >
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by email…"
          className="flex-1 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm"
        />
        <button
          type="submit"
          className="inline-flex items-center h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
        >
          Search
        </button>
        {query && (
          <Link
            href="/admin/outreach"
            className="inline-flex items-center h-9 px-3 rounded-xl text-slate-500 hover:text-slate-700 text-xs"
          >
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">
          {query
            ? "No matches for that search."
            : "No suppressions yet."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 text-xs">
          {rows.map((r) => (
            <li
              key={r.email}
              className="py-2 flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-navy font-mono text-[11px] truncate">
                  {r.email}
                </p>
                <p className="text-[10px] text-slate-500">
                  {r.source ?? "—"} · {formatTimeAgo(r.created_at)}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${suppressionColor(r.reason)}`}
              >
                {r.reason.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function stateColor(state: string): string {
  if (state === "sent" || state === "delivered" || state === "opened") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (state === "clicked" || state === "signed_up" || state === "completed") {
    return "bg-coral-pale text-coral-dark";
  }
  if (state === "queued" || state === "scheduled") {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-rose-100 text-rose-700";
}

function suppressionColor(reason: string): string {
  if (reason === "complained" || reason === "spam_trap") {
    return "bg-rose-100 text-rose-700";
  }
  if (reason === "bounced" || reason === "invalid") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-600";
}

