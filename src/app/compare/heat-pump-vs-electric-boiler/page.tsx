// /compare/heat-pump-vs-electric-boiler — head-term comparison page.
//
// ~500k UK homes use a direct-electric boiler (typically wall-hung
// or floor-standing flow-heater units, often combined with a hot-
// water cylinder). The comparison is the easiest to explain because
// BOTH systems run on the same fuel (grid electricity); the
// difference is purely the efficiency multiplier. A direct-electric
// boiler outputs 1 kWh of heat per 1 kWh of electricity in. A heat
// pump at SCOP 3.5 outputs 3.5 kWh of heat per 1 kWh of electricity.
//
// That means running cost is the central story — not install cost,
// not grant, not carbon. Heat pumps make direct-electric heating
// look mathematically wasteful.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/heat-pump-vs-electric-boiler";

export const metadata: Metadata = {
  title: "Heat pump vs electric boiler in 2026: the running-cost case",
  description:
    "Both run on grid electricity, but a heat pump delivers 3.5× the heat per kWh. The switch saves £600–£1,200/year on a typical UK home.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Heat pump vs electric boiler in 2026: the running-cost case",
    description:
      "Same fuel, different efficiency. Worked through with 2026 UK numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpVsElectricBoiler() {
  return (
    <AEOPage
      headline="Heat pump vs electric boiler in 2026: same fuel, very different bill"
      description="Both run on grid electricity, but a heat pump delivers 3.5× the heat per kWh. The switch saves £600–£1,200/year on a typical UK home."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heating"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Heat pump vs electric boiler" },
      ]}
      directAnswer="Both systems run on grid electricity, but a direct-electric boiler outputs 1 kWh of heat per 1 kWh of electricity while a heat pump outputs about 3.5 kWh of heat per 1 kWh of electricity. For a typical UK home, that efficiency gap is worth £600–£1,200 a year in running cost — and the £7,500 BUS grant usually makes the heat pump cheaper upfront too."
      tldr={[
        "Same fuel (grid electricity) — only the efficiency differs.",
        "Direct-electric boiler: 1:1 efficiency. Heat pump: ~3.5:1 (SCOP 3.5).",
        "Running cost saving on switching: £600–£1,200/year on a typical UK home.",
        "Heat pump usually cheaper UPFRONT after the £7,500 BUS grant.",
        "Direct-electric only wins in unusual edge cases (tiny flats, restricted siting).",
      ]}
      faqs={[
        {
          question:
            "If they both use electricity, why is the heat pump cheaper to run?",
          answer:
            "A direct-electric boiler turns 1 kWh of electricity into 1 kWh of heat — straightforward resistance heating. A heat pump uses 1 kWh of electricity to MOVE 3.5 kWh of heat from outside air into your home (the seasonal coefficient of performance, SCOP). You buy 1 kWh of electricity either way, but you get 3.5× as much heat from the heat pump. That's the entire running-cost story.",
        },
        {
          question:
            "I have an electric boiler in a flat — is a heat pump even feasible?",
          answer:
            "Often yes, but check three things: outdoor space for the unit (private balcony, rear courtyard, or a roof installation with the landlord's sign-off), electricity supply capacity (most UK flats are fine for a 5–8 kW unit), and management-company / freeholder consent if you're a leaseholder. Air-source units have shrunk substantially in 2020s; some new models fit on a 1 m² balcony footprint.",
        },
        {
          question: "Does the BUS grant apply to electric-boiler swaps?",
          answer:
            "Yes — the £7,500 Boiler Upgrade Scheme grant applies to any home in England or Wales swapping to a low-carbon heating system, regardless of what was there before. Electric-boiler-to-heat-pump swaps are a growing segment of BUS applications, particularly in the rental and flat market where the swap is simpler than retrofitting a wet system in a fossil-fuel home.",
        },
        {
          question: "What about combi vs system electric boilers?",
          answer:
            "Combi electric boilers (instantaneous hot water + heating) need an oversized heat-pump install to match their hot-water flow rate, which can push pre-grant cost up. System electric boilers (with an existing hot-water cylinder) are the easiest swap because the cylinder usually stays, and the heat pump just replaces the boiler unit. Pre-survey a system-boiler property at propertoasty.com/check for a faster eligibility verdict.",
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
          name: "Energy Saving Trust — Electric heating + heat pumps",
          url: "https://energysavingtrust.org.uk/advice/electric-heating/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Domestic energy prices (quarterly)",
          url: "https://www.gov.uk/government/collections/domestic-energy-prices",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="Heat pump vs direct-electric boiler — typical UK numbers in 2026"
        headers={["", "Air-source heat pump", "Direct-electric boiler"]}
        rows={[
          ["Install cost (pre-grant)", "£8,000–£14,000", "£1,500–£3,500"],
          ["BUS grant", "−£7,500 (E&W)", "—"],
          ["Net upfront cost", "£1,500–£6,500", "£1,500–£3,500"],
          ["Efficiency (heat / kWh in)", "~3.5 (SCOP)", "1.0"],
          ["Electricity used per year", "3,000–4,500 kWh", "12,000–15,000 kWh"],
          ["Annual fuel cost (standard tariff)", "£900–£1,400", "£3,000–£4,500"],
          ["Annual fuel cost (heat-pump tariff)", "£600–£1,100", "n/a — not eligible"],
          ["Carbon emissions", "~0.4–0.8 t CO₂/yr", "~1.8–2.3 t CO₂/yr"],
          ["Expected lifespan", "15–20 years", "10–20 years"],
          ["Outdoor footprint", "1 × 1 m unit", "None (indoor)"],
          ["Hot water cylinder", "Yes (~£1,500)", "Combi: no; system: yes"],
          ["Install time", "2–3 days", "1 day"],
        ]}
        footnote="Ranges are typical for a 3-bed UK semi or flat (~80–120 m²). Specific quote depends on heat-loss survey + MCS-certified installer assessment."
      />

      <h2>The maths in one paragraph</h2>
      <p>
        A typical UK 3-bed semi needs about 12,000 kWh of useful heat
        per year. A direct-electric boiler burns 1 kWh of electricity
        for every 1 kWh of heat — so it needs roughly 12,000 kWh of
        electricity. A heat pump at SCOP 3.5 needs about 3,400 kWh of
        electricity to deliver the same 12,000 kWh of heat. On the
        2026 standard electricity tariff of around 25p per kWh,
        that&rsquo;s £3,000 vs £850 — a £2,150 annual difference.
        Heat-pump tariffs widen the gap further. Same fuel, same
        home, same heat output; the only difference is how much
        electricity each system buys to deliver it.
      </p>

      <h2>Why direct-electric got popular anyway</h2>
      <p>
        Three reasons direct-electric heating made sense at the
        install stage even though it&rsquo;s expensive to run:
      </p>
      <ul>
        <li>
          <strong>Cheapest install of any whole-house system.</strong>{" "}
          £1,500–£3,500 vs £8,000+ for a heat pump pre-grant. For a
          landlord doing a quick refit before a new tenancy, the
          install cost was the only number they cared about.
        </li>
        <li>
          <strong>No outdoor unit / no flue / no fuel store.</strong>{" "}
          For a top-floor flat or a property where outdoor siting is
          genuinely impossible, direct-electric was the path of
          least resistance.
        </li>
        <li>
          <strong>No specialist installer required.</strong> Most
          competent electricians can fit a direct-electric boiler.
          Heat-pump installs need MCS-certified contractors, which
          historically were thin on the ground.
        </li>
      </ul>
      <p>
        In 2026 the MCS supply chain has caught up, the BUS grant
        has flipped the upfront-cost economics, and the running-cost
        gap has only widened as electricity tariffs settled at 2-3×
        their pre-2021 levels. The case for direct-electric in a
        typical UK home is hard to make on the numbers now.
      </p>

      <h2>The running-cost reality</h2>
      <p>
        Electricity bills for direct-electric-heated homes have been
        the most painful segment of the UK energy crisis. A typical
        3-bed semi on direct-electric heating runs £3,000–£4,500 a
        year on heating alone at 2026 prices. The same home on a
        heat pump runs £900–£1,400 on standard tariffs, and £600–
        £1,100 on heat-pump-specific tariffs. That&rsquo;s a £2,000+
        annual saving on standard tariffs and meaningfully more on
        heat-pump tariffs — bigger than the saving from any
        fossil-fuel switch.
      </p>

      <h2>The carbon angle</h2>
      <p>
        Both systems run on grid electricity, so the per-kWh carbon
        intensity is identical (~150 g CO₂/kWh on the 2026 UK grid).
        The difference is volume: the direct-electric boiler buys
        ~12,000 kWh while the heat pump buys ~3,400 kWh. Heating
        carbon drops proportionally — from ~1.8–2.3 t CO₂/yr to
        ~0.4–0.8 t CO₂/yr, a 65–75% cut.
      </p>

      <h2>When direct-electric still wins (rare)</h2>
      <ul>
        <li>
          <strong>Tiny one-bed flats with zero outdoor space.</strong>{" "}
          The heat-pump install cost-per-kWh-saved doesn&rsquo;t pay
          back at very low heat demand. A 30 m² studio in a leasehold
          building with no consented siting may be stuck with direct-
          electric.
        </li>
        <li>
          <strong>Very-short-tenancy rentals.</strong> If a property
          is mid-lease with a known sale or major renovation in the
          next 18 months, the £1,500–£6,500 post-grant heat-pump
          spend may not recover before the property changes hands.
          Direct-electric&rsquo;s lower install cost wins on
          extreme-short-horizon economics.
        </li>
        <li>
          <strong>Listed buildings where outdoor siting fails.</strong>{" "}
          Same MCS 020 + Listed Building Consent constraints as for
          other heat-pump switches. Rare but real.
        </li>
      </ul>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to confirm BUS eligibility + get a system-size indication
          for your property.
        </li>
        <li>
          If you have an existing hot-water cylinder (system-boiler
          setup), mention this on the first installer call — it
          materially simplifies the install and may reduce cost.
        </li>
        <li>
          Switch to a heat-pump electricity tariff at commissioning
          (Octopus Cosy, British Gas Heat Pump Plus, EDF
          GoElectric) — same supplier, different tariff. The full
          running-cost saving only lands on a heat-pump tariff.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Direct-electric boilers and heat pumps run on the same fuel.
        The heat pump delivers 3.5× the heat per kWh of electricity,
        so the running-cost gap is enormous — typically £2,000+ a
        year on a standard UK semi. After the £7,500 BUS grant the
        heat pump is also usually cheaper upfront. The narrow
        edge-cases where direct-electric still wins (tiny flats with
        no outdoor space, very-short-horizon tenancies) are real
        but unusual.
      </p>
    </AEOPage>
  );
}
