import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/installer/credits/status?session_id=cs_test_…
//
// Used by the success-page poller to detect when the webhook has
// processed a checkout session. Returns:
//
//   { credited: true,  credits, packCredits }   — webhook done
//   { credited: false, credits }                — still waiting
//   { error: ... }                              — auth / lookup fail
//
// Auth: signed-in user. Service role hits the audit table directly
// since it's RLS-locked.

export const runtime = "nodejs";

interface StatusResponse {
  ok: boolean;
  credited?: boolean;
  credits?: number;
  packCredits?: number;
  error?: string;
}

export async function GET(req: Request): Promise<NextResponse<StatusResponse>> {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<StatusResponse>(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  // Read current balance (RLS-friendly via the user-scoped client).
  const { data: profile } = await supabase
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .maybeSingle<{ credits: number }>();

  // Look up the audit row by session id. Service role because the
  // table is RLS-locked. We additionally constrain to the calling
  // user's id so a leaked session_id can't reveal another account's
  // history.
  let credited = false;
  let packCredits: number | undefined;
  if (sessionId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("installer_credit_purchases")
      .select("pack_credits, status")
      .eq("stripe_session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle<{ pack_credits: number; status: string }>();
    if (data && data.status === "completed") {
      credited = true;
      packCredits = data.pack_credits;
    }
  }

  return NextResponse.json<StatusResponse>({
    ok: true,
    credited,
    credits: profile?.credits ?? 0,
    packCredits,
  });
}
