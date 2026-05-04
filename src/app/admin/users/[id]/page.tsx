// /admin/users/[id] — drilldown for a single user.
//
// Five sections:
//   1. Header: identity (email, role, blocked) + "open as" links
//   2. Action panel: change role / block-unblock / adjust credits
//   3. Recent reports for this user (last 25, links into /admin/reports/[id])
//   4. Stripe purchases (if installer/has stripe customer id)
//   5. Credit adjustment audit log

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal-shell";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Coins,
  CreditCard,
  FileText,
  ShieldCheck,
  User as UserIcon,
  Wrench,
} from "lucide-react";
import { RoleForm, BlockedForm, CreditsForm } from "./actions";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type CheckRow = Database["public"]["Tables"]["checks"]["Row"];
type AdjustmentRow = Database["public"]["Tables"]["admin_credit_adjustments"]["Row"];
type PurchaseRow = Database["public"]["Tables"]["installer_credit_purchases"]["Row"];

interface PageProps {
  params: Promise<{ id: string }>;
}

interface LoadedUser {
  user: {
    id: string;
    email: string;
    role: "admin" | "user" | "installer";
    credits: number;
    blocked: boolean;
    stripe_customer_id: string | null;
    created_at: string;
    updated_at: string;
  };
  recentChecks: Pick<
    CheckRow,
    "id" | "short_id" | "address_formatted" | "postcode" | "status" | "created_at"
  >[];
  recentPurchases: Pick<
    PurchaseRow,
    "id" | "created_at" | "price_pence" | "pack_credits" | "stripe_receipt_url"
  >[];
  recentAdjustments: (Pick<
    AdjustmentRow,
    "id" | "delta" | "balance_before" | "balance_after" | "reason" | "created_at" | "admin_id"
  > & { admin_email: string | null })[];
  isSelf: boolean;
}

async function loadUser(id: string): Promise<LoadedUser | null> {
  const admin = createAdminClient();

  const { data: user, error } = await admin
    .from("users")
    .select("id, email, role, credits, blocked, stripe_customer_id, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[admin/users/:id] user query failed", error);
  }
  if (!user) return null;

  // Determine self-check by reading the current admin's id from the
  // auth-aware client (server component can do this directly).
  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const isSelf = viewer?.id === user.id;

  const [checksRes, purchasesRes, adjustmentsRes] = await Promise.all([
    admin
      .from("checks")
      .select("id, short_id, address_formatted, postcode, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25),
    user.stripe_customer_id
      ? admin
          .from("installer_credit_purchases")
          .select("id, created_at, price_pence, pack_credits, stripe_receipt_url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(25)
      : Promise.resolve({ data: [] as PurchaseRow[] }),
    admin
      .from("admin_credit_adjustments")
      .select("id, delta, balance_before, balance_after, reason, created_at, admin_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  // Hydrate admin emails for the audit log.
  const adminIds = Array.from(
    new Set((adjustmentsRes.data ?? []).map((a) => a.admin_id)),
  );
  let adminEmailById = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: admins } = await admin
      .from("users")
      .select("id, email")
      .in("id", adminIds);
    adminEmailById = new Map((admins ?? []).map((a) => [a.id, a.email ?? ""]));
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      role: ((user.role ?? "user") as "admin" | "user" | "installer"),
      credits: user.credits ?? 0,
      blocked: user.blocked ?? false,
      stripe_customer_id: user.stripe_customer_id ?? null,
      created_at: user.created_at ?? "",
      updated_at: user.updated_at ?? "",
    },
    recentChecks: (checksRes.data ?? []) as LoadedUser["recentChecks"],
    recentPurchases: (purchasesRes.data ?? []) as LoadedUser["recentPurchases"],
    recentAdjustments: (adjustmentsRes.data ?? []).map((a) => ({
      ...a,
      admin_email: adminEmailById.get(a.admin_id) ?? null,
    })),
    isSelf,
  };
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadUser(id);
  if (!data) notFound();
  const { user, recentChecks, recentPurchases, recentAdjustments, isSelf } = data;

  return (
    <PortalShell
      portalName="Admin"
      pageTitle={user.email || "(no email)"}
      pageSubtitle={`${user.role.charAt(0).toUpperCase() + user.role.slice(1)} · ${user.credits} credit${user.credits === 1 ? "" : "s"}`}
    >
      <div className="mb-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-coral"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all users
        </Link>
      </div>

      {/* ─── Header card ────────────────────────────────────────── */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 mb-4">
        <div className="flex items-start gap-4">
          <RoleAvatar role={user.role} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-navy text-lg truncate">
                {user.email || "(no email)"}
              </h2>
              <RoleBadge role={user.role} />
              {user.blocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  <Ban className="w-3 h-3" />
                  Blocked
                </span>
              )}
              {isSelf && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-coral-pale/40 text-coral border border-coral/30">
                  This is you
                </span>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Field label="Credits" value={String(user.credits)} icon={<Coins className="w-3 h-3" />} />
              <Field
                label="Stripe"
                value={user.stripe_customer_id ? "Linked" : "—"}
                icon={<CreditCard className="w-3 h-3" />}
              />
              <Field label="Joined" value={formatDate(user.created_at)} />
              <Field label="UUID" value={user.id.slice(0, 8) + "…"} mono />
            </dl>
          </div>
        </div>
      </section>

      {/* ─── Action panel ───────────────────────────────────────── */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Manage
        </h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <RoleForm userId={user.id} currentRole={user.role} isSelf={isSelf} />
          <BlockedForm userId={user.id} blocked={user.blocked} isSelf={isSelf} />
          <CreditsForm userId={user.id} currentBalance={user.credits} />
        </div>
      </section>

      {/* ─── Recent reports ─────────────────────────────────────── */}
      <section className="rounded-xl bg-white border border-slate-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Recent reports
          </h3>
          <Link
            href={`/admin/reports?q=${encodeURIComponent(user.email)}`}
            className="text-xs text-coral hover:underline"
          >
            View all →
          </Link>
        </div>
        {recentChecks.length === 0 ? (
          <p className="text-sm text-slate-500">No reports yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {recentChecks.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/reports/${c.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-navy bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    {c.short_id}
                  </span>
                  <span className="flex-1 text-sm text-navy truncate">
                    {c.address_formatted ?? c.postcode ?? "(no address)"}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {c.status} · {formatDate(c.created_at)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Stripe purchases ───────────────────────────────────── */}
      {recentPurchases.length > 0 && (
        <section className="rounded-xl bg-white border border-slate-200 p-5 mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Stripe purchases
          </h3>
          <ul className="space-y-1.5">
            {recentPurchases.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-navy">
                  £{(p.price_pence / 100).toFixed(2)} · {p.pack_credits} credit{p.pack_credits === 1 ? "" : "s"}
                </span>
                <span className="flex-1" />
                <span className="text-[10px] text-slate-400">{formatDate(p.created_at)}</span>
                {p.stripe_receipt_url && (
                  <a
                    href={p.stripe_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-coral hover:underline"
                  >
                    Receipt →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── Credit adjustments audit log ───────────────────────── */}
      <section className="rounded-xl bg-white border border-slate-200 p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Credit adjustment history
        </h3>
        {recentAdjustments.length === 0 ? (
          <p className="text-sm text-slate-500">No admin adjustments yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {recentAdjustments.map((a) => (
              <li key={a.id} className="px-3 py-2 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span
                    className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold ${
                      a.delta > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {a.delta > 0 ? "+" : ""}
                    {a.delta}
                  </span>
                  <span className="flex-1 text-sm text-navy truncate">
                    {a.reason ?? <span className="text-slate-400 italic">no reason recorded</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {a.balance_before} → {a.balance_after}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 ml-10">
                  by {a.admin_email ?? "(unknown admin)"} · {formatDate(a.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PortalShell>
  );
}

// ─── Components ─────────────────────────────────────────────────────

function Field({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
        {icon}
        {label}
      </dt>
      <dd className={`text-sm text-navy mt-0.5 ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function RoleAvatar({ role }: { role: string }) {
  const Icon = role === "admin" ? ShieldCheck : role === "installer" ? Wrench : UserIcon;
  const palette =
    role === "admin"
      ? "bg-coral/10 text-coral border-coral/30"
      : role === "installer"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl border ${palette}`}
    >
      <Icon className="w-5 h-5" />
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
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
