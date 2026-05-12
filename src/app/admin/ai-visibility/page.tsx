// /admin/ai-visibility — dashboard for the AI search visibility tracker.
//
// Reads from public.ai_visibility_checks (populated by
// scripts/ai-visibility/run-check.ts). Renders:
//
//   - Headline metric: % of queries we were cited on, latest run.
//   - Trend over time: cited rate across the last N runs.
//   - Per-query latest result: which queries cite us + position.
//   - Recent run log: cost + duration accounting.
//
// Server-rendered. `dynamic = "force-dynamic"` so the dashboard
// always reflects the latest DB state — runs are infrequent (weekly)
// but when admin opens this page after a fresh run, they want to
// see new data.

import { PortalShell } from "@/components/portal-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { Eye, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";

export const dynamic = "force-dynamic";

interface CheckRow {
  id: number;
  ran_at: string;
  query: string;
  engine: string;
  cited_us: boolean;
  cited_position: number | null;
  cited_snippet: string | null;
  cited_urls: Array<{ url: string; title: string | null; snippet: string }>;
  response_text: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  web_searches_used: number | null;
  error_message: string | null;
}

async function loadChecks(): Promise<CheckRow[]> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("ai_visibility_checks")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[admin/ai-visibility] load failed", error);
    return [];
  }
  return (data ?? []) as CheckRow[];
}

/**
 * Group rows into "runs" by ran_at bucket — same calendar minute =
 * same run. Loose grouping is fine; the runner inserts rows in
 * series so timestamps cluster naturally.
 */
function groupRuns(rows: CheckRow[]): Array<{
  startedAt: string;
  rows: CheckRow[];
}> {
  const out: Array<{ startedAt: string; rows: CheckRow[] }> = [];
  for (const r of rows) {
    const minute = r.ran_at.slice(0, 16);
    const last = out[out.length - 1];
    if (last && last.startedAt.slice(0, 16) === minute) {
      last.rows.push(r);
    } else {
      out.push({ startedAt: r.ran_at, rows: [r] });
    }
  }
  return out;
}

/**
 * Latest result per (query, engine) combination across all runs.
 * Used for the per-query table — shows current state of citation
 * for each tracked query.
 */
function latestPerQuery(rows: CheckRow[]): CheckRow[] {
  const seen = new Set<string>();
  const out: CheckRow[] = [];
  for (const r of rows) {
    const k = `${r.query}|${r.engine}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AiVisibilityDashboard() {
  const rows = await loadChecks();
  const runs = groupRuns(rows);
  const latest = latestPerQuery(rows);

  // ── Headline metric ─────────────────────────────────────────────
  // % of queries we were cited on in the most recent run.
  const latestRun = runs[0];
  const latestRunCited = latestRun
    ? latestRun.rows.filter((r) => r.cited_us).length
    : 0;
  const latestRunTotal = latestRun?.rows.length ?? 0;
  const latestRunPct =
    latestRunTotal > 0
      ? Math.round((latestRunCited / latestRunTotal) * 100)
      : 0;

  // Previous run for trend comparison
  const prevRun = runs[1];
  const prevRunCited = prevRun
    ? prevRun.rows.filter((r) => r.cited_us).length
    : 0;
  const prevRunPct =
    prevRun && prevRun.rows.length > 0
      ? Math.round((prevRunCited / prevRun.rows.length) * 100)
      : 0;
  const trend =
    latestRunPct > prevRunPct ? "up" : latestRunPct < prevRunPct ? "down" : "flat";
  const trendDelta = latestRunPct - prevRunPct;

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="AI search visibility"
      pageSubtitle="Whether ChatGPT, Claude, Perplexity et al cite us when UK homeowners ask common heat-pump + solar questions."
    >
      {/* Headline + trend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Latest cited rate
          </p>
          <p className="text-3xl font-bold text-navy">{latestRunPct}%</p>
          <p className="text-sm text-slate-500 mt-1">
            {latestRunCited} of {latestRunTotal} queries
          </p>
          {prevRun && (
            <p
              className={`text-xs mt-2 inline-flex items-center gap-1 ${
                trend === "up"
                  ? "text-emerald-600"
                  : trend === "down"
                    ? "text-rose-600"
                    : "text-slate-400"
              }`}
            >
              {trend === "up" && <TrendingUp className="w-3 h-3" />}
              {trend === "down" && <TrendingDown className="w-3 h-3" />}
              {trend === "flat" && <Minus className="w-3 h-3" />}
              {trendDelta > 0 ? "+" : ""}
              {trendDelta}pp vs previous run
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Total runs logged
          </p>
          <p className="text-3xl font-bold text-navy">{runs.length}</p>
          <p className="text-sm text-slate-500 mt-1">
            {rows.length} query checks total
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Latest run
          </p>
          <p className="text-3xl font-bold text-navy">
            {latestRun ? formatDate(latestRun.startedAt) : "—"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Engine:{" "}
            {latestRun?.rows[0]?.engine ?? "—"}
          </p>
        </div>
      </div>

      {/* How to run */}
      {rows.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-8">
          <p className="font-semibold text-amber-900">
            No runs yet — kick off the first check
          </p>
          <pre className="mt-2 text-xs text-amber-900 bg-amber-100 rounded p-2 overflow-x-auto">
            {`node --env-file=.env.local node_modules/.bin/tsx \\
  scripts/ai-visibility/run-check.ts --limit 5`}
          </pre>
          <p className="mt-2 text-sm text-amber-800">
            Start with --limit 5 to validate everything works (~30s
            and ~£0.03 of API spend). Drop the flag to run all 50.
          </p>
        </div>
      )}

      {/* Per-query latest results */}
      {latest.length > 0 && (
        <div className="mb-8">
          <h3 className="text-base font-semibold text-navy mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Per-query latest results ({latest.length})
          </h3>
          <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-deep border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">
                    Query
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">
                    Engine
                  </th>
                  <th className="text-center px-4 py-2 font-medium text-slate-600">
                    Cited
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">
                    Position
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">
                    Last run
                  </th>
                </tr>
              </thead>
              <tbody>
                {latest.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-[var(--border)] last:border-b-0 ${
                      r.cited_us ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-2 text-navy">
                      <span title={r.cited_snippet ?? undefined}>
                        {r.query}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {r.engine}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {r.error_message ? (
                        <span
                          className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-100 text-rose-700"
                          title={r.error_message}
                        >
                          ERROR
                        </span>
                      ) : r.cited_us ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <Eye className="w-3.5 h-3.5" /> yes
                        </span>
                      ) : (
                        <span className="text-slate-400">no</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {r.cited_position ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 text-xs">
                      {formatDate(r.ran_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Run log */}
      {runs.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-navy mb-3">
            Recent runs ({runs.length})
          </h3>
          <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-cream-deep border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">
                    Started
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">
                    Queries
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">
                    Cited
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">
                    Errors
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">
                    Tokens
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">
                    Web searches
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 20).map((run) => {
                  const cited = run.rows.filter((r) => r.cited_us).length;
                  const errors = run.rows.filter((r) => r.error_message).length;
                  const tokens = run.rows.reduce(
                    (a, r) => a + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
                    0,
                  );
                  const searches = run.rows.reduce(
                    (a, r) => a + (r.web_searches_used ?? 0),
                    0,
                  );
                  return (
                    <tr
                      key={run.startedAt}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="px-4 py-2 text-navy">
                        {formatDate(run.startedAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {run.rows.length}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={cited > 0 ? "text-emerald-600 font-medium" : ""}>
                          {cited}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {errors > 0 ? (
                          <span className="text-rose-600">{errors}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {tokens.toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {searches}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
