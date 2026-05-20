// Blog post body renderer.
//
// Two content sources land in this component:
//
//   1. Editorial posts (is_installer_profile = false) ship HTML in
//      `content` — seed posts in supabase/seeds/blog-launch.sql use
//      real <p>, <h2>, <ul>, <table> tags. Rendered via
//      dangerouslySetInnerHTML; XSS surface is admin-only writes.
//   2. Installer-bylined posts (is_installer_profile = true) come
//      from the Claude blog-drafter in markdown. Rendered through
//      react-markdown + remark-gfm so headings, lists, bold/italic,
//      blockquotes, and links land with the proper-toasty prose
//      styling.
//
// Both code paths share the same `prose` class list so the visual
// output is consistent across the two source formats.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface BlogPostContentProps {
  content: string;
  /** True when the content is markdown (installer-bylined posts).
   *  False / undefined renders the content as HTML (editorial posts). */
  isMarkdown?: boolean;
}

export function BlogPostContent({
  content,
  isMarkdown,
}: BlogPostContentProps) {
  if (isMarkdown) {
    return (
      <div className={PROSE_CLASSES}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }
  return (
    <div
      className={PROSE_CLASSES}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
