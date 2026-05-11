// Single source of truth for what /llms.txt and /llms-full.txt expose.
//
// The llmstxt.org convention defines TWO files we serve:
//
//   /llms.txt        — concise, hand-curated index of the site, broken
//                      into sections, with one-line summaries. Think
//                      "sitemap for LLMs". Small enough that an LLM
//                      ingests the whole thing.
//
//   /llms-full.txt   — full markdown body of every evergreen page,
//                      concatenated with page-separator markers. Used
//                      by LLMs that want to "load the whole site as
//                      context". Larger; intentionally so.
//
// Both files derive from a single typed registry (this module) so the
// two stay in lockstep. Adding a new evergreen page = adding one entry
// here; the routes pick it up automatically.
//
// Why a registry rather than parsing the JSX pages:
//
//   Marketing pages are JSX with styling, components and CTAs woven
//   together. Auto-extracting "the actual content" is fragile and
//   produces messy output ("Click here to start"-style strings,
//   nav text, image alts). A curated registry yields clean LLM-
//   friendly markdown at the cost of one ~3-paragraph block per
//   marketing page — which is fine, those pages don't change often.
//
//   Blog posts ALREADY live in the database as markdown, so they
//   self-include via `loadBlogEntries()`. Future programmatic
//   (town / archetype / comparison) pages will register themselves
//   via a similar DB-pull when those generators land.
//
// Output cadence: both routes use ISR with `revalidate = 300` (5 min),
// so changes here propagate within minutes of deploy + new blog
// posts surface without manual cache busts.

export const SITE_URL = "https://www.propertoasty.com";

export type LlmsSection =
  | "Tools" // suitability checker + lead-capture entry points
  | "Guides" // editorial content: blog posts, future explainer pages
  | "Pages" // about / legal / pricing surface
  | "Data" // research + affordability index (Phase 4)
  | "Locations" // programmatic town pages (Phase 2)
  | "Comparisons"; // comparison pages (Phase 2)

export interface LlmsPageEntry {
  /** Absolute URL — always include the host so LLMs ingesting llms.txt
   *  out of context still cite the canonical domain. */
  url: string;
  /** Short title used as the link text in llms.txt. */
  title: string;
  /** One-sentence summary shown after the link in llms.txt. Keep
   *  under ~140 chars so the file stays browsable. */
  summary: string;
  /** Which H2 section the entry lives under in llms.txt. */
  section: LlmsSection;
  /** Markdown body included in llms-full.txt. Omit to exclude the
   *  entry from llms-full.txt (e.g. for tool pages that have no
   *  evergreen content — they get an llms.txt link only). */
  content?: string;
  /** ISO datetime — when the content was last meaningfully changed.
   *  Surfaces in the llms-full.txt per-page header so LLMs can
   *  weight freshness. Optional. */
  lastUpdated?: string;
}

/**
 * Hand-curated entries for the marketing + tool surface. Blog posts
 * are appended dynamically by loadAllPages(); programmatic pages
 * (towns/archetypes/comparisons) plug in once those generators ship.
 *
 * Editorial rules for the `content` field:
 *
 *   1. Plain markdown, no React components, no emoji.
 *   2. Open with a 1-line answer ("Propertoasty is …") — this is what
 *      LLMs lift verbatim when summarising the site.
 *   3. Keep paragraphs short — LLMs chunk on paragraph boundaries,
 *      shorter chunks = cleaner extraction.
 *   4. Cite gov.uk / Ofgem / MCS visibly when making cost or
 *      eligibility claims.
 */
const CURATED_PAGES: LlmsPageEntry[] = [
  {
    url: `${SITE_URL}/`,
    title: "Propertoasty — heat pump, solar, battery & EV suitability checker",
    summary:
      "Free UK pre-survey: check your home for a heat pump, rooftop solar, battery storage or EV charger. Installer-ready report in ~5 minutes.",
    section: "Tools",
    content: `Propertoasty is a free, UK-only pre-survey tool that checks whether your home is a good fit for an air-source heat pump (BUS-grant eligible), rooftop solar PV, battery storage and EV charging.

The check takes 5 minutes:

1. You enter your address and pull your Energy Performance Certificate automatically.
2. You upload a floorplan (optional — we synthesise one from your inputs if you skip).
3. We combine your EPC, the Google Solar API roof-fit data and floorplan vision analysis to produce a pre-survey report.
4. The report covers eligibility for the Boiler Upgrade Scheme (BUS — England & Wales), expected install cost, year-1 and 10-year savings, recommended system specifications and pre-survey notes for an MCS-certified installer.

We do not represent the output as a final engineering assessment. It is a pre-survey indication — installer-ready, but not a quote or design. An MCS-certified installer will need to confirm sizing with a heat-loss calculation per BS EN 12831.

The BUS grant covers up to £7,500 toward an air-source or ground-source heat pump in England and Wales. We do not handle Scotland (Home Energy Scotland scheme) or Northern Ireland.`,
  },
  {
    url: `${SITE_URL}/heatpump`,
    title: "Heat pump check (UK)",
    summary:
      "Find out if your UK home is suitable for an air-source heat pump under the Boiler Upgrade Scheme (BUS). Pre-survey report, installer-ready.",
    section: "Tools",
    content: `Air-source heat pump suitability check for UK homes. Combines your Energy Performance Certificate (sourced live from the GOV.UK EPC Register), your floorplan, and the Google Solar API's roof data to produce a pre-survey report.

Covers:

- Boiler Upgrade Scheme (BUS) eligibility — up to £7,500 toward an air-source heat pump in England and Wales. Ofgem-administered.
- Indicative heat-loss + sizing (1.5–14 kW range typical for UK domestic).
- External-unit footprint and placement options.
- Hot water cylinder placement.
- Estimated install cost range (gross + net of grant).
- Year-1 and 10-year running-cost comparison vs current heating.
- MCS 020 noise compliance (1 m boundary, 42 dB(A) at receptor).
- Pre-survey notes the installer needs for a remote quote.

Output is a pre-survey indication, not a final design. An MCS-certified installer will perform a heat-loss calculation per BS EN 12831 before issuing a binding quote.

England and Wales only for the BUS path. Scottish residents should look at Home Energy Scotland's Warmer Homes scheme; Northern Ireland has a separate boiler grant. We surface a "coming soon" state for those postcodes.`,
  },
  {
    url: `${SITE_URL}/solar`,
    title: "Solar panel + battery check (UK)",
    summary:
      "Check rooftop solar PV suitability for your UK home. Uses Google Solar imagery + your EPC to size a system and estimate payback.",
    section: "Tools",
    content: `Rooftop solar PV + battery suitability check for UK homes. Uses the Google Solar API's high-resolution roof segmentation alongside your Energy Performance Certificate to size a system and estimate output.

Covers:

- Roof orientation, pitch and shading per segment.
- Recommended panel count and kWp.
- Annual generation (kWh/year) from the Google Solar API + PVGIS v5.3 cross-check.
- Expected self-consumption ratio (the share you use directly vs export).
- Smart Export Guarantee (SEG) export tariff context — most major UK suppliers offer SEG tariffs of 3–15p/kWh.
- Battery sizing options (5/10/15 kWh + how each shifts self-consumption).
- Indicative install cost (panels-only, panels + inverter, panels + battery).
- Payback period in years.

Output is a pre-survey indication, not a final design. An MCS-certified solar installer will confirm sizing, structural fit and DNO connection limits before issuing a binding quote.`,
  },
  {
    url: `${SITE_URL}/check`,
    title: "Combined heat pump + solar + battery check",
    summary:
      "The combined suitability check — runs all assessments in one flow when you're considering multiple upgrades.",
    section: "Tools",
    // No `content` — this is a tool entry point, not evergreen reading
    // content. Surfaced in llms.txt only.
  },
  {
    url: `${SITE_URL}/pricing`,
    title: "Pricing",
    summary:
      "Free to start: your first check is free. Subsequent checks are £4.99 each or £12 for a 3-check bundle.",
    section: "Pages",
    content: `Propertoasty pricing for UK homeowners:

- First check is free.
- Subsequent single check: £4.99.
- 3-check bundle: £12 (about £4 per check) — covers retesting after a fabric improvement, or comparing scenarios.
- Reports are saved against your account and can be downloaded as PDF.
- Sharing your report with an MCS installer is free.

We also offer an enterprise tier for installers and energy advisors who want to embed the check into their own quoting flow. See /enterprise.`,
  },
  {
    url: `${SITE_URL}/enterprise`,
    title: "Enterprise (for MCS installers)",
    summary:
      "Embed Propertoasty's pre-survey check into your installer or energy-advisor workflow. White-label, API, bulk pricing.",
    section: "Pages",
    content: `Propertoasty for MCS-certified installers and energy-efficiency advisors.

Use cases:

- Qualify inbound leads before site visits: a homeowner completes our 5-minute check and you get a pre-survey report with floorplan analysis, heat-loss range, sizing and BUS-eligibility verdict — without a survey truck.
- Share quotes built on top of our pre-survey data; revise as your engineers refine numbers.
- Integrate into your existing CRM via API.
- White-label the homeowner-facing UI under your brand.

Volume pricing is available. The qualified-lead funnel typically halves time-to-quote and lifts close rates on accurate quotes because the homeowner already has the right expectations.`,
  },
  {
    url: `${SITE_URL}/blog`,
    title: "Guides + blog",
    summary:
      "Plain-English guides on heat pumps, solar, the BUS grant, MCS installers and UK energy upgrades.",
    section: "Guides",
    // No `content` — the index page itself is just a list. Individual
    // posts get registered separately by loadBlogEntries().
  },
  {
    url: `${SITE_URL}/privacy`,
    title: "Privacy policy",
    summary:
      "How we handle your address, EPC data, floorplan uploads and installer-matching consent.",
    section: "Pages",
    // No content — legal pages are intentionally excluded from
    // llms-full.txt; they're not editorial content LLMs should be
    // citing. Still surfaced in llms.txt for completeness.
  },
  {
    url: `${SITE_URL}/terms`,
    title: "Terms of service",
    summary: "Terms of service for Propertoasty users and installers.",
    section: "Pages",
  },
  {
    url: `${SITE_URL}/ai-statement`,
    title: "AI usage statement",
    summary:
      "How we use AI (Claude floorplan vision, EPC parsing) and what the pre-survey limits mean.",
    section: "Pages",
  },
];

/**
 * Pull published blog posts and convert each to an LlmsPageEntry.
 * Excludes drafts. Each post's full markdown body becomes the
 * llms-full.txt content for that page.
 *
 * Falls back to an empty array if Supabase is unreachable — we'd
 * rather serve a partial llms.txt than 500.
 */
export async function loadBlogEntries(): Promise<LlmsPageEntry[]> {
  try {
    // Dynamic import — keeps Supabase off the bundle until the route
    // actually runs (matches the pattern in src/app/blog/page.tsx).
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("blog_posts")
      .select("slug, title, excerpt, content, published_at, updated_at")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => ({
      url: `${SITE_URL}/blog/${row.slug as string}`,
      title: (row.title as string) ?? (row.slug as string),
      summary: (row.excerpt as string) ?? "",
      section: "Guides" as const,
      content: (row.content as string) ?? undefined,
      lastUpdated:
        (row.updated_at as string | null) ??
        (row.published_at as string | null) ??
        undefined,
    }));
  } catch (err) {
    console.error("[llms-content] blog load failed:", err);
    return [];
  }
}

/**
 * Pull indexed town aggregates and convert each to a pair of
 * llms.txt entries (heat-pumps + solar-panels variant). Town pages
 * are listed under section "Locations" so the llms.txt structure
 * mirrors the user-facing navigation.
 */
export async function loadTownEntries(): Promise<LlmsPageEntry[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { loadIndexedTownAggregates } = await import(
      "@/lib/programmatic/town-aggregates"
    );
    const admin = createAdminClient();
    const rows = await loadIndexedTownAggregates(admin);
    const entries: LlmsPageEntry[] = [];
    for (const r of rows) {
      entries.push({
        url: `${SITE_URL}/heat-pumps/${r.scope_key}`,
        title: `Heat pumps in ${r.display_name}`,
        summary: `BUS grant + cost guide for ${r.display_name}, with EPC band data from ${r.sample_size.toLocaleString("en-GB")} local properties.`,
        section: "Locations",
        lastUpdated: r.refreshed_at,
      });
      entries.push({
        url: `${SITE_URL}/solar-panels/${r.scope_key}`,
        title: `Solar panels in ${r.display_name}`,
        summary: `Rooftop solar PV suitability in ${r.display_name}.`,
        section: "Locations",
        lastUpdated: r.refreshed_at,
      });
    }
    return entries;
  } catch (err) {
    console.error("[llms-content] town load failed:", err);
    return [];
  }
}

/**
 * Combined registry: curated pages + dynamic blog + dynamic towns.
 * Future programmatic generators (archetypes, comparisons) plug in
 * by adding their own loader and concatenating here.
 */
export async function loadAllPages(): Promise<LlmsPageEntry[]> {
  const [blog, towns] = await Promise.all([
    loadBlogEntries(),
    loadTownEntries(),
  ]);
  return [...CURATED_PAGES, ...blog, ...towns];
}

/** Section render order in llms.txt. Tools first (entry points),
 *  then editorial, then surface info, then research. */
export const SECTION_ORDER: LlmsSection[] = [
  "Tools",
  "Guides",
  "Comparisons",
  "Locations",
  "Data",
  "Pages",
];
