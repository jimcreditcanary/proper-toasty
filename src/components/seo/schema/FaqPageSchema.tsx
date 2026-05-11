// FAQPage JSON-LD — for any page that contains an FAQ section.
//
// What it gives us:
//
//   - Google FAQ rich-result eligibility (collapsible Q&A in SERPs)
//   - AI search engines extract Q&A pairs cleanly for citation —
//     they're notably better at lifting "what does X cost?" answers
//     when the page declares FAQPage schema than when the same Q&A
//     is in prose.
//
// Two ways to use this component:
//
//   1. Pass a typed array of { question, answer } objects. This is
//      the canonical path — exact control over what's emitted.
//
//   2. Pass `extractFromHtml: string` to auto-extract Q&A pairs from
//      a page body. Recognises H2/H3 question-form headings followed
//      by their <p> answer. The AEOPage template (deliverable #6)
//      will plumb this through automatically.
//
// IMPORTANT: only emit FAQPage schema when the page genuinely IS an
// FAQ. Google penalises schema that doesn't match visible content
// (e.g. a single FAQ entry in a sea of marketing copy). The validator
// (`shouldEmit`) below guards against the trivial-FAQ case.
//
// schema.org reference: https://schema.org/FAQPage

import * as React from "react";
import { JsonLd } from "./JsonLd";

export interface FaqEntry {
  question: string;
  /** Plain text answer. We strip HTML before emitting because
   *  Article-style markup inside `acceptedAnswer.text` confuses some
   *  consumers; the visible page can still render rich formatting. */
  answer: string;
}

export interface FaqPageSchemaProps {
  faqs: FaqEntry[];
  /** Minimum entries to emit. Default 2 — a one-entry "FAQ" isn't
   *  one, and Google's rich-result eligibility starts at 2. */
  minEntries?: number;
}

/**
 * Strip HTML tags, normalise whitespace. Lets a caller pass a
 * markdown-rendered HTML string as the answer without polluting the
 * schema payload with markup.
 */
function plainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function FaqPageSchema({
  faqs,
  minEntries = 2,
}: FaqPageSchemaProps): React.ReactElement | null {
  const valid = faqs.filter(
    (f) => f.question.trim().length > 0 && f.answer.trim().length > 0,
  );
  if (valid.length < minEntries) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((f) => ({
      "@type": "Question",
      name: f.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: plainText(f.answer),
      },
    })),
  };

  return <JsonLd data={data} />;
}

/**
 * Pull FAQ entries from a markdown / HTML body. Recognises:
 *
 *   - `## How much does ...?`  followed by paragraph text
 *   - `<h2>How much does ...?</h2><p>...</p>`
 *   - `### What is ...?`       followed by paragraph text
 *
 * "Question-shaped" = ends in `?` or starts with a question word
 * (How / What / When / Where / Why / Is / Are / Can / Should / Do /
 * Does / Will). Anything else is treated as a section heading, not
 * a Q.
 *
 * Returns at most `maxEntries` entries — long pages get truncated so
 * the JSON-LD doesn't bloat. Default 12 (more than Google's
 * recommended display cap, but useful for LLM ingestion).
 */
export function extractFaqsFromHtml(html: string, maxEntries = 12): FaqEntry[] {
  // Pattern 1: HTML headings. Match h2/h3 + their first sibling
  // paragraph. Capture is non-greedy so a long page doesn't span the
  // whole document into one match.
  const htmlPattern = /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  const found: FaqEntry[] = [];

  let match: RegExpExecArray | null;
  while ((match = htmlPattern.exec(html)) !== null && found.length < maxEntries) {
    const question = match[1].replace(/<[^>]*>/g, "").trim();
    const answer = match[2].trim();
    if (isQuestionShaped(question)) {
      found.push({ question, answer });
    }
  }

  // Pattern 2: markdown-style headings. Used when the source is
  // markdown rather than rendered HTML.
  if (found.length === 0) {
    const mdPattern = /^#{2,3}\s+(.+?)\s*$\s*([\s\S]+?)(?=^#{1,3}\s|\Z)/gm;
    while (
      (match = mdPattern.exec(html)) !== null &&
      found.length < maxEntries
    ) {
      const question = match[1].trim();
      const answer = match[2].trim();
      if (isQuestionShaped(question)) {
        found.push({ question, answer });
      }
    }
  }

  return found;
}

const QUESTION_STARTS =
  /^(how|what|when|where|why|who|is|are|can|should|do|does|will|won't|isn't|aren't|where's|what's|how's)\b/i;

function isQuestionShaped(text: string): boolean {
  const t = text.trim();
  if (t.endsWith("?")) return true;
  return QUESTION_STARTS.test(t);
}
