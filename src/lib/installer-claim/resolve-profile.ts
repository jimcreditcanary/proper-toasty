// Shared helper used by /lead/accept (page render) and the
// acknowledge route (POST handler) to identify which user account
// owns an installer for credit-attribution purposes.
//
// Priority:
//   1. installers.user_id (F2 binding — durable, intended)
//   2. Email match between installers.email and users.email
//      (bridge for unclaimed installers + test data)
//
// Returns null when no account matches at all — the caller renders
// the "claim your profile" view in that case.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export interface ResolvedProfile {
  id: string;
  email: string;
  credits: number;
  blocked: boolean;
  // Diagnostic — which path resolved this account. Logged into
  // server consoles so we can see the email-match → user_id rollover
  // happen as installers claim their profiles.
  via: "user_id" | "email";
}

export async function resolveInstallerProfile(args: {
  admin: AdminClient;
  boundUserId: string | null;
  fallbackEmail: string | null | undefined;
}): Promise<ResolvedProfile | null> {
  const { admin, boundUserId, fallbackEmail } = args;

  // Path 1 — durable binding from F2.
  if (boundUserId) {
    const { data, error } = await admin
      .from("users")
      .select("id, email, credits, blocked")
      .eq("id", boundUserId)
      .maybeSingle<{
        id: string;
        email: string;
        credits: number;
        blocked: boolean;
      }>();
    if (!error && data) {
      return { ...data, via: "user_id" };
    }
    if (error) {
      console.warn(
        "[resolveInstallerProfile] bound user_id lookup failed",
        error.message,
      );
    }
    // Bound id present but row missing — fall through to the email
    // match in case the email path saves us. Better than null.
  }

  // Path 2 — email-match bridge.
  const email = fallbackEmail?.toLowerCase().trim() ?? null;
  if (!email) return null;

  const { data, error } = await admin
    .from("users")
    .select("id, email, credits, blocked")
    .ilike("email", email)
    .limit(1)
    .maybeSingle<{
      id: string;
      email: string;
      credits: number;
      blocked: boolean;
    }>();
  if (error) {
    console.warn(
      "[resolveInstallerProfile] email-match lookup failed",
      error.message,
    );
    return null;
  }
  if (!data) return null;
  return { ...data, via: "email" };
}
