// Resolve the email address we should send installer-side proposal
// notifications to. Tries `installers.email` first (the MCS-listed
// company contact), falls back to the bound user's auth email
// (auth.users via the admin API) if that's null.
//
// Why: many MCS rows have a null email, but the installer who
// signed up is reachable through their account. Without this
// fallback, the test installer's "quote accepted / message" emails
// silently skip and the installer never finds out.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export async function resolveInstallerNotifyEmail(
  admin: AdminClient,
  installer: { email: string | null; user_id: string | null },
): Promise<string | null> {
  const direct = installer.email?.trim();
  if (direct) return direct;
  if (!installer.user_id) return null;
  try {
    const { data, error } = await admin.auth.admin.getUserById(
      installer.user_id,
    );
    if (error) {
      console.warn("[proposals] auth lookup failed for installer notify", {
        userId: installer.user_id,
        error: error.message,
      });
      return null;
    }
    return data?.user?.email ?? null;
  } catch (e) {
    console.warn("[proposals] auth lookup threw for installer notify", {
      userId: installer.user_id,
      err: e instanceof Error ? e.message : e,
    });
    return null;
  }
}
