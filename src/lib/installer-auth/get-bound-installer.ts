// Resolve a user's bound installer id.
//
// Replaces the old pattern — scattered across ~18 endpoints — of
// `admin.from("installers").select(...).eq("user_id", user.id)`.
// That only ever matched a single primary-owner link. Migration 087
// added users.installer_id so many users can share one installer;
// this helper is the one place reads check the binding.
//
// Returns just the id — callers follow up with their own typed
// select on the installers table against the id, keeping per-endpoint
// column lists intact.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function getBoundInstallerId(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<number | null> {
  const { data } = await admin
    .from("users")
    .select("installer_id")
    .eq("id", userId)
    .maybeSingle<{ installer_id: number | null }>();
  return data?.installer_id ?? null;
}
