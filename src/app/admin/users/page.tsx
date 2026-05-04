// /admin/users — searchable list of every public.users row.
//
// Filters by role + blocked. Search hits email substring + UUID prefix.
// Per-row check counts come from a single GROUP BY query so we don't
// fan out N lookups; bounded to ~100 users per render anyway.
//
// All state in URL params, fully server-rendered.

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  ArrowRight,
  Ban,
  Coins,
  CreditCard,
  Download,
  Search,
  ShieldCheck,
  Users as UsersIcon,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    blocked?: string;
  }>;
}

const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "admin", label: "Admins" },
  { key: "installer", label: "Installers" },
  { key: "user", label: "Homeowners" },
] as const;

type RoleFilter = (typeof ROLE_FILTERS)[number]["key"];

function isRoleFilter(s: string | undefined): s is RoleFilter {
  return ROLE_FILTERS.some((f) => f.key === s);
}

interface UserListItem {
  id: string;
  email: string;
  role: string;
  credits: number;
  blocked: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  check_count: number;
}

async function loadUsers(args: {
  q: string;
  role: RoleFilter;
  blocked: "all" | "blocked" | "active";
}): Promise<UserListItem[]> {
  const admin = createAdminClient();

  let query = admin
    .from("users")
    .select("id, email, role, credits, blocked, stripe_customer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (args.role !== "all") {
    query = query.eq("role", args.role);
  }
  if (args.blocked === "blocked") {
    query = query.eq("blocked", true);
  } else if (args.blocked === "active") {
    query = query.eq("blocked", false);
  }

  const q = args.q.trim();
  if (q.length > 0) {
    // UUID prefix match if it looks like one (hex-only, ≥4 chars);
    // otherwise just email substring. PostgREST or() handles both.
    const isHexish = /^[0-9a-f-]{4,}$/i.test(q);
    const filters: string[] = [`email.ilike.%${q}%`];
    if (isHexish) {
      filters.push(`id.eq.${q}`); // exact UUID match if they pasted one
    }
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/users] query failed", error);
    return [];
  }
  const rows = data ?? [];

  // Fetch check counts in one shot. PostgREST doesn't expose
  // GROUP BY directly, but we can pull every check user_id matching
  // our user list and tally in memory — bounded to 100 users so the
  // worst-case payload is a few KB.
  const userIds = rows.map((r) => r.id);
  const checkCountByUser = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: checks } = await admin
      .from("checks")
      .select("user_id")
      .in("user_id", userIds);
    for (const c of checks ?? []) {
      checkCountByUser.set(c.user_id, (checkCountByUser.get(c.user_id) ?? 0) + 1);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    email: r.email ?? "",
    role: r.role ?? "user",
    credits: r.credits ?? 0,
    blocked: r.blocked ?? false,
    stripe_customer_id: r.stripe_customer_id ?? null,
    created_at: r.created_at ?? "",
    check_count: checkCountByUser.get(r.id) ?? 0,
  }));
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 200);
  const role: RoleFilter = isRoleFilter(params.role) ? params.role : "all";
  const blocked: "all" | "blocked" | "active" =
    params.blocked === "blocked" ? "blocked" : params.blocked === "active" ? "active" : "all";

  const rows = await loadUsers({ q, role, blocked });

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="User management"
      pageSubtitle="Roles, blocking, credits — and a way into every user's reports."
    >
      <form
        action="/admin/users"
        method="GET"
        className="mb-5 flex flex-col gap-3"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Email or UUID…"
            autoComplete="off"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
          />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="blocked" value={blocked} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
            Role
          </span>
          {ROLE_FILTERS.map((f) => {
            const active = f.key === role;
            const url = buildFilterUrl({ q, role: f.key, blocked });
            return (
              <Link
                key={f.key}
                href={url}
                className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-coral text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">
            Status
          </span>
          {(
            [
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "blocked", label: "Blocked" },
            ] as const
          ).map((f) => {
            const active = f.key === blocked;
            const url = buildFilterUrl({ q, role, blocked: f.key });
            return (
              <Link
                key={f.key}
                href={url}
                className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-coral text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          {rows.length === 100
            ? "Showing first 100 — refine search to see more."
            : `${rows.length} user${rows.length === 1 ? "" : "s"}`}
        </p>
        <a
          href={`/api/admin/users/export?${buildExportQuery({ q, role, blocked })}`}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-coral/40 hover:text-coral transition-colors"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <UsersIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium text-navy">No users match.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/users/${u.id}`}
                className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-coral/40 hover:shadow-sm transition-all"
              >
                <RoleAvatar role={u.role} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy truncate">
                      {u.email || "(no email)"}
                    </span>
                    <RoleBadge role={u.role} />
                    {u.blocked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <Ban className="w-3 h-3" />
                        Blocked
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {u.credits} credit{u.credits === 1 ? "" : "s"}
                    </span>
                    <span>
                      {u.check_count} report{u.check_count === 1 ? "" : "s"}
                    </span>
                    {u.stripe_customer_id && (
                      <span
                        className="inline-flex items-center gap-1 text-emerald-700"
                        title={u.stripe_customer_id}
                      >
                        <CreditCard className="w-3 h-3" />
                        Stripe customer
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Joined {formatDate(u.created_at)}
                  </p>
                </div>
                <ArrowRight className="shrink-0 w-4 h-4 text-slate-400 mt-1" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

function buildFilterUrl(args: {
  q: string;
  role: RoleFilter;
  blocked: "all" | "active" | "blocked";
}): string {
  const params = new URLSearchParams();
  if (args.q) params.set("q", args.q);
  if (args.role !== "all") params.set("role", args.role);
  if (args.blocked !== "all") params.set("blocked", args.blocked);
  const qs = params.toString();
  return `/admin/users${qs ? `?${qs}` : ""}`;
}

function buildExportQuery(args: {
  q: string;
  role: RoleFilter;
  blocked: "all" | "active" | "blocked";
}): string {
  const params = new URLSearchParams();
  if (args.q) params.set("q", args.q);
  if (args.role !== "all") params.set("role", args.role);
  if (args.blocked !== "all") params.set("blocked", args.blocked);
  return params.toString();
}

function RoleAvatar({ role }: { role: string }) {
  const Icon = role === "admin" ? ShieldCheck : role === "installer" ? Wrench : UsersIcon;
  const palette =
    role === "admin"
      ? "bg-coral/10 text-coral border-coral/30"
      : role === "installer"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border ${palette}`}
    >
      <Icon className="w-4 h-4" />
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const palette =
    role === "admin"
      ? "bg-coral/10 text-coral"
      : role === "installer"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";
  const label = role === "admin" ? "Admin" : role === "installer" ? "Installer" : "User";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${palette}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
