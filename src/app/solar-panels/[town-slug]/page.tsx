// /solar-panels/[town-slug] — programmatic town page for solar PV
// suitability. Twin of /heat-pumps/[town-slug] with solar-focused
// copy + a solar-focused TL;DR / table interpretation of the same
// EPC band-distribution data.
//
// Same data source, same load pattern, same noindex gating as the
// heat-pump variant — both share the epc_area_aggregates row for
// the town and refresh in lockstep when the build script runs.
//
// Why a separate file rather than a shared component: the body copy
// + framing differs enough between the two that a shared template
// would obscure rather than DRY. Keeping each page self-contained
// makes it obvious where to tweak copy per-vertical.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTownBySlug, allTownSlugs, getNearbyTowns, PILOT_TOWNS, type PilotTown } from "@/lib/programmatic/towns";
import {
  loadTownAggregate,
  loadLAAggregate,
  loadPostcodeDistrictAggregate,
  ALL_BANDS,
  type TownAggregateRow,
  type EnergyBand,
} from "@/lib/programmatic/town-aggregates";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import { InstallerListSection } from "@/components/installer/installer-list-section";

export const revalidate = 3600;

export async function generateStaticParams() {
  // LA slugs — same enumeration pattern as the heat-pump route.
  // Filter out LAs that have a matching PILOT_TOWN to avoid
  // duplicating town pages.
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
      "[solar-panels] generateStaticParams: LA/PCD enum failed, skipping:",
      err instanceof Error ? err.message : err,
    );
  }

  return [
    ...allTownSlugs().map((slug) => ({ "town-slug": slug })),
    ...laSlugs.map((slug) => ({ "town-slug": slug })),
    ...pcdSlugs.map((slug) => ({ "town-slug": slug })),
  ];
}

interface PageProps {
  params: Promise<{ "town-slug": string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { "town-slug": slug } = await params;

  // LA branch — slug shape "la-<gss>".
  if (slug.startsWith("la-")) {
    const admin = createAdminClient();
    const row = await loadLAAggregate(admin, slug);
    if (!row || !row.indexed) {
      return { robots: { index: false, follow: false } };
    }
    const url = `https://www.propertoasty.com/solar-panels/${slug}`;
    const title = `Solar panels across ${row.display_name}: 2026 cost + SEG guide`;
    const description = `Rooftop solar PV suitability across the ${row.display_name} local authority area, with install cost ranges, Smart Export Guarantee context, and EPC band data from ${row.sample_size.toLocaleString("en-GB")} local properties.`;
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
        images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
      },
    };
  }

  // Postcode-district branch — slug shape "pc-<district>".
  if (slug.startsWith("pc-")) {
    const admin = createAdminClient();
    const row = await loadPostcodeDistrictAggregate(admin, slug);
    if (!row || !row.indexed) {
      return { robots: { index: false, follow: false } };
    }
    const url = `https://www.propertoasty.com/solar-panels/${slug}`;
    const title = `Solar panels in ${row.display_name}: 2026 cost + SEG guide`;
    const description = `Rooftop solar PV suitability across the ${row.display_name} postcode area, with install cost ranges, Smart Export Guarantee context, and EPC band data from ${row.sample_size.toLocaleString("en-GB")} local properties.`;
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
        images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
      },
    };
  }

  const town = getTownBySlug(slug);
  if (!town) return { robots: { index: false, follow: false } };

  const admin = createAdminClient();
  const row = await loadTownAggregate(admin, slug);

  if (!row || !row.indexed) {
    return {
      robots: { index: false, follow: false },
      title: `Solar panels in ${town.name}`,
    };
  }

  const url = `https://www.propertoasty.com/solar-panels/${slug}`;
  const title = `Solar panels in ${town.name}: 2026 cost + SEG guide`;
  const description = `Rooftop solar PV suitability in ${town.name}, with install cost ranges, payback periods, Smart Export Guarantee context, and EPC band data from ${row.sample_size.toLocaleString("en-GB")} local properties.`;
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
      images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
    },
  };
}

export default async function SolarPanelsTownPage({ params }: PageProps) {
  const { "town-slug": slug } = await params;

  // LA branch — slug shape "la-<gss>".
  if (slug.startsWith("la-")) {
    const admin = createAdminClient();
    const row = await loadLAAggregate(admin, slug);
    if (!row) notFound();
    const fakeTown = laToTownAdapter(row);
    return <TownPageWithData town={fakeTown} row={row} isLA />;
  }

  // Postcode-district branch — slug shape "pc-<district>".
  if (slug.startsWith("pc-")) {
    const admin = createAdminClient();
    const row = await loadPostcodeDistrictAggregate(admin, slug);
    if (!row) notFound();
    const fakeTown = pcdToTownAdapter(row);
    return <TownPageWithData town={fakeTown} row={row} isPCD />;
  }

  const town = getTownBySlug(slug);
  if (!town) notFound();

  const admin = createAdminClient();
  const row = await loadTownAggregate(admin, slug);

  if (!row) return <NoDataShell town={town} />;
  return <TownPageWithData town={town} row={row} />;
}

function laToTownAdapter(row: TownAggregateRow): PilotTown {
  return {
    slug: row.scope_key,
    name: row.display_name,
    laGssCode: row.scope_key.replace(/^la-/i, "").toUpperCase(),
    councilName: row.display_name,
    postTowns: [],
    postcodeDistricts: [],
    county: row.county ?? "",
    region: row.region ?? "",
    country: row.country as PilotTown["country"],
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
}

function pcdToTownAdapter(row: TownAggregateRow): PilotTown {
  return {
    slug: row.scope_key,
    name: row.display_name,
    laGssCode: "",
    councilName: "",
    postTowns: [],
    postcodeDistricts: [row.scope_key.replace(/^pc-/i, "").toUpperCase()],
    county: row.county ?? "",
    region: row.region ?? "",
    country: row.country as PilotTown["country"],
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
}

function NoDataShell({ town }: { town: PilotTown }) {
  return (
    <div className="bg-cream min-h-screen p-12 text-center">
      <meta name="robots" content="noindex, nofollow" />
      <h1 className="text-2xl font-semibold text-navy">
        Solar panels in {town.name}
      </h1>
      <p className="mt-4 text-slate-600">
        We&rsquo;re still pulling EPC data for {town.name}. Check back
        shortly.
      </p>
      <p className="mt-2 text-slate-500">
        Want a check on your specific roof?{" "}
        <a href="/check" className="text-coral underline">
          Run our free pre-survey
        </a>
        .
      </p>
    </div>
  );
}

function TownPageWithData({
  town,
  row,
  isLA = false,
  isPCD = false,
}: {
  town: PilotTown;
  row: TownAggregateRow;
  isLA?: boolean;
  isPCD?: boolean;
}) {
  const data = row.data;
  const url = `https://www.propertoasty.com/solar-panels/${town.slug}`;
  const inOrAcross = isLA || isPCD ? "across" : "in";
  const areaLabel = isLA
    ? `${town.name} (local authority area)`
    : isPCD
      ? `${town.name} postcode area`
      : town.name;

  // Band data — same source as the heat-pump variant. We interpret
  // it through a SOLAR lens: well-rated homes typically have intact
  // roofs (less likely to need re-roof before install); poorly-rated
  // homes may have older roof structures that warrant a structural
  // sign-off pre-install.
  const medianBand = data.median_band ?? "D";
  const samplePretty = row.sample_size.toLocaleString("en-GB");
  const bandPct = data.band_distribution_pct;
  const cOrBetterPct =
    (bandPct.A ?? 0) +
    (bandPct.B ?? 0) +
    (bandPct.C ?? 0);

  const directAnswer = buildDirectAnswer(town, medianBand, samplePretty, cOrBetterPct);

  const tldr = [
    `Typical UK install: £4,000–£8,000 for 3.5–5 kW with battery option.`,
    `Smart Export Guarantee pays 3–15p/kWh for exported electricity.`,
    `Median EPC band across ${samplePretty} ${town.name} properties: ${medianBand}.`,
    `${cOrBetterPct.toFixed(0)}% at band C or better — typically intact roofs.`,
    `MCS-certified installer required for SEG eligibility + DNO sign-off.`,
  ];

  const faqs = buildSolarTownFaqs(town, medianBand, samplePretty, cOrBetterPct);
  const nearby = getNearbyTowns(town.slug, 3);

  // Same band-distribution table as heat-pumps, but with a SOLAR-
  // specific interpretation column.
  const tableRows: Array<Array<string | number>> = ALL_BANDS.map((b) => {
    const count = data.band_distribution[b] ?? 0;
    const pct = bandPct[b] ?? 0;
    return [
      `Band ${b}`,
      count.toLocaleString("en-GB"),
      pct > 0 ? `${pct.toFixed(1)}%` : "—",
      solarHint(b),
    ];
  });

  return (
    <AEOPage
      headline={`Solar panels ${inOrAcross} ${areaLabel}: 2026 cost + SEG guide`}
      description={`Rooftop solar PV suitability ${inOrAcross} ${areaLabel}, with install cost ranges, payback periods, Smart Export Guarantee context, and EPC band data from ${samplePretty} local properties.`}
      url={url}
      image="/hero-solar.jpg"
      datePublished="2026-05-11"
      dateModified={row.refreshed_at.slice(0, 10)}
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section={`${town.region} · ${town.country}`}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Solar panels", url: "/solar-panels" },
        { name: areaLabel },
      ]}
      directAnswer={directAnswer}
      tldr={tldr}
      faqs={faqs}
      sourcesEpc
      sources={[
        {
          name: "Ofgem — Smart Export Guarantee (SEG)",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer (solar PV)",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Solar panels",
          url: "https://energysavingtrust.org.uk/advice/solar-panels/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Find an energy certificate (EPC Register)",
          url: "https://find-energy-certificate.service.gov.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Solar PV permitted development rules",
          url: "https://www.gov.uk/guidance/when-is-permission-required",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>What the EPC data shows for {town.name}</h2>
      <p>
        We&rsquo;ve aggregated the current Energy Performance Certificate
        band for {samplePretty} properties in {town.name}, drawn live
        from the GOV.UK EPC Register. The median home in our sample
        sits at band {medianBand}. Around {cOrBetterPct.toFixed(0)}%
        of properties are at band C or better — homes with newer
        roofs, modern fabric and intact membranes that typically
        accept a rooftop PV install with minimal pre-work. The
        balance (band D and below) more often needs a quick
        structural survey to confirm the roof can carry the panel
        weight without reinforcement.
      </p>

      <ComparisonTable
        caption={`EPC band distribution across ${samplePretty} properties in ${town.name} — solar PV readiness context`}
        headers={["Band", "Properties", "Share", "Solar install context"]}
        rows={tableRows}
        footnote={`Source: GOV.UK EPC Register. Sample collected ${row.refreshed_at.slice(0, 10)}.`}
      />

      {(data.median_floor_area_m2 != null ||
        data.median_heating_cost_current_gbp != null ||
        (data.built_form_distribution &&
          Object.keys(data.built_form_distribution).length > 0)) && (
        <>
          <h2>The typical {town.name} home — solar context</h2>
          <p>
            EPC data adds three useful signals for sizing a solar PV
            install:
          </p>
          <ul>
            {data.median_floor_area_m2 != null && (
              <li>
                <strong>Floor area:</strong> median{" "}
                {Math.round(data.median_floor_area_m2)} m². Roof area
                tracks loosely with floor area; the median {town.name}{" "}
                roof supports a 3.5–5 kW PV system.
              </li>
            )}
            {data.median_heating_cost_current_gbp != null && (
              <li>
                <strong>Current heating cost:</strong> median £
                {Math.round(data.median_heating_cost_current_gbp).toLocaleString("en-GB")}/yr
                . Solar economics improve sharply if you also electrify
                heating — a heat pump powered partly by self-consumed
                solar effectively buys electricity at near zero cost
                for the self-consumed share.
              </li>
            )}
            {data.built_form_distribution &&
              Object.keys(data.built_form_distribution).length > 0 && (
                <li>
                  <strong>Property mix:</strong>{" "}
                  {Object.entries(data.built_form_distribution)
                    .filter(
                      ([k]) =>
                        k.toLowerCase() !== "not recorded" &&
                        k.toLowerCase() !== "nodata!",
                    )
                    .slice(0, 4)
                    .map(
                      ([form, pct]) =>
                        `${form} ${(pct as number).toFixed(0)}%`,
                    )
                    .join(", ")}
                  . Detached and semi-detached homes have the strongest
                  unshaded roof case; terraces work but may share roof
                  pitches with neighbours.
                </li>
              )}
            {data.construction_age_distribution &&
              Object.keys(data.construction_age_distribution).length > 0 && (
                <li>
                  <strong>Dominant age band:</strong>{" "}
                  {
                    Object.entries(data.construction_age_distribution).sort(
                      (a, b) => (b[1] as number) - (a[1] as number),
                    )[0][0]
                  }
                  . Older roofs may need a structural sign-off
                  pre-install; post-1990 roofs typically accept solar
                  with minimal pre-work.
                </li>
              )}
          </ul>
        </>
      )}

      <h2>Typical install cost in {town.name}</h2>
      <p>
        Solar PV install costs in {town.name} fall in the UK
        national range: £4,000 to £8,000 for a 3.5–5 kW system
        (10–14 panels typically), £6,500 to £10,500 with a 5 kWh
        battery, and £9,000 to £14,000 for a fully-loaded system
        with 10 kWh+ battery and an EV-ready inverter. Labour rates
        in {town.region} sit close to the UK mean. Three factors
        drive most of the spread: roof complexity (a single-aspect
        roof is cheaper than a hipped or stepped roof with multiple
        segments), inverter location (loft is cheapest; integrated
        DC-coupled inverter on the panel is most expensive), and
        whether scaffolding access is straightforward.
      </p>

      <h3>Smart Export Guarantee in {town.name}</h3>
      <p>
        The Smart Export Guarantee (SEG) pays you for every kWh of
        solar electricity you export to the grid rather than use in
        your home. Every UK electricity supplier with more than
        150,000 customers must offer an SEG tariff — rates today run
        from 3p/kWh (suppliers offering the minimum) to about 15p/kWh
        (the most generous fixed-rate tariffs from Octopus, E.ON Next,
        EDF and a few independents). The SEG tariff you can get in{" "}
        {town.name} depends on which supplier you use for your
        electricity bill — not your location. A typical 4 kW system
        on a sunny south-facing UK roof generates around 3,400 kWh a
        year, of which roughly half is consumed directly (saves you
        electricity-rate cost) and roughly half is exported (paid at
        SEG rate).
      </p>

      <h2>Does {town.name} have planning quirks?</h2>
      <p>
        For most homes in {town.name}, rooftop solar falls under
        Permitted Development — no planning application required as
        long as panels don&rsquo;t project more than 200mm above the
        roof plane, don&rsquo;t cover the highest part of the roof,
        and (for flat roofs) aren&rsquo;t closer than 1m to the
        edge. The exceptions worth checking before you commit: if
        the property is in a Conservation Area or is a Listed
        Building, planning consent IS required and panels can&rsquo;t
        face a highway. {town.name}&rsquo;s historic / conservation
        areas vary — check{" "}
        <a
          href="https://www.gov.uk/check-planning-permission"
          target="_blank"
          rel="noopener noreferrer"
        >
          gov.uk/check-planning-permission
        </a>
        {" "}with your postcode before scheduling a survey.
      </p>

      <h2>What this means for your home</h2>
      <p>
        Whether solar PV pays back well on your specific home in{" "}
        {town.name} comes down to three things the EPC alone
        can&rsquo;t answer: usable roof area + orientation (south +
        south-west are best in the UK), your daytime electricity
        usage (the more you self-consume, the faster the payback),
        and whether you&rsquo;d add a battery (shifts marginal
        electricity from export to self-consumption — typically
        worth doing if you spend &gt;£800/yr on electricity).
        Propertoasty&rsquo;s free pre-survey check combines your
        address, the Google Solar API&rsquo;s high-resolution roof
        segmentation, and your EPC to size a system and estimate
        payback in about five minutes.
      </p>
      <p>
        <a href="/check">Run a free pre-survey check on your home</a>{" "}
        — installer-ready report, panel count + system size, expected
        kWh/year output, payback in years, and a list of MCS-certified
        installers covering {town.name}.
      </p>

      <InstallerListSection
        lat={town.lat}
        lng={town.lng}
        areaLabel={areaLabel}
        capability="solar"
        areaSlug={town.slug}
      />

      {nearby.length > 0 && (
        <>
          <h3>Nearby towns we cover</h3>
          <p>
            Solar comparison data for areas near {town.name} —
            useful if your property sits on a boundary or
            you&rsquo;re comparing across the wider region:
          </p>
          <ul>
            {nearby.map((n) => (
              <li key={n.slug}>
                <a href={`/solar-panels/${n.slug}`}>
                  Solar panels in {n.name}
                </a>{" "}
                — {n.region}, {n.country}.
              </li>
            ))}
          </ul>
        </>
      )}
    </AEOPage>
  );
}

function buildDirectAnswer(
  town: PilotTown,
  medianBand: EnergyBand | "D",
  samplePretty: string,
  cOrBetterPct: number,
): string {
  return `Most homes in ${town.name} qualify for rooftop solar PV under permitted development, with install costs running £4,000 to £8,000 for a typical 3.5–5 kW system. Across ${samplePretty} EPCs lodged for the area, the median band is ${medianBand} and ${cOrBetterPct.toFixed(0)}% sit at band C or better — usually intact roofs ready for install. Smart Export Guarantee tariffs pay 3 to 15p per kWh exported.`;
}

function buildSolarTownFaqs(
  town: PilotTown,
  medianBand: EnergyBand | "D",
  samplePretty: string,
  cOrBetterPct: number,
) {
  const roofReadiness =
    cOrBetterPct >= 50
      ? "most"
      : cOrBetterPct >= 30
      ? "around half of"
      : "a minority of";

  return [
    {
      question: `Is solar PV worth installing in ${town.name}?`,
      answer: `For most homes in ${town.name} a 3.5–5 kW rooftop solar PV system generates roughly 2,800–3,800 kWh per year. UK irradiance varies less by latitude than people assume; ${town.region} sits within ~10% of the national average for annual yield. Combined with self-consumption savings (no electricity import for daytime use) and the Smart Export Guarantee (3–15p/kWh exported), payback typically falls in 7–12 years on a no-battery install in ${town.name}.`,
    },
    {
      question: `What's the typical roof condition in ${town.name}?`,
      answer: `Across the EPC sample for ${town.name}, the median rating is band ${medianBand} and ${cOrBetterPct.toFixed(0)}% of properties sit at band C or better — typically homes with intact modern roofs that accept a solar PV install with minimal pre-work. ${roofReadiness} the area is ready without structural intervention. The balance (band D and below) usually warrants a quick roof-condition check before commissioning to confirm the structure can carry panel weight without reinforcement.`,
    },
    {
      question: `Do I need planning permission for solar panels in ${town.name}?`,
      answer: `For most ${town.name} properties solar PV falls under permitted development — no planning application required as long as panels don't project more than 200mm above the roof plane, don't cover the highest part of the roof, and (for flat roofs) aren't closer than 1m to the edge. Exceptions: properties in Conservation Areas or Listed Buildings need planning consent, and panels can't face a highway. Check gov.uk/check-planning-permission with your specific postcode before committing.`,
    },
    {
      question: `Does the £7,500 BUS grant cover solar?`,
      answer: `No — the Boiler Upgrade Scheme is for heat pumps and biomass boilers, not solar PV. The main UK solar incentive is the Smart Export Guarantee, which pays you per kWh exported to the grid. Solar installs are not currently grant-subsidised in ${town.name} or anywhere else in the UK, but the install qualifies for 0% VAT (extended through to March 2027) and battery storage qualifies for the same VAT relief when fitted with solar.`,
    },
  ];
}

function solarHint(band: EnergyBand): string {
  switch (band) {
    case "A":
      return "Modern roof; clean install, panels often built-in";
    case "B":
      return "Strong fabric; smooth fit on standard mounting";
    case "C":
      return "Typical UK roof; straightforward install in most cases";
    case "D":
      return "Confirm roof age before install; reinforcement rare";
    case "E":
      return "Likely older roof; structural sign-off advisable";
    case "F":
      return "Roof condition often the cost driver; survey upfront";
    case "G":
      return "Plan a roof refurb before solar; reuse scaffolding";
  }
}
