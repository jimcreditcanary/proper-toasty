// POST /api/admin/users/[id]/blocked
//
// Body: { blocked: boolean }
//
// Toggles users.blocked. Self-block guard prevents an admin from
// locking themselves out. Per the product call: blocked = stops
// login, that's it. Existing share tokens, signed URLs, etc. all
// keep working until they expire naturally.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

const BlockedSchema = z.object({
  blocked: z.boolean(),
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

  const parsed = BlockedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (targetId === auth.userId && parsed.data.blocked === true) {
    return NextResponse.json(
      { error: "Cannot block yourself." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ blocked: parsed.data.blocked })
    .eq("id", targetId);

  if (error) {
    console.error("[admin/users/blocked] update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
