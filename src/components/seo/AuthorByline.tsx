// AuthorByline — surfaces the primary author + optional reviewer at
// the top of an evergreen page.
//
// The visible byline is the human-side companion to Article.author /
// Article.reviewedBy in the JSON-LD. Both should agree — Google's
// quality raters cross-check the on-page byline against the schema
// when judging E-E-A-T.
//
// Layout: name → credentials chip → " · reviewed by reviewer name →
// reviewer credentials". Falls back gracefully if either author is
// missing from the registry (renders the slug as plain text).

import * as React from "react";
import Link from "next/link";
import { getAuthor } from "@/lib/seo/authors";

interface AuthorBylineProps {
  /** Primary author's slug — must match an entry in AUTHORS. */
  authorSlug: string;
  /** Optional reviewer slug — typically an MCS-installer co-signer. */
  reviewerSlug?: string;
}

export function AuthorByline({
  authorSlug,
  reviewerSlug,
}: AuthorBylineProps): React.ReactElement {
  const author = getAuthor(authorSlug);
  const reviewer = reviewerSlug ? getAuthor(reviewerSlug) : null;

  if (!author) {
    // Defensive fallback — render the slug as raw text rather than
    // crashing the page. Dev sees this with a console warn from
    // org-profile.ts; prod just renders a less-pretty byline.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[AEO] AuthorByline: no entry for slug "${authorSlug}"`);
    }
    return (
      <span className="text-sm text-slate-500" data-aeo="author-byline">
        By {authorSlug}
      </span>
    );
  }

  return (
    <span
      className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600"
      data-aeo="author-byline"
    >
      <span>
        By{" "}
        <Link
          href={`/authors/${author.slug}`}
          className="font-semibold text-navy hover:text-coral transition-colors"
        >
          {author.name}
        </Link>
      </span>
      {author.credentials.length > 0 && (
        <CredentialsChips credentials={author.credentials} />
      )}
      {reviewer && (
        <>
          <span className="text-slate-300">·</span>
          <span>
            Reviewed by{" "}
            <Link
              href={`/authors/${reviewer.slug}`}
              className="font-semibold text-navy hover:text-coral transition-colors"
            >
              {reviewer.name}
            </Link>
          </span>
          {reviewer.credentials.length > 0 && (
            <CredentialsChips credentials={reviewer.credentials} />
          )}
          {reviewer.mcsCertificateNumber && (
            // Link to the MCS public register — same URL as
            // PersonSchema.identifier. Lets readers verify the
            // credential in one click. Cheap, BIG E-E-A-T win.
            <a
              href={`https://mcscertified.com/find-an-installer/?mcsNumber=${reviewer.mcsCertificateNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-slate-500 hover:text-coral"
            >
              Verify MCS
            </a>
          )}
        </>
      )}
    </span>
  );
}

function CredentialsChips({ credentials }: { credentials: string[] }) {
  return (
    <>
      {credentials.map((c) => (
        <span
          key={c}
          className="inline-flex items-center rounded-full bg-cream-deep px-2 py-0.5 text-[11px] font-semibold text-navy/80 border border-[var(--border)]"
        >
          {c}
        </span>
      ))}
    </>
  );
}
