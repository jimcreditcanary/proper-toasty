// /research — research + data assets hub.
//
// Lists the Propertoasty EPC Index quarterly entries + the
// Affordability Index + any other data-asset pages. Designed to
// build a topical-authority hub under the /research namespace
// that AI search engines + Google index as a "data source" cluster.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const PAGE_URL = "https://www.propertoasty.com/research";

export const metadata: Metadata = {
  title:
    "Propertoasty Research — UK energy efficiency data + EPC Index reports",
  description:
    "Open data + analysis on UK home energy efficiency. EPC Index quarterly reports, Affordability Index, deep-dives on heat pump and solar PV adoption.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Propertoasty Research — UK energy efficiency data",
    description:
      "Quarterly EPC Index + Affordability Index + UK home energy data analyses.",
    type: "website",
    url: PAGE_URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

interface ResearchEntry {
  slug: string;
  title: string;
  summary: string;
  series: string;
  date: string; // ISO month
}

// Hand-curated list — research entries are static pages, not DB-driven.
// Add new entries by appending here and creating /research/[slug]/page.tsx.
const ENTRIES: ResearchEntry[] = [
  {
    slug: "uk-affordability-index",
    title: "UK Heat Pump & Solar Affordability Index 2026",
    summary:
      "Trended snapshot of UK home energy affordability across 5 lodgement years and 13 regions, built from the full GOV.UK EPC Register.",
    series: "Affordability Index",
    date: "2026-05",
  },
  {
    slug: "epc-index-2026-q2",
    title: "Propertoasty EPC Index — Q2 2026",
    summary:
      "Five anchor insights on UK home energy efficiency: most + least efficient council areas, fastest improver, national savings potential, and national waste.",
    series: "EPC Index",
    date: "2026-05",
  },
  {
    slug: "most-efficient-uk-borough-tower-hamlets",
    title:
      "Tower Hamlets is the UK's most energy-efficient borough — and floor area is why",
    summary:
      "Why Tower Hamlets tops the UK's energy efficiency rankings with mean SAP 75.1 — the small-flat density story and what the league table doesn't tell you.",
    series: "EPC Index deep-dive",
    date: "2026-05",
  },
  {
    slug: "rural-wales-energy-waste-100m",
    title: "Mid-Wales homes waste £100 million a year on inefficient heating",
    summary:
      "Ceredigion, Gwynedd, Powys, Anglesey, Carmarthenshire and Pembrokeshire account for £101 M/yr in available household savings.",
    series: "EPC Index deep-dive",
    date: "2026-05",
  },
  {
    slug: "burnley-uk-biggest-epc-improver",
    title:
      "How Burnley gained 14 SAP points in a decade — the UK's biggest EPC improver",
    summary:
      "Burnley's mean EPC SAP score rose from 54.2 in 2014 to 68.2 in 2024 — the fastest improvement of any UK council area with comparable data.",
    series: "EPC Index deep-dive",
    date: "2026-05",
  },
  {
    slug: "uk-home-energy-savings-259-per-year",
    title:
      "£259 a year: the average UK home's energy efficiency saving — by council area",
    summary:
      "If every UK home cleared the recommendations on its current EPC, households would save £4.6 billion a year — an average of £259 each, rising to £534 in Ceredigion.",
    series: "EPC Index deep-dive",
    date: "2026-05",
  },
  {
    slug: "uk-postcode-heating-cost-lottery",
    title:
      "The UK's 5× heating-cost postcode lottery — from £225 to £1,180 a year",
    summary:
      "Median heating cost varies by a factor of 5× across UK postcode districts. Central-city flats pay £225/year; rural mid-Wales pays £1,180.",
    series: "EPC Index deep-dive",
    date: "2026-05",
  },
];

export default function ResearchHubPage() {
  return (
    <AEOPage
      headline="Propertoasty Research — UK home energy efficiency data"
      description="Open data + analysis on UK home energy efficiency. EPC Index quarterly reports, Affordability Index, deep-dives on heat pump and solar PV adoption."
      url={PAGE_URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Research"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Research" },
      ]}
      directAnswer="Propertoasty Research publishes open data and analysis on UK home energy efficiency. Two recurring series — the EPC Index (quarterly snapshot of UK council-area efficiency drawn from the full GOV.UK EPC Register) and the Affordability Index (trended year-on-year housing affordability) — plus standalone deep-dives. All datasets are reproducible from the raw EPC bulk dump under Open Government Licence v3.0."
      tldr={[
        "EPC Index — quarterly snapshot of UK council-area energy efficiency (17.8 M properties analysed).",
        "Affordability Index — trended year-on-year UK home energy data 2012–2026.",
        "Standalone deep-dives on Tower Hamlets, rural Wales, Burnley, postcode-level heating costs, and £/home savings.",
        "All findings reproducible via scripts/epc-bulk/ — source: GOV.UK EPC Register, OGL v3.0.",
        "Cite us with the page URL + 'Propertoasty Research, May 2026'. Press contact at /contact.",
      ]}
      sourcesEpc
      sources={[
        {
          name: "GOV.UK — Find an Energy Performance Certificate (EPC Register)",
          url: "https://find-energy-certificate.service.gov.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — EPC bulk download (technical documentation)",
          url: "https://get-energy-performance-data.communities.gov.uk/api-technical-documentation/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Energy price cap",
          url: "https://www.ofgem.gov.uk/energy-price-cap",
          accessedDate: "May 2026",
        },
        {
          name: "DESNZ — Heat pump deployment statistics",
          url: "https://www.gov.uk/government/statistics/heat-pump-deployment",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>What we publish</h2>
      <p>
        Propertoasty Research is the open-data arm of the
        Propertoasty homeowner suitability service. We ingest the
        full GOV.UK EPC Register every month (5.4 GB, ~25 million
        certificates spanning 2008–present), run rollups by council
        area, postcode district, and property archetype, and publish
        findings that are useful to homeowners, journalists, and the
        retrofit industry.
      </p>
      <p>
        Every page on this section cites methodology and the
        underlying queries — the EPC pipeline at{" "}
        <a
          href="https://github.com/jimcreditcanary/proper-toasty/tree/main/scripts/epc-bulk"
          target="_blank"
          rel="noopener noreferrer"
        >
          scripts/epc-bulk/
        </a>{" "}
        is the reproducible workflow. Re-run quarterly = updated
        Index.
      </p>

      <h2>The series</h2>

      <h3>EPC Index — UK home energy efficiency</h3>
      <p>
        Quarterly snapshot of UK council-area efficiency. Mean SAP
        score per LAD, year-over-year improver league table,
        national savings potential, national waste. The launch
        report is Q2 2026; refreshed quarterly thereafter.
      </p>

      <h3>Affordability Index — trended housing affordability</h3>
      <p>
        Year-on-year EPC snapshots across 13 UK regions — band
        shares, median heating cost, median floor area, mains-gas
        coverage. Tracks how UK housing affordability has shifted
        2012 → 2026.
      </p>

      <h2>All entries</h2>

      <ul className="not-prose mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ENTRIES.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/research/${e.slug}`}
              className="group block rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-colors hover:border-coral hover:shadow-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-coral">
                {e.series} · {e.date}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-navy">
                {e.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {e.summary}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2 transition-all">
                Read the report
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Press + research enquiries</h2>
      <p>
        Citation form: &ldquo;Propertoasty Research, [Month Year]&rdquo;
        with a link to the specific page. For interviews, data
        requests, or pre-publication briefings, contact us via the{" "}
        <a href="/contact">contact page</a>.
      </p>
      <p>
        All findings are published under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY 4.0
        </a>{" "}
        for the analytical work. Underlying EPC source data is{" "}
        <a
          href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Government Licence v3.0
        </a>{" "}
        (&copy; Crown copyright).
      </p>
    </AEOPage>
  );
}
