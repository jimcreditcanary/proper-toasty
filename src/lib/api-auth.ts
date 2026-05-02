import { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export type ApiUser = {
  id: string;
  email: string;
  credits: number;
};

/**
 * Authenticate an API request using either:
 * 1. Bearer token (API key from users table)
 * 2. Supabase session cookie (for dashboard requests)
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<{ user: ApiUser } | { error: string; status: number }> {
  const authHeader = request.headers.get("authorization");

  // API key auth
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, credits")
      .eq("api_key", apiKey)
      .single();

    if (error || !user) {
      return { error: "Invalid API key", status: 401 };
    }

    return { user };
  }

  return { error: "Missing authorization header", status: 401 };
}

// ─── Installer-scoped API key auth (I8) ───────────────────────────
//
// Used by /api/v1/* endpoints that need to act on behalf of a
// specific installer (e.g. POST /api/v1/pre-survey-requests).
// Resolves the Bearer token to the auth user + bound installer in
// one round-trip, so the route handler doesn't need to do its own
// installer lookup. Fails closed (401/403) on any miss.

export interface InstallerForApi {
  id: number;
  company_name: string;
  email: string | null;
  telephone: string | null;
  user_id: string | null;
}

export type InstallerApiAuthResult =
  | {
      ok: true;
      user: User;
      installer: InstallerForApi;
      admin: AdminClient;
    }
  | { ok: false; status: number; error: string };

/** Pull a bearer token from the request — Authorization first,
 *  X-API-Key as a fallback (some HTTP clients eat Authorization). */
export function extractApiKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(\S+)$/i);
    if (m) return m[1].trim();
  }
  const xKey = req.headers.get("x-api-key");
  if (xKey) return xKey.trim();
  return null;
}

/**
 * Resolve a Bearer token to (auth user, bound installer). Returns
 * a discriminated union so the caller can NextResponse.json the
 * error path verbatim.
 *
 * Auth-failure modes:
 *   401  no token
 *   401  token doesn't match a user
 *   403  user has no installer profile (homeowner / unbound)
 */
export async function authenticateInstallerApiKey(
  req: Request,
): Promise<InstallerApiAuthResult> {
  const token = extractApiKey(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error:
        "Missing API key. Pass it as `Authorization: Bearer <key>` or `X-API-Key: <key>`.",
    };
  }

  const admin = createAdminClient();

  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("api_key", token)
    .maybeSingle<{ id: string }>();
  if (!userRow) {
    return { ok: false, status: 401, error: "Invalid API key." };
  }

  // Hydrate the auth.User shape so endpoints can pass it straight
  // to helpers like chargeAndSend() that expect a real User.
  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(
    userRow.id,
  );
  if (authErr || !authData?.user) {
    return { ok: false, status: 401, error: "API key user not found." };
  }

  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name, email, telephone, user_id")
    .eq("user_id", userRow.id)
    .maybeSingle<InstallerForApi>();
  if (!installer) {
    return {
      ok: false,
      status: 403,
      error:
        "API key isn't linked to an installer profile. Claim your profile first at /installer-signup.",
    };
  }

  return { ok: true, user: authData.user, installer, admin };
}
