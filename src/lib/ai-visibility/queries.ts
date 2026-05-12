// Target queries for AI visibility tracking.
//
// 50 plain-English questions a UK homeowner would actually ask an AI
// assistant before committing to a heat pump or solar install. The
// list is intentionally PHRASED LIKE A HUMAN — not as search-engine
// keyword strings — because that's the form AI search engines (and
// the underlying LLMs) optimise to answer well.
//
// Each query is grouped by intent so the dashboard can show "we're
// strong on cost questions but weak on planning questions" type
// breakdowns. Categories:
//
//   - cost: how-much-does-X-cost queries (high commercial intent)
//   - eligibility: BUS grant + Permitted Development questions
//   - feasibility: "will it work in MY house" questions
//   - comparison: X vs Y questions
//   - savings: running-cost + payback questions
//   - tech: how-X-works questions (educational)
//
// When new programmatic content lands, add queries that target it.
// Removing queries is fine but breaks trend continuity — prefer to
// mark deprecated rather than delete.

export interface TargetQuery {
  query: string;
  category:
    | "cost"
    | "eligibility"
    | "feasibility"
    | "comparison"
    | "savings"
    | "tech";
  /** Which page on our site is the IDEAL answer destination. Used
   *  by the dashboard to flag "we're getting cited but not for the
   *  page we'd want cited". */
  targetPath?: string;
}

export const TARGET_QUERIES: TargetQuery[] = [
  // ─── Cost ───────────────────────────────────────────────────────
  {
    query: "How much does a heat pump cost in the UK in 2026?",
    category: "cost",
    targetPath: "/heatpump",
  },
  {
    query: "Cost of an air source heat pump install in England",
    category: "cost",
    targetPath: "/heatpump",
  },
  {
    query: "Ground source vs air source heat pump price UK",
    category: "comparison",
    targetPath: "/compare/air-source-vs-ground-source-heat-pump",
  },
  {
    query: "How much does it cost to install solar panels on a UK house?",
    category: "cost",
    targetPath: "/solar",
  },
  {
    query: "What does a 4kW solar PV system cost in 2026?",
    category: "cost",
    targetPath: "/compare/solar-vs-no-solar",
  },
  {
    query: "How much is a solar battery for a UK home?",
    category: "cost",
    targetPath: "/solar",
  },
  {
    query: "Heat pump installation cost for a 3-bed semi UK",
    category: "cost",
    targetPath: "/heat-pumps/1930s-semi",
  },
  {
    query: "Cost of a heat pump for a Victorian house",
    category: "cost",
    targetPath: "/heat-pumps/victorian-terrace",
  },

  // ─── Eligibility / grants ───────────────────────────────────────
  {
    query: "How much is the Boiler Upgrade Scheme grant?",
    category: "eligibility",
    targetPath: "/heatpump",
  },
  {
    query: "Am I eligible for the BUS grant?",
    category: "eligibility",
    targetPath: "/heatpump",
  },
  {
    query: "Boiler Upgrade Scheme eligibility rules UK 2026",
    category: "eligibility",
    targetPath: "/heatpump",
  },
  {
    query: "Do I need planning permission for solar panels in the UK?",
    category: "eligibility",
    targetPath: "/solar",
  },
  {
    query: "Are heat pumps permitted development in England?",
    category: "eligibility",
    targetPath: "/heatpump",
  },
  {
    query: "BUS grant for a flat or leasehold property",
    category: "eligibility",
    targetPath: "/heat-pumps/1960s-flat",
  },
  {
    query: "Smart Export Guarantee best UK tariff 2026",
    category: "eligibility",
    targetPath: "/compare/solar-vs-no-solar",
  },

  // ─── Feasibility ───────────────────────────────────────────────
  {
    query: "Will a heat pump work in an old British house?",
    category: "feasibility",
    targetPath: "/heat-pumps/victorian-terrace",
  },
  {
    query: "Can I get a heat pump in a Victorian terrace?",
    category: "feasibility",
    targetPath: "/heat-pumps/victorian-terrace",
  },
  {
    query: "Do heat pumps work in poorly insulated homes?",
    category: "feasibility",
    targetPath: "/heatpump",
  },
  {
    query: "Heat pump for 1930s semi-detached UK",
    category: "feasibility",
    targetPath: "/heat-pumps/1930s-semi",
  },
  {
    query: "Can a flat have a heat pump?",
    category: "feasibility",
    targetPath: "/heat-pumps/1960s-flat",
  },
  {
    query: "Is my roof suitable for solar panels?",
    category: "feasibility",
    targetPath: "/solar",
  },
  {
    query: "Solar panels on a north-facing roof UK",
    category: "feasibility",
    targetPath: "/compare/solar-vs-no-solar",
  },
  {
    query: "Heat pump for a new-build home UK",
    category: "feasibility",
    targetPath: "/heat-pumps/new-build",
  },

  // ─── Comparison ─────────────────────────────────────────────────
  {
    query: "Heat pump vs gas boiler in 2026",
    category: "comparison",
    targetPath: "/compare/heat-pump-vs-gas-boiler",
  },
  {
    query: "Should I replace my gas boiler with a heat pump?",
    category: "comparison",
    targetPath: "/compare/heat-pump-vs-gas-boiler",
  },
  {
    query: "Are solar panels worth it in the UK in 2026?",
    category: "comparison",
    targetPath: "/compare/solar-vs-no-solar",
  },
  {
    query: "Air source vs ground source heat pump UK",
    category: "comparison",
    targetPath: "/compare/air-source-vs-ground-source-heat-pump",
  },
  {
    query: "Best heat pump brands UK",
    category: "comparison",
  },
  {
    query: "Solar panels with battery vs panels only",
    category: "comparison",
    targetPath: "/compare/solar-vs-no-solar",
  },
  {
    query: "Heat pump vs oil boiler UK running cost",
    category: "comparison",
    targetPath: "/compare/heat-pump-vs-gas-boiler",
  },

  // ─── Savings / payback ──────────────────────────────────────────
  {
    query: "How much can I save with a heat pump UK?",
    category: "savings",
    targetPath: "/heatpump",
  },
  {
    query: "Heat pump running cost per year UK",
    category: "savings",
    targetPath: "/blog/heat-pump-running-costs-uk",
  },
  {
    query: "Best electricity tariff for a heat pump 2026",
    category: "savings",
    targetPath: "/blog/best-tariff-for-heat-pump-uk",
  },
  {
    query: "Solar panel payback period UK",
    category: "savings",
    targetPath: "/compare/solar-vs-no-solar",
  },
  {
    query: "How much do solar panels save per year UK?",
    category: "savings",
    targetPath: "/solar",
  },
  {
    query: "Solar export tariff income UK",
    category: "savings",
    targetPath: "/blog/smart-export-guarantee-explained",
  },

  // ─── Technical / how-X-works ────────────────────────────────────
  {
    query: "How does an air source heat pump work?",
    category: "tech",
    targetPath: "/heatpump",
  },
  {
    query: "What size heat pump do I need UK?",
    category: "tech",
    targetPath: "/heatpump",
  },
  {
    query: "How loud are heat pumps in the UK?",
    category: "tech",
    targetPath: "/blog/heat-pump-noise-rules-uk",
  },
  {
    query: "Do I need a new hot water cylinder with a heat pump?",
    category: "tech",
    targetPath: "/heatpump",
  },
  {
    query: "Do I need insulation before a heat pump?",
    category: "tech",
    targetPath: "/blog/insulation-before-heat-pump",
  },
  {
    query: "Are heat pumps banned 2035 UK?",
    category: "tech",
    targetPath: "/blog/gas-boiler-ban-uk-2035",
  },
  {
    query: "How many solar panels do I need UK?",
    category: "tech",
    targetPath: "/solar",
  },
  {
    query: "Solar panel orientation UK best direction",
    category: "tech",
    targetPath: "/solar",
  },
  {
    query: "MCS certification meaning heat pump installer",
    category: "tech",
  },

  // ─── Regional ──────────────────────────────────────────────────
  {
    query: "Heat pump installer Sheffield",
    category: "cost",
    targetPath: "/heat-pumps/sheffield",
  },
  {
    query: "Heat pump in Manchester home",
    category: "feasibility",
    targetPath: "/heat-pumps/manchester",
  },
  {
    query: "Solar panels Bristol installation cost",
    category: "cost",
    targetPath: "/solar-panels/bristol",
  },
  {
    query: "Heat pumps for Welsh homes BUS grant",
    category: "eligibility",
    targetPath: "/heat-pumps/cardiff",
  },
  {
    query: "Solar PV Brighton south coast UK",
    category: "feasibility",
    targetPath: "/solar-panels/brighton-and-hove",
  },
];

/** Filter helper for the dashboard's category facet. */
export function queriesByCategory(category: TargetQuery["category"]): TargetQuery[] {
  return TARGET_QUERIES.filter((q) => q.category === category);
}
