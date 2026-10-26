// POST /api/admin/users/[id]/set-password
//
// Admin generates a temporary password for a user. Writes it to
// auth.users via the admin SDK, flips public.users.must_change_password
// so the user is forced to pick a new one on next login (enforced by
// the portal layouts), and returns the plaintext password so admin
// can copy and share it out-of-band.
//
// Replaces the earlier "send a Supabase recovery email" flow — Jim
// wanted a direct set-and-share pattern instead of relying on inbox
// delivery.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

// 16 chars from the url-safe base64 alphabet. ~96 bits of entropy —
// well past any practical brute force. Readable enough that an admin
// can relay it on WhatsApp/Slack without typos.
function generateTempPassword(): string {
  return randomBytes(12)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 16);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: targetId } = await params;
  const admin = createAdminClient();

  const password = generateTempPassword();

  const { error: pwError } = await admin.auth.admin.updateUserById(targetId, {
    password,
  });
  if (pwError) {
    console.error("[admin/users/set-password] auth update failed", pwError);
    return NextResponse.json(
      { error: pwError.message ?? "Password update failed" },
      { status: 500 },
    );
  }

  const { error: flagError } = await admin
    .from("users")
    .update({ must_change_password: true })
    .eq("id", targetId);
  if (flagError) {
    console.error("[admin/users/set-password] flag update failed", flagError);
    // Password already changed; surface the error but don't try to
    // roll back — the admin can just re-run if the flag is critical.
    return NextResponse.json(
      {
        error:
          "Password set but force-change flag did not save — rerun or set the flag manually.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, password });
}
