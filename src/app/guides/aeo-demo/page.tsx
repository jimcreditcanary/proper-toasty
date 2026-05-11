// Internal AEO template demo — exercises every primitive so we can
// eyeball the rendered output before using AEOPage for real
// programmatic / editorial content.
//
// NOT linked from the site. The underscore-prefixed segment is a
// Next App Router convention for "private" routes (not picked up by
// generateStaticParams etc), and we set robots → noindex,nofollow
// so it stays out of the index.
//
// Delete the page (or convert to a real demo route under
// /docs/aeo-demo etc) once you're happy with the rendering — kept
// in-repo for now so the team can compare any future tweaks against
// a known reference render.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

export const metadata: Metadata = {
  title: "AEO template demo (internal)",
  description: "Internal demo exercising the AEOPage primitives.",
  robots: { index: false, follow: false },
};

export default function AeoDemoPage() {
  return (
    <AEOPage
      headline="How much does a heat pump cost in the UK in 2026?"
      description="UK air-source heat pump install costs in 2026, with the BUS grant deduction worked through and running-cost ranges by home type."
      url="https://www.propertoasty.com/guides/_aeo-demo"
      image="/hero-heatpump.jpg"
      datePublished="2026-05-11"
      dateModified="2026-05-11"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Heat pump"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "Heat pump cost UK 2026" },
      ]}
      directAnswer="A UK air-source heat pump installs at £8,000 to £14,000 before any grant. The Boiler Upgrade Scheme deducts £7,500 directly off the installer's invoice in England and Wales, leaving most homeowners paying £1,500 to £6,500 out of pocket once an MCS-certified engineer confirms sizing and the install scope."
      tldr={[
        "Pre-grant install: £8,000–£14,000 for an air-source unit",
        "BUS grant: flat £7,500 deduction in England and Wales",
        "Typical out-of-pocket: £1,500–£6,500 after BUS",
        "Running cost: £900–£1,400 a year on a heat-pump tariff",
        "Lead time: 4–10 weeks from quote to commissioning",
      ]}
      faqs={[
        {
          question: "Is the BUS grant £7,500 for everyone?",
          answer:
            "Yes — the Boiler Upgrade Scheme pays £7,500 per air-source heat pump install in England and Wales, regardless of household income. The grant is means-tested only in the sense that the property must be owner-occupied or privately rented and have a valid EPC.",
        },
        {
          question: "How much does running a heat pump cost per year?",
          answer:
            "A typical UK home spends £900–£1,400 per year running an air-source heat pump on a heat-pump tariff like Octopus Cosy or British Gas Heat Pump Plus. That is usually less than mains gas at 2026 prices and substantially less than oil or LPG.",
        },
        {
          question: "Can I install a heat pump in a Victorian terrace?",
          answer:
            "Yes — air-source heat pumps work in pre-1930s terraces provided the property has loft and (where possible) cavity wall insulation, larger radiators or wet underfloor, and a suitable outdoor unit location. Around 60% of UK heat-pump installs are in homes built before 1980.",
        },
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
      <h2>What drives the £8k–£14k pre-grant range?</h2>
      <p>
        Three factors set most of the gap between a £8,000 quote and a
        £14,000 quote on the same property. Heat-loss + sizing comes
        first: a properly-sized 5 kW air-source unit for a well-
        insulated 1980s semi is much cheaper than the 12 kW unit a
        large Victorian end-terrace needs. Radiator upgrades come
        second — most pre-2000s UK homes have radiators sized for an
        80°C gas flow and need at least some changed to a larger
        column or fan-assisted convector for heat-pump operation at
        45–55°C. Hot water cylinder is the third — most heat-pump
        installs add a 200–300 litre unvented cylinder, which adds
        £1,200–£2,000 and an installer-day for the install.
      </p>

      <ComparisonTable
        caption="Indicative install cost by UK property archetype (2026, pre-BUS grant)"
        headers={[
          "Property type",
          "Typical unit size",
          "Pre-grant install",
          "After £7,500 BUS",
        ]}
        rows={[
          ["1980s 3-bed semi", "5 kW", "£8,500", "£1,000"],
          ["1930s 3-bed semi", "7 kW", "£10,500", "£3,000"],
          ["Victorian end-terrace", "10 kW", "£12,500", "£5,000"],
          ["1960s detached", "8 kW", "£11,000", "£3,500"],
          ["Modern 2-bed flat", "4 kW", "£8,000", "£500"],
        ]}
        footnote="Ranges, not quotes. Confirmation from an MCS-certified engineer required before any work is committed."
      />

      <h3>Where does the grant land in the cashflow?</h3>
      <p>
        The £7,500 BUS grant is deducted by the installer from your
        final invoice — you never see the cash. The installer claims
        the £7,500 back from Ofgem after the install is commissioned.
        This matters for cashflow: you only need to fund the
        post-grant balance, not the full pre-grant figure. Most
        installers will not bill the deposit on the grant portion
        either, so a £10,500 pre-grant install for a 1930s semi
        typically asks for a 20–40% deposit against £3,000 (~£600–
        £1,200), not against £10,500.
      </p>

      <h2>Running costs after install</h2>
      <p>
        A heat pump runs on electricity, so the running cost depends
        on the unit&rsquo;s seasonal coefficient of performance
        (SCOP) and your electricity tariff. SCOP of 3 means every
        1 kWh of electricity in produces 3 kWh of heat out — modern
        air-source units score 3.0–4.5 SCOP in UK conditions. A
        well-insulated UK home using 12,000 kWh of heat per year at
        SCOP 3.5 needs about 3,400 kWh of electricity. On a
        heat-pump-specific tariff at 18p/kWh that is £612 a year
        before standing charges.
      </p>
    </AEOPage>
  );
}
