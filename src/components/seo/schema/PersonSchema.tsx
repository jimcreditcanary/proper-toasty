// Person JSON-LD — for /authors/[slug] bio pages.
//
// Drives the standalone Person entity Google + AI engines associate
// with every byline. Article.author and Article.reviewedBy point at
// this Person via the same @id, so a single person is one node in
// the Knowledge Graph regardless of how many articles cite them.
//
// schema.org reference: https://schema.org/Person

import * as React from "react";
import { ORG_PROFILE } from "@/lib/seo/org-profile";
import { authorUrl, type AuthorProfile } from "@/lib/seo/authors";
import { JsonLd } from "./JsonLd";

export interface PersonSchemaProps {
  author: AuthorProfile;
}

export function PersonSchema({ author }: PersonSchemaProps): React.ReactElement | null {
  const pageUrl = authorUrl(author.slug);
  const absoluteImage = author.image
    ? author.image.startsWith("http")
      ? author.image
      : `${ORG_PROFILE.url}${author.image.startsWith("/") ? author.image : `/${author.image}`}`
    : undefined;

  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${pageUrl}#person`,
    name: author.name,
    url: pageUrl,
    description: author.bio,
    jobTitle: author.jobTitle,
    image: absoluteImage,
    // hasCredential is the schema.org-canonical way to surface
    // credentials. We emit each as an EducationalOccupationalCredential
    // for portability — MCS / chartered / degree credentials all share
    // the same shape.
    hasCredential: author.credentials.length > 0
      ? author.credentials.map((c) => ({
          "@type": "EducationalOccupationalCredential",
          name: c,
        }))
      : undefined,
    // MCS certificate gets a verifiable cross-link so AI engines can
    // confirm the credential against the public MCS register.
    identifier: author.mcsCertificateNumber
      ? {
          "@type": "PropertyValue",
          propertyID: "MCS",
          value: author.mcsCertificateNumber,
          url: `https://mcscertified.com/find-an-installer/?mcsNumber=${author.mcsCertificateNumber}`,
        }
      : undefined,
    affiliation: author.affiliation
      ? {
          "@type": "Organization",
          name: author.affiliation.name,
          url: author.affiliation.url,
        }
      : undefined,
    knowsAbout: author.knowsAbout.length > 0 ? author.knowsAbout : undefined,
    sameAs: author.sameAs.length > 0 ? author.sameAs : undefined,
    worksFor: { "@id": `${ORG_PROFILE.url}#organization` },
  };

  return <JsonLd data={data} />;
}
