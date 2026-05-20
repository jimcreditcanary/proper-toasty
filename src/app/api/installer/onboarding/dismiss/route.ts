// POST /api/installer/onboarding/dismiss
//
// Stamps installers.welcome_card_dismissed_at with the current
// time so the welcome card on /installer hides on next render.
//
// History: previously wrote to users.installer_onboarding_dismissed_at
// (m056). Migration 075 moves the canonical state onto the installer
// row itself — see that migration's header for rationale. The old
// column is left in place for now; the dashboard reads exclusively
// from the new column.
//
// Auth: must be signed in AND own an installer row. Admins viewing
// the installer surface without their own installer row are a no-op
// here (no row to update) — that's fine, they can use admin tools.

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

  // Service role bypasses RLS — the installers RLS only permits
  // self-reads, not arbitrary updates. Cleaner to centralise this
  // write here than thread a per-column UPDATE policy through the
  // schema.
  const admin = createAdminClient();
  const { error, data } = await admin
    .from("installers")
    .update({ welcome_card_dismissed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error("[onboarding/dismiss] update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    // User without an installer row — no-op (the card couldn't have
    // been rendered for them anyway). Return ok so the client
    // doesn't surface a confusing error.
    return NextResponse.json({ ok: true, noop: true });
  }
  return NextResponse.json({ ok: true });
}
