// POST /api/admin/outreach/pause
//
// Body: { campaignId: string, action: "pause" | "resume" | "complete" }
//
// Flips the campaign status. Idempotent — calling pause on an
// already-paused campaign no-ops cleanly. Auth: must be admin role
// (the layout enforces this for /admin/* pages, but the API route
// has to re-check since it's hit directly).

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  action: z.enum(["pause", "resume", "complete"]),
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

  const nextStatus: "draft" | "active" | "paused" | "complete" =
    parsed.data.action === "pause"
      ? "paused"
      : parsed.data.action === "resume"
        ? "active"
        : "complete";

  const admin = createAdminClient();
  const { error } = await admin
    .from("outreach_campaigns")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.campaignId);
  if (error) {
    console.error("[admin/outreach/pause] update failed", error);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
