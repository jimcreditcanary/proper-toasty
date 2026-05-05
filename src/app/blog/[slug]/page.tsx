import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, ArrowRight, Calendar, User, ShieldCheck } from "lucide-react";
import { BlogPostContent } from "@/components/blog-post-content";

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

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!data) {
    notFound();
  }

  const post = data as Record<string, unknown>;
  const title = post.title as string;
  const content = post.content as string;
  const excerpt = post.excerpt as string;
  const category = post.category as string;
  const author = post.author as string;
  const publishedAt = post.published_at as string;
  const categoryColors =
    CATEGORY_COLORS[category] ?? "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="flex min-h-screen flex-col bg-cream text-slate-900">
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
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-tight">
          {title}
        </h1>

        {/* Excerpt */}
        <p className="mt-4 text-lg text-slate-600 leading-relaxed">
          {excerpt}
        </p>

        <hr className="my-8 border-slate-200" />

        {/* Content */}
        <BlogPostContent content={content} />
      </article>

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
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Propertoasty is a trading name of <a href="https://find-and-update.company-information.service.gov.uk/company/11591983" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">Braemar, Brook &amp; New Limited</a> (company no. 11591983). All rights reserved.
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
