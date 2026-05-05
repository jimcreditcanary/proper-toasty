// Blog post body renderer.
//
// Stores HTML rather than markdown — the seed posts in
// supabase/seeds/blog-launch.sql use real <p>, <h2>, <ul>, <table>
// tags. Older content was authored as markdown and rendered through
// ReactMarkdown, but mixing the two in one collection meant either
// strict-markdown for everything (loses tables) or escaped tags for
// HTML content (the bug we just fixed).
//
// Settled on HTML-only via dangerouslySetInnerHTML. Source is the
// admin-only blog_posts table — admin client writes only — so the
// XSS surface is the same as the rest of the admin UI. If we ever
// open this to user-generated content, swap in DOMPurify or
// sanitize-html before the dangerouslySetInnerHTML call.

const PROSE_CLASSES = [
  "prose prose-slate prose-lg max-w-none",
  "prose-headings:font-bold prose-headings:tracking-tight",
  "prose-h2:text-2xl prose-h2:mt-14 prose-h2:mb-6",
  "prose-h3:text-xl prose-h3:mt-12 prose-h3:mb-4",
  "prose-p:leading-[1.8] prose-p:text-slate-600 prose-p:mb-7",
  "prose-li:text-slate-600 prose-li:my-2 prose-li:leading-[1.8]",
  "prose-ul:my-7 prose-ol:my-7",
  "prose-a:text-coral prose-a:font-semibold prose-a:no-underline hover:prose-a:underline",
  "prose-strong:text-slate-900",
  "prose-blockquote:border-coral prose-blockquote:text-slate-500 prose-blockquote:not-italic prose-blockquote:my-8",
  // Table styles — the markdown renderer didn't theme these; bring
  // them in line with the rest of the prose palette.
  "prose-table:my-8 prose-table:text-sm",
  "prose-th:text-left prose-th:font-semibold prose-th:text-navy prose-th:bg-slate-50 prose-th:px-3 prose-th:py-2",
  "prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-slate-200 prose-td:text-slate-700",
  "prose-img:rounded-xl prose-img:my-8",
  "prose-hr:my-12",
].join(" ");

export function BlogPostContent({ content }: { content: string }) {
  return (
    <div
      className={PROSE_CLASSES}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
