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
              <a href="/" className="hover:text-coral transition-colors">
                Home
              </a>
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
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
