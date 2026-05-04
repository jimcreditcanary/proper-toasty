// POST /api/admin/users/[id]/role
//
// Body: { role: 'admin' | 'user' | 'installer' }
//
// Changes a user's role. Self-demotion is rejected — an admin can't
// strip their own admin role accidentally (would lock themselves out).
// Removing the last admin is also rejected. Promote a second admin
// first, then demote.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

const RoleSchema = z.object({
  role: z.enum(["admin", "user", "installer"]),
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

  const parsed = RoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid role", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Self-demote guard.
  if (targetId === auth.userId && parsed.data.role !== "admin") {
    return NextResponse.json(
      { error: "Cannot demote yourself — ask another admin." },
      { status: 400 },
    );
  }

  // Last-admin guard. Only relevant when demoting an existing admin.
  const { data: target } = await admin
    .from("users")
    .select("role")
    .eq("id", targetId)
    .maybeSingle<{ role: string | null }>();
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "admin" && parsed.data.role !== "admin") {
    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin." },
        { status: 400 },
      );
    }
  }

  const { error } = await admin
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", targetId);

  if (error) {
    console.error("[admin/users/role] update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
