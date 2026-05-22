// /sitemap.xml — master sitemap INDEX pointing to the sub-sitemaps:
//
//   /sitemap-pages.xml    static marketing + landing
//   /sitemap-guides.xml   blog posts + future /guides
//   /sitemap-towns.xml    programmatic town pages (Phase 2)
//   /sitemap-data.xml     research / data assets (Phase 4) — NOT yet
//                         listed below: it's still an empty <urlset>,
//                         and Bing rejects an empty sitemap referenced
//                         in an index ("Invalid sitemap — Unable to
//                         fetch urls from the sitemap"), failing the
//                         whole scan. Re-add the entry once it emits
//                         real <url> rows. Google tolerates the empty
//                         child; Bing does not.
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
    // sitemap-data.xml deliberately omitted while it's an empty
    // <urlset> — see the file header. Re-add when Phase 4 data assets
    // populate it.
  ];
  return xmlResponse(buildSitemapIndexXml(entries));
}
