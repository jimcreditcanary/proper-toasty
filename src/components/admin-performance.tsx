"use client";

import { useMemo, useState } from "react";
import {
  PoundSterling,
  TrendingUp,
  TrendingDown,
  Wallet,
  ServerCog,
  Users,
  UserCheck,
  Mail,
  AlertTriangle,
  Route,
} from "lucide-react";
import type {
  PaymentRow,
  VerificationRow,
  UserRow,
  LeadRow,
  LeadImpressionRow,
  AdminSettings,
  ObPaymentRow,
} from "@/app/dashboard/admin/performance/page";

type Props = {
  payments: PaymentRow[];
  verifications: VerificationRow[];
  users: UserRow[];
  leads: LeadRow[];
  leadImpressions: LeadImpressionRow[];
  settings: AdminSettings;
  userPriceMap: Record<string, number>;
  obPayments: ObPaymentRow[];
};

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getMonthOptions(
  verifications: { created_at: string }[],
  payments: { created_at: string }[],
  leadImpressions: { created_at: string }[]
): { label: string; value: string }[] {
  // Collect months that have actual data
  const monthsWithData = new Set<string>();
  for (const v of verifications) {
    const d = new Date(v.created_at);
    monthsWithData.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  for (const p of payments) {
    const d = new Date(p.created_at);
    monthsWithData.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  for (const li of leadImpressions) {
    const d = new Date(li.created_at);
    monthsWithData.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const options: { label: string; value: string }[] = [
    { label: "All Time", value: "all" },
  ];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthsWithData.has(value)) continue;
    const label = d.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    options.push({ label, value });
  }
  return options;
}

function isInMonth(dateStr: string, month: string): boolean {
  if (month === "all") return true;
  const d = new Date(dateStr);
  const check = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return check === month;
}

function countMonthsInRange(month: string): number {
  if (month === "all") return 0; // handled separately
  return 1;
}

export function AdminPerformance({
  payments,
  verifications,
  users,
  leads,
  leadImpressions,
  settings,
  userPriceMap,
  obPayments,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const monthOptions = useMemo(() => getMonthOptions(verifications, payments, leadImpressions), [verifications, payments, leadImpressions]);

  const metrics = useMemo(() => {
    // Filter data by selected month
    const filteredPayments = payments.filter((p) =>
      isInMonth(p.created_at, selectedMonth)
    );
    const filteredVerifications = verifications.filter((v) =>
      isInMonth(v.created_at, selectedMonth)
    );
    const filteredLeads = leads.filter((l) =>
      isInMonth(l.created_at, selectedMonth)
    );

    // 1. Revenue: total amount of completed payments (amount_total is in pence)
    const revenue = filteredPayments.reduce(
      (sum, p) => sum + p.amount_total / 100,
      0
    );

    // 2. Revenue Realised: count of verifications x each user's price_per_credit
    const revenueRealised = filteredVerifications.reduce((sum, v) => {
      if (!v.user_id) return sum;
      const pricePerCredit = userPriceMap[v.user_id] ?? 0;
      return sum + pricePerCredit;
    }, 0);

    // 3. Revenue Unrealised: remaining credits x price_per_credit for each user
    // Only shown for "All Time" since credits are a point-in-time snapshot
    const revenueUnrealised = users.reduce((sum, u) => {
      const pricePerCredit = userPriceMap[u.id] ?? 0;
      return sum + u.credits * pricePerCredit;
    }, 0);

    // 4. Cost of Realised Searches
    const copChecks = filteredVerifications.filter(
      (v) => v.cop_result !== null
    ).length;
    const copCost = copChecks * settings.cop_cost_per_check;

    const totalTokens = filteredVerifications.reduce(
      (sum, v) => sum + (v.anthropic_tokens_used ?? 0),
      0
    );
    const anthropicCost =
      (totalTokens / 1000) * settings.anthropic_cost_per_1k_tokens;

    // Fixed cost: monthly hosting cost
    // For "all time", count distinct months in the verifications data range
    let hostingCost = 0;
    if (selectedMonth === "all") {
      const months = new Set<string>();
      for (const v of verifications) {
        const d = new Date(v.created_at);
        months.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
      hostingCost = months.size * settings.monthly_hosting_cost;
    } else {
      hostingCost =
        countMonthsInRange(selectedMonth) * settings.monthly_hosting_cost;
    }

    // OB transaction cost
    const filteredObPayments = obPayments.filter((op) =>
      isInMonth(op.created_at, selectedMonth)
    );
    const obCount = filteredObPayments.length;
    const obCost = obCount * settings.ob_cost_per_transaction;

    const totalCost = copCost + anthropicCost + hostingCost + obCost;

    // 5. Profit
    const profit = revenueRealised - totalCost;

    // 6. Wizard Starts (lead impressions)
    const filteredImpressions = leadImpressions.filter((li) =>
      isInMonth(li.created_at, selectedMonth)
    );
    const wizardStarts = filteredImpressions.length;

    // Incomplete journeys
    const incompleteJourneys = filteredImpressions.filter((li) => !li.completed);
    const incompleteCount = incompleteJourneys.length;
    const completedCount = filteredImpressions.filter((li) => li.completed).length;
    const completionRate = wizardStarts > 0 ? (completedCount / wizardStarts) * 100 : 0;

    // Wasted costs on incomplete journeys
    const incompleteExtractionCost = incompleteJourneys.reduce(
      (sum, li) => sum + (li.extraction_cost || 0), 0
    );
    const incompleteMarketplaceCost = incompleteJourneys.reduce(
      (sum, li) => sum + (li.marketplace_cost || 0), 0
    );
    const totalWastedCost = incompleteExtractionCost + incompleteMarketplaceCost;

    // Drop-off by step
    const stepDropoffs: Record<string, number> = {};
    for (const li of incompleteJourneys) {
      const step = li.last_step || "1";
      stepDropoffs[step] = (stepDropoffs[step] || 0) + 1;
    }

    // 7. Emails Captured (leads)
    const uniqueLeadEmails = new Set(
      filteredLeads.map((l) => l.email.toLowerCase())
    );
    const emailsCaptured = uniqueLeadEmails.size;

    // 8. Email Capture Rate
    const emailCaptureRate = wizardStarts > 0 ? (emailsCaptured / wizardStarts) * 100 : 0;

    // 9. Converted to Paying: lead emails that also exist in users with credits > 0 or have payments
    const userEmailSet = new Set(users.map((u) => u.email.toLowerCase()));
    const usersWithPayments = new Set(payments.map((p) => p.user_id));
    const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    let convertedCount = 0;
    for (const email of uniqueLeadEmails) {
      if (userEmailSet.has(email)) {
        const matchedUser = userMap.get(email);
        if (matchedUser) {
          if (
            matchedUser.credits > 0 ||
            usersWithPayments.has(matchedUser.id)
          ) {
            convertedCount++;
          }
        }
      }
    }

    // 10. Conversion Rate (from emails captured)
    const conversionRate = emailsCaptured > 0 ? (convertedCount / emailsCaptured) * 100 : 0;

    return {
      revenue,
      revenueRealised,
      revenueUnrealised,
      copChecks,
      copCost,
      totalTokens,
      anthropicCost,
      hostingCost,
      obCount,
      obCost,
      totalCost,
      profit,
      wizardStarts,
      emailsCaptured,
      emailCaptureRate,
      convertedCount,
      conversionRate,
      incompleteCount,
      completedCount,
      completionRate,
      incompleteExtractionCost,
      incompleteMarketplaceCost,
      totalWastedCost,
      stepDropoffs,
    };
  }, [
    payments,
    verifications,
    users,
    leads,
    leadImpressions,
    obPayments,
    settings,
    userPriceMap,
    selectedMonth,
  ]);

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="month-select"
          className="text-sm font-medium text-slate-500"
        >
          Period
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-coral/40"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 1: Revenue */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          icon={PoundSterling}
          label="Revenue (Credits Purchased)"
          value={formatGBP(metrics.revenue)}
          valueColor="text-coral"
          description="Total credits purchased"
        />
        <MetricCard
          icon={Wallet}
          label="Revenue Unrealised"
          value={formatGBP(metrics.revenueUnrealised)}
          valueColor="text-slate-500"
          description="Credits still outstanding"
          note={
            selectedMonth !== "all"
              ? "Showing all-time snapshot"
              : undefined
          }
        />
      </div>

      {/* Row 2: Realised */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={TrendingUp}
          label="Realised Revenue"
          value={formatGBP(metrics.revenueRealised)}
          valueColor="text-coral"
          description="Value of searches performed"
        />
        <MetricCard
          icon={ServerCog}
          label="Cost of Realised Searches"
          value={formatGBP(metrics.totalCost)}
          valueColor="text-red-600"
          breakdown={[
            {
              label: `CoP checks (${metrics.copChecks})`,
              value: formatGBP(metrics.copCost),
            },
            {
              label: `Anthropic tokens (${metrics.totalTokens.toLocaleString()})`,
              value: formatGBP(metrics.anthropicCost),
            },
            {
              label: `OB transactions (${metrics.obCount})`,
              value: formatGBP(metrics.obCost),
            },
            {
              label: "Hosting (fixed)",
              value: formatGBP(metrics.hostingCost),
            },
          ]}
        />
        <MetricCard
          icon={metrics.profit >= 0 ? TrendingUp : TrendingDown}
          label="Profit from Realised Searches"
          value={formatGBP(metrics.profit)}
          valueColor={metrics.profit >= 0 ? "text-emerald-600" : "text-red-600"}
          description="Realised revenue minus costs"
        />
      </div>

      {/* Row 3: Lead Funnel */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={Users}
          label="Website Searches"
          value={metrics.wizardStarts.toString()}
          valueColor="text-slate-900"
          description="Free check page visits"
        />
        <MetricCard
          icon={Mail}
          label="Emails Captured"
          value={metrics.emailsCaptured.toString()}
          valueColor="text-coral"
          description="Leads who provided email"
          note={metrics.wizardStarts > 0 ? `(${metrics.emailCaptureRate.toFixed(1)}% of website searches)` : undefined}
        />
        <MetricCard
          icon={UserCheck}
          label="Leads Converted to Paying"
          value={metrics.convertedCount.toString()}
          valueColor={metrics.convertedCount > 0 ? "text-emerald-600" : "text-slate-500"}
          description="Leads who bought credits"
          note={metrics.emailsCaptured > 0 ? `(${metrics.conversionRate.toFixed(1)}% of emails)` : undefined}
        />
      </div>

      {/* Row 4: Incomplete Journeys */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={Route}
          label="Journey Completion"
          value={`${metrics.completedCount} / ${metrics.wizardStarts}`}
          valueColor="text-slate-900"
          description="Completed vs started"
          note={metrics.wizardStarts > 0 ? `(${metrics.completionRate.toFixed(1)}% completion rate)` : undefined}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Incomplete Journeys"
          value={metrics.incompleteCount.toString()}
          valueColor={metrics.incompleteCount > 0 ? "text-amber-600" : "text-slate-500"}
          description="Started but not completed"
          breakdown={Object.keys(metrics.stepDropoffs).length > 0
            ? Object.entries(metrics.stepDropoffs)
                .sort(([, a], [, b]) => b - a)
                .map(([step, count]) => ({
                  label: `Dropped at step ${step}`,
                  value: count.toString(),
                }))
            : undefined
          }
        />
        <MetricCard
          icon={TrendingDown}
          label="Wasted Cost (Incomplete)"
          value={formatGBP(metrics.totalWastedCost)}
          valueColor={metrics.totalWastedCost > 0 ? "text-red-600" : "text-slate-500"}
          description="API costs with no conversion"
          breakdown={metrics.totalWastedCost > 0
            ? [
                { label: "Invoice extraction", value: formatGBP(metrics.incompleteExtractionCost) },
                { label: "Marketplace checks", value: formatGBP(metrics.incompleteMarketplaceCost) },
              ]
            : undefined
          }
        />
      </div>
    </div>
  );
}

type MetricCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueColor: string;
  description?: string;
  note?: string;
  breakdown?: { label: string; value: string }[];
};

function MetricCard({
  icon: Icon,
  label,
  value,
  valueColor,
  description,
  note,
  breakdown,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5">
      <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
      {note && (
        <p className="text-[11px] text-slate-400 mt-1 italic">{note}</p>
      )}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
          {breakdown.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-slate-500">{item.label}</span>
              <span className="text-slate-900 font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
