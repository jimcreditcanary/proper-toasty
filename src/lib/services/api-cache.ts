import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/**
 * Thin wrapper over the `api_cache` table. Namespaces keep provider caches
 * isolated (e.g. "places:details", "solar:building", "epc:cert").
 *
 * Stores raw JSON so different providers can share the same machinery.
 * Returns null on miss or expiry.
 */
export async function cacheGet<T>(namespace: string, key: string): Promise<T | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_cache")
    .select("payload, expires_at")
    .eq("namespace", namespace)
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload as T;
}

export async function cacheSet(
  namespace: string,
  key: string,
  payload: unknown,
  ttlSeconds: number
): Promise<void> {
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await admin
    .from("api_cache")
    .upsert(
      { namespace, key, payload: payload as Json, expires_at: expiresAt },
      { onConflict: "namespace,key" }
    );
}
