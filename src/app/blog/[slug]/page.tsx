import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, ArrowRight, Calendar, Clock, User, ShieldCheck } from "lucide-react";
import { BlogPostContent } from "@/components/blog-post-content";
import { RelatedPosts } from "@/components/blog/related-posts";
import { SocialShare } from "@/components/blog/social-share";
import { ArticleSchema, BreadcrumbListSchema } from "@/components/seo/schema";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const SITE_URL = "https://www.propertoasty.com";

// Default cover image for posts that don't carry their own
// cover_image. Lives in /public so it serves from the same domain
// (no remote-pattern config) and is already preloaded for the home
// page hero so the byte cost is zero on the second hit.
const DEFAULT_COVER_IMAGE = "/hero-uk-home.jpg";

// Roughly the median adult reading speed for non-fiction. We strip
// HTML tags before counting so embedded markup doesn't inflate it.
const READING_WORDS_PER_MIN = 220;

function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / READING_WORDS_PER_MIN));
}

// Loaded once and reused by both generateMetadata + the page render
// to avoid two trips to Supabase. Next handles the dedupe via React's
// per-request request cache.
async function fetchPost(slug: string): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return (data ?? null) as Record<string, unknown> | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Fraud Prevention": "bg-red-50 text-red-700 border-red-200",
  Guides: "bg-blue-50 text-blue-700 border-blue-200",
  News: "bg-amber-50 text-amber-700 border-amber-200",
  Safety: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Business: "bg-purple-50 text-purple-700 border-purple-200",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: "Post not found" };
  const title = post.title as string;
  const excerpt = post.excerpt as string;
  const url = `${SITE_URL}/blog/${slug}`;
  // Cover image: use the post's cover_image when set, else fall
  // back to the home-page hero so previews on Twitter / LinkedIn /
  // WhatsApp / Slack always render with a real photo rather than
  // the missing-image placeholder.
  const coverPath = (post.cover_image as string | null) ?? DEFAULT_COVER_IMAGE;
  const ogImage = coverPath.startsWith("http") ? coverPath : `${SITE_URL}${coverPath}`;
  return {
    title,
    description: excerpt,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: excerpt,
      type: "article",
      url,
      siteName: "Propertoasty",
      locale: "en_GB",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: excerpt,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchPost(slug);

  if (!data) {
    notFound();
  }

  const post = data;
  const title = post.title as string;
  const content = post.content as string;
  const excerpt = post.excerpt as string;
  const category = post.category as string;
  const author = post.author as string;
  const publishedAt = post.published_at as string;
  const updatedAt = (post.updated_at as string | undefined) ?? publishedAt;
  const coverImage = (post.cover_image as string | null) ?? DEFAULT_COVER_IMAGE;
  const readingMinutes = estimateReadingMinutes(content);
  const categoryColors =
    CATEGORY_COLORS[category] ?? "bg-slate-50 text-slate-700 border-slate-200";

  // ─── JSON-LD structured data ────────────────────────────────
  // ArticleSchema + BreadcrumbListSchema components (in
  // @/components/seo/schema) own the shape. They:
  //   - resolve `author` to a Person (not Organization) via the
  //     authors registry — E-E-A-T win over the previous inline
  //     Organization author
  //   - emit a `@id` ref to /authors/<slug>#person so this Article's
  //     author consolidates into the Person entity used sitewide
  //   - skip undefined / null / empty fields so partial profiles
  //     don't ship empty schema stubs
  //
  // `author` from the DB is a free-text name string we don't have
  // a registry entry for yet. Until we backfill DB authors with
  // their registry slug, every post bylines to the default author
  // (Jim). The visible page byline still reads the DB column —
  // so a transition to per-author bylines doesn't lose attribution.
  const url = `${SITE_URL}/blog/${slug}`;
  const absoluteCoverImage = coverImage.startsWith("http")
    ? coverImage
    : `${SITE_URL}${coverImage}`;
  const wordCount = content
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="flex min-h-screen flex-col bg-cream text-slate-900">
      {/* JSON-LD structured data — emitted in the body rather than
          the head because Next's metadata.other doesn't accept
          script tags. Google reads JSON-LD wherever it sits in
          the document. */}
      <ArticleSchema
        headline={title}
        description={excerpt}
        url={url}
        image={absoluteCoverImage}
        datePublished={publishedAt}
        dateModified={updatedAt}
        authorSlug={DEFAULT_AUTHOR_SLUG}
        section={category}
        wordCount={wordCount}
      />
      <BreadcrumbListSchema
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Journal", url: `${SITE_URL}/blog` },
          { name: title },
        ]}
      />
      <MarketingHeader active="blog" />

      {/* Article */}
      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          All posts
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${categoryColors}`}>
            {category}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            <Calendar className="size-3.5" />
            {formatDate(publishedAt)}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            <User className="size-3.5" />
            {author}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            <Clock className="size-3.5" />
            {readingMinutes} min read
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-tight">
          {title}
        </h1>

        {/* Excerpt */}
        <p className="mt-4 text-lg text-slate-600 leading-relaxed">
          {excerpt}
        </p>

        {/* Cover image — uses next/image for automatic WebP +
            responsive sizing. Falls back to the home-page hero
            when the post has no cover_image. priority={true} would
            be wrong here (cover sits below the fold for short
            screens) so we leave Next to lazy-load it. */}
        <div className="mt-8 relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            quality={80}
            className="object-cover"
          />
        </div>

        {/* Share row + horizontal rule introducing the body copy. */}
        <div className="mt-8 mb-2">
          <SocialShare url={url} title={title} />
        </div>

        <hr className="my-8 border-slate-200" />

        {/* Content */}
        <BlogPostContent content={content} />

        {/* Repeat the share row at the bottom — readers who finish
            the post are the ones most likely to share it. */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm font-semibold text-navy mb-3">
            Found this useful? Pass it on.
          </p>
          <SocialShare url={url} title={title} />
        </div>
      </article>

      {/* Related posts — 3 follow-up reads, same category preferred,
          backfills with most-recent if the category is sparse. Loads
          server-side as part of this page's render. */}
      <RelatedPosts currentSlug={slug} category={category} />

      {/* CTA */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-12 text-center">
          <ShieldCheck className="size-10 mx-auto mb-4 text-coral" />
          <h2 className="text-2xl font-bold text-slate-900">
            Protect yourself today
          </h2>
          <p className="mt-2 text-slate-600">
            Run a free check before your next payment.
          </p>
          <Button
            className="mt-5 h-12 px-8 text-[15px] font-semibold rounded-lg bg-coral hover:bg-coral-dark text-white shadow-sm transition-all"
            render={<Link href="/check" />}
          >
            Check my home — free
            <ArrowRight className="size-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Logo size="sm" variant="light" showTagline />
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <Link href="/#how-it-works" className="hover:text-slate-900 transition-colors">How it works</Link>
              <Link href="/enterprise" className="hover:text-slate-900 transition-colors">Enterprise</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
              <Link href="/check" className="hover:text-slate-900 transition-colors">Check my home</Link>
              <Link href="/auth/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
            </nav>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
            <p className="text-xs text-slate-400 leading-relaxed">
              &copy; {new Date().getFullYear()} Propertoasty. All
              rights reserved.
              <br />
              Illustrative examples for research purposes only — we
              are not a lender or a broker.
            </p>
            <nav className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-1 text-xs text-slate-400">
              <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
              <Link href="/ai-statement" className="hover:text-slate-600 transition-colors">AI Statement</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
