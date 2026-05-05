// POST /api/installer/onboarding/dismiss
//
// Stamps users.installer_onboarding_dismissed_at with the current
// time so the onboarding checklist on /installer hides on next render.
//
// Auth: must be signed in. We don't gate by role — admins viewing
// the installer surface can also dismiss it for their own account
// without affecting installers.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Service role bypasses RLS — the existing users RLS only permits
  // self-reads, not updates. Cleaner to centralise this write here
  // than thread a UPDATE policy through the schema.
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ installer_onboarding_dismissed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    console.error("[onboarding/dismiss] update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
