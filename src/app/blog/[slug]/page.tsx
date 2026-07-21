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
import { DEFAULT_AUTHOR_SLUG, authorSlugForName } from "@/lib/seo/authors";
import { InstallerPostByline } from "@/components/blog/installer-post-byline";
import { InstallerPostCta } from "@/components/blog/installer-post-cta";
import { InstallerPostRelated } from "@/components/blog/installer-post-related";
import { resolveInstallerArea } from "@/lib/installers/area-resolve";
import {
  primaryTechBucket,
  techBucketDisplayName,
} from "@/lib/outreach/tier-preview";
import { creditForCoverImage } from "@/lib/outreach/cover-image-library";
import type { Database } from "@/types/database";

const SITE_URL = "https://www.propertoasty.com";

// Default cover image for posts that don't carry their own
// cover_image. Lives in /public so it serves from the same domain
// (no remote-pattern config) and is already preloaded for the home
// page hero so the byte cost is zero on the second hit.
const DEFAULT_COVER_IMAGE = "/hero-uk-home.jpg";

// Roughly the median adult reading speed for non-fiction. We strip
// HTML / markdown markers before counting so embedded syntax doesn't
// inflate it.
const READING_WORDS_PER_MIN = 220;

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

function estimateReadingMinutes(text: string): number {
  const stripped = text.replace(/<[^>]*>/g, " ").replace(/[#*_>`-]+/g, " ");
  const words = stripped.split(/\s+/).filter(Boolean).length;
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

async function fetchInstaller(
  installerId: number,
): Promise<InstallerRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("installers")
    .select("*")
    .eq("id", installerId)
    .maybeSingle<InstallerRow>();
  return data ?? null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Fraud Prevention": "bg-red-50 text-red-700 border-red-200",
  Guides: "bg-blue-50 text-blue-700 border-blue-200",
  News: "bg-amber-50 text-amber-700 border-amber-200",
  Safety: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Business: "bg-purple-50 text-purple-700 border-purple-200",
  "Installer Voices": "bg-coral-pale text-coral-dark border-coral/20",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Tech bucket → capability filter used by selectInstallersByArea. */
function capabilityForInstaller(
  installer: InstallerRow,
): "heat_pump" | "solar" {
  const bucket = primaryTechBucket(installer);
  return bucket === "solar_pv" ? "solar" : "heat_pump";
}

/** Rating-cache freshness check — matches the 30-day TTL the card
 *  client-refresh hits in @/components/installer/installer-card. */
function isGoogleFresh(capturedAt: string | null): boolean {
  if (!capturedAt) return false;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(capturedAt).getTime() > cutoff;
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
  const publishedAt = post.published_at as string | undefined;
  const updatedAt = (post.updated_at as string | undefined) ?? publishedAt;
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
      publishedTime: publishedAt,
      modifiedTime: updatedAt,
      authors: [post.author as string],
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
  const isInstallerPost =
    (post.is_installer_profile as boolean | null) === true ||
    post.installer_id != null;
  const installerId = post.installer_id as number | null;
  const readingMinutes = estimateReadingMinutes(content);
  const categoryColors =
    CATEGORY_COLORS[category] ?? "bg-slate-50 text-slate-700 border-slate-200";

  // Installer-bylined posts: pull the installer row once + reuse for
  // byline + CTA + related-installers. Posts where `installer_id`
  // is set but the row's gone (rare — ON DELETE SET NULL hasn't
  // fired because the FK is non-cascading) fall back to editorial-
  // post rendering.
  const installer =
    isInstallerPost && installerId != null
      ? await fetchInstaller(installerId)
      : null;

  const installerArea = installer
    ? resolveInstallerArea({
        postcode: installer.postcode,
        county: installer.county,
        latitude: installer.latitude,
        longitude: installer.longitude,
      })
    : null;

  const installerCapability = installer
    ? capabilityForInstaller(installer)
    : null;
  const installerTechBucket = installer ? primaryTechBucket(installer) : null;
  const installerTechDisplay = installerTechBucket
    ? techBucketDisplayName(installerTechBucket)
    : null;

  const directoryHref =
    installerArea?.slug && installerCapability
      ? `/${installerCapability === "solar" ? "solar-panel-installers" : "heat-pump-installers"}/${installerArea.slug}`
      : null;

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
    .replace(/[#*_>`-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  const googleFresh =
    !!installer && isGoogleFresh(installer.google_captured_at);
  const photoCredit = creditForCoverImage(post.cover_image as string | null);

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
          {/* Byline resolves to an /authors/<slug> link when the DB
              name matches a registry author. Unknown names (external
              contributors we haven't registered yet) fall back to
              plain text so we don't 404 on a bad link. */}
          <span className="flex items-center gap-1.5 text-sm text-slate-400">
            <User className="size-3.5" />
            {(() => {
              const authorSlug = authorSlugForName(author);
              return authorSlug ? (
                <Link
                  href={`/authors/${authorSlug}`}
                  className="hover:text-coral transition-colors underline decoration-slate-300 underline-offset-2"
                >
                  {author}
                </Link>
              ) : (
                author
              );
            })()}
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

        {/* Installer byline — slotted between the title and the
            excerpt so "By {company}" lands before the reader hits
            "I've been fitting…". Skipped on editorial posts. */}
        {installer && (
          <InstallerPostByline
            companyName={installer.company_name}
            logoUrl={installer.logo_url}
            locationLabel={installerArea?.label ?? installer.county ?? null}
            techDisplay={installerTechDisplay}
          />
        )}

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
        {photoCredit && (
          <p className="mt-2 text-[11px] text-slate-400 text-right">
            Photo:{" "}
            <a
              href={photoCredit.creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 underline-offset-2 hover:underline"
            >
              {photoCredit.credit}
            </a>
          </p>
        )}

        {/* Share row + horizontal rule introducing the body copy. */}
        <div className="mt-8 mb-2">
          <SocialShare url={url} title={title} />
        </div>

        <hr className="my-8 border-slate-200" />

        {/* Content — installer posts arrive as markdown; editorial
            posts as HTML. The renderer branches on isMarkdown. */}
        <BlogPostContent content={content} isMarkdown={isInstallerPost} />

        {/* Installer booking CTA card — bottom of the body, before
            the share row. Drives the "installer-bylined post → site
            visit booked" conversion. */}
        {installer && installerCapability && (
          <InstallerPostCta
            installerId={installer.id}
            companyName={installer.company_name}
            capability={installerCapability}
            googleRating={googleFresh ? installer.google_rating : null}
            googleReviewCount={
              googleFresh ? installer.google_review_count : null
            }
            checkatradeScore={installer.checkatrade_score}
            checkatradeReviewCount={installer.checkatrade_review_count}
            websiteUrl={installer.website}
          />
        )}

        {/* Repeat the share row at the bottom — readers who finish
            the post are the ones most likely to share it. */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm font-semibold text-navy mb-3">
            Found this useful? Pass it on.
          </p>
          <SocialShare url={url} title={title} />
        </div>

        {/* Related installers — pivot path for readers who don't
            want to book the post author. Server component, queries
            inline. */}
        {installer && installerArea && installerCapability && (
          <InstallerPostRelated
            excludeInstallerId={installer.id}
            areaLabel={installerArea.label}
            directoryHref={directoryHref}
            capability={installerCapability}
            lat={installerArea.lat}
            lng={installerArea.lng}
          />
        )}
      </article>

      {/* Related posts — 3 follow-up reads, same category preferred,
          backfills with most-recent if the category is sparse. Loads
          server-side as part of this page's render. */}
      <RelatedPosts currentSlug={slug} category={category} />

      {/* CTA — editorial posts only. Installer posts already carry
          their own author-specific CTA card above, so a second
          generic CTA muddies the message. */}
      {!installer && (
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
      )}

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
