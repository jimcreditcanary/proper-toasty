// Redirect gate for the forced-password-change flow.
//
// Call from the portal layouts (admin / dashboard / installer) right
// after confirming the user is signed in. If the user's row has
// must_change_password = true (set by admin via /admin/users →
// "Set new password"), we send them to /auth/change-password until
// they pick a new one.
//
// Service-role read because RLS on public.users can block a
// non-admin from reading their own column on some policies.

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function enforcePasswordChange(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("must_change_password")
    .eq("id", userId)
    .maybeSingle<{ must_change_password: boolean | null }>();
  if (data?.must_change_password) {
    redirect("/auth/change-password");
  }
}
