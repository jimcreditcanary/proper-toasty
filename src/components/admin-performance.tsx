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
  Percent,
} from "lucide-react";
import type {
  PaymentRow,
  VerificationRow,
  UserRow,
  LeadRow,
  AdminSettings,
} from "@/app/dashboard/admin/performance/page";

type Props = {
  payments: PaymentRow[];
  verifications: VerificationRow[];
  users: UserRow[];
  leads: LeadRow[];
  settings: AdminSettings;
  userPriceMap: Record<string, number>;
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
  payments: { created_at: string }[]
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
  settings,
  userPriceMap,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const monthOptions = useMemo(() => getMonthOptions(verifications, payments), [verifications, payments]);

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

    const totalCost = copCost + anthropicCost + hostingCost;

    // 5. Profit
    const profit = revenueRealised - totalCost;

    // 6. Leads
    const uniqueLeadEmails = new Set(
      filteredLeads.map((l) => l.email.toLowerCase())
    );
    const leadCount = uniqueLeadEmails.size;

    // 7. Leads Converted: lead emails that also exist in users with credits > 0 or have payments
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

    // 8. Conversion Rate
    const conversionRate = leadCount > 0 ? (convertedCount / leadCount) * 100 : 0;

    return {
      revenue,
      revenueRealised,
      revenueUnrealised,
      copChecks,
      copCost,
      totalTokens,
      anthropicCost,
      hostingCost,
      totalCost,
      profit,
      leadCount,
      convertedCount,
      conversionRate,
    };
  }, [
    payments,
    verifications,
    users,
    leads,
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
          className="text-sm font-medium text-brand-muted-light"
        >
          Period
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 rounded-xl border border-white/[0.06] bg-navy-card px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-coral/40"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Revenue */}
        <MetricCard
          icon={PoundSterling}
          label="Revenue"
          value={formatGBP(metrics.revenue)}
          valueColor="text-coral"
          description="Total credits purchased"
        />

        {/* Revenue Realised */}
        <MetricCard
          icon={TrendingUp}
          label="Revenue Realised"
          value={formatGBP(metrics.revenueRealised)}
          valueColor="text-coral"
          description="Value of searches performed"
        />

        {/* Revenue Unrealised */}
        <MetricCard
          icon={Wallet}
          label="Revenue Unrealised"
          value={formatGBP(metrics.revenueUnrealised)}
          valueColor="text-brand-muted-light"
          description="Credits still outstanding"
          note={
            selectedMonth !== "all"
              ? "Showing all-time snapshot"
              : undefined
          }
        />

        {/* Cost of Realised Searches */}
        <MetricCard
          icon={ServerCog}
          label="Cost of Realised Searches"
          value={formatGBP(metrics.totalCost)}
          valueColor="text-fail"
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
              label: "Hosting (fixed)",
              value: formatGBP(metrics.hostingCost),
            },
          ]}
        />

        {/* Profit */}
        <MetricCard
          icon={metrics.profit >= 0 ? TrendingUp : TrendingDown}
          label="Profit"
          value={formatGBP(metrics.profit)}
          valueColor={metrics.profit >= 0 ? "text-pass-green" : "text-fail"}
          description="Realised revenue minus costs"
        />

        {/* Leads */}
        <MetricCard
          icon={Users}
          label="Leads"
          value={metrics.leadCount.toString()}
          valueColor="text-white"
          description="Unique lead emails"
        />

        {/* Leads Converted */}
        <MetricCard
          icon={UserCheck}
          label="Leads Converted"
          value={metrics.convertedCount.toString()}
          valueColor="text-coral"
          description="Leads who became paying users"
        />

        {/* Conversion Rate */}
        <MetricCard
          icon={Percent}
          label="Lead Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          valueColor={
            metrics.conversionRate > 0 ? "text-pass-green" : "text-brand-muted-light"
          }
          description="Converted / Total leads"
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
    <div className="rounded-2xl bg-navy-card border border-white/[0.06] p-5">
      <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-2">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {description && (
        <p className="text-xs text-brand-muted-light mt-1">{description}</p>
      )}
      {note && (
        <p className="text-[11px] text-brand-muted mt-1 italic">{note}</p>
      )}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
          {breakdown.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-brand-muted-light">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
