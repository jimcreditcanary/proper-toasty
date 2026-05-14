// /heat-pump-installers/[area] — dedicated heat-pump installer
// directory page, mirroring the URL pattern user search behaviour
// expects ("heat pump installers Sheffield"). Sister to
// /solar-panel-installers/[area].
//
// Distinct from /heat-pumps/[area] (the technology + EPC-data page):
//   /heat-pumps/sheffield        — "should I get a heat pump in Sheffield?"
//   /heat-pump-installers/sheffield — "find me a heat pump installer in Sheffield"
//
// Same area-slug shapes as /heat-pumps/[town-slug]: PILOT_TOWNS slugs,
// LA slugs ("la-<gss>"), postcode-district slugs ("pc-<district>").
// Archetypes excluded (not locations).
//
// Each page renders the same InstallerListSection used on town pages
// but with the dedicated framing — installer-focused content above
// the fold, area context as supporting material.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PILOT_TOWNS,
  allTownSlugs,
  getTownBySlug,
} from "@/lib/programmatic/towns";
import {
  loadTownAggregate,
  loadLAAggregate,
  loadPostcodeDistrictAggregate,
  type TownAggregateRow,
} from "@/lib/programmatic/town-aggregates";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { InstallerListSection } from "@/components/installer/installer-list-section";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ area: string }>;
}

interface ResolvedArea {
  slug: string;
  displayName: string;
  /** Long-form area label used in headlines + breadcrumbs. */
  areaLabel: string;
  lat: number;
  lng: number;
  /** Path back to the town/LA/postcode page for cross-linking. */
  guideHref: string;
}

async function resolveArea(slug: string): Promise<ResolvedArea | null> {
  // Town slug — curated PILOT_TOWNS.
  const town = getTownBySlug(slug);
  if (town) {
    if (!town.lat || !town.lng) return null;
    return {
      slug,
      displayName: town.name,
      areaLabel: town.name,
      lat: town.lat,
      lng: town.lng,
      guideHref: `/heat-pumps/${slug}`,
    };
  }

  // LA slug.
  if (slug.startsWith("la-")) {
    const admin = createAdminClient();
    const row = await loadLAAggregate(admin, slug);
    if (!row || !row.indexed) return null;
    return rowToArea(slug, row, "la");
  }

  // Postcode-district slug.
  if (slug.startsWith("pc-")) {
    const admin = createAdminClient();
    const row = await loadPostcodeDistrictAggregate(admin, slug);
    if (!row || !row.indexed) return null;
    return rowToArea(slug, row, "pcd");
  }

  return null;
}

function rowToArea(
  slug: string,
  row: TownAggregateRow,
  kind: "la" | "pcd",
): ResolvedArea | null {
  if (row.lat == null || row.lng == null) return null;
  return {
    slug,
    displayName: row.display_name,
    areaLabel:
      kind === "la"
        ? `${row.display_name} (local authority area)`
        : `${row.display_name} postcode area`,
    lat: row.lat,
    lng: row.lng,
    guideHref: `/heat-pumps/${slug}`,
  };
}

export async function generateStaticParams() {
  // Town slugs from the curated seed + LA slugs + postcode-district
  // slugs from Supabase. Archetypes excluded — not location-shaped.
  const townSlugs = allTownSlugs();

  const pilotLaGss = new Set(
    PILOT_TOWNS.map((t) => t.laGssCode.toUpperCase()),
  );
  let laSlugs: string[] = [];
  let pcdSlugs: string[] = [];
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: laData } = await (admin as any)
      .from("epc_area_aggregates")
      .select("scope_key")
      .eq("scope", "local_authority")
      .eq("indexed", true);
    laSlugs = ((laData ?? []) as Array<{ scope_key: string }>)
      .filter((r) => {
        const gss = r.scope_key.replace(/^la-/i, "").toUpperCase();
        return !pilotLaGss.has(gss);
      })
      .map((r) => r.scope_key);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pcdData } = await (admin as any)
      .from("epc_area_aggregates")
      .select("scope_key")
      .eq("scope", "postcode_district")
      .eq("indexed", true);
    pcdSlugs = ((pcdData ?? []) as Array<{ scope_key: string }>).map(
      (r) => r.scope_key,
    );
  } catch (err) {
    console.warn(
      "[heat-pump-installers] generateStaticParams: LA/PCD enum failed:",
      err instanceof Error ? err.message : err,
    );
  }

  return [
    ...townSlugs.map((slug) => ({ area: slug })),
    ...laSlugs.map((slug) => ({ area: slug })),
    ...pcdSlugs.map((slug) => ({ area: slug })),
  ];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { area: slug } = await params;
  const area = await resolveArea(slug);
  if (!area) return { robots: { index: false, follow: false } };

  const url = `https://www.propertoasty.com/heat-pump-installers/${slug}`;
  const title = `Heat pump installers in ${area.displayName}: MCS-certified directory`;
  const description = `MCS-certified heat pump installers covering ${area.displayName}, ranked by distance with Google verified reviews and BUS-grant registration. Request a quote in 5 minutes.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Propertoasty",
      locale: "en_GB",
      images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
    },
  };
}

export default async function HeatPumpInstallersAreaPage({ params }: PageProps) {
  const { area: slug } = await params;
  const area = await resolveArea(slug);
  if (!area) notFound();

  const url = `https://www.propertoasty.com/heat-pump-installers/${slug}`;

  return (
    <AEOPage
      headline={`Heat pump installers in ${area.displayName}: MCS-certified directory`}
      description={`MCS-certified heat pump installers covering ${area.areaLabel}, ranked by distance with Google verified reviews + BUS grant registration status.`}
      url={url}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Directory · Heat pump installers"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Heat pump installers" },
        { name: area.displayName },
      ]}
      directAnswer={`Find MCS-certified heat pump installers covering ${area.areaLabel}. Every installer below holds active MCS certification (required for the £7,500 Boiler Upgrade Scheme grant), with Google ratings + reviews verified within the last 30 days. Click any installer to start a free 5-minute property check; we'll match you with them for a quote.`}
      tldr={[
        `Directory of MCS-certified heat pump installers covering ${area.areaLabel}.`,
        "Every installer holds the certification required for the £7,500 Boiler Upgrade Scheme grant.",
        "Ratings from Google verified reviews — only displayed when status is current.",
        "Distance-ranked from the area centroid. Request a quote in 5 minutes.",
        "We never share your contact details until you opt in — installer contact is gated behind the property check.",
      ]}
      sources={[
        {
          name: "MCS — Find a heat pump installer (official directory)",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Google Maps Platform — Places API",
          url: "https://developers.google.com/maps/documentation/places/web-service/overview",
          accessedDate: "May 2026",
        },
      ]}
    >
      <InstallerListSection
        lat={area.lat}
        lng={area.lng}
        areaLabel={area.areaLabel}
        capability="heat_pump"
        limit={20}
      />

      <h2>How we rank installers</h2>
      <p>
        Installers shown above are filtered to those:
      </p>
      <ul>
        <li>
          Listed on the official MCS-certified directory (
          <a
            href="https://mcscertified.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            mcscertified.com
          </a>
          ).
        </li>
        <li>
          Approved to certify air-source heat pump installs
          (cap_air_source_heat_pump = true).
        </li>
        <li>
          BUS-registered — meaning they can apply the £7,500
          Boiler Upgrade Scheme grant to your install.
        </li>
        <li>
          Within a sensible distance of the {area.areaLabel}{" "}
          centroid. We widen the radius automatically if installer
          density is low in your area.
        </li>
      </ul>
      <p>
        Ratings come from Google verified reviews, fetched via the
        official Google Places API with attribution. We show a
        rating only when it&rsquo;s current (refreshed in the last 30
        days). Installers without a Google Business listing don&rsquo;t
        show a rating — we don&rsquo;t fabricate stars.
      </p>

      <h2>What happens when I click &ldquo;Request a quote&rdquo;</h2>
      <p>
        We don&rsquo;t hand over your phone number or email to the
        installer until you decide. The flow:
      </p>
      <ol>
        <li>
          <strong>5-minute property check.</strong> Enter your
          address; we pull your EPC, check Solar / heat-pump
          suitability based on roof + floor area + heating type.
        </li>
        <li>
          <strong>Personalised report.</strong> We tell you whether
          your home is a good fit, indicate sizing + cost ranges,
          and flag any insulation prerequisites that need clearing
          for the BUS grant.
        </li>
        <li>
          <strong>You decide.</strong> If the report says
          you&rsquo;re a fit, you can book a meeting directly with
          the installer you chose. We share your details only
          then — never automatically.
        </li>
      </ol>

      <h2>About {area.displayName}</h2>
      <p>
        Looking for more context on heat pumps in {area.displayName}{" "}
        specifically — typical install costs, local EPC data, BUS
        grant eligibility for properties in this area? See our{" "}
        <a href={area.guideHref}>heat pumps in {area.displayName} guide</a>
        {" "}for the full local picture.
      </p>
    </AEOPage>
  );
}
