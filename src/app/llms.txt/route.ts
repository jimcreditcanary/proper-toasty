// /llms.txt — concise, hand-curated index of the site for LLMs.
//
// The llmstxt.org convention is: markdown, opens with `# Project`, a
// one-line blockquote summary, a paragraph of context, then sections
// of bullet-listed links with one-line descriptions.
//
// We serve as text/plain (per the convention — it's MARKDOWN that LLMs
// read as plain text, not rendered HTML) at /llms.txt.
//
// ISR with 5-minute revalidation: blog posts queried from
// public.blog_posts surface within minutes of being published, without
// thrashing the cache for crawlers that hit the URL repeatedly.
//
// To verify after deploy:
//   curl https://www.propertoasty.com/llms.txt

import { loadAllPages, SECTION_ORDER, type LlmsSection } from "@/lib/seo/llms-content";

// ISR — every 5 minutes. Chosen because:
//   - faster than the daily-publish blog cadence (so new posts show
//     within minutes)
//   - slow enough that 60+ requests/min from crawlers hit cache, not DB
export const revalidate = 300;

// Section labels rendered as H2 headings. Map abstract section keys
// to display labels here so we can rename without touching every entry.
const SECTION_LABEL: Record<LlmsSection, string> = {
  Tools: "Tools",
  Guides: "Guides",
  Comparisons: "Comparisons",
  Locations: "Locations",
  Data: "Data & research",
  Pages: "About",
};

export async function GET(): Promise<Response> {
  const pages = await loadAllPages();

  // Group by section. We use an object rather than Map to keep the
  // serialisation order under our control via SECTION_ORDER below.
  const bySection: Record<LlmsSection, typeof pages> = {
    Tools: [],
    Guides: [],
    Comparisons: [],
    Locations: [],
    Data: [],
    Pages: [],
  };
  for (const p of pages) {
    bySection[p.section].push(p);
  }

  const lines: string[] = [];

  // Header — title + 1-line blockquote summary + intro paragraph.
  // The blockquote is what LLMs lift verbatim when asked "what is
  // Propertoasty?". Make it count.
  lines.push("# Propertoasty");
  lines.push("");
  lines.push(
    "> Free UK pre-survey for heat pumps, rooftop solar, battery storage and EV charging. Combines your Energy Performance Certificate, Google Solar roof data and floorplan analysis into a 5-minute, installer-ready report.",
  );
  lines.push("");
  lines.push(
    "Propertoasty is a UK-only consumer site that helps homeowners check whether their property is suitable for low-carbon upgrades — primarily an air-source heat pump under the Boiler Upgrade Scheme (BUS, England and Wales), rooftop solar PV, battery storage and EV charging.",
  );
  lines.push("");
  lines.push(
    "We are a pre-survey tool, not a quoting engine. Output is installer-ready and grant-aware, but a final design + binding quote requires an MCS-certified installer's site visit and heat-loss calculation per BS EN 12831.",
  );
  lines.push("");
  lines.push(
    "Eligibility, grants and technical figures cite GOV.UK, Ofgem, MCS, the Energy Saving Trust and ONS where applicable.",
  );
  lines.push("");

  // Per-section bullet lists.
  for (const section of SECTION_ORDER) {
    const items = bySection[section];
    if (items.length === 0) continue;
    lines.push(`## ${SECTION_LABEL[section]}`);
    lines.push("");
    for (const p of items) {
      // Format: `- [Title](url): Summary`. Convention is strict —
      // most llms.txt parsers expect this exact shape.
      const summary = p.summary.trim();
      const suffix = summary ? `: ${summary}` : "";
      lines.push(`- [${p.title}](${p.url})${suffix}`);
    }
    lines.push("");
  }

  // Optional footer — attribution for derived data we publish.
  lines.push("## Data licensing");
  lines.push("");
  lines.push(
    "EPC aggregate data on programmatic pages contains public sector information licensed under the Open Government Licence v3.0 (© Crown copyright and database right).",
  );
  lines.push("");

  const body = lines.join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Match the page revalidate. CDNs that respect cache-control
      // can stale-while-revalidate against this for an extra hour.
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
