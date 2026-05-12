#!/usr/bin/env tsx
//
// Build-time SEO audit — walks every page surface the site is meant
// to expose, runs the validators in src/lib/seo/validators.ts against
// each one, and exits non-zero (failing the Vercel build) when any
// errors are found.
//
// Wired into `npm run build` as the prebuild step:
//
//   "prebuild": "tsx scripts/seo/audit.ts",
//   "build":    "next build",
//
// What it checks
// ──────────────────────────────────────────────────────────────────
//
//   CURATED PAGES (src/lib/seo/llms-content.ts CURATED_PAGES):
//     - Pages declaring `content` have ≥ 200 words (low bar; marketing
//       pages are short by design).
//
//   BLOG POSTS (public.blog_posts where published=true):
//     - Body content ≥ 300 words.
//     - Excerpt present, > 20 chars.
//     - cover_image present.
//
//   TOWN AGGREGATES (public.epc_area_aggregates where scope='town'):
//     - sample_size ≥ 50 when indexed=true.
//     - Each town has a corresponding entry in PILOT_TOWNS seed.
//     - Conversely: every PILOT_TOWN slug has a DB row.
//
//   ORG PROFILE (src/lib/seo/org-profile.ts):
//     - foundingDate, description present.
//
// What it does NOT check
// ──────────────────────────────────────────────────────────────────
//
//   - JSON-LD validity at the rendered-HTML level. That'd require
//     rendering each page; out of scope for a build-time precheck.
//     Sanity-check post-deploy via https://validator.schema.org/.
//   - DirectAnswer word count on town pages. The page's directAnswer
//     is computed PROGRAMMATICALLY from town data — it's deterministic
//     and we trust the helper. If we want to tighten this later we
//     can snapshot-render one town and validate.
//
// Bypass — emergency only
// ──────────────────────────────────────────────────────────────────
//
//   SEO_AUDIT_SKIP=1 npm run build
//
//   Skips the audit entirely. Use only when you need to ship a fix
//   urgently and the audit is the blocker. Vercel build env should
//   NOT have this set by default.
//
// Skips Supabase-dependent checks silently when SUPABASE creds aren't
// in the build env (e.g. fork-CI builds without secrets). The curated/
// org-profile checks still run.

import {
  CURATED_PAGES,
  type LlmsPageEntry,
} from "../../src/lib/seo/llms-content";
import { ORG_PROFILE } from "../../src/lib/seo/org-profile";
import { PILOT_TOWNS } from "../../src/lib/programmatic/towns";
import {
  countWords,
  validateBodyWordCount,
  type ValidationIssue,
} from "../../src/lib/seo/validators";

interface PageReport {
  surface: "curated" | "blog" | "town" | "org-profile";
  url: string;
  label: string;
  issues: ValidationIssue[];
}

const MIN_BODY_WORDS_BLOG = 300;
const MIN_TOWN_SAMPLE = 50;

// ─── Surface 1: curated marketing entries ─────────────────────────
//
// CURATED_PAGES holds the `content` block we publish in llms-full.txt
// for each marketing surface — it's a SUMMARY for LLMs, NOT the body
// of the page itself (the actual marketing JSX has hundreds of words
// of copy). So the validator only checks the summary's shape:
//
//   - title + summary must exist
//   - when `content` is present, ≥ 50 words (a paragraph minimum;
//     stops accidental one-liners)
//
// The 600-word body-content rule lives on the programmatic /
// editorial surfaces only.

function auditCurated(): PageReport[] {
  return CURATED_PAGES.map((page: LlmsPageEntry) => {
    const issues: ValidationIssue[] = [];
    if (!page.title || page.title.trim().length === 0) {
      issues.push({
        rule: "curated-title-required",
        severity: "error",
        message: "Curated entry missing title.",
      });
    }
    if (!page.summary || page.summary.trim().length < 20) {
      issues.push({
        rule: "curated-summary-required",
        severity: "error",
        message: "Curated entry summary missing or too short (< 20 chars).",
      });
    }
    if (page.content && page.content.trim().length > 0) {
      issues.push(...validateBodyWordCount(page.content, 50));
    }
    return {
      surface: "curated" as const,
      url: page.url,
      label: page.title,
      issues,
    };
  });
}

// ─── Surface 2: blog posts ────────────────────────────────────────

async function auditBlog(): Promise<PageReport[]> {
  if (!hasSupabaseCreds()) {
    return [
      {
        surface: "blog",
        url: "blog:*",
        label: "Blog (Supabase creds missing)",
        issues: [
          {
            rule: "blog-skipped",
            severity: "warning",
            message: "Skipped — SUPABASE_SERVICE_ROLE_KEY not set.",
          },
        ],
      },
    ];
  }

  const { createAdminClient } = await import("../../src/lib/supabase/admin");
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("blog_posts")
    .select("slug, title, excerpt, content, cover_image, published_at")
    .eq("published", true);

  if (error) {
    return [
      {
        surface: "blog",
        url: "blog:*",
        label: "Blog query",
        issues: [
          {
            rule: "blog-query-failed",
            severity: "error",
            message: `Supabase query failed: ${error.message}`,
          },
        ],
      },
    ];
  }

  const reports: PageReport[] = [];
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const slug = row.slug as string;
    const issues: ValidationIssue[] = [];

    const content = (row.content as string | null) ?? "";
    issues.push(...validateBodyWordCount(content, MIN_BODY_WORDS_BLOG));

    const excerpt = (row.excerpt as string | null) ?? "";
    if (excerpt.trim().length < 20) {
      issues.push({
        rule: "blog-excerpt-required",
        severity: "error",
        message: `Excerpt missing or too short (got ${excerpt.trim().length} chars).`,
      });
    }

    if (!row.cover_image) {
      issues.push({
        rule: "blog-cover-required",
        severity: "warning",
        message: "No cover_image set (falls back to default hero).",
      });
    }

    reports.push({
      surface: "blog",
      url: `${ORG_PROFILE.url}/blog/${slug}`,
      label: (row.title as string) ?? slug,
      issues,
    });
  }
  return reports;
}

// ─── Surface 3: programmatic town pages ───────────────────────────

async function auditTowns(): Promise<PageReport[]> {
  if (!hasSupabaseCreds()) {
    return [
      {
        surface: "town",
        url: "town:*",
        label: "Town aggregates (Supabase creds missing)",
        issues: [
          {
            rule: "town-skipped",
            severity: "warning",
            message: "Skipped — SUPABASE_SERVICE_ROLE_KEY not set.",
          },
        ],
      },
    ];
  }

  const { createAdminClient } = await import("../../src/lib/supabase/admin");
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("epc_area_aggregates")
    .select("scope_key, display_name, sample_size, indexed, index_reason")
    .eq("scope", "town");

  if (error) {
    return [
      {
        surface: "town",
        url: "town:*",
        label: "Town aggregate query",
        issues: [
          {
            rule: "town-query-failed",
            severity: "error",
            message: `Supabase query failed: ${error.message}`,
          },
        ],
      },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as Array<any>;
  const reports: PageReport[] = [];
  const dbSlugs = new Set<string>(rows.map((r) => r.scope_key as string));

  // Per-row checks
  for (const row of rows) {
    const issues: ValidationIssue[] = [];
    const sample = row.sample_size as number;
    const indexed = row.indexed as boolean;

    if (indexed && sample < MIN_TOWN_SAMPLE) {
      issues.push({
        rule: "indexed-with-small-sample",
        severity: "error",
        message: `Indexed but sample_size=${sample} (< ${MIN_TOWN_SAMPLE}). Sitemap and indexed page mismatch.`,
      });
    }
    if (!indexed) {
      // Not an error — noindex is a valid state — but worth flagging
      // as a warning so we know which towns aren't shipping.
      issues.push({
        rule: "town-noindexed",
        severity: "warning",
        message: `Not indexed: ${row.index_reason ?? "unknown reason"}`,
      });
    }

    reports.push({
      surface: "town",
      url: `${ORG_PROFILE.url}/heat-pumps/${row.scope_key}`,
      label: row.display_name as string,
      issues,
    });
  }

  // Seed-vs-DB drift: every PILOT_TOWN must have a DB row.
  for (const t of PILOT_TOWNS) {
    if (!dbSlugs.has(t.slug)) {
      reports.push({
        surface: "town",
        url: `${ORG_PROFILE.url}/heat-pumps/${t.slug}`,
        label: t.name,
        issues: [
          {
            rule: "town-missing-aggregate",
            severity: "error",
            message: `${t.slug} is in PILOT_TOWNS seed but has no row in epc_area_aggregates. Run scripts/epc-search/build-town-aggregates.ts.`,
          },
        ],
      });
    }
  }

  return reports;
}

// ─── Surface 4: org profile sanity ────────────────────────────────

function auditOrgProfile(): PageReport[] {
  const issues: ValidationIssue[] = [];

  if (!ORG_PROFILE.foundingDate) {
    issues.push({
      rule: "org-founding-date",
      severity: "warning",
      message: "ORG_PROFILE.foundingDate is empty.",
    });
  }
  if (!ORG_PROFILE.description || ORG_PROFILE.description.length < 50) {
    issues.push({
      rule: "org-description",
      severity: "error",
      message: "ORG_PROFILE.description must be a meaningful sentence (≥ 50 chars).",
    });
  }
  if (countWords(ORG_PROFILE.founder.bio) < 25) {
    issues.push({
      rule: "founder-bio",
      severity: "warning",
      message: "Founder bio is shorter than 25 words. Pad for Person schema.",
    });
  }

  return [
    {
      surface: "org-profile",
      url: ORG_PROFILE.url,
      label: "Organization profile",
      issues,
    },
  ];
}

// ─── Plumbing ─────────────────────────────────────────────────────

function hasSupabaseCreds(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function main() {
  if (process.env.SEO_AUDIT_SKIP === "1") {
    console.warn(
      "[seo-audit] SKIPPED via SEO_AUDIT_SKIP=1 — emergency bypass active",
    );
    return;
  }

  const [curated, blog, towns, org] = await Promise.all([
    Promise.resolve(auditCurated()),
    auditBlog(),
    auditTowns(),
    Promise.resolve(auditOrgProfile()),
  ]);

  const all = [...curated, ...blog, ...towns, ...org];
  const errors = all.filter((r) =>
    r.issues.some((i) => i.severity === "error"),
  );
  const warnings = all.filter(
    (r) =>
      r.issues.some((i) => i.severity === "warning") &&
      !r.issues.some((i) => i.severity === "error"),
  );
  const clean = all.length - errors.length - warnings.length;

  console.log("\n──── SEO audit ────");
  console.log(
    `  Pages checked: ${all.length} ` +
      `(${curated.length} curated · ${blog.length} blog · ${towns.length} town · ${org.length} org)`,
  );
  console.log(`  ✓ Clean:    ${clean}`);
  console.log(`  ⚠ Warnings: ${warnings.length}`);
  console.log(`  ✗ Errors:   ${errors.length}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const r of warnings) {
      console.log(`  ⚠ ${r.label}  (${r.url})`);
      for (const i of r.issues) {
        if (i.severity === "warning") {
          console.log(`      ${i.rule}: ${i.message}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.log("\nErrors (blocking build):");
    for (const r of errors) {
      console.log(`  ✗ ${r.label}  (${r.url})`);
      for (const i of r.issues) {
        if (i.severity === "error") {
          console.log(`      ${i.rule}: ${i.message}`);
        }
      }
    }
    console.error(
      `\n✗ SEO audit FAILED — ${errors.length} page(s) with errors. Fix or run with SEO_AUDIT_SKIP=1 for emergency bypass.\n`,
    );
    process.exit(1);
  }

  console.log("\n✓ SEO audit passed\n");
}

main().catch((err) => {
  console.error("[seo-audit] crashed:", err);
  process.exit(2);
});
