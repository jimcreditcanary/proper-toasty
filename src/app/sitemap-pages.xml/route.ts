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
    // Programmatic-town index landings — entry point for town
    // browsing + ranks for the head terms ("heat pumps UK",
    // "solar panels UK"). The per-town pages are listed in
    // sitemap-towns.xml.
    {
      loc: `${SITE_URL}/heat-pumps`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.85,
    },
    {
      loc: `${SITE_URL}/solar-panels`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.85,
    },
    // Comparison pages — head-term targets ("heat pump vs gas
    // boiler" is one of the highest-search-volume UK heat queries).
    // Hand-curated; one file each under src/app/compare/.
    {
      loc: `${SITE_URL}/compare`,
      lastmod: now,
      changefreq: "weekly",
      priority: 0.85,
    },
    {
      loc: `${SITE_URL}/compare/heat-pump-vs-gas-boiler`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/compare/heat-pump-vs-oil-boiler`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/compare/heat-pump-vs-lpg-boiler`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/heat-pump-vs-electric-boiler`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/heat-pump-vs-night-storage-heaters`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/air-source-vs-ground-source-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/hybrid-vs-full-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/compare/solar-vs-no-solar`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/solar-with-battery-vs-solar-alone`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/compare/daikin-vs-mitsubishi-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/compare/vaillant-vs-daikin-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/compare/vaillant-vs-mitsubishi-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
    },
    {
      loc: `${SITE_URL}/compare/underfloor-heating-vs-radiators-for-heat-pumps`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/solar-pv-vs-solar-thermal`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.7,
    },
    {
      loc: `${SITE_URL}/compare/samsung-vs-lg-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/heat-pump-tariffs`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.85,
    },
    {
      loc: `${SITE_URL}/compare/air-to-air-vs-air-to-water-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.75,
    },
    {
      loc: `${SITE_URL}/compare/new-build-vs-retrofit-heat-pump`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.7,
    },
    {
      loc: `${SITE_URL}/compare/heat-pump-finance-options`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.8,
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
      loc: `${SITE_URL}/authors/jim-fell`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      loc: `${SITE_URL}/research/uk-affordability-index`,
      lastmod: now,
      changefreq: "monthly",
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
