// /authors/[slug] — author bio page.
//
// The standalone Person entity that every Article.author and
// Article.reviewedBy points at via the same @id. Google + AI
// search engines see one author node in the Knowledge Graph
// regardless of how many guides cite them.
//
// E-E-A-T: this page is the load-bearing surface for the "experience,
// expertise, authoritativeness, trust" signals on every editorial
// page. Substantive bio, credentials, knowsAbout topics, sameAs
// links — all the trust signals — live here.
//
// New authors get added by editing AUTHORS in /lib/seo/authors.ts;
// this route then renders them automatically with no per-author code.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import { AUTHORS, getAuthor, authorUrl } from "@/lib/seo/authors";
import { ORG_PROFILE } from "@/lib/seo/org-profile";
import {
  PersonSchema,
  BreadcrumbListSchema,
} from "@/components/seo/schema";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(AUTHORS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) {
    return { robots: { index: false, follow: false } };
  }
  const url = authorUrl(slug);
  const title = `${author.name} — ${author.jobTitle}`;
  return {
    title,
    description: author.bio,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: author.bio,
      type: "profile",
      url,
      siteName: ORG_PROFILE.name,
      locale: "en_GB",
      images: author.image
        ? [
            {
              url: author.image.startsWith("http")
                ? author.image
                : `${ORG_PROFILE.url}${author.image}`,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
  };
}

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  return (
    <div className="bg-cream min-h-screen flex flex-col">
      <MarketingHeader />

      <PersonSchema author={author} />
      <BreadcrumbListSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Authors", url: "/authors" },
          { name: author.name },
        ]}
      />

      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16 flex-1">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 text-xs text-slate-500"
        >
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link href="/" className="hover:text-coral transition-colors">
                Home
              </Link>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="text-slate-300">›</span>
              <span className="text-navy/80">Authors</span>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="text-slate-300">›</span>
              <span className="text-navy/80">{author.name}</span>
            </li>
          </ol>
        </nav>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-coral mb-3">
          Author profile
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-navy leading-tight">
          {author.name}
        </h1>
        <p className="mt-2 text-lg text-slate-600">{author.jobTitle}</p>

        {author.credentials.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {author.credentials.map((c) => (
              <li
                key={c}
                className="rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-navy"
              >
                {c}
              </li>
            ))}
          </ul>
        )}

        <section className="mt-8 prose prose-slate prose-lg max-w-none prose-headings:font-semibold prose-headings:text-navy prose-p:leading-relaxed prose-a:text-coral hover:prose-a:text-coral-dark">
          <h2>About</h2>
          <p>{author.bio}</p>

          {author.knowsAbout.length > 0 && (
            <>
              <h2>Areas of expertise</h2>
              <ul>
                {author.knowsAbout.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </>
          )}

          {author.affiliation && (
            <>
              <h2>Affiliation</h2>
              <p>
                {author.affiliation.url ? (
                  <a
                    href={author.affiliation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {author.affiliation.name}
                  </a>
                ) : (
                  author.affiliation.name
                )}
              </p>
            </>
          )}

          {author.mcsCertificateNumber && (
            <>
              <h2>MCS verification</h2>
              <p>
                MCS certificate number{" "}
                <strong>{author.mcsCertificateNumber}</strong> — verify on the{" "}
                <a
                  href={`https://mcscertified.com/find-an-installer/?mcsNumber=${author.mcsCertificateNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  MCS public register
                </a>
                .
              </p>
            </>
          )}

          {author.sameAs.length > 0 && (
            <>
              <h2>Elsewhere on the web</h2>
              <ul>
                {author.sameAs.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      {link.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Published on Propertoasty — the two index pages already
              enumerate every guide + comparison this author has
              written (all currently authored by the default author).
              Once a second author ships we'll swap this for a
              per-author manifest. Until then, sending readers to
              the indexes is both correct and doesn't rot. */}
          <h2>Published on Propertoasty</h2>
          <p>
            {author.name} has written every guide and comparison
            currently on the site. Browse them by topic:
          </p>
          <ul>
            <li>
              <Link href="/guides">Guides</Link> — long-form
              walkthroughs of the Boiler Upgrade Scheme, MCS site
              visits, fabric-first retrofit, smart-tariff setup,
              hot-water planning, and the numbers behind heat-pump
              payback.
            </li>
            <li>
              <Link href="/compare">Comparisons</Link> — head-to-head
              heat-pump vs boiler / heat-pump vs storage-heater
              breakdowns, solar-with-battery vs solar-alone, and the
              installer tariff and manufacturer comparisons.
            </li>
            <li>
              <Link href="/research">Research</Link> — the EPC Index
              and the UK Home Energy Affordability Index, plus
              standalone data deep-dives.
            </li>
            <li>
              <Link href="/blog">Journal</Link> — shorter posts on
              retrofit decisions and homeowner questions.
            </li>
          </ul>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
