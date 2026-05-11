// Organization JSON-LD — sitewide, mounts in the root layout.
//
// Builds the canonical Organization node that Google + the AI engines
// use to consolidate every mention of "Propertoasty" into a single
// entity. Without this, citations are ambiguous ("Propertoasty (the
// website)" vs "Propertoasty (the company)") and Knowledge Graph
// enrichment stalls.
//
// All fields derived from ORG_PROFILE — single source of truth. The
// JsonLd primitive strips undefined / empty fields so partial
// profiles still emit clean JSON-LD without empty `address: {}`
// stubs.
//
// schema.org reference: https://schema.org/Organization

import * as React from "react";
import { ORG_LOGO_URL, ORG_PROFILE, FOUNDER_AUTHOR_URL } from "@/lib/seo/org-profile";
import { JsonLd } from "./JsonLd";

export function OrganizationSchema(): React.ReactElement | null {
  const founder = ORG_PROFILE.founder;

  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${ORG_PROFILE.url}#organization`,
    name: ORG_PROFILE.name,
    legalName: ORG_PROFILE.legalName,
    url: ORG_PROFILE.url,
    description: ORG_PROFILE.description,
    foundingDate: ORG_PROFILE.foundingDate,
    logo: {
      "@type": "ImageObject",
      url: ORG_LOGO_URL,
      // Width/height aren't strictly required, but Google's
      // structured-data validator nudges you to include them when
      // the asset is a logo. We use the SVG so dimensions are
      // intrinsic — declaring 512×512 reflects the rendered raster.
      width: 512,
      height: 512,
    },
    // sameAs is the strongest signal for Knowledge Graph
    // consolidation — drop the field entirely (vs an empty array)
    // until at least one real URL is added. JsonLd.clean() handles
    // the drop automatically.
    sameAs: ORG_PROFILE.sameAs.length > 0 ? ORG_PROFILE.sameAs : undefined,
    // Founder cross-link — references the same Person @id used by
    // the standalone PersonSchema on /authors/jim-fell, so Google
    // sees them as the same node rather than two competing entities.
    founder: {
      "@type": "Person",
      "@id": `${FOUNDER_AUTHOR_URL}#person`,
      name: founder.name,
      url: FOUNDER_AUTHOR_URL,
    },
    address: ORG_PROFILE.address
      ? { "@type": "PostalAddress", ...ORG_PROFILE.address }
      : undefined,
    contactPoint: ORG_PROFILE.contactPoint
      ? { "@type": "ContactPoint", ...ORG_PROFILE.contactPoint }
      : undefined,
  };

  return <JsonLd data={data} />;
}
