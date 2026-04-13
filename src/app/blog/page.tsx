import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { ShieldCheck, ArrowRight, Calendar } from "lucide-react";

function BlogHeader() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/enterprise" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Enterprise
          </Link>
          <Link href="/blog" className="text-sm font-semibold text-slate-900 transition-colors">
            Blog
          </Link>
        </nav>
        <nav className="flex items-center gap-3">
          <Button
            className="h-10 bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-5 rounded-lg shadow-sm hover:shadow-md transition-all"
            render={<Link href="/verify" />}
          >
            Make a check
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            render={<Link href="/auth/login" />}
          >
            Sign in
          </Button>
        </nav>
      </div>
    </header>
  );
}

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
  "Fraud Prevention": "bg-red-50 text-red-700 border-red-200",
  Guides: "bg-blue-50 text-blue-700 border-blue-200",
  News: "bg-amber-50 text-amber-700 border-amber-200",
  Safety: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Business: "bg-purple-50 text-purple-700 border-purple-200",
};

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors}`}>
      {category}
    </span>
  );
}

export default async function BlogPage() {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("blog_posts")
    .select("slug, title, excerpt, category, author, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  const posts: BlogPost[] = (data ?? []).map((p: Record<string, unknown>) => ({
    slug: p.slug as string,
    title: p.title as string,
    excerpt: p.excerpt as string,
    category: p.category as string,
    author: p.author as string,
    published_at: p.published_at as string,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <BlogHeader />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-coral/10 border border-coral/20 px-3 py-1.5 mb-6">
            <ShieldCheck className="size-4 text-coral" />
            <span className="text-sm font-semibold text-coral">Blog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Insights to keep you safe
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-xl mx-auto">
            Fraud prevention tips, payment safety guides, and the latest
            scam trends in the UK.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <article key={post.slug} className="py-8 first:pt-0 last:pb-0">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <CategoryBadge category={post.category} />
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="size-3" />
                      {formatDate(post.published_at)}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-coral transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-coral">
                    Read more
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-coral/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl text-white font-bold tracking-tight">
            Check before you pay
          </h2>
          <p className="mt-3 text-slate-400">
            Run a free verification check in under 30 seconds.
          </p>
          <Button
            className="mt-6 h-12 px-8 text-[15px] font-semibold rounded-lg bg-coral hover:bg-coral-dark text-white shadow-lg transition-all"
            render={<Link href="/verify" />}
          >
            Make a check — free
            <ArrowRight className="size-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Logo size="sm" variant="light" showTagline />
            <nav className="flex gap-6 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
              <Link href="/enterprise" className="hover:text-slate-900 transition-colors">Enterprise</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
              <Link href="/verify" className="hover:text-slate-900 transition-colors">Make a check</Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200 text-center sm:text-left">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} WhoAmIPaying. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
