// Article JSON-LD — for editorial content (blog posts, future
// long-form guides under /guides).
//
// What it gives us:
//
//   - Google Article rich results (date, author, headline)
//   - AI search engines learn the author + publish date for the
//     content they're citing
//   - `reviewedBy` slot for MCS-installer reviewers when the
//     engagement campaign delivers sign-ups
//
// CRITICAL E-E-A-T NOTE
// ────────────────────────────────────────────────────────────────────
//
//   Article.author MUST be Person (not Organization) for content that
//   carries opinion / cost claims. Google's quality raters use the
//   presence of a named, credentialed Person author as a primary
//   E-E-A-T signal. The pre-refactor blog page set author as an
//   Organization — fixed here as part of the schema-component
//   migration.
//
// schema.org reference: https://schema.org/Article

import * as React from "react";
import { ORG_PROFILE, ORG_LOGO_URL } from "@/lib/seo/org-profile";
import { getAuthor, authorUrl, DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { JsonLd } from "./JsonLd";

export interface ArticleSchemaProps {
  /** Page H1 / OG title. Becomes Article.headline. */
  headline: string;
  /** One-line description / excerpt. */
  description: string;
  /** Canonical URL of the page (absolute). */
  url: string;
  /** Cover image — absolute URL (or path resolved against ORG_PROFILE.url). */
  image: string;
  /** ISO datetime when first published. */
  datePublished: string;
  /** ISO datetime when last meaningfully edited. Defaults to
   *  datePublished when omitted (Google treats them as equivalent). */
  dateModified?: string;
  /** Author slug — looked up against the AUTHORS registry. Falls
   *  back to the founder when not found, so a guide doesn't 500 if
   *  the author hasn't been seeded yet. */
  authorSlug?: string;
  /** Optional reviewer slug — appears as Article.reviewedBy. The
   *  E-E-A-T slot for our MCS-installer co-sign campaign. */
  reviewerSlug?: string;
  /** Article category for `articleSection` (e.g. "Heat pump",
   *  "Solar PV"). */
  section?: string;
  /** Word count — improves how AI search engines weight the depth
   *  of the article. Optional but recommended. */
  wordCount?: number;
}

/**
 * Build a Person reference for use in author / reviewedBy.
 * Returns a `@id` ref to the standalone PersonSchema on
 * /authors/<slug> so Google sees a single Person entity, not
 * multiple competing copies across articles.
 */
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

export function ArticleSchema(props: ArticleSchemaProps): React.ReactElement | null {
  const {
    headline,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorSlug = DEFAULT_AUTHOR_SLUG,
    reviewerSlug,
    section,
    wordCount,
  } = props;

  const absoluteImage = image.startsWith("http")
    ? image
    : `${ORG_PROFILE.url}${image.startsWith("/") ? image : `/${image}`}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: [absoluteImage],
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: personRef(authorSlug),
    // reviewedBy is the slot we surface MCS installers under. Drops
    // out entirely when reviewerSlug is absent.
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
    articleSection: section,
    wordCount,
    inLanguage: "en-GB",
  };

  return <JsonLd data={data} />;
}
