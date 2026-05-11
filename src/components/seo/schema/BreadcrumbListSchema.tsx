// BreadcrumbList JSON-LD — slots in alongside Article/Product/etc.
//
// Powers the breadcrumb trail in SERPs (Home › Guides › How much does
// a heat pump cost?) instead of the bare URL slug. Also signals page
// hierarchy to AI engines that build site-structure maps.
//
// schema.org reference: https://schema.org/BreadcrumbList

import * as React from "react";
import { JsonLd } from "./JsonLd";

export interface BreadcrumbItem {
  /** Display name, e.g. "Guides". */
  name: string;
  /** Absolute URL. Omit on the final crumb (current page) per
   *  Google's BreadcrumbList spec — the page itself doesn't need to
   *  link to itself. The component handles the omission when
   *  `url` is undefined. */
  url?: string;
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
      // Drop on the last crumb if no URL provided.
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}
