// Shared helpers for every sitemap route handler.
//
// Why hand-rolled XML rather than Next's MetadataRoute.Sitemap
// convention:
//
//   Next's convention serves a SINGLE /sitemap.xml. We want four
//   named sub-sitemaps (pages / guides / towns / data) plus an
//   index — the convention's `generateSitemaps` works but emits at
//   /sitemap/<id>.xml, which doesn't match the file naming the SEO
//   plan asks for. Route handlers give us full URL control.
//
// XML safety: every dynamic value passes through `xmlEscape` before
// landing in the output. A blog post slug with `&` would otherwise
// break the parser; an installer-named URL with a quote ditto.
//
// Caching: 5-minute ISR via Cache-Control. Matches /llms.txt
// cadence — new blog posts surface within minutes, crawler load
// stays bounded.

import { ORG_PROFILE } from "./org-profile";

export const SITE_URL = ORG_PROFILE.url;

export type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapUrlEntry {
  /** Absolute URL. Caller is responsible for using the canonical
   *  host (typically SITE_URL); xmlEscape handles any odd chars. */
  loc: string;
  /** ISO date or Date object. Always serialised as W3C datetime. */
  lastmod?: string | Date;
  changefreq?: ChangeFrequency;
  /** 0.0–1.0. Convention is to use 1.0 for the home page and
   *  decay from there; >0.8 = highest, ~0.5 = mid, <0.3 = low. */
  priority?: number;
}

export interface SitemapIndexEntry {
  /** URL of a sub-sitemap. */
  loc: string;
  lastmod?: string | Date;
}

/**
 * XML attribute / text escape. Standard 5: &, <, >, ", '.
 * Cheap; URLs and dates are rarely long.
 */
export function xmlEscape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIso(d: string | Date | undefined): string | undefined {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return undefined;
  // W3C datetime — sitemaps.org spec accepts full ISO 8601 with
  // millisecond precision. We trim to date-only when the input was
  // a plain date string (no time component) to match Google's
  // preferred form.
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d;
  }
  return date.toISOString();
}

/**
 * Serialise a list of URL entries to a <urlset> XML document.
 * Conformant with sitemaps.org v0.9.
 */
export function buildUrlsetXml(entries: SitemapUrlEntry[]): string {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];
  for (const e of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(e.loc)}</loc>`);
    const lm = toIso(e.lastmod);
    if (lm) lines.push(`    <lastmod>${lm}</lastmod>`);
    if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
    if (e.priority !== undefined) {
      // sitemaps.org caps priority to 0.0–1.0 with one decimal.
      const p = Math.max(0, Math.min(1, e.priority));
      lines.push(`    <priority>${p.toFixed(1)}</priority>`);
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n");
}

/**
 * Serialise a list of sub-sitemap entries to a <sitemapindex> XML
 * document. Used by /sitemap.xml (the master index) only.
 */
export function buildSitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];
  for (const e of entries) {
    lines.push("  <sitemap>");
    lines.push(`    <loc>${xmlEscape(e.loc)}</loc>`);
    const lm = toIso(e.lastmod);
    if (lm) lines.push(`    <lastmod>${lm}</lastmod>`);
    lines.push("  </sitemap>");
  }
  lines.push("</sitemapindex>");
  return lines.join("\n");
}

/**
 * Standard response wrapper. Every sitemap route handler returns
 * via this so headers stay consistent. 5-minute SWR cache —
 * generous for crawlers, fast enough that publishing a blog post
 * surfaces in the sitemap within minutes.
 */
export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
