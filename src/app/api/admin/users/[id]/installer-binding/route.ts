// POST /api/admin/users/[id]/installer-binding
//
// Admin binds a user to an installer (so they can access the installer
// portal with their own login, alongside any other users bound to the
// same installer) or unbinds (installer_id: null).
//
// Also flips users.role to 'installer' when binding — the middleware
// portal routing gates on role, so without this David would stay on
// /dashboard regardless of the binding.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

const BodySchema = z.object({
  installer_id: z.number().int().positive().nullable(),
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
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const installerId = parsed.data.installer_id;

  // Verify the installer exists before writing. Catches typo'd ids
  // and keeps the FK error path out of a client-visible 500.
  if (installerId !== null) {
    const { data: installer } = await admin
      .from("installers")
      .select("id, company_name")
      .eq("id", installerId)
      .maybeSingle<{ id: number; company_name: string }>();
    if (!installer) {
      return NextResponse.json(
        { error: "Installer not found" },
        { status: 404 },
      );
    }
  }

  const update: { installer_id: number | null; role?: "installer" | "user" } = {
    installer_id: installerId,
  };
  // Keep role in sync so the middleware/portal routing works without
  // another admin step. Binding → installer; unbinding leaves role
  // alone (admin may want to demote to 'user' separately).
  if (installerId !== null) {
    update.role = "installer";
  }

  const { error } = await admin
    .from("users")
    .update(update)
    .eq("id", targetId);
  if (error) {
    console.error("[admin/users/installer-binding] update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
