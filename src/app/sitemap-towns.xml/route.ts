// /sitemap-towns.xml — programmatic town pages (Phase 2).
//
// Empty stub today. Wired so:
//
//   - The master /sitemap.xml index always points here; once town
//     pages start landing, this populates automatically without a
//     redeploy or index change.
//   - Crawlers learn the canonical URL ahead of time and don't
//     index the routes via alternative paths.
//
// The town page generator (deliverable #8) will populate
// `loadTownEntries()` by reading the same source the routes use to
// render — typically the `epc_area_aggregates` rollup table, with
// scope='town'. Any town where the build-time quality gates failed
// (insufficient unique data, body word count under 600) will be
// noindex'd at the page level AND excluded from this sitemap.
// Sitemap + meta-robots agree.

import { createAdminClient } from "@/lib/supabase/admin";
import { loadIndexedTownAggregates } from "@/lib/programmatic/town-aggregates";
import {
  SITE_URL,
  buildUrlsetXml,
  xmlResponse,
  type SitemapUrlEntry,
} from "@/lib/seo/sitemap-shared";

export const revalidate = 300;

async function loadTownEntries(): Promise<SitemapUrlEntry[]> {
  try {
    const admin = createAdminClient();
    const rows = await loadIndexedTownAggregates(admin);
    const entries: SitemapUrlEntry[] = [];
    for (const r of rows) {
      // Each town gets two pages — the heat-pump and the solar
      // variant. Both are indexed when the aggregate is indexed
      // (same quality bar applies to both).
      entries.push({
        loc: `${SITE_URL}/heat-pumps/${r.scope_key}`,
        lastmod: r.refreshed_at,
        changefreq: "monthly",
        priority: 0.6,
      });
      entries.push({
        loc: `${SITE_URL}/solar-panels/${r.scope_key}`,
        lastmod: r.refreshed_at,
        changefreq: "monthly",
        priority: 0.6,
      });
    }
    return entries;
  } catch (err) {
    console.error("[sitemap-towns] query failed", err);
    return [];
  }
}

export async function GET(): Promise<Response> {
  const entries = await loadTownEntries();
  return xmlResponse(buildUrlsetXml(entries));
}
