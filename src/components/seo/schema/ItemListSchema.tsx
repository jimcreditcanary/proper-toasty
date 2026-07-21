// ItemList JSON-LD — for directory / index pages.
//
// Used on /heat-pump-installers and /solar-panel-installers to mark
// each directory page as an ordered list of items. Combined with the
// existing Service/Article markup on the page itself, ItemList makes
// the "list of installers by area" structure machine-legible to
// Google (rich list results) and to AI answer engines fielding
// "heat pump installers near {area}" queries.
//
// The list items themselves point at the per-area directory pages
// (e.g. /heat-pump-installers/sheffield). We don't emit individual
// installer names here — those live on the per-area page's own
// InstallerListSection block and would explode the schema payload.
//
// schema.org reference: https://schema.org/ItemList

import * as React from "react";
import { JsonLd } from "./JsonLd";

export interface ItemListEntry {
  /** Human-readable label rendered in Google's list preview. */
  name: string;
  /** Absolute URL of the item. */
  url: string;
  /** Optional short description. Google truncates long strings so
   *  keep to ~1 sentence. */
  description?: string;
}

export interface ItemListSchemaProps {
  /** Public URL of the page emitting the list. */
  url: string;
  /** List name — a short, distinct label. */
  name: string;
  /** One-paragraph description of what the list contains. */
  description: string;
  /** Ordered items. Google honours the array order as the visible
   *  ranking, so pass items in the order they render on the page. */
  items: ItemListEntry[];
}

export function ItemListSchema(
  props: ItemListSchemaProps,
): React.ReactElement | null {
  const { url, name, description, items } = props;
  if (items.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${url}#itemlist`,
    name,
    description,
    url,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: item.url,
      name: item.name,
      description: item.description,
    })),
  };

  return <JsonLd data={data} />;
}
