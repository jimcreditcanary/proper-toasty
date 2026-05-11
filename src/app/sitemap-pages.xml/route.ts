// /sitemap-pages.xml — static marketing + landing pages.
//
// Hand-maintained list — these are the pages that exist as real
// React routes in src/app/. New evergreen pages get added here when
// they ship.
//
// Programmatic content (town pages, archetype pages, comparison
// pages) lives in the OTHER sub-sitemaps (`sitemap-towns.xml`,
// `sitemap-data.xml`) so the lists stay focused. Crawlers digest
// many smaller sitemaps more reliably than one huge one — Google's
// 50K URL / 50MB caps are nowhere near these counts, but the
// segmentation also makes diagnostics easier ("Google indexed N
// of M pages on sitemap-towns but only K of L on sitemap-guides").
//
// To verify after deploy:
//   curl https://www.propertoasty.com/sitemap-pages.xml | head -30

import {
  SITE_URL,
  buildUrlsetXml,
  xmlResponse,
  type SitemapUrlEntry,
} from "@/lib/seo/sitemap-shared";

export const revalidate = 300;

export async function GET(): Promise<Response> {
  const now = new Date();

  // Pages ordered by importance (priority signal). Home highest,
  // legal lowest. Focused-variant landing pages (/heatpump, /solar)
  // bumped above generic ones because they're the primary
  // conversion landings for paid-search visitors with intent.
  const entries: SitemapUrlEntry[] = [
    {
      loc: `${SITE_URL}/`,
      lastmod: now,
      changefreq: "weekly",
      priority: 1.0,
    },
    {
      loc: `${SITE_URL}/heatpump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.9,
    },
    {
      loc: `${SITE_URL}/solar`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.9,
    },
    {
      loc: `${SITE_URL}/enterprise`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/pricing`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/blog`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.7,
    },
    {
      loc: `${SITE_URL}/privacy`,
      lastmod: now,
      changefreq: "yearly",
      priority: 0.3,
    },
    {
      loc: `${SITE_URL}/terms`,
      lastmod: now,
      changefreq: "yearly",
      priority: 0.3,
    },
    {
      loc: `${SITE_URL}/ai-statement`,
      lastmod: now,
      changefreq: "yearly",
      priority: 0.3,
    },
  ];

  return xmlResponse(buildUrlsetXml(entries));
}
