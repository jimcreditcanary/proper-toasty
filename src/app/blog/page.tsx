import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { Leaf, ArrowRight, Calendar, Mail } from "lucide-react";

type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
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
      .select("slug, title, excerpt, category, author, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((p: Record<string, unknown>) => ({
      slug: p.slug as string,
      title: p.title as string,
      excerpt: p.excerpt as string,
      category: p.category as string,
      author: p.author as string,
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

      {/* Posts */}
      <section className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20 flex-1">
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {posts.map((post) => (
              <article key={post.slug} className="py-10 first:pt-0 last:pb-0">
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="flex items-center gap-3 mb-3">
                    <CategoryBadge category={post.category} />
                    <span className="flex items-center gap-1.5 text-xs text-[var(--muted-brand)]">
                      <Calendar className="size-3" />
                      {formatDate(post.published_at)}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl text-navy group-hover:text-coral transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">{post.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-coral">
                    Read more
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-cream-deep">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-brand)]">
          <span>
            &copy; {new Date().getFullYear()} Propertoasty · a trading name of{" "}
            <a
              href="https://find-and-update.company-information.service.gov.uk/company/11591983"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-navy underline-offset-2 hover:underline"
            >
              Braemar, Brook &amp; New Limited
            </a>
            {" "}(company no. 11591983)
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
