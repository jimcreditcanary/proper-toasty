import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeInstallerClaim } from "@/lib/installer-claim/complete-claim";

// POST /api/installer-signup/claim-as-self
//
// Body: { installerId: number }
//
// Fast-path for users who already have a Propertoasty account and
// just want to bind it to an installer record. Skips the F2 signup
// flow (which would create a duplicate account + send a confirm
// email they don't need).
//
// Auth: must be signed in. The user's auth.id becomes
// installers.user_id.
//
// Outcomes mirror completeInstallerClaim: claimed / race-lost /
// error. Race-lost = someone else got there first; the UI surfaces
// the same "this profile has been claimed" message as F2.

export const runtime = "nodejs";

const RequestSchema = z.object({
  installerId: z.coerce.number().int().positive(),
});

interface ClaimResponse {
  ok: boolean;
  installerId?: number;
  companyName?: string;
  error?: string;
  reason?: "race-lost" | "installer-missing" | "unauthenticated" | "internal";
}

export async function POST(req: Request): Promise<NextResponse<ClaimResponse>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<ClaimResponse>(
      { ok: false, error: "Sign in required", reason: "unauthenticated" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ClaimResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ClaimResponse>(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const result = await completeInstallerClaim({
    admin,
    userId: user.id,
    installerId: parsed.data.installerId,
  });

  if (result.kind === "claimed") {
    return NextResponse.json<ClaimResponse>({
      ok: true,
      installerId: result.installerId,
      companyName: result.companyName,
    });
  }
  if (result.kind === "race-lost") {
    return NextResponse.json<ClaimResponse>(
      {
        ok: false,
        reason: "race-lost",
        error:
          "Another account claimed this installer just now. If that wasn't you, email hello@propertoasty.com.",
      },
      { status: 409 },
    );
  }
  return NextResponse.json<ClaimResponse>(
    {
      ok: false,
      reason: result.reason === "installer-missing" ? "installer-missing" : "internal",
      error: "Couldn't bind your account. Try again or email hello@propertoasty.com.",
    },
    { status: 500 },
  );
}
