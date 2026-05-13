// /guides — guide hub page.
//
// Mirrors the /compare hub pattern. Lists every production guide
// page under /guides/[slug] in a responsive card grid. Internal-
// link surface so guides aren't orphan pages discoverable only
// via sitemap.
//
// Adding new guides: append to the GUIDES array below.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const PAGE_URL = "https://www.propertoasty.com/guides";

export const metadata: Metadata = {
  title: "Heat pump + solar guides — UK 2026 homeowner walkthroughs",
  description:
    "Practical homeowner guides on the UK heat-pump install process: BUS grant application, MCS site visits, what to ask installers.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Heat pump + solar guides — UK 2026 homeowner walkthroughs",
    description: "Practical step-by-step guides on UK heat-pump + solar installs.",
    type: "website",
    url: PAGE_URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

interface GuideEntry {
  slug: string;
  title: string;
  summary: string;
  audience: string;
}

const GUIDES: GuideEntry[] = [
  {
    slug: "bus-application-walkthrough",
    title: "BUS grant application walkthrough",
    summary:
      "How the £7,500 Boiler Upgrade Scheme grant actually flows from installer through Ofgem to your invoice. Timeline, paperwork, what can go wrong.",
    audience: "Applying for the BUS grant",
  },
  {
    slug: "mcs-site-visit-what-to-expect",
    title: "MCS heat pump site visit: what to expect",
    summary:
      "Step-by-step of what happens during an MCS-certified installer's 60–120 minute survey. Heat-loss calc, emitter check, outdoor siting, MCS 020 noise, electrical.",
    audience: "Preparing for an installer visit",
  },
];

export default function GuidesPage() {
  return (
    <AEOPage
      headline="Heat pump + solar guides for UK homeowners in 2026"
      description="Practical step-by-step guides on the UK heat-pump install process: BUS grant application, MCS site visits, what to ask installers."
      url={PAGE_URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guides"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides" },
      ]}
      directAnswer="These guides walk through the practical steps of a UK heat-pump install in 2026 — how the £7,500 BUS grant application flows, what happens during an MCS-certified installer's site visit, and what to look out for at each stage. Written for homeowners considering or about to commission an install."
      tldr={[
        "Two production guides covering BUS application + MCS site visits.",
        "Every guide uses 2026 UK numbers and current Ofgem / MCS rules.",
        "Aimed at homeowners 1–3 months from commissioning an install.",
        "Pair these with the comparison pages at /compare for technology decisions.",
        "More guides coming — fabric-first retrofit, hot-water planning, smart-tariff configuration.",
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
          name: "MCS — Find an installer + product register",
          url: "https://mcscertified.com/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>Pick a guide</h2>
      <p>
        Each guide answers a specific practical question about the
        UK heat-pump install process. Read the one that matches
        your current stage — or all of them if you&rsquo;re still
        figuring out the order.
      </p>

      <ul className="not-prose mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group block rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition-colors hover:border-coral hover:shadow-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-coral">
                {g.audience}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-navy">
                {g.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {g.summary}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2 transition-all">
                Read the guide
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Looking for technology comparisons instead?</h2>
      <p>
        Guides cover the PROCESS of installing a heat pump or
        solar system. If you&rsquo;re still deciding between
        technologies (heat pump vs gas boiler, air-to-water vs
        air-to-air, Daikin vs Mitsubishi etc.), the comparison
        pages at <a href="/compare">/compare</a> work through
        those decisions side by side.
      </p>

      <h2>What&rsquo;s coming next</h2>
      <p>
        Three guides scheduled for the next batch:
      </p>
      <ul>
        <li>
          <strong>Fabric-first retrofit before a heat pump</strong> — loft, cavity, glazing
          + which order they should happen in.
        </li>
        <li>
          <strong>Hot-water planning for a heat-pump install</strong> — cylinder
          sizing, immersion strategy, cycling vs continuous.
        </li>
        <li>
          <strong>Setting up a heat-pump smart tariff</strong> — schedule
          configuration, weather compensation, app integration.
        </li>
      </ul>
    </AEOPage>
  );
}
