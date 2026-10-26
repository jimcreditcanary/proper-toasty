// POST /api/auth/change-password
//
// User sets a new password (while already authenticated) and the
// must_change_password flag is cleared. Used by the forced-change
// page at /auth/change-password after an admin set a temp password.
//
// Writes auth.users via the session's own supabase client (so the
// user's updated_at reflects their own action), then clears the flag
// via the admin client (RLS on public.users may block user-side
// writes to columns like this).

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid password" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) {
    return NextResponse.json(
      { error: updateError.message ?? "Password update failed" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error: flagError } = await admin
    .from("users")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (flagError) {
    console.error("[auth/change-password] flag clear failed", flagError);
    // Password already saved — report success but note the flag didn't
    // clear. Portal layouts will keep redirecting; the user can retry.
    return NextResponse.json(
      {
        error:
          "Password saved but we couldn't clear the force-change flag — contact support.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
