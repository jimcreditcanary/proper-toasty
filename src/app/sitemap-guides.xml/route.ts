// /sitemap-guides.xml — editorial content: blog posts today, future
// /guides/[slug] pages once they land.
//
// All entries are DB-driven (blog_posts.published=true) so the
// sitemap stays in lockstep with the publishing flow — admin
// publishes a post, the sitemap surfaces it within 5 minutes
// (ISR cadence) without a redeploy.
//
// Graceful degradation: a Supabase outage returns an empty <urlset>
// rather than a 500, so the sitemap-index still validates and
// crawlers keep their existing entries cached. Worst case we lose
// a few minutes of new-post visibility, not the whole sitemap.
//
// To verify after deploy:
//   curl https://www.propertoasty.com/sitemap-guides.xml

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SITE_URL,
  buildUrlsetXml,
  xmlResponse,
  type SitemapUrlEntry,
} from "@/lib/seo/sitemap-shared";

export const revalidate = 300;

interface BlogPostRow {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
}

async function loadBlogEntries(): Promise<SitemapUrlEntry[]> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(1000);

    const rows = (data ?? []) as BlogPostRow[];
    return rows.map((row) => ({
      loc: `${SITE_URL}/blog/${row.slug}`,
      lastmod:
        row.updated_at ?? row.published_at ?? new Date().toISOString(),
      changefreq: "monthly" as const,
      priority: 0.7,
    }));
  } catch (err) {
    console.error("[sitemap-guides] blog query failed", err);
    return [];
  }
}

// Production guide pages under /guides/[slug]. Hand-curated list
// because guides are React files in src/app/guides/, not DB-driven
// like blog posts. New guides get added here when they ship.
//
// The /guides hub itself + individual guides are listed; the
// /guides/aeo-demo internal template is excluded (it's noindex'd at
// the page level too).
async function loadGuideEntries(): Promise<SitemapUrlEntry[]> {
  const now = new Date();
  return [
    {
      loc: `${SITE_URL}/guides`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.85,
    },
    {
      loc: `${SITE_URL}/guides/bus-application-walkthrough`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/guides/mcs-site-visit-what-to-expect`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/guides/fabric-first-retrofit-before-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
  ];
}

export async function GET(): Promise<Response> {
  const [blog, guides] = await Promise.all([
    loadBlogEntries(),
    loadGuideEntries(),
  ]);
  const entries = [...blog, ...guides];
  return xmlResponse(buildUrlsetXml(entries));
}
