"use client";

import ReactMarkdown from "react-markdown";

export function BlogPostContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-14 prose-h2:mb-6 prose-h3:text-xl prose-h3:mt-12 prose-h3:mb-4 prose-p:leading-[1.8] prose-p:text-slate-600 prose-p:mb-7 prose-li:text-slate-600 prose-li:my-2 prose-li:leading-[1.8] prose-ul:my-7 prose-ol:my-7 prose-a:text-coral prose-a:font-semibold prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 prose-blockquote:border-coral prose-blockquote:text-slate-500 prose-blockquote:not-italic prose-blockquote:my-8 prose-img:rounded-xl prose-img:my-8 prose-hr:my-12">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
