// GET /api/admin/reports/export?q=...&status=...&range=...
//
// CSV export of /admin/reports with the same filter set. We accept
// the same URL params so an admin can paste the list-page URL into a
// download bookmarklet or just click an export link from the page
// itself with their current filters applied.
//
// Bounded to 5000 rows — the page only shows 50, so anyone hitting
// the cap should refine their filter before exporting.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buildCsv, csvResponse } from "@/lib/admin/csv";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 30;

const EXPORT_LIMIT = 5000;

const RANGE_DAYS: Record<string, number | null> = {
  "30d": 30,
  "90d": 90,
  all: null,
};

const VALID_STATUS = new Set(["draft", "running", "complete", "failed"]);

type CheckRow = Database["public"]["Tables"]["checks"]["Row"];

export async function GET(req: Request): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200).trim();
  const status = url.searchParams.get("status") ?? "all";
  const range = url.searchParams.get("range") ?? "all";
  const days = RANGE_DAYS[range] ?? null;

  const admin = createAdminClient();

  // Resolve email→user_ids first because PostgREST or() doesn't span
  // the FK to public.users. Same shape the list page uses.
  let userIdsFromEmail: string[] = [];
  if (q.length > 0) {
    const { data } = await admin
      .from("users")
      .select("id")
      .ilike("email", `%${q}%`)
      .limit(500);
    userIdsFromEmail = (data ?? []).map((u) => u.id);
  }

  let query = admin
    .from("checks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(EXPORT_LIMIT);

  if (status !== "all" && VALID_STATUS.has(status)) {
    query = query.eq("status", status as CheckRow["status"]);
  }
  if (days !== null) {
    const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
    query = query.gte("created_at", sinceIso);
  }
  if (q.length > 0) {
    const postcodeNoSpace = q.replace(/\s+/g, "");
    const filters: string[] = [
      `short_id.ilike.${q}%`,
      `uprn.ilike.${q}%`,
      `postcode.ilike.${postcodeNoSpace}%`,
      `address_formatted.ilike.%${q}%`,
    ];
    if (userIdsFromEmail.length > 0) {
      filters.push(`user_id.in.(${userIdsFromEmail.join(",")})`);
    }
    query = query.or(filters.join(","));
  }

  const { data: checks, error } = await query;
  if (error) {
    console.error("[admin/reports/export]", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
  const rows = (checks ?? []) as CheckRow[];

  // Hydrate emails so the CSV has a human column rather than a uuid.
  // user_id is nullable for guest checks — strip nulls before lookup.
  const uniqueUserIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
  );
  let emailByUserId = new Map<string, string>();
  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("users")
      .select("id, email")
      .in("id", uniqueUserIds);
    emailByUserId = new Map(
      (profiles ?? []).map((p) => [p.id, p.email ?? ""]),
    );
  }

  const header = [
    "short_id",
    "id",
    "status",
    "user_email",
    "address_formatted",
    "postcode",
    "uprn",
    "country",
    "tenure",
    "current_heating_fuel",
    "floorplan_uploaded",
    "credits_spent",
    "created_at",
    "updated_at",
  ];
  const csvRows = rows.map((r) => [
    r.short_id,
    r.id,
    r.status,
    r.user_id ? emailByUserId.get(r.user_id) ?? "" : "",
    r.address_formatted ?? "",
    r.postcode ?? "",
    r.uprn ?? "",
    r.country ?? "",
    r.tenure ?? "",
    r.current_heating_fuel ?? "",
    r.floorplan_object_key ? "yes" : "no",
    r.credits_spent,
    r.created_at,
    r.updated_at,
  ]);

  return csvResponse(buildCsv(header, csvRows), "reports");
}
