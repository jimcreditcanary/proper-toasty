// /sitemap.xml — master sitemap INDEX pointing to four sub-sitemaps:
//
//   /sitemap-pages.xml    static marketing + landing
//   /sitemap-guides.xml   blog posts + future /guides
//   /sitemap-towns.xml    programmatic town pages (Phase 2)
//   /sitemap-data.xml     research / data assets (Phase 4)
//
// This file is what robots.txt advertises and what we submit to
// Google Search Console + Bing Webmaster Tools. Crawlers fetch it,
// discover the four sub-sitemaps, then fetch each.
//
// Segmentation makes the index useful AS A DIAGNOSTIC: in Search
// Console you see indexing health per sub-sitemap, so when
// programmatic towns start landing it's obvious whether they're
// indexing well vs. struggling — distinct from the editorial
// blog's indexing curve.
//
// Why a hand-rolled INDEX instead of MetadataRoute.Sitemap:
//
//   Next's metadata convention emits a <urlset> (a regular sitemap)
//   for /sitemap.xml. Sitemap INDEXES use a different XML schema
//   (<sitemapindex>) and Next's `generateSitemaps` helper generates
//   per-ID sub-files at /sitemap/<id>.xml — not the file naming the
//   SEO plan asks for. Route handler gives us full control.

import {
  SITE_URL,
  buildSitemapIndexXml,
  xmlResponse,
  type SitemapIndexEntry,
} from "@/lib/seo/sitemap-shared";

export const revalidate = 300;

export async function GET(): Promise<Response> {
  const now = new Date();
  const entries: SitemapIndexEntry[] = [
    { loc: `${SITE_URL}/sitemap-pages.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-guides.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-towns.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-data.xml`, lastmod: now },
  ];
  return xmlResponse(buildSitemapIndexXml(entries));
}
