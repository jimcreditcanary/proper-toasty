// POST /api/admin/users/[id]/reset-password
//
// Admin-triggered password reset. Looks up the target user's email
// and asks Supabase to send its standard recovery email with a magic
// link to /auth/reset-password. The user clicks the link and sets a
// new password — same flow as /auth/forgot-password, just initiated
// by an admin.
//
// Uses the public resetPasswordForEmail API (works through the admin
// client too) because the admin.generateLink() variant returns a link
// without sending the email — this way the user gets the familiar
// Supabase-branded email without us needing a transport of our own.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: targetId } = await params;
  const admin = createAdminClient();

  const { data: user, error: lookupError } = await admin
    .from("users")
    .select("email")
    .eq("id", targetId)
    .maybeSingle<{ email: string | null }>();

  if (lookupError) {
    console.error("[admin/users/reset-password] lookup failed", lookupError);
    return NextResponse.json({ error: "User lookup failed" }, { status: 500 });
  }
  if (!user?.email) {
    return NextResponse.json(
      { error: "User has no email on file — can't send a reset." },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const { error } = await admin.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    console.error("[admin/users/reset-password] send failed", error);
    return NextResponse.json(
      { error: error.message ?? "Send failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email: user.email });
}
