// POST /api/admin/users/create
//
// Admin creates a new user from the /admin/users page. Generates a
// temp password (user is forced to change on first login — same flow
// as the "Set new password" row action), optionally binds the new
// user to an installer, and returns the temp password so the admin
// can share it out-of-band.
//
// Creation path: admin.auth.admin.createUser fires the handle_new_user
// trigger (migration 036) which inserts the matching public.users
// row with defaults. We then UPDATE that row with role / installer_id
// / must_change_password in a single follow-up.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().email("Not a valid email"),
  role: z.enum(["user", "installer", "admin"]),
  installer_id: z.number().int().positive().nullable().optional(),
});

function generateTempPassword(): string {
  return randomBytes(12)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 16);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid body",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { email, role, installer_id = null } = parsed.data;

  const admin = createAdminClient();

  // Verify the installer exists up front — catches typos before we
  // commit to creating the auth user.
  if (installer_id !== null) {
    const { data: installer } = await admin
      .from("installers")
      .select("id")
      .eq("id", installer_id)
      .maybeSingle<{ id: number }>();
    if (!installer) {
      return NextResponse.json(
        { error: "Installer not found" },
        { status: 404 },
      );
    }
  }

  const password = generateTempPassword();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createError || !created?.user) {
    // Most common case: email already exists → 422 from Supabase.
    const message = createError?.message ?? "Create failed";
    const status = message.toLowerCase().includes("already")
      ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }

  // handle_new_user trigger has by now inserted into public.users with
  // the id + email + schema defaults. Set the admin-chosen fields.
  const { error: updateError } = await admin
    .from("users")
    .update({
      role,
      installer_id,
      must_change_password: true,
    })
    .eq("id", created.user.id);
  if (updateError) {
    console.error("[admin/users/create] profile update failed", updateError);
    // Auth user is already created — report partial success + ask admin to fix.
    return NextResponse.json(
      {
        error:
          "User created but profile fields did not save — set role / installer manually on the row.",
        user_id: created.user.id,
        password,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    user_id: created.user.id,
    password,
  });
}
