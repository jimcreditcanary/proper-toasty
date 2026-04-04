"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type AdminSearchRow = {
  id: string;
  short_id: string;
  created_at: string;
  user_email: string;
  flow_type: string | null;
  user_type: "Lead" | "User" | "API";
  account_name: string | null;
  overall_risk: string | null;
  status: string | null;
  price_per_credit: number;
  cop_cost_per_check: number;
};

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-pass/10 border-pass/20 text-pass" },
  MEDIUM: { label: "Medium", className: "bg-warn/10 border-warn/20 text-warn" },
  HIGH: { label: "High", className: "bg-fail/10 border-fail/20 text-fail" },
  UNKNOWN: { label: "Unknown", className: "bg-white/[0.05] border-white/10 text-brand-muted-light" },
};

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "Lead", label: "Lead" },
  { value: "User", label: "User" },
  { value: "API", label: "API" },
] as const;

const DATE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

const RISK_OPTIONS = [
  { value: "all", label: "All risks" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
] as const;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return `\u00A3${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

function getUserTypeLabel(userType: "Lead" | "User" | "API") {
  return userType;
}

export function AdminSearchesTable({ rows }: { rows: AdminSearchRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = typeFilter !== "all" || dateFilter !== "all" || riskFilter !== "all" || search !== "";

  const filtered = useMemo(() => {
    let result = rows;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          (r.short_id && r.short_id.toLowerCase().includes(q)) ||
          (r.user_email && r.user_email.toLowerCase().includes(q)) ||
          (r.account_name && r.account_name.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((r) => r.user_type === typeFilter);
    }

    if (riskFilter !== "all") {
      result = result.filter((r) => r.overall_risk === riskFilter);
    }

    if (dateFilter !== "all") {
      const now = Date.now();
      const ms: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "90d": 90 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - (ms[dateFilter] ?? 0);
      result = result.filter((r) => new Date(r.created_at).getTime() >= cutoff);
    }

    return result;
  }, [rows, search, typeFilter, dateFilter, riskFilter]);

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setDateFilter("all");
    setRiskFilter("all");
  }

  return (
    <>
      {/* Search + filter bar */}
      <div className="px-6 py-3 border-b border-white/[0.06] flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or account name..."
            className="w-full rounded-xl bg-white/[0.05] border border-white/[0.06] pl-9 pr-3 py-2 text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-coral transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters
              ? "bg-coral/10 border border-coral/20 text-coral"
              : "bg-white/[0.05] border border-white/[0.06] text-brand-muted-light hover:text-white"
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full bg-coral text-[10px] font-bold text-white">
              {(typeFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0) + (riskFilter !== "all" ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-white/[0.06] flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-brand-muted uppercase tracking-wider">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg bg-white/[0.05] border border-white/[0.06] px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-coral [&>option]:bg-navy-card [&>option]:text-white"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-brand-muted uppercase tracking-wider">Date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg bg-white/[0.05] border border-white/[0.06] px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-coral [&>option]:bg-navy-card [&>option]:text-white"
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-brand-muted uppercase tracking-wider">Risk</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="rounded-lg bg-white/[0.05] border border-white/[0.06] px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-coral [&>option]:bg-navy-card [&>option]:text-white"
            >
              {RISK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-coral hover:text-coral-light font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-3 size-10 text-brand-muted/50" />
            <p className="text-sm font-medium text-white">No results found</p>
            <p className="mt-1 text-xs text-brand-muted">
              {hasActiveFilters
                ? "Try adjusting your search or filters"
                : "No verifications yet"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-coral hover:text-coral-light font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Search ID</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">User Email</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Account Name</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Risk Level</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Price</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Cost</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Profit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const riskInfo = row.overall_risk ? RISK_BADGE[row.overall_risk] ?? RISK_BADGE.UNKNOWN : null;
                  const profit = row.price_per_credit - row.cop_cost_per_check;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 px-2 whitespace-nowrap">
                        <Link
                          href={`/dashboard/results/${row.id}`}
                          className="font-mono text-coral hover:text-coral-light transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.short_id}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-brand-muted-light whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="py-3 px-2 text-brand-muted-light">
                        <span title={row.user_email}>
                          {truncate(row.user_email, 28)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-brand-muted-light">
                          {getUserTypeLabel(row.user_type)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-brand-muted-light">
                        {row.account_name ? truncate(row.account_name, 30) : "\u2014"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {riskInfo ? (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${riskInfo.className}`}>
                            {riskInfo.label}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${RISK_BADGE.UNKNOWN.className}`}>
                            {row.status === "completed" ? "Unknown" : (row.status ?? "Pending")}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-brand-muted-light">
                        {formatCurrency(row.price_per_credit)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-brand-muted-light">
                        {formatCurrency(row.cop_cost_per_check)}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono ${profit > 0 ? "text-pass" : profit < 0 ? "text-fail" : "text-brand-muted-light"}`}>
                        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
