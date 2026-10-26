// GET /api/admin/installers/search?q=<text>
//
// Lightweight installer search for admin pickers (e.g. the "Bind to
// installer" row action on /admin/users). Searches company_name
// substring, returns the top 20 hits with just enough fields to
// render a result row.
//
// Admin-gated — no public endpoint since the full directory is
// expensive to iterate and the public /installers page has its own
// scoped lookup.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Escape PostgREST wildcards so a user typing % or _ doesn't blow
  // the query up or do a scan on everything.
  const escaped = q.replace(/[%_]/g, (c) => `\\${c}`);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("installers")
    .select("id, company_name, email, postcode")
    .ilike("company_name", `%${escaped}%`)
    .order("company_name", { ascending: true })
    .limit(20);
  if (error) {
    console.error("[admin/installers/search] query failed", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
