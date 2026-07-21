// Filesystem-based article manifest for /authors/[slug].
//
// Every guide + comparison + research page uses the AEOPage wrapper
// and passes literal `headline=` / `datePublished=` / `dateModified=`
// / `authorSlug=` props. We regex-lift those at build time to
// enumerate every static article the site publishes, without having
// to hand-maintain a manifest that goes stale.
//
// Blog posts live in Supabase (`public.blog_posts`) so they're
// enumerated via a separate DB query in the caller.
//
// This runs server-side only. `fs` calls fire at build time inside
// the Server Component's render — no runtime cost after the page
// is generated.

import "server-only";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_AUTHOR_SLUG } from "./authors";

export interface CollectedArticle {
  slug: string;
  /** Section label — "Guide", "Comparison", "Research". */
  section: string;
  /** Absolute route path (leading slash, no origin). */
  path: string;
  headline: string;
  datePublished: string;
  dateModified: string;
  authorSlug: string;
}

/** Sections we scan. Each entry maps a URL prefix to its filesystem
 *  directory. Add new evergreen sections here. */
const SECTIONS: Array<{ label: string; dir: string; urlPrefix: string }> = [
  { label: "Guide", dir: "src/app/guides", urlPrefix: "/guides" },
  { label: "Comparison", dir: "src/app/compare", urlPrefix: "/compare" },
  { label: "Research", dir: "src/app/research", urlPrefix: "/research" },
];

/** Directory-name entries that ARE folders but aren't articles —
 *  index pages, demo scratch, etc. Skipped during the scan. */
const SKIP_SLUGS = new Set(["aeo-demo"]);

const HEADLINE_RE = /headline\s*=\s*(?:\{`([^`]+)`\}|"([^"]+)"|\{"([^"]+)"\})/;
const DATE_PUBLISHED_RE = /datePublished\s*=\s*"([^"]+)"/;
const DATE_MODIFIED_RE = /dateModified\s*=\s*(?:\{?([a-zA-Z_.$]+)\}?|"([^"]+)")/;
const AUTHOR_SLUG_RE = /authorSlug\s*=\s*(?:\{([A-Z_]+)\}|"([^"]+)")/;

function extract(source: string, re: RegExp): string | null {
  const m = source.match(re);
  if (!m) return null;
  // Return the first captured non-empty group.
  for (let i = 1; i < m.length; i++) {
    if (m[i]) return m[i];
  }
  return null;
}

/** Reads a single page.tsx and pulls the AEOPage metadata out of it.
 *  Returns null when the file doesn't use AEOPage or is missing
 *  headline/date — those get quietly skipped rather than throwing. */
function readArticle(
  slug: string,
  section: { label: string; urlPrefix: string },
  filePath: string,
): CollectedArticle | null {
  const src = readFileSync(filePath, "utf-8");
  if (!/AEOPage[\s>]/.test(src)) return null;

  const headline = extract(src, HEADLINE_RE);
  const datePublished = extract(src, DATE_PUBLISHED_RE);
  if (!headline || !datePublished) return null;

  // dateModified may be an expression like `row.refreshed_at.slice(0, 10)`
  // (dynamic) or a literal string. When it's an expression we can't
  // resolve it at scan time — fall back to datePublished.
  const dateModifiedRaw = extract(src, DATE_MODIFIED_RE);
  const dateModified =
    dateModifiedRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateModifiedRaw)
      ? dateModifiedRaw
      : datePublished;

  // authorSlug is usually `{DEFAULT_AUTHOR_SLUG}` — resolve that
  // constant here so downstream code sees the real slug.
  const authorSlugRaw = extract(src, AUTHOR_SLUG_RE);
  const authorSlug =
    authorSlugRaw === "DEFAULT_AUTHOR_SLUG"
      ? DEFAULT_AUTHOR_SLUG
      : authorSlugRaw ?? DEFAULT_AUTHOR_SLUG;

  return {
    slug,
    section: section.label,
    path: `${section.urlPrefix}/${slug}`,
    headline,
    datePublished,
    dateModified,
    authorSlug,
  };
}

/** Full scan across every registered section. Cached-per-process via
 *  module-level memoisation — `fs` calls fire on first invocation
 *  only. Safe because static routes don't shift within a build. */
let cached: CollectedArticle[] | null = null;

export function collectStaticArticles(): CollectedArticle[] {
  if (cached) return cached;

  const out: CollectedArticle[] = [];
  for (const section of SECTIONS) {
    let entries: string[] = [];
    try {
      entries = readdirSync(section.dir);
    } catch {
      // Section directory missing (fresh clone or a section being
      // renamed) — skip rather than fail the render.
      continue;
    }
    for (const entry of entries) {
      if (SKIP_SLUGS.has(entry)) continue;
      const entryPath = join(section.dir, entry);
      let isDir = false;
      try {
        isDir = statSync(entryPath).isDirectory();
      } catch {
        continue;
      }
      if (!isDir) continue;
      const pagePath = join(entryPath, "page.tsx");
      let article: CollectedArticle | null = null;
      try {
        article = readArticle(entry, section, pagePath);
      } catch {
        continue;
      }
      if (article) out.push(article);
    }
  }

  // Newest first.
  out.sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));
  cached = out;
  return out;
}

/** Filter the scan to a single author. */
export function collectStaticArticlesByAuthor(
  authorSlug: string,
): CollectedArticle[] {
  return collectStaticArticles().filter((a) => a.authorSlug === authorSlug);
}
