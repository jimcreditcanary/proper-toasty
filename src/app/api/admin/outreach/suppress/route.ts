// POST /api/admin/outreach/suppress
//
// Body: { email: string, reason?: string }
//
// Adds an email to the outreach_suppression table manually. Used
// when an installer emails Jim directly saying "stop emailing me"
// outside the inbound webhook path (e.g. they forward Jim the
// email from their personal account).
//
// Idempotent — re-adding an existing email is a no-op (the table
// uses email as PK).

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const RequestSchema = z.object({
  email: z.string().email().max(320),
  reason: z
    .enum([
      "bounced",
      "complained",
      "unsubscribed",
      "manual",
      "spam_trap",
      "low_engagement",
      "invalid",
    ])
    .default("manual"),
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
  const email = parsed.data.email.toLowerCase().trim();
  const { error } = await admin
    .from("outreach_suppression")
    .upsert(
      {
        email,
        reason: parsed.data.reason,
        source: "admin_manual",
      },
      { onConflict: "email" },
    );
  if (error) {
    console.error("[admin/outreach/suppress] insert failed", error);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }

  // Also flip any active recipient row for this email to
  // 'unsubscribed' so the running campaign stops trying to send to
  // them. Sender→installer email match is fragile but it's the best
  // we've got at this layer.
  const { data: installer } = await admin
    .from("installers")
    .select("id")
    .ilike("email", email)
    .maybeSingle<{ id: number }>();
  if (installer) {
    await admin
      .from("outreach_recipients")
      .update({
        state: "unsubscribed",
        updated_at: new Date().toISOString(),
      })
      .eq("installer_id", installer.id)
      .in("state", ["queued", "scheduled", "sent", "delivered", "opened", "clicked"]);
  }

  return NextResponse.json({ ok: true, email });
}
