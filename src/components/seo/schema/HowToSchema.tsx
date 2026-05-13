// HowTo JSON-LD — for procedural guide pages where the body is
// a structured step-by-step walkthrough (BUS application, MCS
// site visit, fabric-first retrofit, hot-water planning, smart-
// tariff setup).
//
// Why HowTo and not Article: HowTo unlocks step-by-step rich
// results in Google search (the "step 1, 2, 3..." carousel that
// gets shown for high-intent procedural queries). AI search
// engines also lift the structured step list verbatim when a
// user asks "how do I X" — exactly the lifting behaviour we
// want for guides.
//
// Author + publisher carry across from ArticleSchema patterns
// so the byline graph stays consistent regardless of which
// schema type a guide uses.
//
// schema.org reference: https://schema.org/HowTo

import * as React from "react";
import { ORG_PROFILE, ORG_LOGO_URL } from "@/lib/seo/org-profile";
import { getAuthor, authorUrl, DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { JsonLd } from "./JsonLd";

export interface HowToStep {
  /** Short step title — surfaces in the rich-result carousel. */
  name: string;
  /** Step body — what to do at this step. 1–3 sentences. */
  text: string;
}

export interface HowToSchemaProps {
  /** Page H1 / OG title. Becomes HowTo.name. */
  headline: string;
  /** One-line description / excerpt. */
  description: string;
  /** Canonical URL of the page (absolute). */
  url: string;
  /** Cover image — absolute URL (or path resolved against ORG_PROFILE.url). */
  image: string;
  /** ISO datetime when first published. */
  datePublished: string;
  /** ISO datetime when last meaningfully edited. */
  dateModified?: string;
  /** Author slug — looked up against the AUTHORS registry. */
  authorSlug?: string;
  /** Optional reviewer slug. */
  reviewerSlug?: string;
  /** The ordered step list. Required — HowTo without steps doesn't
   *  generate rich results. */
  steps: HowToStep[];
  /** Optional total time estimate (ISO 8601 duration, e.g. "PT4H"
   *  for 4 hours, "P3M" for 3 months). */
  totalTime?: string;
}

function personRef(slug: string): Record<string, unknown> | undefined {
  const author = getAuthor(slug);
  if (!author) return undefined;
  return {
    "@type": "Person",
    "@id": `${authorUrl(slug)}#person`,
    name: author.name,
    url: authorUrl(slug),
  };
}

export function HowToSchema(props: HowToSchemaProps): React.ReactElement | null {
  const {
    headline,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorSlug = DEFAULT_AUTHOR_SLUG,
    reviewerSlug,
    steps,
    totalTime,
  } = props;

  const absoluteImage = image.startsWith("http")
    ? image
    : `${ORG_PROFILE.url}${image.startsWith("/") ? image : `/${image}`}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: headline,
    description,
    image: [absoluteImage],
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: personRef(authorSlug),
    reviewedBy: reviewerSlug ? personRef(reviewerSlug) : undefined,
    publisher: {
      "@type": "Organization",
      "@id": `${ORG_PROFILE.url}#organization`,
      name: ORG_PROFILE.name,
      url: ORG_PROFILE.url,
      logo: {
        "@type": "ImageObject",
        url: ORG_LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    totalTime,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
    inLanguage: "en-GB",
  };

  return <JsonLd data={data} />;
}
