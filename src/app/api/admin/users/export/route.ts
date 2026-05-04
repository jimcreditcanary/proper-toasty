// GET /api/admin/users/export?q=...&role=...&blocked=...
//
// CSV export of /admin/users with the same filter set as the page.
// Bounded to 5000 rows. Includes a check-count column built from a
// single GROUP-BY-equivalent fetch over the matching cohort.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buildCsv, csvResponse } from "@/lib/admin/csv";

export const runtime = "nodejs";
export const maxDuration = 30;

const EXPORT_LIMIT = 5000;
const VALID_ROLES = new Set(["admin", "user", "installer"]);

export async function GET(req: Request): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200).trim();
  const role = url.searchParams.get("role") ?? "all";
  const blocked = url.searchParams.get("blocked") ?? "all";

  const admin = createAdminClient();

  let query = admin
    .from("users")
    .select("id, email, role, credits, blocked, stripe_customer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(EXPORT_LIMIT);

  if (role !== "all" && VALID_ROLES.has(role)) {
    // VALID_ROLES is the source-of-truth for the enum; narrow for TS.
    query = query.eq("role", role as "admin" | "user" | "installer");
  }
  if (blocked === "blocked") query = query.eq("blocked", true);
  if (blocked === "active") query = query.eq("blocked", false);

  if (q.length > 0) {
    const isHexish = /^[0-9a-f-]{4,}$/i.test(q);
    const filters: string[] = [`email.ilike.%${q}%`];
    if (isHexish) filters.push(`id.eq.${q}`);
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/users/export]", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
  const users = data ?? [];

  // Check count per user — single fetch + tally in memory. Bounded
  // by EXPORT_LIMIT so worst-case payload is one user_id column for
  // however many checks the cohort has.
  const userIds = users.map((u) => u.id);
  const checkCount = new Map<string, number>();
  if (userIds.length > 0) {
    const { data: checks } = await admin
      .from("checks")
      .select("user_id")
      .in("user_id", userIds);
    for (const c of checks ?? []) {
      checkCount.set(c.user_id, (checkCount.get(c.user_id) ?? 0) + 1);
    }
  }

  const header = [
    "id",
    "email",
    "role",
    "credits",
    "blocked",
    "stripe_customer_linked",
    "report_count",
    "created_at",
  ];
  const csvRows = users.map((u) => [
    u.id,
    u.email ?? "",
    u.role ?? "user",
    u.credits ?? 0,
    u.blocked ? "yes" : "no",
    u.stripe_customer_id ? "yes" : "no",
    checkCount.get(u.id) ?? 0,
    u.created_at ?? "",
  ]);

  return csvResponse(buildCsv(header, csvRows), "users");
}
