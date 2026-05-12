// /heat-pumps/[town-slug] — programmatic town page.
//
// Reads the town's EPC aggregate from public.epc_area_aggregates,
// renders an AEOPage with town-specific data points woven through
// the body copy. Each page has a unique data signal (the band
// distribution histogram for THIS town) — that's what clears the
// validator's "≥1 unique data point per page" rule.
//
// Pages are noindex'd when:
//   - the slug doesn't match a seeded town  → notFound()
//   - the aggregate row has indexed=false   → robots: noindex
//
// SITEMAP: sitemap-towns.xml (deliverable #7) filters on
// indexed=true; a town with indexed=false renders to robots-no
// AND is absent from the sitemap. Both signals agree.
//
// SOLAR TWIN: /solar-panels/[town-slug] follows the same pattern
// with solar-focused copy. Implemented as a separate file rather
// than a shared component because the body content + sources differ
// enough that abstracting would obscure rather than DRY.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTownBySlug, allTownSlugs, type PilotTown } from "@/lib/programmatic/towns";
import {
  getArchetypeBySlug,
  allArchetypeSlugs,
} from "@/lib/programmatic/archetypes";
import {
  loadTownAggregate,
  ALL_BANDS,
  type TownAggregateRow,
  type EnergyBand,
} from "@/lib/programmatic/town-aggregates";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { HeatPumpArchetypePage } from "@/components/programmatic/heat-pump-archetype-page";

// ISR — 1h. EPC data refreshes monthly at the source so the page
// itself doesn't need to be hot-rebuild fast. The build-towns
// script bumps refreshed_at when it runs; the ISR window means
// changes propagate within the hour without manual invalidation.
export const revalidate = 3600;

// Static params from the pilot seeds — Next pre-renders these at
// build time. Slugs split between two seeds:
//
//   - PILOT_TOWNS  → town pages backed by epc_area_aggregates
//   - PILOT_ARCHETYPES → curated property-type pages
//
// Both share the /heat-pumps/<slug> namespace. The route dispatches
// based on which seed the slug matches. Slug collisions between the
// two seeds MUST be avoided when adding new entries.
export async function generateStaticParams() {
  return [
    ...allTownSlugs().map((slug) => ({ "town-slug": slug })),
    ...allArchetypeSlugs().map((slug) => ({ "town-slug": slug })),
  ];
}

interface PageProps {
  params: Promise<{ "town-slug": string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { "town-slug": slug } = await params;

  // Archetype branch — curated content, always indexed.
  const archetype = getArchetypeBySlug(slug);
  if (archetype) {
    const url = `https://www.propertoasty.com/heat-pumps/${slug}`;
    const title = `Heat pump for a ${archetype.name}: 2026 cost + sizing guide`;
    const description = `Air-source heat pump suitability for a ${archetype.name.toLowerCase()}, with sizing, install cost, BUS grant eligibility and pre-install fabric work.`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        type: "article",
        url,
        siteName: "Propertoasty",
        locale: "en_GB",
        images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
      },
    };
  }

  // Town branch.
  const town = getTownBySlug(slug);
  if (!town) return { robots: { index: false, follow: false } };

  const admin = createAdminClient();
  const row = await loadTownAggregate(admin, slug);

  // Noindex when there's no data OR the validator flagged it.
  if (!row || !row.indexed) {
    return {
      robots: { index: false, follow: false },
      title: `Heat pumps in ${town.name}`,
    };
  }

  const url = `https://www.propertoasty.com/heat-pumps/${slug}`;
  const title = `Heat pumps in ${town.name}: 2026 grant + cost guide`;
  const description = `Air-source heat pump suitability in ${town.name}, with BUS grant breakdown, install cost ranges, and EPC band data from ${row.sample_size.toLocaleString("en-GB")} local properties.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName: "Propertoasty",
      locale: "en_GB",
      images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
    },
  };
}

export default async function HeatPumpsTownPage({ params }: PageProps) {
  const { "town-slug": slug } = await params;

  // Archetype branch — curated content, no DB read needed.
  const archetype = getArchetypeBySlug(slug);
  if (archetype) {
    return <HeatPumpArchetypePage archetype={archetype} />;
  }

  // Town branch — needs DB lookup.
  const town = getTownBySlug(slug);
  if (!town) notFound();

  const admin = createAdminClient();
  const row = await loadTownAggregate(admin, slug);

  if (!row) {
    // No aggregate built yet — render a minimal noindex shell so
    // the route works, but tell crawlers not to weight it.
    return <NoDataShell town={town} />;
  }

  // From here on we have data. Build the page.
  return <TownPageWithData town={town} row={row} />;
}

// ─── No-data shell ────────────────────────────────────────────────

function NoDataShell({ town }: { town: PilotTown }) {
  // This branch shouldn't fire often once the build script has run,
  // but is here so the route doesn't 500 if a town is in the seed
  // but its aggregate hasn't been computed yet.
  return (
    <div className="bg-cream min-h-screen p-12 text-center">
      <meta name="robots" content="noindex, nofollow" />
      <h1 className="text-2xl font-semibold text-navy">
        Heat pumps in {town.name}
      </h1>
      <p className="mt-4 text-slate-600">
        We&rsquo;re still pulling EPC data for {town.name}. Check back
        shortly.
      </p>
      <p className="mt-2 text-slate-500">
        Want a check on your specific property?{" "}
        <a href="/check" className="text-coral underline">
          Run our free pre-survey
        </a>
        .
      </p>
    </div>
  );
}

// ─── Real page ────────────────────────────────────────────────────

function TownPageWithData({
  town,
  row,
}: {
  town: PilotTown;
  row: TownAggregateRow;
}) {
  const data = row.data;
  const url = `https://www.propertoasty.com/heat-pumps/${town.slug}`;

  // ── Body-driving data points ────────────────────────────────────
  const medianBand = data.median_band ?? "D";
  const samplePretty = row.sample_size.toLocaleString("en-GB");
  const bandPct = data.band_distribution_pct;
  // The two bands most common in the sample. Used in copy.
  const sortedBands = [...ALL_BANDS]
    .map((b) => ({ band: b, pct: bandPct[b] ?? 0 }))
    .sort((a, b) => b.pct - a.pct);
  const topBand = sortedBands[0];
  const secondBand = sortedBands[1];

  // % of homes at D or worse — the "headline retrofit opportunity"
  // figure that captures how many homes have room to improve.
  const dOrWorsePct =
    (bandPct.D ?? 0) +
    (bandPct.E ?? 0) +
    (bandPct.F ?? 0) +
    (bandPct.G ?? 0);

  // ── 40–60 word DirectAnswer ─────────────────────────────────────
  const directAnswer = buildDirectAnswer(town, medianBand, samplePretty, dOrWorsePct);

  // ── TL;DR (3–6 short bullets) ────────────────────────────────────
  const tldr = [
    `BUS grant of £7,500 toward an air-source heat pump applies in ${town.name} (${town.country}).`,
    `Median EPC band across ${samplePretty} local properties: ${medianBand}.`,
    `${dOrWorsePct.toFixed(0)}% of homes sit at band D or below — typical retrofit candidates.`,
    `Top property band in ${town.name}: ${topBand.band} (${topBand.pct.toFixed(0)}%).`,
    `MCS-certified installer required for a binding heat-loss quote.`,
  ];

  // ── Comparison table data ───────────────────────────────────────
  const tableRows: Array<Array<string | number>> = ALL_BANDS.map((b) => {
    const count = data.band_distribution[b] ?? 0;
    const pct = bandPct[b] ?? 0;
    return [
      `Band ${b}`,
      count.toLocaleString("en-GB"),
      pct > 0 ? `${pct.toFixed(1)}%` : "—",
      retrofitHint(b),
    ];
  });

  return (
    <AEOPage
      headline={`Heat pumps in ${town.name}: 2026 grant + cost guide`}
      description={`Air-source heat pump suitability in ${town.name}, with BUS grant breakdown, install cost ranges, and EPC band data from ${samplePretty} local properties.`}
      url={url}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-11"
      dateModified={row.refreshed_at.slice(0, 10)}
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section={`${town.region} · ${town.country}`}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Heat pumps", url: "/heat-pumps" },
        { name: town.name },
      ]}
      directAnswer={directAnswer}
      tldr={tldr}
      sourcesEpc
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
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Find an energy certificate (EPC Register)",
          url: "https://find-energy-certificate.service.gov.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Air source heat pumps",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>What the EPC data shows for {town.name}</h2>
      <p>
        We&rsquo;ve aggregated the current Energy Performance Certificate
        band for {samplePretty} properties in {town.name}, drawn live
        from the GOV.UK EPC Register. The median home in our sample
        sits at band {medianBand}, with {topBand.pct.toFixed(0)}%
        falling into band {topBand.band} and {secondBand.pct.toFixed(0)}%
        in band {secondBand.band}. Around{" "}
        {dOrWorsePct.toFixed(0)}% of homes are at band D or below — the
        cohort with the most realistic retrofit upside.
      </p>

      <ComparisonTable
        caption={`EPC band distribution across ${samplePretty} properties in ${town.name}`}
        headers={["Band", "Properties", "Share", "Retrofit context"]}
        rows={tableRows}
        footnote={`Source: GOV.UK EPC Register. Sample collected ${row.refreshed_at.slice(0, 10)}.`}
      />

      <h2>Does the Boiler Upgrade Scheme apply in {town.name}?</h2>
      <p>
        Yes. {town.name} is in {town.country}, where the Boiler Upgrade
        Scheme (BUS) pays £7,500 toward an air-source heat pump
        install. The grant is administered by Ofgem and deducted by
        the installer at the point of invoice — you never see the
        cash. To qualify, the property must be owner-occupied or
        privately rented, have a valid EPC issued in the last 10
        years, and have no outstanding loft-or-cavity insulation
        recommendation on the EPC (unless an exemption is documented).
        In our sample of {town.name} EPCs the median rating is band{" "}
        {medianBand}, which means most homes need to clear at least
        one insulation recommendation before the installer can claim
        the grant.
      </p>

      <h3>Typical install cost in {town.name}</h3>
      <p>
        Pre-grant install costs in {town.name} typically run £8,000
        to £14,000 for a 5–10 kW air-source unit, in line with UK
        averages — labour rates in {town.region} sit close to the
        national mean. After the £7,500 BUS deduction most {town.name}
        homeowners pay £1,500 to £6,500 out of pocket. The figure
        within that range that applies to your property depends on
        three things: heat-loss sizing (set by floor area, fabric and
        air-tightness), radiator upgrades (most pre-2000s homes need
        at least one or two changed), and hot-water cylinder
        provision. An MCS-certified engineer issues the binding quote
        after a heat-loss calculation per BS EN 12831.
      </p>

      <h2>What this means for your home</h2>
      <p>
        Whether a heat pump is a good fit for your specific home in{" "}
        {town.name} depends on three factors the EPC alone can&rsquo;t
        answer: roof + outdoor space for the external unit, radiator
        sizing throughout the heating circuit, and your current
        heating fuel + tariff. Propertoasty&rsquo;s free pre-survey
        check combines your address, an EPC pull, the Google Solar
        API&rsquo;s roof data, and a floorplan vision analysis to
        produce an installer-ready report — typically takes about
        five minutes.
      </p>
      <p>
        <a href="/check">Run a free pre-survey check on your home</a>{" "}
        — installer-ready report, BUS-eligibility verdict, sizing
        range, and a list of MCS-certified installers covering{" "}
        {town.name}.
      </p>

      <h3>How {town.name} compares</h3>
      <p>
        Compared with the England + Wales average band-D share of
        roughly 45%, {town.name}&rsquo;s {(bandPct.D ?? 0).toFixed(0)}%
        sits {(bandPct.D ?? 0) >= 45 ? "at or above" : "below"} the
        national midpoint. Bands E and worse — typical pre-1930s
        homes without significant retrofit — make up{" "}
        {(
          (bandPct.E ?? 0) +
          (bandPct.F ?? 0) +
          (bandPct.G ?? 0)
        ).toFixed(0)}
        % of the local sample, which compares to the E&W average of
        around 22%.
      </p>
    </AEOPage>
  );
}

// ─── copy helpers ─────────────────────────────────────────────────

/**
 * Build the 40–60 word DirectAnswer. Pulls in town name, sample
 * size, median band — every page's lift is unique.
 */
function buildDirectAnswer(
  town: PilotTown,
  medianBand: EnergyBand | "D",
  samplePretty: string,
  dOrWorsePct: number,
): string {
  return `Most homes in ${town.name} qualify for the Boiler Upgrade Scheme grant of £7,500 toward an air-source heat pump. Across ${samplePretty} EPCs lodged for the area, the median band is ${medianBand} with ${dOrWorsePct.toFixed(0)}% at band D or below — the cohort with the strongest retrofit case. An MCS-certified installer issues a binding heat-loss quote after a site visit.`;
}

function retrofitHint(band: EnergyBand): string {
  switch (band) {
    case "A":
      return "Already exceptional; heat pump replaces fossil heat directly";
    case "B":
      return "Strong fabric; heat-pump-ready after minor checks";
    case "C":
      return "Typical retrofit candidate; small upgrades likely";
    case "D":
      return "Insulation prerequisites likely; well-suited post-upgrade";
    case "E":
      return "Insulation recommendations typically required for BUS";
    case "F":
      return "Significant fabric improvements before heat pump fit";
    case "G":
      return "Fabric-first retrofit before any heat-pump consideration";
  }
}
