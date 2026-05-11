// AEOPage — the canonical wrapper for every evergreen, AI-search-
// optimised page on Propertoasty. Programmatic town / archetype /
// comparison pages and editorial guides all compose AEOPage.
//
// What it does for you:
//
//   1. Renders the standard chrome: MarketingHeader + cream-bg
//      article container + LandingFooter.
//
//   2. Emits Article + BreadcrumbList JSON-LD with @id references
//      that consolidate into the sitewide Organization / Person
//      entities. Optionally emits FAQPage schema when `faqs` is
//      supplied.
//
//   3. Lays out the AEO-mandated structure:
//        <h1>headline</h1>
//        <DirectAnswer>...</DirectAnswer>          (40–60 word lift)
//        <metadata row>: AuthorByline · LastUpdated
//        <TLDR bullets>
//        {children}                                  (body content)
//        <SourcesList>
//        OGL attribution footer (when sourcesEpc=true)
//
//   4. Computes Article.wordCount from body word count for the
//      JSON-LD — used by AI engines to weight depth.
//
//   5. Runs dev-time validators (DirectAnswer length, sources
//      authority) via the primitives. Build-time validator
//      (deliverable #10) re-runs on every programmatic page.
//
// What it does NOT do:
//
//   - Auto-extract FAQs from body content. The FaqPageSchema
//     component exposes extractFaqsFromHtml; pass the result to
//     `faqs` if you want it. Default off to avoid surprise schema.
//
//   - Style the body content. Children can be plain JSX with
//     whatever H2/H3/p/img markup the page wants. Recommended
//     wrapping in `prose prose-lg` (Tailwind Typography) for
//     editorial pages — done by the caller.

import * as React from "react";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import {
  ArticleSchema,
  BreadcrumbListSchema,
  FaqPageSchema,
  type BreadcrumbItem,
  type FaqEntry,
} from "@/components/seo/schema";
import { DirectAnswer } from "./DirectAnswer";
import { LastUpdated } from "./LastUpdated";
import { AuthorByline } from "./AuthorByline";
import { TLDR } from "./TLDR";
import { SourcesList } from "./SourcesList";
import type { SourceEntry } from "@/lib/seo/validators";
import { countWords } from "@/lib/seo/validators";

export interface AEOPageProps {
  // ─── Required identity ────────────────────────────────────────
  /** Page H1. Also becomes Article.headline + the document title. */
  headline: string;
  /** Short page description — meta description + Article.description. */
  description: string;
  /** Canonical absolute URL of this page. */
  url: string;
  /** Open Graph / Article.image. Absolute URL or root-relative path. */
  image: string;
  /** ISO date when the page was first published. */
  datePublished: string;
  /** ISO date when the page was last edited. */
  dateModified: string;
  /** Author slug — looked up against AUTHORS registry. */
  authorSlug: string;
  /** Optional reviewer slug — typically an MCS-installer co-signer. */
  reviewerSlug?: string;

  // ─── AEO required structure ───────────────────────────────────
  /** The 40–60 word lift-friendly answer paragraph. */
  directAnswer: string;
  /** Breadcrumb trail. Last item should NOT have `url` (current page). */
  breadcrumbs: BreadcrumbItem[];
  /** Sources cited on the page. Min 3 recommended; ≥1 should be
   *  from an approved authority (gov.uk / Ofgem / MCS / EST / ONS). */
  sources: SourceEntry[];

  // ─── Optional ──────────────────────────────────────────────────
  /** TL;DR bullets. 3–6 short factual lines. */
  tldr?: string[];
  /** FAQ entries to emit as FAQPage schema. */
  faqs?: FaqEntry[];
  /** Article category for `articleSection` (e.g. "Heat pump",
   *  "Solar PV"). Surfaces in JSON-LD only — not rendered visibly. */
  section?: string;
  /** Set true when the page renders aggregated EPC data —
   *  surfaces the OGL v3.0 attribution line in the footer. */
  sourcesEpc?: boolean;
  /** Body content — H2/H3/p/img/etc. */
  children: React.ReactNode;
}

/**
 * Convert React children to a flat HTML-ish string for word counting
 * and FAQ auto-extraction (when callers want it). Best-effort —
 * primitives, fragments, and arrays are flattened; complex components
 * render as empty (they're typically chrome, not body content).
 */
function childrenToText(children: React.ReactNode): string {
  const buf: string[] = [];
  const walk = (node: React.ReactNode): void => {
    if (node == null || node === false) return;
    if (typeof node === "string" || typeof node === "number") {
      buf.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      for (const c of node) walk(c);
      return;
    }
    if (React.isValidElement(node)) {
      const childProps = (node.props ?? {}) as { children?: React.ReactNode };
      walk(childProps.children);
    }
  };
  walk(children);
  return buf.join(" ");
}

export function AEOPage(props: AEOPageProps): React.ReactElement {
  const {
    headline,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorSlug,
    reviewerSlug,
    directAnswer,
    breadcrumbs,
    sources,
    tldr,
    faqs,
    section,
    sourcesEpc = false,
    children,
  } = props;

  // Body word count drives Article.wordCount + the build-time
  // 600-word minimum check (validated by the seo-audit script —
  // see deliverable #10). Computed once here.
  const bodyText = childrenToText(children);
  const wordCount = countWords(bodyText);

  return (
    <div className="bg-cream min-h-screen flex flex-col" data-aeo="page">
      {/* ─── Sitewide chrome ─────────────────────────────────────── */}
      <MarketingHeader />

      {/* ─── JSON-LD ─────────────────────────────────────────────── */}
      <ArticleSchema
        headline={headline}
        description={description}
        url={url}
        image={image}
        datePublished={datePublished}
        dateModified={dateModified}
        authorSlug={authorSlug}
        reviewerSlug={reviewerSlug}
        section={section}
        wordCount={wordCount}
      />
      <BreadcrumbListSchema items={breadcrumbs} />
      {faqs && faqs.length > 0 && <FaqPageSchema faqs={faqs} />}

      {/* ─── Article body ────────────────────────────────────────── */}
      <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-14 flex-1">
        {/* Visible breadcrumb trail mirrors the schema. Last crumb
            (current page) renders unlinked. */}
        {breadcrumbs.length > 1 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-xs text-slate-500"
          >
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {breadcrumbs.map((c, i) => (
                <li
                  key={i}
                  className="inline-flex items-center gap-1.5"
                >
                  {i > 0 && <span className="text-slate-300">›</span>}
                  {c.url ? (
                    <a
                      href={c.url}
                      className="hover:text-coral transition-colors"
                    >
                      {c.name}
                    </a>
                  ) : (
                    <span className="text-navy/80">{c.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* H1 — single per page. Section comes BEFORE H1 visually as
            a category eyebrow, when supplied. */}
        {section && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-coral mb-3">
            {section}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-navy leading-[1.1] tracking-tight">
          {headline}
        </h1>

        {/* DirectAnswer — the 40–60 word lift. Lives immediately
            below H1 by spec. */}
        <DirectAnswer>{directAnswer}</DirectAnswer>

        {/* Byline + last-updated row. Keep tight; this is metadata,
            not body. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AuthorByline authorSlug={authorSlug} reviewerSlug={reviewerSlug} />
          <span className="text-slate-300 hidden sm:inline">·</span>
          <LastUpdated isoDate={dateModified} />
        </div>

        {/* Optional TL;DR card. */}
        {tldr && tldr.length > 0 && <TLDR bullets={tldr} />}

        {/* Body content — caller controls H2/H3/p/img structure.
            Wrapped in a prose container for readable defaults; pages
            can override per-section if they want a wider layout
            (tables, etc, are NOT confined to the prose width). */}
        <div className="mt-8 prose prose-slate prose-lg max-w-none prose-headings:font-semibold prose-headings:text-navy prose-h2:mt-12 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-a:text-coral hover:prose-a:text-coral-dark prose-strong:text-navy">
          {children}
        </div>

        {/* Sources — always rendered at the bottom of the article. */}
        <SourcesList sources={sources} />

        {/* OGL attribution — emitted on every page that consumes
            aggregated EPC data. OGL v3.0 requires attribution
            whenever derivatives are published. */}
        {sourcesEpc && (
          <p
            className="mt-6 text-[11px] text-slate-400 leading-relaxed"
            data-aeo="ogl-attribution"
          >
            EPC aggregate data contains public sector information licensed
            under the{" "}
            <a
              href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Open Government Licence v3.0
            </a>{" "}
            (&copy; Crown copyright and database right).
          </p>
        )}
      </article>

      <LandingFooter />
    </div>
  );
}
