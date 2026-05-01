// Lightweight per-IP rate limit for the F3 installer signup request
// endpoint. Keeps spam off the admin queue without taking on a Redis
// dependency.
//
// Backed by the installer_signup_requests table itself — we count
// rows with the same hashed IP submitted in the last 24 hours. This
// is a poor man's leaky bucket but plenty for an endpoint that's
// only meant to fire a handful of times a day per legit user.

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

// 5 requests per IP per 24h — generous enough that a real installer
// who fat-fingered their first attempt won't get locked out, tight
// enough that a bot-assisted form filler hits the wall fast.
export const REQUESTS_PER_IP_PER_DAY = 5;
export const RATE_LIMIT_WINDOW_HOURS = 24;

// Hash with a project-specific salt so the same IP across other
// Propertoasty deployments doesn't share a rate-limit count.
const HASH_SALT = "propertoasty-installer-signup-rate-limit-v1";

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${HASH_SALT}:${ip}`).digest("hex");
}

// Pull the request's IP. We trust x-forwarded-for first hop
// (Vercel proxies set this), then x-real-ip, then nothing.
export function getRequestIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return null;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

export async function checkIpRateLimit(
  admin: AdminClient,
  ipHash: string | null,
): Promise<RateLimitResult> {
  if (!ipHash) {
    // Couldn't determine IP — let the request through. We don't want
    // to fail closed on unusual deploy topologies. The admin can still
    // reject obvious junk in the queue.
    return {
      allowed: true,
      count: 0,
      limit: REQUESTS_PER_IP_PER_DAY,
    };
  }
  const since = new Date(
    Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { count, error } = await admin
    .from("installer_signup_requests")
    .select("id", { count: "exact", head: true })
    .eq("request_ip_hash", ipHash)
    .gte("created_at", since);
  if (error) {
    console.warn(
      "[installer-signup/request] rate-limit lookup failed — allowing through",
      error.message,
    );
    return {
      allowed: true,
      count: 0,
      limit: REQUESTS_PER_IP_PER_DAY,
    };
  }
  const c = count ?? 0;
  return {
    allowed: c < REQUESTS_PER_IP_PER_DAY,
    count: c,
    limit: REQUESTS_PER_IP_PER_DAY,
  };
}
