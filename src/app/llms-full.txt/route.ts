// /llms-full.txt — concatenated full markdown content of every
// evergreen page on the site, separated by clear page markers.
//
// This is the "load the whole site into context" file: an LLM agent
// can fetch it once and have every authoritative answer cached. The
// convention is less standardised than llms.txt itself — we follow
// the de-facto pattern used by mintlify, vercel etc.:
//
//   # Page: <Title>
//   URL: <absolute url>
//   Last updated: <ISO date>     (when known)
//
//   <markdown body of the page>
//
//   ---
//
//   # Page: <Title>
//   ...
//
// Entries without a `content` field on their LlmsPageEntry (e.g. legal
// pages, tool entry points) are SKIPPED — they have nothing of
// editorial substance to include here, and bloating the file dilutes
// the signal for the pages that do.
//
// To verify after deploy:
//   curl https://www.propertoasty.com/llms-full.txt | head -50

import { loadAllPages } from "@/lib/seo/llms-content";

// Same ISR cadence as llms.txt — both files derive from the same
// registry, so keep them in lockstep on freshness.
export const revalidate = 300;

export async function GET(): Promise<Response> {
  const pages = await loadAllPages();

  const lines: string[] = [];

  // Top-of-file preamble — orients an LLM that lands on this file
  // alone. Mirrors the llms.txt blockquote so any single file is
  // self-describing.
  lines.push("# Propertoasty — full content");
  lines.push("");
  lines.push(
    "Concatenated content from every evergreen page on Propertoasty. Each page is delimited by a `# Page:` heading and a horizontal rule. See https://www.propertoasty.com/llms.txt for the concise site index.",
  );
  lines.push("");
  lines.push(
    "Propertoasty is a free UK pre-survey tool for heat pump, rooftop solar, battery and EV-charger suitability checks. Output is installer-ready but is a pre-survey indication — a binding quote requires an MCS-certified installer's site visit and heat-loss calculation per BS EN 12831.",
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Per-page body. Skip entries with no content — those exist in
  // llms.txt as links only.
  const withContent = pages.filter((p) => p.content && p.content.trim().length > 0);
  for (const p of withContent) {
    lines.push(`# Page: ${p.title}`);
    lines.push("");
    lines.push(`URL: ${p.url}`);
    if (p.lastUpdated) {
      lines.push(`Last updated: ${p.lastUpdated}`);
    }
    lines.push("");
    // Trim trailing whitespace to keep the file tidy; preserve the
    // markdown structure within.
    lines.push((p.content ?? "").trim());
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Footer attribution — once at the end of the file rather than per
  // page, to avoid clutter. Per OGL v3.0 we include attribution
  // whenever we publish derivatives of the EPC data.
  lines.push("## Data licensing");
  lines.push("");
  lines.push(
    "Aggregate EPC data on programmatic pages contains public sector information licensed under the Open Government Licence v3.0 (© Crown copyright and database right).",
  );
  lines.push("");

  const body = lines.join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
