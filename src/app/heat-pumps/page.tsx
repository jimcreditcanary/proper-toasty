// /heat-pumps — index page for the programmatic town pages under
// /heat-pumps/[town-slug]. Lists every indexed town alphabetically
// so visitors landing on the root segment have somewhere to go
// (rather than the 404 Next defaults to).
//
// Also doubles as an SEO landing for the "heat pumps near me" /
// "heat pumps UK" head term, since it links to every town we
// cover + carries the canonical heat-pump explainer copy.
//
// ISR — 1h. Town aggregates change monthly at most; no reason to
// re-render on every request.

import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIndexedTownAggregates } from "@/lib/programmatic/town-aggregates";
import { PILOT_ARCHETYPES } from "@/lib/programmatic/archetypes";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

export const revalidate = 3600;

const PAGE_URL = "https://www.propertoasty.com/heat-pumps";

export const metadata: Metadata = {
  title: "Heat pumps in the UK: 2026 grant + cost guide by town",
  description:
    "Air-source heat pump suitability across UK towns, with BUS grant breakdown, install cost ranges, and live EPC band data per location.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Heat pumps in the UK: 2026 grant + cost guide by town",
    description:
      "BUS grant + cost ranges + EPC data by UK town. Free pre-survey checks for every property.",
    type: "website",
    url: PAGE_URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default async function HeatPumpsIndex() {
  const admin = createAdminClient();
  const towns = await loadIndexedTownAggregates(admin);
  const sorted = [...towns].sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );

  const directAnswer =
    "The Boiler Upgrade Scheme (BUS) pays £7,500 toward an air-source heat pump install in any property in England or Wales. Typical pre-grant cost is £8,000 to £14,000, leaving most homeowners paying £1,500 to £6,500 out of pocket. Pick your town below for the local EPC profile, or run a free pre-survey on your specific address.";

  return (
    <AEOPage
      headline="Heat pumps in the UK: 2026 grant + cost guide by town"
      description="Air-source heat pump suitability across UK towns, with BUS grant breakdown, install cost ranges, and live EPC band data per location."
      url={PAGE_URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-11"
      dateModified="2026-05-11"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Heat pump · UK"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Heat pumps" },
      ]}
      directAnswer={directAnswer}
      tldr={[
        "BUS grant: flat £7,500 in England and Wales, regardless of household income.",
        "Pre-grant install cost: £8,000–£14,000 for a 5–10 kW air-source unit.",
        "Net of grant: £1,500–£6,500 for most UK homes after BUS deduction.",
        "Running cost: £900–£1,400 a year on a heat-pump-specific tariff.",
        "Pre-survey: free on Propertoasty; binding quote requires MCS site visit.",
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
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Air source heat pumps",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>How heat pumps work in UK homes</h2>
      <p>
        An air-source heat pump (ASHP) extracts heat from outside air
        using a refrigerant cycle — even at -5°C, there&rsquo;s enough
        ambient heat to extract usefully. The compressor lifts that
        heat to 45–55°C for your radiators or underfloor heating, vs.
        the 70–80°C a gas boiler runs at. The lower flow temperature
        is why ASHP installs need bigger radiators (or wet underfloor)
        than a gas system — the heat has to come out more slowly to
        warm the room.
      </p>
      <p>
        The seasonal coefficient of performance (SCOP) measures
        efficiency. SCOP 3.5 means every 1 kWh of electricity in
        produces 3.5 kWh of heat out. A typical UK home using
        12,000 kWh of heat per year at SCOP 3.5 needs about
        3,400 kWh of electricity to deliver it. On a heat-pump
        tariff at 18p/kWh that&rsquo;s £612/year before standing
        charges — usually less than the equivalent gas bill at
        2026 prices.
      </p>

      <h2>Browse by town</h2>
      <p>
        Each town page below carries live EPC band data drawn from
        the GOV.UK EPC Register, the local BUS-eligibility context,
        and install cost ranges for the area. Sample size is shown
        next to each town. We&rsquo;re expanding coverage steadily —
        if your town isn&rsquo;t listed yet, the suitability checker
        below works for every UK address.
      </p>

      {sorted.length === 0 ? (
        <p className="text-slate-500 italic">
          Town pages are being built — check back shortly.
        </p>
      ) : (
        <ul
          className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3 my-6"
          aria-label="Towns with heat pump guides"
        >
          {sorted.map((t) => (
            <li key={t.scope_key}>
              <Link
                href={`/heat-pumps/${t.scope_key}`}
                className="block rounded-xl border border-[var(--border)] bg-white px-4 py-3 hover:border-coral/30 hover:shadow-sm transition-all"
              >
                <span className="block font-semibold text-navy">
                  {t.display_name}
                </span>
                <span className="block text-xs text-slate-500">
                  {t.region} · {t.country} ·{" "}
                  {t.sample_size.toLocaleString("en-GB")} EPCs
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2>Browse by property type</h2>
      <p>
        Heat-pump sizing, fabric prerequisites, and BUS grant
        considerations vary by the kind of home you have. Pick the
        archetype that best matches your property for a deep-dive on
        what install scope looks like.
      </p>
      <ul
        className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3 my-6"
        aria-label="Heat pump guides by property type"
      >
        {PILOT_ARCHETYPES.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/heat-pumps/${a.slug}`}
              className="block rounded-xl border border-[var(--border)] bg-white px-4 py-3 hover:border-coral/30 hover:shadow-sm transition-all"
            >
              <span className="block font-semibold text-navy">{a.name}</span>
              <span className="block text-xs text-slate-500">
                {a.era} · {a.heatPumpKW.min}–{a.heatPumpKW.max} kW
                typical · band {a.typicalEpcBand}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Check your specific home</h2>
      <p>
        Town pages give the local context; the actual answer for your
        property depends on three factors only a pre-survey can
        resolve: heat-loss range (set by your floor area, fabric and
        air-tightness), radiator sizing (most pre-2000s homes need at
        least one or two upgraded), and outdoor unit placement.
        Propertoasty&rsquo;s free pre-survey check combines your
        address, an EPC pull, the Google Solar API&rsquo;s roof data,
        and a floorplan vision analysis to produce an installer-ready
        report — typically takes about five minutes.
      </p>
      <p>
        <a href="/check">Run a free pre-survey check on your home</a>{" "}
        — installer-ready report, BUS-eligibility verdict, sizing
        range, and a list of MCS-certified installers covering your
        area.
      </p>
    </AEOPage>
  );
}
