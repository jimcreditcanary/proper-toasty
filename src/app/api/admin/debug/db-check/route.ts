// GET /api/admin/debug/db-check
//
// Temporary admin-gated diagnostic. Hit this in a browser while
// signed in as an admin — returns the runtime view of:
//   - Which Supabase project the production code is talking to
//     (hostname only — never the full URL or any secret)
//   - The blog_posts row count visible to the production runtime
//   - The latest deploy's git commit hash, if Vercel injected one
//
// Lets us verify whether the env-var Supabase URL matches the one
// where the seed ran, without playing 20-questions over chat.
//
// Safe to leave in (or rip out once the blog launch is confirmed).
// Returns 403 to non-admins so it never leaks to crawlers / public.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Hostname of the Supabase URL — diagnoses wrong-project issues
  // without revealing the project ID in full.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let supabaseHost = "(unset)";
  try {
    if (url) supabaseHost = new URL(url).hostname;
  } catch {
    supabaseHost = "(invalid URL)";
  }

  // Service role key presence + last-4 chars only (helps catch
  // copy-paste truncation without leaking the key).
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const serviceRoleHint = serviceRoleKey
    ? `set, ends in …${serviceRoleKey.slice(-4)}`
    : "(unset)";

  // Blog count — same query the page + sitemap use.
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blogCountRes = await (admin as any)
    .from("blog_posts")
    .select("slug, published, published_at", { count: "exact" })
    .order("published_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    runtime: {
      supabase_host: supabaseHost,
      service_role_key: serviceRoleHint,
      vercel_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "(local)",
      vercel_env: process.env.VERCEL_ENV ?? "(unset)",
    },
    blog_query: {
      ok: !blogCountRes.error,
      error: blogCountRes.error?.message ?? null,
      total_count: blogCountRes.count ?? null,
      published_count: (blogCountRes.data ?? []).filter(
        (r: { published?: boolean }) => r.published === true,
      ).length,
      slugs: (blogCountRes.data ?? []).map(
        (r: { slug?: string; published?: boolean }) => ({
          slug: r.slug,
          published: r.published,
        }),
      ),
    },
  });
}
