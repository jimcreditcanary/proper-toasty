// Dataset JSON-LD — for /research.
//
// We publish two aggregate open datasets derived from the GOV.UK
// EPC Register: the EPC Index (band + floor-area distribution per
// area) and the Affordability Index (heat-pump running-cost ranges
// per archetype). Marking each with Dataset schema makes them
// discoverable via Google Dataset Search and cite-able by AI search
// answering data-shaped queries.
//
// schema.org reference: https://schema.org/Dataset

import * as React from "react";
import { ORG_PROFILE } from "@/lib/seo/org-profile";
import { JsonLd } from "./JsonLd";

export interface DatasetSchemaProps {
  /** Public URL where the dataset is described. */
  url: string;
  /** Dataset name — a short, distinct label. */
  name: string;
  /** One-paragraph description of what the dataset contains and how
   *  it was derived. */
  description: string;
  /** Public licence URL. Defaults to OGL v3.0 (the licence the
   *  underlying EPC Register data is published under). */
  licenseUrl?: string;
  /** Free-text licence label alongside the URL, e.g. "Open
   *  Government Licence v3.0". */
  licenseName?: string;
  /** Time span covered by the dataset — ISO 8601 interval
   *  ("2008-01-01/2026-06-30") or an open-ended range. */
  temporalCoverage?: string;
  /** Free-text spatial coverage description ("England & Wales"). */
  spatialCoverage?: string;
  /** Optional keywords for Dataset Search categorisation. */
  keywords?: string[];
}

const DEFAULT_LICENSE_URL =
  "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
const DEFAULT_LICENSE_NAME = "Open Government Licence v3.0";

export function DatasetSchema(props: DatasetSchemaProps): React.ReactElement | null {
  const {
    url,
    name,
    description,
    licenseUrl = DEFAULT_LICENSE_URL,
    licenseName = DEFAULT_LICENSE_NAME,
    temporalCoverage,
    spatialCoverage,
    keywords,
  } = props;

  const data = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name,
    description,
    url,
    license: licenseUrl,
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    // Creator is the publishing organisation (Propertoasty), which
    // aggregates + derives the dataset from the source register.
    creator: {
      "@type": "Organization",
      "@id": `${ORG_PROFILE.url}#organization`,
      name: ORG_PROFILE.name,
      url: ORG_PROFILE.url,
    },
    publisher: {
      "@id": `${ORG_PROFILE.url}#organization`,
    },
    // Cross-cite the source. Dataset schema doesn't have a strict
    // provenance field, so `isBasedOn` is the standard shape.
    isBasedOn: {
      "@type": "Dataset",
      name: "Energy Performance of Buildings Register",
      url: "https://epc.opendatacommunities.org/",
      license: licenseUrl,
    },
    // Human-readable licence label paired with the machine URL.
    // Google's Dataset Search picks up both.
    conditionsOfAccess: licenseName,
    temporalCoverage,
    spatialCoverage,
    keywords: keywords && keywords.length > 0 ? keywords.join(", ") : undefined,
  };

  return <JsonLd data={data} />;
}
