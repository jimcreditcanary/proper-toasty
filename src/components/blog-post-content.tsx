"use client";

import ReactMarkdown from "react-markdown";

export function BlogPostContent({ content }: { content: string }) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-coral prose-a:font-semibold prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 prose-blockquote:border-coral prose-blockquote:text-slate-500 prose-blockquote:not-italic prose-img:rounded-xl">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
