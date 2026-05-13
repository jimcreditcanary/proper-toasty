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
import {
  loadIndexedTownAggregates,
  loadIndexedLAAggregates,
  loadIndexedPostcodeDistrictAggregates,
} from "@/lib/programmatic/town-aggregates";
import { PILOT_TOWNS } from "@/lib/programmatic/towns";
import { PILOT_ARCHETYPES } from "@/lib/programmatic/archetypes";
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
    // Archetype pages — curated, always indexed. Same /heat-pumps/<slug>
    // namespace, dispatched by the route handler.
    const now = new Date();
    for (const a of PILOT_ARCHETYPES) {
      entries.push({
        loc: `${SITE_URL}/heat-pumps/${a.slug}`,
        lastmod: now,
        changefreq: "monthly",
        priority: 0.7,
      });
    }

    // Local-authority scope pages. Each indexed LA gets a heat-pump
    // + solar URL under /heat-pumps/la-<gss> and /solar-panels/la-<gss>.
    // Exclude LAs that map to a PILOT_TOWN — those are covered by
    // the town pages above and shouldn't duplicate.
    const pilotLaGss = new Set(
      PILOT_TOWNS.map((t) => t.laGssCode.toUpperCase()),
    );
    const laRows = await loadIndexedLAAggregates(admin);
    for (const r of laRows) {
      const gss = r.scope_key.replace(/^la-/i, "").toUpperCase();
      if (pilotLaGss.has(gss)) continue;
      entries.push({
        loc: `${SITE_URL}/heat-pumps/${r.scope_key}`,
        lastmod: r.refreshed_at,
        changefreq: "monthly",
        priority: 0.55,
      });
      entries.push({
        loc: `${SITE_URL}/solar-panels/${r.scope_key}`,
        lastmod: r.refreshed_at,
        changefreq: "monthly",
        priority: 0.55,
      });
    }

    // Postcode-district pages — most granular geographic surface.
    // Priority slightly lower than LAs because the data is thinner
    // per page; the sheer page count compensates.
    const pcdRows = await loadIndexedPostcodeDistrictAggregates(admin);
    for (const r of pcdRows) {
      entries.push({
        loc: `${SITE_URL}/heat-pumps/${r.scope_key}`,
        lastmod: r.refreshed_at,
        changefreq: "monthly",
        priority: 0.5,
      });
      entries.push({
        loc: `${SITE_URL}/solar-panels/${r.scope_key}`,
        lastmod: r.refreshed_at,
        changefreq: "monthly",
        priority: 0.5,
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
