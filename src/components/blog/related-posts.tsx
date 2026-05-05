// Related posts widget — renders at the bottom of every blog post.
//
// Picks 3 posts to surface, in this priority order:
//   1. Other posts in the same category, newest first
//   2. Most-recent posts from any category, to backfill if step 1
//      didn't yield 3 (rare with current 10-post launch but useful
//      when a category has fewer entries)
//
// Server component — runs the query inline at render time. The
// /blog/[slug] page is already a server component so this slots in
// without a client boundary.

import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

interface RelatedPostRow {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  published_at: string | null;
}

interface RelatedPostsProps {
  /** Slug of the current post — excluded from results. */
  currentSlug: string;
  /** Category of the current post — preferred for matching. */
  category: string;
}

const TARGET_COUNT = 3;

async function loadRelatedPosts(args: RelatedPostsProps): Promise<RelatedPostRow[]> {
  const admin = createAdminClient();

  // Step 1 — same-category posts, exclude current.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sameCategory } = await (admin as any)
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at")
    .eq("published", true)
    .eq("category", args.category)
    .neq("slug", args.currentSlug)
    .order("published_at", { ascending: false })
    .limit(TARGET_COUNT);

  const matched: RelatedPostRow[] = (sameCategory ?? []) as RelatedPostRow[];
  if (matched.length >= TARGET_COUNT) {
    return matched.slice(0, TARGET_COUNT);
  }

  // Step 2 — backfill from any category if same-category came up
  // short. We exclude both the current post and the ones we already
  // picked so we don't double-list.
  const excludeSlugs = [args.currentSlug, ...matched.map((p) => p.slug)];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: backfill } = await (admin as any)
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at")
    .eq("published", true)
    .not("slug", "in", `(${excludeSlugs.map((s) => `"${s}"`).join(",")})`)
    .order("published_at", { ascending: false })
    .limit(TARGET_COUNT - matched.length);

  return [...matched, ...((backfill ?? []) as RelatedPostRow[])].slice(
    0,
    TARGET_COUNT,
  );
}

const CATEGORY_PILL: Record<string, string> = {
  Guides: "bg-coral-pale text-coral-dark border-coral/20",
  Stories: "bg-[color:var(--terracotta-pale)] text-[color:var(--terracotta)] border-[color:var(--terracotta)]/20",
  News: "bg-amber-50 text-amber-700 border-amber-200",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function RelatedPosts(props: RelatedPostsProps) {
  const posts = await loadRelatedPosts(props);
  if (posts.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-cream-deep/40">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-navy">Keep reading</h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-coral hover:underline inline-flex items-center gap-1"
          >
            All posts
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p) => {
            const pillCls =
              CATEGORY_PILL[p.category] ??
              "bg-slate-50 text-slate-700 border-slate-200";
            return (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 hover:border-coral/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pillCls}`}
                    >
                      {p.category}
                    </span>
                    {p.published_at && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(p.published_at)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-navy leading-snug group-hover:text-coral-dark transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {p.excerpt}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-coral">
                    Read article
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
