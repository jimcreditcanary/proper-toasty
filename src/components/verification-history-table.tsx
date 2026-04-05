"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X } from "lucide-react";

type HistoryRow = {
  id: string;
  shortId: string;
  created_at: string;
  source: "verification" | "scan";
  flowType: string | null;
  fileName: string | null;
  accountName: string | null;
  amount: number | null;
  risk: string | null;
  status: string;
  paymentStatus: string | null;
};

const RISK_BADGE: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  MEDIUM: { label: "Medium", className: "bg-amber-50 border-amber-200 text-amber-700" },
  HIGH: { label: "High", className: "bg-red-50 border-red-200 text-red-700" },
  UNKNOWN: { label: "Unknown", className: "bg-slate-50 border-slate-200 text-slate-500" },
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  processing: "secondary",
  pending: "outline",
  failed: "destructive",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number | null | undefined) {
  if (amount == null) return "\u2014";
  return `\u00A3${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
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

export function VerificationHistoryTable({ history }: { history: HistoryRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = typeFilter !== "all" || dateFilter !== "all" || search !== "";

  const filtered = useMemo(() => {
    let rows = history;

    // Search
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.shortId && r.shortId.toLowerCase().includes(q)) ||
          (r.fileName && r.fileName.toLowerCase().includes(q)) ||
          (r.accountName && r.accountName.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      rows = rows.filter((r) => {
        if (typeFilter === "API") return r.flowType === "api";
        // "User" = everything that's not api (dashboard only shows logged-in user's verifications)
        return r.flowType !== "api";
      });
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = Date.now();
      const ms: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "90d": 90 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - (ms[dateFilter] ?? 0);
      rows = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
    }

    return rows;
  }, [history, search, typeFilter, dateFilter]);

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setDateFilter("all");
  }

  function handleRowClick(row: HistoryRow) {
    const href =
      row.source === "verification"
        ? `/dashboard/results/${row.id}`
        : `/dashboard/scans/${row.id}`;
    router.push(href);
  }

  return (
    <>
      {/* Search + filter bar */}
      <div className="px-6 py-3 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file or account name..."
            className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters
              ? "bg-coral/5 border border-coral/20 text-coral"
              : "bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900"
          }`}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full bg-coral text-[10px] font-bold text-white">
              {(typeFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-coral"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-coral"
            >
              {DATE_OPTIONS.map((o) => (
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
            <Search className="mb-3 size-10 text-slate-400/50" />
            <p className="text-sm font-medium text-slate-900">No results found</p>
            <p className="mt-1 text-xs text-slate-400">
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
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Search ID</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">File</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Account Name</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Level</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">Paid</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const riskInfo = row.risk ? RISK_BADGE[row.risk] ?? RISK_BADGE.UNKNOWN : null;
                  return (
                    <tr
                      key={`${row.source}-${row.id}`}
                      onClick={() => handleRowClick(row)}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-2 font-mono text-slate-500 whitespace-nowrap">
                        {row.shortId || "\u2014"}
                      </td>
                      <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {row.flowType === "api" ? "API" : "User"}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className="font-medium text-coral"
                          title={row.fileName ?? undefined}
                        >
                          {row.fileName ? truncate(row.fileName, 25) : "\u2014"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-500">
                        {row.accountName ?? "\u2014"}
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-slate-500">
                        {formatAmount(row.amount)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {row.status === "completed" && riskInfo ? (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${riskInfo.className}`}>
                            {riskInfo.label}
                          </span>
                        ) : row.status !== "completed" ? (
                          <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"}>
                            {row.status}
                          </Badge>
                        ) : (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${RISK_BADGE.UNKNOWN.className}`}>
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {row.paymentStatus === "completed" ? (
                          <span className="inline-flex items-center rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium">
                            Paid
                          </span>
                        ) : row.paymentStatus === "pending" ? (
                          <span className="inline-flex items-center rounded-full border bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-0.5 text-[11px] font-medium">
                            Pending
                          </span>
                        ) : row.paymentStatus === "failed" ? (
                          <span className="inline-flex items-center rounded-full border bg-red-50 text-red-700 border-red-200 px-2.5 py-0.5 text-[11px] font-medium">
                            Failed
                          </span>
                        ) : (
                          <span className="text-slate-400">{"\u2014"}</span>
                        )}
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
