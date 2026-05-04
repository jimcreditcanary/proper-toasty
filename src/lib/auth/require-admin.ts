// Shared admin gate for API routes.
//
// Three places duplicated this inline (admin/blog GET, admin/blog/[id],
// admin/installer-requests/[id]/action) — same shape every time. Moving
// it here means the role check is in one place and we can extend it
// (audit logging, rate-limit, IP allowlist) without trawling.
//
// Returns a discriminated union so callers can narrow safely:
//
//   const auth = await requireAdmin();
//   if (!auth.ok) {
//     return NextResponse.json({ error: auth.error }, { status: auth.status });
//   }
//   // auth.userId is now string

import { createClient } from "@/lib/supabase/server";

export type RequireAdminResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required" };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role, blocked")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null; blocked: boolean }>();
  if (profile?.blocked) {
    return { ok: false, status: 403, error: "Account blocked" };
  }
  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Admins only" };
  }
  return { ok: true, userId: user.id };
}
