// POST /api/admin/outreach/daily-limit
//
// Body: { campaignId: string, dailyLimit: number }
//
// Sets the campaign's daily_send_limit. Used by the inline editor on
// /admin/outreach to step the conservative warmup ramp (5 → 10 → 20
// → 30 → 30 → 50) without dropping into SQL. Auth: admin role only
// (the /admin/* layout enforces this for pages, but the API route is
// hit directly so it re-checks).
//
// Bounds: 1–500. Lower bound 1 because 0 would silently halt sends
// (use pause for that). Upper bound 500 is a sanity ceiling — well
// above the 100/day day-30 target, but stops a fat-fingered 5000
// from torching reputation in one run.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  dailyLimit: z.number().int().min(1).max(500),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (profile?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Admin role required" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("outreach_campaigns")
    .update({
      daily_send_limit: parsed.data.dailyLimit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.campaignId);
  if (error) {
    console.error("[admin/outreach/daily-limit] update failed", error);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, dailyLimit: parsed.data.dailyLimit });
}
