// /compare — comparison hub page.
//
// Fixes the orphan-page problem where every /compare/[topic] page
// was unlinked from the rest of the site (sitemap-only discovery,
// slow Google indexing, no PageRank flow). The hub itself targets
// the "heat pump comparisons" head term + each comparison entry
// sits one click from home via the home-page tile.
//
// Adding new comparisons: append to the COMPARISONS array below,
// in the same order the comparison's /compare/<slug>/page.tsx
// was added. The hub's content is hand-curated rather than
// auto-extracted from each child route, so the summary copy reads
// natively rather than as a meta-description echo.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const PAGE_URL = "https://www.propertoasty.com/compare";

export const metadata: Metadata = {
  title: "Heat pump & solar comparisons — UK 2026 switch guides",
  description:
    "Head-to-head comparisons of heat pump options vs gas, oil, LPG, and electric heating. Cost, running cost, carbon, and which suits which UK home.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Heat pump & solar comparisons — UK 2026 switch guides",
    description:
      "Costs, running cost, carbon — every comparison worked through with 2026 UK numbers and the £7,500 BUS grant.",
    type: "website",
    url: PAGE_URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

interface ComparisonEntry {
  slug: string;
  title: string;
  summary: string;
  audience: string;
}

const COMPARISONS: ComparisonEntry[] = [
  {
    slug: "heat-pump-vs-gas-boiler",
    title: "Heat pump vs gas boiler",
    summary:
      "Highest-volume UK comparison. £7,500 BUS grant maths against modern combi boiler running costs.",
    audience: "Most UK homes on mains gas",
  },
  {
    slug: "heat-pump-vs-oil-boiler",
    title: "Heat pump vs oil boiler",
    summary:
      "Off-gas-grid switching guide. Bigger running-cost saving than mains gas; tank-removal logistics covered.",
    audience: "~1.1M UK homes on heating oil",
  },
  {
    slug: "heat-pump-vs-lpg-boiler",
    title: "Heat pump vs LPG boiler",
    summary:
      "Sharpest running-cost saving of the three fossil fuels. Tank-lease + supply-contract unwind under the 2018 CMA Order.",
    audience: "~150k UK homes on LPG",
  },
  {
    slug: "heat-pump-vs-electric-boiler",
    title: "Heat pump vs electric boiler",
    summary:
      "Same fuel (grid electricity), very different efficiency. Heat pump delivers 3.5× the heat per kWh; switching saves £600–£1,200/year on a typical UK home.",
    audience: "~500k UK homes on direct electric",
  },
  {
    slug: "heat-pump-vs-night-storage-heaters",
    title: "Heat pump vs night storage heaters",
    summary:
      "Storage heaters run on cheap Economy 7 overnight electricity but the heat is gone by evening. Heat pump on a time-of-use tariff matches the cost story + delivers heat on demand.",
    audience: "~700k UK homes on Economy 7",
  },
  {
    slug: "air-source-vs-ground-source-heat-pump",
    title: "Air source vs ground source heat pump",
    summary:
      "Both qualify for the same £7,500 BUS grant; air-source suits 95% of UK homes. When ground source actually pays back.",
    audience: "Choosing your heat pump type",
  },
  {
    slug: "solar-vs-no-solar",
    title: "Solar panels vs no solar",
    summary:
      "20-year cashflow on a 4 kW UK install. Payback in 7–11 years on most south-facing roofs. SEG tariff selection matters.",
    audience: "Considering rooftop solar PV",
  },
];

export default function ComparePage() {
  return (
    <AEOPage
      headline="Compare your heating + solar options in 2026"
      description="Head-to-head comparisons of heat pump options vs gas, oil, LPG, and electric heating. Cost, running cost, carbon, and which suits which UK home."
      url={PAGE_URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparisons"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare" },
      ]}
      directAnswer="Picking between a heat pump, gas boiler, oil boiler, LPG, or solar starts with what fuel your property runs on today. Each comparison below works through the 2026 UK numbers — install cost, BUS grant maths, running cost, carbon, and lifespan — for that specific switch. Read the one that matches your current setup, then run a free pre-survey on your address."
      tldr={[
        "5 comparisons cover the main UK switching decisions in 2026.",
        "Every comparison uses 2026 UK numbers + the £7,500 BUS grant where applicable.",
        "Heat pump usually wins on day-one cost after BUS, regardless of current fuel.",
        "Running cost saving is biggest switching off LPG, smallest switching off mains gas.",
        "Brand and product-specific comparisons coming next — fuel-type first.",
      ]}
      sources={[
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Boiler Upgrade Scheme guidance",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heating and energy",
          url: "https://energysavingtrust.org.uk/advice/heating-systems/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>Pick the comparison that matches your home today</h2>
      <p>
        Each guide below answers the same five questions for one
        specific switch — how much it costs to install, what you pay
        after the £7,500 Boiler Upgrade Scheme grant, what running
        costs look like in 2026, how the carbon stacks up, and when
        the alternative still makes sense.
      </p>

      <ul className="not-prose mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COMPARISONS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/compare/${c.slug}`}
              className="group block rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-colors hover:border-coral hover:shadow-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-coral">
                {c.audience}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-navy">
                {c.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {c.summary}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2 transition-all">
                Read the comparison
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Not sure which one applies?</h2>
      <p>
        Start with what currently heats your home: mains gas (most
        urban UK homes), heating oil or LPG (rural off-gas-grid),
        or direct electric / storage heaters. If you&rsquo;re
        considering solar PV separately from heating, the
        solar-vs-no-solar guide answers that on its own. The free
        pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
        gives you the specific verdict for your property in 5
        minutes.
      </p>

      <h2>What&rsquo;s coming next</h2>
      <p>
        Brand-specific comparisons (Daikin vs Mitsubishi, Vaillant
        vs Samsung) and product-type comparisons (hybrid vs full
        heat pump, solar + battery vs solar alone) are next on the
        roadmap. We sequence fuel-type switches first because they
        cover the largest UK audience and the decision is more
        binary; brand comparisons matter once you&rsquo;ve already
        decided to switch.
      </p>
    </AEOPage>
  );
}
