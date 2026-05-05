// /sitemap.xml — Next.js App Router sitemap convention.
//
// Auto-served at https://www.propertoasty.com/sitemap.xml. Submit
// that URL to Google Search Console (Sitemaps → Add new sitemap →
// type "sitemap.xml"). Bing accepts the same URL.
//
// Structure:
//   - Static marketing pages: hard-coded with priority weights
//   - Blog posts: queried from public.blog_posts where published=true,
//     newest first, lastModified = updated_at
//
// Excludes (intentionally):
//   - /check — high-churn entry point with no canonical content
//     to index; we don't want Google indexing every parameterised
//     variant. Internal links + the home-page CTA send people there.
//   - /installer/* — auth-gated portal
//   - /admin/* — auth-gated admin
//   - /dashboard — auth-gated user dashboard
//   - /r/[token] — per-user shared report links (private by design)
//   - /auth/* — auth flows
//   - /lead/accept — magic-link landing
//   - /api/* — API routes (Next handles these implicitly anyway)
//
// Robots.txt (src/app/robots.ts) restates these exclusions for
// crawlers that do not respect noindex / sitemap-only signals.

import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = "https://www.propertoasty.com";

// Cache for a minute. Blog publishes are rare, but seeing a new
// post in the sitemap within ~60s of going live is worth the small
// extra cost. Was 3600 — too long when seeding bulk content.
export const revalidate = 60;

interface BlogPostRow {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static marketing pages — priority + change frequency signals
  // what crawlers should weight. Home highest, legal lowest.
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/enterprise`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/ai-statement`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic blog posts. Best-effort: if Supabase is unreachable we
  // fall back to just the static entries rather than 500ing the
  // sitemap. Worst case Google sees fewer URLs for an hour.
  //
  // The `as any` cast matches the pattern in src/app/blog/page.tsx
  // — public.blog_posts isn't in the generated database.ts types
  // because the table predates that file. Adding it later is
  // safe; doesn't change runtime behaviour.
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(500);

    blogEntries = ((data ?? []) as BlogPostRow[]).map((row) => ({
      url: `${SITE_URL}/blog/${row.slug}`,
      lastModified: row.updated_at
        ? new Date(row.updated_at)
        : row.published_at
          ? new Date(row.published_at)
          : now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  } catch (err) {
    // Don't fail the sitemap if the blog table read errors — log
    // and serve the static entries only. Google retries.
    console.error("[sitemap] blog query failed, serving static only", err);
  }

  return [...staticEntries, ...blogEntries];
}
