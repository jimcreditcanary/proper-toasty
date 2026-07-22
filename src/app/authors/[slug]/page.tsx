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
import { collectStaticArticlesByAuthor } from "@/lib/seo/collect-articles";

/** Fetch this author's blog posts from Supabase. Returns [] when the
 *  DB is unreachable or the byline doesn't match anyone — the render
 *  degrades gracefully to just the static articles list. */
async function fetchBlogPostsByAuthor(
  authorName: string,
): Promise<
  Array<{ slug: string; title: string; published_at: string }>
> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("blog_posts")
      .select("slug, title, published_at")
      .eq("published", true)
      .eq("author", authorName)
      .order("published_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Array<{
      slug: string;
      title: string;
      published_at: string;
    }>;
  } catch {
    return [];
  }
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(AUTHORS).map((slug) => ({ slug }));
}

/** Trim a long bio down to a meta-description-friendly length.
 *  Google truncates at ~155-160 chars — anything longer is wasted
 *  render + gets cut mid-word. First sentence when it fits;
 *  otherwise a hard-cap at 155 with an ellipsis on a word boundary. */
function shortDescription(bio: string): string {
  const firstSentence = bio.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 155) {
    return firstSentence + (bio.length > firstSentence.length ? "." : "");
  }
  const cap = bio.slice(0, 155);
  const lastSpace = cap.lastIndexOf(" ");
  return cap.slice(0, lastSpace > 100 ? lastSpace : cap.length) + "…";
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
  const description = shortDescription(author.bio);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
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

  // Enumerate every article this author has published. Two sources:
  //   1. Static: filesystem scan of /guides, /compare, /research
  //      AEOPage-wrapped routes (build time — free at request time).
  //   2. Dynamic: Supabase blog_posts rows matching author name.
  // Empty result from either is fine — the section only renders
  // whatever's non-empty.
  const staticArticles = collectStaticArticlesByAuthor(author.slug);
  const blogPosts = await fetchBlogPostsByAuthor(author.name);

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

          {/* Published on Propertoasty — the actual list, enumerated
              at build time from the filesystem (guides + comparisons +
              research) and at render time from Supabase (blog posts).
              Grouped by section so a scanning reader sees the shape of
              the author's work rather than a flat firehose. */}
          {(staticArticles.length > 0 || blogPosts.length > 0) && (
            <>
              <h2>Published on Propertoasty</h2>

              {(["Guide", "Comparison", "Research"] as const).map(
                (sectionLabel) => {
                  const items = staticArticles.filter(
                    (a) => a.section === sectionLabel,
                  );
                  if (items.length === 0) return null;
                  const heading =
                    sectionLabel === "Guide"
                      ? "Guides"
                      : sectionLabel === "Comparison"
                        ? "Comparisons"
                        : "Research";
                  return (
                    <div key={sectionLabel}>
                      <h3>{heading}</h3>
                      <ul>
                        {items.map((a) => (
                          <li key={a.path}>
                            <Link href={a.path}>{a.headline}</Link>{" "}
                            <span className="text-slate-400 text-sm">
                              · {formatShortDate(a.datePublished)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                },
              )}

              {blogPosts.length > 0 && (
                <div>
                  <h3>Journal</h3>
                  <ul>
                    {blogPosts.map((p) => (
                      <li key={p.slug}>
                        <Link href={`/blog/${p.slug}`}>{p.title}</Link>{" "}
                        <span className="text-slate-400 text-sm">
                          · {formatShortDate(p.published_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
