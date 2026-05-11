import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { Leaf, ArrowRight, Calendar, Mail } from "lucide-react";

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  cover_image: string | null;
  published_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  Guides: "bg-coral-pale text-coral-dark border-[color:var(--coral)]/20",
  Stories: "bg-[color:var(--terracotta-pale)] text-[color:var(--terracotta)] border-[color:var(--terracotta)]/20",
  News: "bg-[color:var(--coral-pale)] text-coral border-[color:var(--coral)]/20",
};

function CategoryBadge({ category }: { category: string }) {
  const colors =
    CATEGORY_COLORS[category] ?? "bg-cream-deep text-[var(--muted-brand)] border-[var(--border)]";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors}`}
    >
      {category}
    </span>
  );
}

async function fetchPosts(): Promise<BlogPost[]> {
  try {
    // Dynamically import so a missing Supabase connection / missing table on
    // a fresh project doesn't take the whole page down.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("blog_posts")
      .select("slug, title, excerpt, category, author, cover_image, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((p: Record<string, unknown>) => ({
      slug: p.slug as string,
      title: p.title as string,
      excerpt: p.excerpt as string,
      category: p.category as string,
      author: p.author as string,
      cover_image: (p.cover_image as string | null) ?? null,
      published_at: p.published_at as string,
    }));
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await fetchPosts();

  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <MarketingHeader active="blog" />

      {/* Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3 py-1 text-xs text-coral shadow-sm">
            <Leaf className="w-3.5 h-3.5" />
            Journal
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl text-navy leading-[1.05]">
            Living greener at home.
          </h1>
          <p className="mt-6 text-lg text-[var(--muted-brand)] max-w-xl mx-auto leading-relaxed">
            Practical notes on heat pumps, rooftop solar, retrofit, and the small decisions that
            add up to a warmer, lower-carbon UK home.
          </p>
        </div>
      </section>

      {/* Posts — card grid. First post takes a full-width hero
          card on desktop (the most-recent / most-prominent piece);
          the rest tile in a 2-up grid below. Each card has the
          cover image at the top, then the chip + date + title +
          excerpt. Postless cards still work — they fall back to a
          coloured tile with the category badge centred. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20 flex-1">
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Featured (first) card — full width on lg+, stacked
                photo + body on smaller screens. */}
            <FeaturedCard post={posts[0]} />

            {/* Remaining posts — responsive grid. */}
            {posts.length > 1 && (
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(1).map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-cream-deep">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-brand)]">
          <span className="flex flex-col gap-1">
            <span>&copy; {new Date().getFullYear()} Propertoasty</span>
            <span className="text-[11px]">
              Illustrative examples for research purposes only — we
              are not a lender or a broker.
            </span>
          </span>
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-navy">Privacy</Link>
            <Link href="/terms" className="hover:text-navy">Terms</Link>
            <Link href="/ai-statement" className="hover:text-navy">AI use</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// ─── Card components ────────────────────────────────────────────────

function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-3xl overflow-hidden border border-[var(--border)] bg-white hover:shadow-lg transition-shadow"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        <div className="lg:col-span-3">
          <CoverImage post={post} className="h-72 lg:h-full min-h-[18rem]" />
        </div>
        <div className="lg:col-span-2 p-8 sm:p-10 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <CategoryBadge category={post.category} />
            <span className="flex items-center gap-1.5 text-xs text-[var(--muted-brand)]">
              <Calendar className="size-3" />
              {formatDate(post.published_at)}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl text-navy group-hover:text-coral transition-colors leading-tight">
            {post.title}
          </h2>
          <p className="mt-4 text-[var(--muted-brand)] leading-relaxed flex-1">
            {post.excerpt}
          </p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-coral">
            Read article
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl overflow-hidden border border-[var(--border)] bg-white hover:shadow-md hover:border-coral/30 transition-all flex flex-col"
    >
      <CoverImage post={post} className="h-44" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <CategoryBadge category={post.category} />
          <span className="text-[11px] text-[var(--muted-brand)]">
            {formatDate(post.published_at)}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-navy group-hover:text-coral transition-colors leading-tight">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted-brand)] leading-relaxed flex-1 line-clamp-3">
          {post.excerpt}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-coral">
          Read more
          <ArrowRight className="size-3" />
        </span>
      </div>
    </Link>
  );
}

function CoverImage({
  post,
  className = "",
}: {
  post: BlogPost;
  className?: string;
}) {
  // When there's no cover image, render a coloured placeholder
  // tile with the category-coloured Leaf icon centred. Keeps the
  // grid visually consistent (no missing-tile holes) and avoids
  // shipping a stock-photo dependency for old posts.
  if (!post.cover_image) {
    return (
      <div
        className={`bg-gradient-to-br from-coral-pale via-cream-deep to-[color:var(--terracotta-pale)] flex items-center justify-center ${className}`}
      >
        <Leaf className="w-12 h-12 text-coral/50" />
      </div>
    );
  }
  return (
    <div className={`bg-slate-100 overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.cover_image}
        alt={post.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-10 sm:p-14 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-coral-pale text-coral mb-6">
        <Leaf className="w-6 h-6" />
      </div>
      <h2 className="text-2xl sm:text-3xl text-navy">
        New stories are on the way.
      </h2>
      <p className="mt-4 text-[var(--muted-brand)] max-w-md mx-auto leading-relaxed">
        We&rsquo;re writing up what we learn from real UK homes — heat pump myths, solar-sizing shortcuts,
        and what installers actually need. First posts land shortly.
      </p>
      <Link
        href="mailto:hello@propertoasty.com?subject=Notify%20me%20when%20the%20journal%20launches"
        className="mt-7 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm transition-colors"
      >
        <Mail className="w-4 h-4" />
        Email me when posts go live
      </Link>
    </div>
  );
}
