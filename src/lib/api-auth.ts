import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
