// BreadcrumbList JSON-LD — slots in alongside Article/Product/etc.
//
// Powers the breadcrumb trail in SERPs (Home › Guides › How much does
// a heat pump cost?) instead of the bare URL slug. Also signals page
// hierarchy to AI engines that build site-structure maps.
//
// schema.org reference: https://schema.org/BreadcrumbList

import * as React from "react";
import { JsonLd } from "./JsonLd";
import { ORG_PROFILE } from "@/lib/seo/org-profile";

export interface BreadcrumbItem {
  /** Display name, e.g. "Guides". */
  name: string;
  /** URL for the crumb. May be passed as a site-relative path
   *  ("/heat-pumps") or an absolute URL — the component resolves
   *  relative paths to absolute against ORG_PROFILE.url before
   *  emitting, because schema.org's `item` field requires an absolute
   *  URL (Google flags relative values as "Invalid URL in field
   *  'id'"). Omit on the final crumb (current page) per Google's
   *  BreadcrumbList spec — the page doesn't link to itself. */
  url?: string;
}

/** Resolve a crumb URL to an absolute URL. Site-relative paths are
 *  joined onto the canonical origin; already-absolute URLs pass
 *  through untouched; undefined stays undefined (final crumb). */
function toAbsoluteUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = ORG_PROFILE.url.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  // "/" resolves to the bare origin (no trailing slash) to match the
  // canonical homepage URL.
  return path === "/" ? origin : `${origin}${path}`;
}

export interface BreadcrumbListSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbListSchema({
  items,
}: BreadcrumbListSchemaProps): React.ReactElement | null {
  if (items.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      // `item` is the URL field per the spec (legacy naming —
      // BreadcrumbList predates schema.org's preference for `url`).
      // Must be absolute; resolve relative paths. Drops on the last
      // crumb when no URL provided (JsonLd strips undefined keys).
      item: toAbsoluteUrl(item.url),
    })),
  };

  return <JsonLd data={data} />;
}
