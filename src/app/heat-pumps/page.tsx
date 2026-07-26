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
        "Heat pump grant: flat £7,500 for homeowners in England and Wales.",
        "Install cost before the grant: £8,000 to £14,000 for a typical family home.",
        "What you actually pay after the grant: £1,500 to £6,500 for most UK homes.",
        "Running cost: £900 to £1,400 a year on a heat-pump-friendly electricity plan.",
        "Pre-survey: free on Propertoasty; final quote needs a site visit.",
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
          name: "Ofgem — Boiler Upgrade Scheme (BUS)",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>How heat pumps work in UK homes</h2>
      <p>
        A heat pump takes warmth from the outside air and pumps it
        into your radiators or underfloor heating — even at -5°C
        there&rsquo;s enough warmth in the air to be useful. It
        runs your radiators cooler than a gas boiler does, so
        heat pump installs usually need slightly bigger radiators
        (or underfloor heating) to release the same warmth into
        the room.
      </p>
      <p>
        Heat pumps are efficient because they move existing warmth
        rather than making it. For every £1 of electricity you put
        in, a well-set-up heat pump gives you around £3.50 of heat
        out. A typical UK home costs around £600 a year to heat
        with a well-run heat pump on a heat-pump-friendly
        electricity plan — usually less than heating the same
        home with gas at 2026 prices.
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
        Heat pump sizing, insulation needs, and grant paperwork vary
        by the kind of home you have. Pick the closest match to yours
        for a deep-dive on what an install actually involves.
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
        Town pages give the local picture; the actual answer for
        your home depends on three things only a pre-survey can
        answer: how much heat your home loses on a cold day
        (driven by size and insulation), whether any radiators
        need upsizing (most pre-2000s homes need at least one),
        and where the outdoor unit could go. Our free pre-survey
        combines your address, energy certificate, floorplan, and
        satellite roof imagery — takes about five minutes.
      </p>
      <p>
        <a href="/check">Run a free pre-survey check on your home</a>{" "}
        — a quote-ready report, whether you qualify for the
        £7,500 grant, a heat pump size range, and a list of
        qualified installers covering your area.
      </p>
    </AEOPage>
  );
}
