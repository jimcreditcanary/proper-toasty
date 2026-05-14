// /authors — author hub page.
//
// Lists every author whose byline appears on Propertoasty editorial
// content. Drives the E-E-A-T graph: search engines + LLMs see a
// single Person entity per author + can trace every cited article
// back to that author's bio. Currently a single-author site (Jim);
// surfaces additional authors as they sign on.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { AUTHORS } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/authors";

export const metadata: Metadata = {
  title: "Authors + contributors — Propertoasty",
  description:
    "The named authors and reviewers whose bylines appear on Propertoasty editorial content. Bios, areas of expertise, credentials, and links to published work.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Authors + contributors — Propertoasty",
    description:
      "Named bylines + bios for every author and reviewer on Propertoasty editorial.",
    type: "website",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
  },
};

export default function AuthorsHubPage() {
  const authors = Object.values(AUTHORS);

  return (
    <AEOPage
      headline="Authors + contributors"
      description="The named authors and reviewers whose bylines appear on Propertoasty editorial content."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="About"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Authors" },
      ]}
      directAnswer="Every editorial page on Propertoasty carries a named author byline. We treat author transparency as load-bearing for E-E-A-T (experience, expertise, authoritativeness, trust) — search engines and AI assistants citing our research, guides, and comparisons can trace each piece back to a single, verifiable Person entity with credentials, affiliation, and area of expertise."
      tldr={[
        `${authors.length} author${authors.length === 1 ? "" : "s"} currently published.`,
        "Every editorial page (guides, research, comparisons) carries a named byline.",
        "Author records include credentials, affiliations, and areas of expertise.",
        "Person schema published per author for search-engine + AI assistant ingestion.",
      ]}
      sources={[
        {
          name: "Google Search Quality Rater Guidelines — E-E-A-T",
          url: "https://developers.google.com/search/blog/2022/12/google-raters-guidelines-e-e-a-t",
          accessedDate: "May 2026",
        },
        {
          name: "Schema.org — Person + Article author",
          url: "https://schema.org/Person",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>Published authors</h2>

      <ul className="not-prose mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {authors.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/authors/${a.slug}`}
              className="group block rounded-2xl border border-[var(--border)] bg-white p-5 hover:border-coral hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  aria-hidden
                  className="shrink-0 w-12 h-12 rounded-full bg-cream border border-[var(--border)] flex items-center justify-center text-sm font-semibold text-navy"
                >
                  {a.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-navy m-0 leading-tight">
                    {a.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {a.jobTitle}
                  </p>
                  {a.knowsAbout.length > 0 && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      <span className="font-medium">Writes about:</span>{" "}
                      {a.knowsAbout.slice(0, 3).join(", ")}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs text-coral">
                    Read bio
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Why named bylines matter</h2>
      <p>
        Three reasons we sign every editorial page:
      </p>
      <ul>
        <li>
          <strong>Accountability.</strong> Each guide and research
          page carries a named author. If our methodology or numbers
          are wrong, you know who to challenge.
        </li>
        <li>
          <strong>E-E-A-T signal.</strong> Google&rsquo;s Quality
          Rater Guidelines weight named-author content with verifiable
          credentials more heavily than anonymous content. AI search
          assistants (ChatGPT, Perplexity, Gemini) do the same.
        </li>
        <li>
          <strong>Knowledge Graph linking.</strong> Each author has
          a single Person entity referenced from every published
          page via JSON-LD <code>@id</code>. Search engines build a
          coherent author profile rather than seeing each article as
          a standalone unowned document.
        </li>
      </ul>

      <h2>Contribute</h2>
      <p>
        Want to write or review on Propertoasty? We&rsquo;re
        specifically interested in MCS-certified heat pump
        engineers, retrofit coordinators, and chartered building
        services engineers who can sign off the technical content.
        Contact us via{" "}
        <Link href="/contact">/contact</Link> with your background +
        what you&rsquo;d like to cover.
      </p>

      <h2>Looking for what we&rsquo;ve published?</h2>
      <p>
        Browse by section:
      </p>
      <ul>
        <li>
          <Link href="/guides">
            <BookOpen
              className="inline w-4 h-4 mr-1 align-text-bottom"
              aria-hidden
            />
            Guides
          </Link>{" "}
          — homeowner walkthroughs (BUS grant, MCS site visit,
          fabric-first retrofit, hot-water planning, smart-tariff
          setup, running costs, payback, MCS 020 noise rules)
        </li>
        <li>
          <Link href="/research">Research</Link> — UK home energy
          data, EPC Index quarterly reports, Affordability Index
        </li>
        <li>
          <Link href="/compare">Comparisons</Link> — head-to-head
          decision pages on technologies and brands
        </li>
        <li>
          <Link href="/blog">Journal</Link> — shorter editorial
          pieces and news
        </li>
      </ul>
    </AEOPage>
  );
}
