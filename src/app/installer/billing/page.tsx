// /installer/billing — consolidated VAT receipts + monthly spend
// + credit usage breakdown.
//
// Sections, top-to-bottom:
//   1. YTD summary cards (calendar year, accountant-friendly):
//      - £ spent
//      - Credits purchased
//      - Credits used (with breakdown)
//   2. Monthly ledger table (last 12 months) — money in + credits used,
//      collapsed into one row per month so it tracks easily.
//   3. Stripe purchases / receipts table — every credit purchase, with
//      a downloadable Stripe receipt link per row.
//   4. CSV export — all rows (purchases + usage) so the accountant
//      can drop straight into a spreadsheet for the VAT return.
//
// All money in pence at the data layer; formatGbp at render. Read-
// only — no writes anywhere on this page.

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownToLine,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  PoundSterling,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { formatGbp } from "@/lib/proposals/schema";
import { loadBilling, type BillingData } from "@/lib/installer-billing/queries";

export const dynamic = "force-dynamic";

const BILLING_WINDOW_MONTHS = 12;

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/billing");
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
        pageTitle="Billing & receipts"
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

  const data = await loadBilling(admin, {
    userId: user.id,
    installerId: installer.id,
    months: BILLING_WINDOW_MONTHS,
  });

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Billing & receipts"
      pageSubtitle={`Consolidated spend + VAT receipts. Last ${BILLING_WINDOW_MONTHS} months below.`}
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {/* YTD summary */}
      <YearToDateSummary ytd={data.ytd} />

      {/* Monthly ledger table */}
      <MonthlyLedger data={data} />

      {/* Receipts table */}
      <ReceiptsTable purchases={data.purchases} />

      {/* CSV export */}
      <ExportCard hasData={data.purchases.length > 0 || data.totals.usage.totalCreditsUsed > 0} />
    </PortalShell>
  );
}

// ─── YTD summary cards ─────────────────────────────────────────────

function YearToDateSummary({ ytd }: { ytd: BillingData["ytd"] }) {
  const year = new Date().getUTCFullYear();
  return (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        Year to date — {year}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label="Spent"
          value={formatGbp(ytd.pencePaid)}
          sub={`${ytd.purchaseCount} purchase${ytd.purchaseCount === 1 ? "" : "s"} this year`}
          icon={<PoundSterling className="w-4 h-4" />}
          accent="emerald"
        />
        <SummaryCard
          label="Credits purchased"
          value={ytd.creditsPurchased.toLocaleString("en-GB")}
          sub={
            ytd.purchaseCount > 0 && ytd.creditsPurchased > 0
              ? `${formatGbp(Math.round(ytd.pencePaid / ytd.creditsPurchased))} avg per credit`
              : "—"
          }
          icon={<CreditCard className="w-4 h-4" />}
        />
        <SummaryCard
          label="Credits used"
          value={ytd.creditsUsed.toLocaleString("en-GB")}
          sub={
            ytd.creditsPurchased > 0
              ? `${Math.round((ytd.creditsUsed / ytd.creditsPurchased) * 100)}% of purchased`
              : "—"
          }
          icon={<Receipt className="w-4 h-4" />}
          accent="coral"
        />
        <SummaryCard
          label="Net balance change"
          value={(ytd.creditsPurchased - ytd.creditsUsed).toLocaleString("en-GB")}
          sub={
            ytd.creditsPurchased - ytd.creditsUsed >= 0
              ? "Credits left from this year"
              : "Used more than purchased"
          }
          icon={<RefreshCw className="w-4 h-4" />}
        />
      </div>
    </>
  );
}

function SummaryCard({
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

// ─── Monthly ledger ─────────────────────────────────────────────────

function MonthlyLedger({ data }: { data: BillingData }) {
  // Render newest-first so the most recent activity is at the top of
  // the table — easier to scan than oldest-first.
  const rows = [...data.months].reverse();
  const hasAny = data.totals.spend.purchaseCount > 0 || data.totals.usage.totalCreditsUsed > 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-semibold text-navy">Monthly ledger</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Each month: money in (Stripe purchases) + credits out
          (lead acceptances + pre-survey sends).
        </p>
      </div>

      {!hasAny ? (
        <div className="p-8 text-center">
          <p className="text-sm text-slate-500">
            No activity in the last {BILLING_WINDOW_MONTHS} months.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-2.5">Month</th>
                <th className="text-right px-3 py-2.5">£ in</th>
                <th className="text-right px-3 py-2.5">Credits in</th>
                <th className="text-right px-3 py-2.5">Lead accepts</th>
                <th className="text-right px-3 py-2.5">Pre-surveys</th>
                <th className="text-right px-5 py-2.5">Credits out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const isEmpty =
                  m.spend.purchaseCount === 0 && m.usage.totalCreditsUsed === 0;
                return (
                  <tr
                    key={m.monthStart}
                    className={`border-b border-slate-200 last:border-b-0 ${
                      isEmpty ? "text-slate-400" : "text-slate-800"
                    }`}
                  >
                    <td className="px-5 py-3 font-medium">{m.label}</td>
                    <td className="text-right px-3 py-3">
                      {m.spend.pencePaid > 0
                        ? formatGbp(m.spend.pencePaid)
                        : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {m.spend.creditsPurchased > 0
                        ? `+${m.spend.creditsPurchased}`
                        : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {m.usage.leadAcceptances > 0
                        ? `${m.usage.leadAcceptances} (${m.usage.leadCreditsUsed} ${m.usage.leadCreditsUsed === 1 ? "credit" : "credits"})`
                        : "—"}
                    </td>
                    <td className="text-right px-3 py-3">
                      {m.usage.preSurveyRequests > 0
                        ? `${m.usage.preSurveyRequests} (${m.usage.preSurveyCreditsUsed} ${m.usage.preSurveyCreditsUsed === 1 ? "credit" : "credits"})`
                        : "—"}
                    </td>
                    <td
                      className={`text-right px-5 py-3 font-semibold ${
                        m.usage.totalCreditsUsed > 0 ? "text-navy" : ""
                      }`}
                    >
                      {m.usage.totalCreditsUsed > 0
                        ? `−${m.usage.totalCreditsUsed}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-[11px]">
              <tr>
                <td className="px-5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Window total
                </td>
                <td className="text-right px-3 py-3 font-bold text-navy">
                  {formatGbp(data.totals.spend.pencePaid)}
                </td>
                <td className="text-right px-3 py-3 font-bold text-emerald-700">
                  +{data.totals.spend.creditsPurchased}
                </td>
                <td className="text-right px-3 py-3 text-slate-700">
                  {data.totals.usage.leadAcceptances} (
                  {data.totals.usage.leadCreditsUsed}{" "}
                  {data.totals.usage.leadCreditsUsed === 1 ? "credit" : "credits"})
                </td>
                <td className="text-right px-3 py-3 text-slate-700">
                  {data.totals.usage.preSurveyRequests} (
                  {data.totals.usage.preSurveyCreditsUsed}{" "}
                  {data.totals.usage.preSurveyCreditsUsed === 1 ? "credit" : "credits"})
                </td>
                <td className="text-right px-5 py-3 font-bold text-coral-dark">
                  −{data.totals.usage.totalCreditsUsed}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Receipts table ─────────────────────────────────────────────────

function ReceiptsTable({
  purchases,
}: {
  purchases: BillingData["purchases"];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold text-navy">
            Stripe receipts (VAT)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Every credit purchase. Receipts are hosted by Stripe — opens
            in a new tab.
          </p>
        </div>
        <Link
          href="/installer/credits"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-colors"
        >
          <CreditCard className="w-3 h-3" />
          Buy more credits
        </Link>
      </div>

      {purchases.length === 0 ? (
        <div className="p-8 text-center">
          <Receipt className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No credit purchases in the window. Top up at{" "}
            <Link
              href="/installer/credits"
              className="text-coral hover:text-coral-dark underline"
            >
              /installer/credits
            </Link>{" "}
            to start.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-2.5">Date</th>
                <th className="text-right px-3 py-2.5">Credits</th>
                <th className="text-right px-3 py-2.5">Amount</th>
                <th className="text-left px-3 py-2.5">Method</th>
                <th className="text-right px-5 py-2.5">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <td className="px-5 py-3 text-slate-700">
                    {formatDateTime(p.created_at)}
                  </td>
                  <td className="text-right px-3 py-3 font-semibold text-navy">
                    +{p.pack_credits}
                  </td>
                  <td className="text-right px-3 py-3 font-semibold text-navy">
                    {formatGbp(p.price_pence)}
                  </td>
                  <td className="px-3 py-3">
                    {p.is_auto_recharge ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Auto top-up
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        Checkout
                      </span>
                    )}
                    {p.status === "refunded" && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 ml-1">
                        Refunded
                      </span>
                    )}
                  </td>
                  <td className="text-right px-5 py-3">
                    {p.stripe_receipt_url ? (
                      <a
                        href={p.stripe_receipt_url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Export ─────────────────────────────────────────────────────────

function ExportCard({ hasData }: { hasData: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3 flex-wrap">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 shrink-0">
          <FileText className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-sm font-semibold text-navy">
            CSV export for accountants
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Two-tab CSV (Stripe purchases + credit usage), last 12
            months. Drops straight into Excel / Numbers / Sheets.
          </p>
        </div>
        <a
          href="/api/installer/billing/export"
          download
          className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full font-semibold text-xs shadow-sm transition-colors ${
            hasData
              ? "bg-coral hover:bg-coral-dark text-white"
              : "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none"
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          Download CSV
        </a>
      </div>
      <p className="text-[10px] text-slate-400 mt-3 inline-flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Includes VAT-receipt URLs alongside each Stripe purchase row.
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
