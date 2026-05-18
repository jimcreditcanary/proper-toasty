// POST /api/installer/onboarding/profile
//
// Saves the bio + completes Step 1 of the onboarding flow. Logo
// upload itself goes through /api/installer/profile/logo (existing
// since m064); this endpoint is purely the "I'm done with the
// profile step" submission.
//
// Side effects:
//   - installers.bio updated
//   - outreach_recipients.profile_completed_at stamped (when an
//     outreach recipient exists for this user's installer)
//   - tier-dependent credits granted via outreach_grant_credits
//
// Auth: must be signed in + bound to an installer.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantOnboardingStep } from "@/lib/outreach/onboarding";

export const runtime = "nodejs";

const RequestSchema = z.object({
  bio: z.string().min(40).max(600),
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
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, logo_url")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; logo_url: string | null }>();
  if (!installer) {
    return NextResponse.json(
      { ok: false, error: "No installer bound to this account" },
      { status: 403 },
    );
  }
  if (!installer.logo_url) {
    return NextResponse.json(
      {
        ok: false,
        error: "Upload a logo before completing the profile step",
      },
      { status: 400 },
    );
  }

  const { error: updateErr } = await admin
    .from("installers")
    .update({
      bio: parsed.data.bio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", installer.id);
  if (updateErr) {
    console.error("[onboarding/profile] bio save failed", updateErr);
    return NextResponse.json(
      { ok: false, error: "Database update failed" },
      { status: 500 },
    );
  }

  const grant = await grantOnboardingStep(admin, {
    userId: user.id,
    installerId: installer.id,
    step: "profile",
  });

  return NextResponse.json({
    ok: true,
    creditsGranted: grant.creditsGranted,
    newBalance: grant.newBalance,
  });
}
