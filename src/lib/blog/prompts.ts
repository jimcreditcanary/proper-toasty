// Prompts for the weekly blog auto-generator.
//
// Two model calls per run:
//   1. Writer  — Sonnet 5 + web_search drafts a full blog post
//      grounded in current UK 2026 sources (gov.uk, DESNZ, Ofgem,
//      MCS, Times, Guardian, Which?). Returns strict JSON.
//   2. Guardrail — Haiku 4.5 acts as skeptic. Rejects if any
//      specific claim can't trace to a cited source, or the piece
//      contradicts known-true UK policy.
//
// Structure is AEO/GEO-optimised:
//   - Opens with a direct-answer paragraph (40-60 words) — this is
//     what Perplexity / ChatGPT Search / Google's AI Overview
//     lift verbatim.
//   - 4-6 H2s phrased as REAL user questions (matches migration 077
//     H2-as-question convention).
//   - Each H2 section is answer-first.
//   - Ends with SourcesList-compatible citations (migration 079).

import type { BlogPillar, ExistingPost } from "./pillars";

// ─── Types ────────────────────────────────────────────────────────

export interface BlogDraft {
  title: string;
  slug: string;
  excerpt: string;
  /** HTML body — <p>, <h2>, <ul>/<li>, <strong>, <em> only. No
   *  script/style/img — the blog page renders it with react-safe
   *  html handling. */
  content: string;
  /** "Guides" is the default category for the corpus we've been
   *  publishing under. Rare exceptions: "News" for policy shifts,
   *  "Installer Voices" for interviews. Writer prompt biases to
   *  "Guides" unless the topic is genuinely news. */
  category: string;
  /** SourceEntry shape (src/lib/seo/validators.ts) — surfaces via
   *  the existing SourcesList component at the foot of the post. */
  sources: Array<{ name: string; url: string; accessedDate?: string }>;
}

export interface GuardrailVerdict {
  passed: boolean;
  reason: string;
}

// ─── Writer prompt ────────────────────────────────────────────────

const PILLAR_BRIEFS: Record<BlogPillar, string> = {
  heat_pump:
    "UK residential heat pumps under the Boiler Upgrade Scheme (BUS). Angles: cost of running, sizing for cold snaps, myths about old houses / radiators / noise, cooling reversal in summer, the £7,500 grant mechanics, MCS-certified installer requirements.",
  solar:
    "UK rooftop solar PV + battery storage in 2026. Angles: payback period on real UK electricity prices, Smart Export Guarantee earnings, battery uplift maths, roof suitability myths (north-facing / small / shaded), G98/G99 grid connection, VAT rules.",
  plug_in_solar:
    "Plug-in solar in the UK following BS 7671 Amendment 4 (legal April 2026, 800W inverter limit). Angles: renters, flats, small terraces, install without an MCS installer, best kits under £500, real winter yield in UK conditions.",
  boiler_vs_hp:
    "Direct comparisons — new gas boiler vs air-source heat pump for UK homes replacing an ageing boiler. Angles: all-in cost with £7,500 grant, monthly finance, 15-year running-cost totals, radiator implications, when to wait vs when to switch now.",
};

const HOUSE_STYLE = `
Voice: Propertoasty is a UK savings-first pre-survey tool for heat pumps, solar, plug-in solar and boiler-vs-heat-pump comparisons. We write for UK homeowners in plain English.

We NEVER:
- Invent specific £ figures, %s, grant amounts, or paybacks. Every number must be traceable to a cited source (or be a KNOWN-TRUE fact — see guardrail below).
- Say "quote", "final engineering assessment", or "guaranteed price" — we produce "pre-survey indication" / "savings estimate" / "check".
- Use SCOP, PVGIS, or kWh/m² unless the topic is genuinely technical enough to warrant them (rare).
- Reference floorplan analysis (feature retired July 2026).
- Use "revolutionary", "game-changing", "unlock", "seamless", or marketing filler.
- Write with the trappings of AI text: no "In the ever-evolving landscape of…", no "It's important to note that…", no bullet-lists-of-obvious-things.

We DO:
- Cite gov.uk, DESNZ, MCS, Ofgem, Solar Energy UK, Nesta, Which?, Times, Guardian, BBC. Prefer primary sources over aggregators.
- Say "£7,500 grant" (BUS), "England & Wales only" (BUS eligibility).
- Ground every claim in a specific real 2025-2026 UK data point where possible.
- Write like a UK founder explaining to a peer — direct, evidence-first, no hedging on facts.
`;

const AEO_STRUCTURE = `
Structure — this is mandatory:

1. DIRECT-ANSWER PARAGRAPH (first paragraph):
   - 40-60 words.
   - Answers the article's core question completely.
   - No throat-clearing, no "In this article we'll cover…". Just the answer.
   - This is what Perplexity, ChatGPT Search, and Google's AI Overview lift verbatim. If it's not a standalone answer, the article won't rank in AI search.

2. FOUR TO SIX H2 SECTIONS, each phrased as a real user question:
   - "What size heat pump does a 3-bed semi need?" ✅
   - "The sizing question" ❌ (retired convention, per migration 077)
   - "Heat pump sizing" ❌ (not a question)
   - Answer-first: the first sentence of the section answers the H2. Everything after is evidence + nuance.
   - 120-220 words per section.

3. NO conclusion / summary section. AI search doesn't lift them, human readers skip them.

4. TOTAL LENGTH: 1200-2000 words (post-HTML-strip).

5. HTML allowed: <p>, <h2>, <ul>, <li>, <strong>, <em>. Nothing else — no <img>, no <script>, no inline styles, no <div>.
`;

export function buildWriterPrompt(args: {
  pillar: BlogPillar;
  existingPosts: ExistingPost[];
  recentGeneratedTopics: string[];
}): { system: string; user: string } {
  const excludeSlugs = args.existingPosts
    .map((p) => `- /blog/${p.slug} — ${p.title}`)
    .join("\n");
  const excludeTopics =
    args.recentGeneratedTopics.length === 0
      ? "(none yet)"
      : args.recentGeneratedTopics.map((t) => `- "${t}"`).join("\n");

  const system = `You are the weekly blog author for Propertoasty, a UK home savings pre-survey tool.

Your job today: pick ONE specific, high-search-intent UK question in the pillar below, then write a full blog post that answers it comprehensively, grounded in current UK 2026 sources you gather via web_search.

${HOUSE_STYLE}

${AEO_STRUCTURE}

Today's pillar:
${PILLAR_BRIEFS[args.pillar]}

Existing posts on this pillar (published in the last 90 days — do NOT re-cover):
${excludeSlugs || "(no recent posts on this pillar)"}

Topics the auto-generator has recently attempted (avoid these angles):
${excludeTopics}

Output rules:
- Return ONE JSON object matching the schema in the user message. No prose outside JSON.
- The "title" is the H1 (not written into content — the blog page renders it separately).
- The "slug" is kebab-case, ends without a trailing slash, ASCII only, 3-8 words.
- The "excerpt" is ≤ 160 chars, punchy, benefit-led. This becomes the meta description on the /blog/[slug] page + the RelatedPosts card text.
- The "content" is HTML per the structure rules above.
- The "sources" array has 3-6 entries, each a real URL you referenced via web_search. Never fabricate a citation. Format per the SourceEntry type: {name, url, accessedDate (optional, "Month YYYY")}.
- The "category" defaults to "Guides" — only use "News" if the post is genuinely news (a policy change, a rate change), or "Installer Voices" if the topic frames it as installer experience.`;

  const user = `Step 1: Use web_search to find:
- The single most-searched or most-newsworthy UK question in this pillar that ISN'T covered by the exclude list.
- 3-6 authoritative UK sources (published in the last 24 months) that support the answer. Prefer: gov.uk, DESNZ, Ofgem, MCS, Solar Energy UK, Nesta, Which?, Times, Guardian, BBC.

Step 2: Draft the blog post following the structure rules above.

Step 3: Return this JSON exactly:

{
  "title": "…",
  "slug": "…",
  "excerpt": "… ≤160 chars",
  "content": "<p>Direct-answer paragraph 40-60 words…</p><h2>Question 1?</h2><p>Answer…</p>… etc",
  "category": "Guides",
  "sources": [
    {"name": "GOV.UK — Boiler Upgrade Scheme", "url": "https://www.gov.uk/apply-boiler-upgrade-scheme", "accessedDate": "August 2026"}
  ]
}

Nothing else.`;

  return { system, user };
}

// ─── Guardrail prompt ─────────────────────────────────────────────

export function buildGuardrailPrompt(draft: BlogDraft): {
  system: string;
  user: string;
} {
  const system = `You are a strict fact-checker reviewing a full UK home-energy blog post for Propertoasty.

KNOWN-TRUE FACTS — treat these as valid regardless of whether the post cites them:
- The Boiler Upgrade Scheme (BUS) grant is £7,500 for air-source heat pumps in England & Wales as of 2026. £9,000 for oil/LPG replacements from 21 July 2026. £7,500 for ground-source (including shared loops). £5,000 for biomass in rural areas.
- Plug-in solar is legal in the UK from April 2026 under BS 7671 Amendment 4, with an 800W inverter limit.
- Smart Export Guarantee (SEG) is mandatory for large licensed suppliers; 2026 rates range roughly 1p-15p/kWh depending on supplier.
- Propertoasty is a pre-survey tool / savings calculator, not a quoting engine. It's a trading name of Braemar, Brook & New Limited (Companies House 11591983).

REJECT the post if ANY of these are true:
1. A specific £ figure, percentage, or grant amount appears that is NOT in the known-true list AND is not supported by one of the cited sources.
2. A source is cited that clearly doesn't exist (fake URL, fake publisher).
3. The post contradicts a known-true fact (e.g. claims BUS grant is £5,000).
4. It represents Propertoasty as offering "quotes", "final designs", or "guaranteed prices". ("Pre-survey indication", "savings estimate", "check" are fine.)
5. It includes floorplan or floorplan-analysis references (feature was removed July 2026).
6. It uses "always" / "never" / "guaranteed" / "everyone" in a way that overstates a claim.
7. The direct-answer paragraph (first paragraph) is NOT 40-60 words OR doesn't fully answer the article's core question.
8. Any H2 is not phrased as a real user question (e.g. "The sizing question" would fail; "What size heat pump does a 3-bed semi need?" passes).

Default to APPROVE when the specific claims are consistent with the known-true facts + the cited sources. Reject only on concrete violations.

Return JSON only: {"passed": boolean, "reason": "<one sentence>"}.`;

  const citations = draft.sources
    .map((s, i) => `[${i + 1}] ${s.name} — ${s.url}`)
    .join("\n");
  const user = `Title: ${draft.title}
Slug: /blog/${draft.slug}
Category: ${draft.category}

Cited sources:
${citations || "(none supplied)"}

Content (HTML):
"""
${draft.content}
"""

Return the JSON verdict.`;

  return { system, user };
}
