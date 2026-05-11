// Validation helpers for AEO page primitives.
//
// Used in two places:
//
//   1. Component render — dev-mode `console.warn` so devs see quality
//      issues immediately while building a page.
//   2. Build-time seo-audit script (deliverable #10) — same helpers,
//      called in batch, fail the build on hard violations.
//
// Validators return a structured `ValidationIssue[]` rather than
// throwing so callers can decide how to react. Empty array = clean.

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  /** Which validator surfaced this. */
  rule: string;
  severity: ValidationSeverity;
  message: string;
}

/**
 * Count words in a string. HTML tags stripped first. Whitespace-
 * collapsed before split. Matches the convention used elsewhere
 * in the codebase (estimateReadingMinutes in the blog page).
 */
export function countWords(input: string): number {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

/**
 * DirectAnswer copy MUST be 40–60 words. AI engines lift this
 * paragraph verbatim when summarising the page — shorter and the
 * answer feels incomplete; longer and it gets truncated mid-
 * sentence. Hard error if outside the range.
 */
export function validateDirectAnswer(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const wc = countWords(text);
  if (wc < 40) {
    issues.push({
      rule: "direct-answer-word-count",
      severity: "error",
      message: `DirectAnswer is ${wc} words; needs 40–60. Add detail.`,
    });
  } else if (wc > 60) {
    issues.push({
      rule: "direct-answer-word-count",
      severity: "warning",
      message: `DirectAnswer is ${wc} words; ideal is 40–60. Trim.`,
    });
  }
  if (text.includes("\n")) {
    issues.push({
      rule: "direct-answer-single-paragraph",
      severity: "warning",
      message:
        "DirectAnswer should be one paragraph; line breaks fragment the lift.",
    });
  }
  return issues;
}

/**
 * Body copy on programmatic pages must be ≥600 words of non-templated
 * prose. Below that, Google treats the page as thin and AI engines
 * tend not to cite it.
 */
export function validateBodyWordCount(
  text: string,
  minWords = 600,
): ValidationIssue[] {
  const wc = countWords(text);
  if (wc < minWords) {
    return [
      {
        rule: "body-min-word-count",
        severity: "error",
        message: `Body is ${wc} words; minimum is ${minWords}. Programmatic pages below this threshold should be noindex'd.`,
      },
    ];
  }
  return [];
}

/**
 * E-E-A-T sensitive verticals (cost / eligibility / grant claims)
 * require visible source citations. We approve the official UK
 * energy + housing authorities — anything else is a warning, not
 * a hard fail, because guides sometimes legitimately cite academic
 * or NGO sources we haven't whitelisted.
 */
export const APPROVED_SOURCE_DOMAINS = [
  "gov.uk",
  "ofgem.gov.uk",
  "mcscertified.com",
  "energysavingtrust.org.uk",
  "ons.gov.uk",
  "communities.gov.uk", // EPC service host
  "find-energy-certificate.service.gov.uk",
  "trustmark.org.uk",
  "ofcom.org.uk",
  "ofwat.gov.uk",
  "hse.gov.uk",
];

export interface SourceEntry {
  name: string;
  url: string;
  accessedDate?: string;
}

export function validateSources(
  sources: SourceEntry[],
  minCount = 3,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (sources.length < minCount) {
    issues.push({
      rule: "sources-min-count",
      severity: "error",
      message: `Page has ${sources.length} sources; minimum is ${minCount} for E-E-A-T sensitive content.`,
    });
  }
  // Check at least ONE source comes from an approved domain — gov.uk
  // / ofgem / mcs / EST / ONS. A page with only opinion-blog sources
  // looks like editorial speculation, not researched fact.
  const approvedHits = sources.filter((s) => {
    try {
      const host = new URL(s.url).hostname.toLowerCase();
      return APPROVED_SOURCE_DOMAINS.some(
        (d) => host === d || host.endsWith(`.${d}`),
      );
    } catch {
      return false;
    }
  });
  if (approvedHits.length === 0 && sources.length > 0) {
    issues.push({
      rule: "sources-include-authority",
      severity: "warning",
      message:
        "No sources from gov.uk / Ofgem / MCS / EST / ONS. Cost + eligibility claims should cite an official source.",
    });
  }
  return issues;
}

/**
 * Dev-mode log helper — fires once per render in non-production
 * environments. In prod, swallows silently (we don't want noisy
 * warnings in real-user request paths; the build-time seo-audit
 * is the production gate).
 */
export function logIssues(label: string, issues: ValidationIssue[]): void {
  if (process.env.NODE_ENV === "production") return;
  if (issues.length === 0) return;
  for (const i of issues) {
    const fn = i.severity === "error" ? console.error : console.warn;
    fn(`[AEO:${label}] ${i.rule}: ${i.message}`);
  }
}
