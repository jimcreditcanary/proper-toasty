// WebSite JSON-LD — sitewide.
//
// Pairs with OrganizationSchema in the root layout. Both blocks are
// served on every page; together they tell Google + the AI engines
// "this domain belongs to this organisation, and here is its name +
// canonical URL + primary action".
//
// We declare a `PotentialAction` pointing at the suitability check —
// the canonical user task on the site. We do NOT declare a Google
// "Sitelinks search box" SearchAction because we don't have a generic
// site-wide search (the homepage CTA is a multi-step wizard, not a
// `q=` query). Lying about it tends to backfire — Google validates
// the search URL against the live site and downgrades the schema
// when it doesn't behave.
//
// schema.org reference: https://schema.org/WebSite

import * as React from "react";
import { ORG_PROFILE } from "@/lib/seo/org-profile";
import { JsonLd } from "./JsonLd";

export function WebSiteSchema(): React.ReactElement | null {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${ORG_PROFILE.url}#website`,
    name: ORG_PROFILE.name,
    url: ORG_PROFILE.url,
    description: ORG_PROFILE.description,
    inLanguage: "en-GB",
    // Link back to the Organization @id from OrganizationSchema so
    // both blocks reference the same entity.
    publisher: { "@id": `${ORG_PROFILE.url}#organization` },
    // The suitability checker is the primary action a visitor takes.
    // Modelled as a generic Action rather than SearchAction (we don't
    // accept arbitrary query strings).
    potentialAction: {
      "@type": "Action",
      name: "Run a free pre-survey check",
      target: `${ORG_PROFILE.url}/check`,
    },
  };

  return <JsonLd data={data} />;
}
