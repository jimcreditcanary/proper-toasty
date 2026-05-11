// /sitemap-data.xml — research / data-asset pages (Phase 4).
//
// Empty stub today. Will populate when the UK Affordability Index
// + future research assets ship under /research/*. Surfaces here
// (rather than sitemap-pages.xml) so we can monitor data-asset
// indexing separately — these pages are higher-stakes for citation
// links and we want a clean signal in Search Console for them.
//
// Population strategy is the same as the towns sitemap: read the
// route definitions, filter by an "indexed" boolean, emit.

import {
  buildUrlsetXml,
  xmlResponse,
  type SitemapUrlEntry,
} from "@/lib/seo/sitemap-shared";

export const revalidate = 300;

async function loadDataEntries(): Promise<SitemapUrlEntry[]> {
  // TODO: populate with /research/uk-affordability-index +
  //   /press + any future data-asset routes once Phase 4 lands.
  return [];
}

export async function GET(): Promise<Response> {
  const entries = await loadDataEntries();
  return xmlResponse(buildUrlsetXml(entries));
}
