// POST /api/admin/users/[id]/credits
//
// Body: { delta: number, reason: string }
//
// Atomic credit adjustment via the SECURITY DEFINER RPC defined in
// migration 054 — the RPC handles the FOR UPDATE lock, the negative-
// balance guard, and the audit row insert in a single transaction.
//
// Reason is required (caller-side validation): we audit, so the
// reason should be specific enough to make sense to the next admin.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

const CreditAdjustmentSchema = z.object({
  // ±10 000 cap is generous compared to anything a real adjustment
  // would be — guards against typos like "1000000" rather than 100.
  delta: z.number().int().refine((n) => n !== 0 && n >= -10000 && n <= 10000, {
    message: "Delta must be non-zero and within ±10000.",
  }),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: targetId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreditAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: newBalance, error } = await admin.rpc(
    "admin_adjust_credits",
    {
      p_user_id: targetId,
      p_admin_id: auth.userId,
      p_delta: parsed.data.delta,
      p_reason: parsed.data.reason,
    },
  );

  if (error) {
    // The RPC raises clear messages for known failure modes (user
    // not found, would go negative). Surface them to the admin so
    // they understand why their adjustment was rejected.
    console.error("[admin/users/credits] adjust failed", error);
    return NextResponse.json(
      { error: error.message ?? "Adjustment failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, new_balance: newBalance });
}
