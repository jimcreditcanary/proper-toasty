// /compare/heat-pump-vs-gas-boiler — head-term comparison page.
//
// Highest-search-volume comparison in the UK heat-tech space. AI
// engines (ChatGPT, Perplexity) cite comparison pages disproportion-
// ately when the body uses semantic <table> markup — hence the
// ComparisonTable primitive carrying the headline cost / efficiency
// /lifetime data.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/compare/heat-pump-vs-gas-boiler";

export const metadata: Metadata = {
  title: "Heat pump vs gas boiler in 2026: UK cost + running guide",
  description:
    "Head-to-head: upfront cost, annual running cost, lifespan, carbon, and which suits which UK home. BUS grant maths worked through.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Heat pump vs gas boiler in 2026: UK cost + running guide",
    description:
      "Upfront cost, annual running cost, lifespan, carbon — worked through with 2026 UK numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpVsGasBoiler() {
  return (
    <AEOPage
      headline="Heat pump vs gas boiler in 2026: which costs less for a UK home?"
      description="Head-to-head: upfront cost, annual running cost, lifespan, carbon, and which suits which UK home. BUS grant maths worked through."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-12"
      dateModified="2026-05-12"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heating"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Heat pump vs gas boiler" },
      ]}
      directAnswer="In 2026 a new gas boiler costs £2,500–£4,500 installed; an air-source heat pump costs £1,500–£6,500 after the £7,500 Boiler Upgrade Scheme grant. Running costs are close on equivalent tariffs at £900–£1,400 a year. Heat pumps win on lifetime cost, carbon and resale; gas boilers win only on retrofit speed in poorly insulated homes."
      tldr={[
        "Out-of-pocket install: heat pump often LESS than gas boiler after BUS grant.",
        "Running costs are similar on standard tariffs; heat-pump tariffs widen the gap.",
        "Heat pumps last 15–20 years vs 10–15 for boilers.",
        "Heat pump emissions are roughly one-quarter of gas boiler emissions.",
        "Gas boiler wins only on instant install + tolerance of leaky old homes.",
      ]}
      faqs={[
        {
          question: "Is a heat pump cheaper than a gas boiler in 2026?",
          answer:
            "After the £7,500 Boiler Upgrade Scheme grant, an air-source heat pump install costs £1,500–£6,500 out of pocket in most UK homes. A new gas boiler install costs £2,500–£4,500. The heat pump is often cheaper upfront after grant; running costs are similar on equivalent tariffs.",
        },
        {
          question: "Will a heat pump work in my old house?",
          answer:
            "Yes — air-source heat pumps work in pre-1930s UK homes provided the property has loft insulation, ideally cavity wall insulation, and either larger radiators or wet underfloor heating. About 60% of UK heat-pump installs in 2026 are in homes built before 1980.",
        },
        {
          question: "Are heat pumps noisy compared to a gas boiler?",
          answer:
            "Modern air-source heat pumps run at 40–50 dB(A) at 1 metre — quieter than a domestic fridge. UK Permitted Development rules cap noise at the neighbour boundary (MCS 020); a competent installer will site the outdoor unit to comply by design.",
        },
        {
          question: "Will the BUS grant still be available next year?",
          answer:
            "The Boiler Upgrade Scheme is funded by the UK government through to at least 2028. The £7,500 grant amount was set in 2023 and has been administered consistently since. No current sunset is announced, but it's a budgeted scheme so the cap may be reviewed in future Budgets.",
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
          name: "Energy Saving Trust — Air source heat pumps",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Domestic energy prices (BEIS quarterly data)",
          url: "https://www.gov.uk/government/collections/domestic-energy-prices",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="Heat pump vs gas boiler — typical UK numbers in 2026"
        headers={["", "Air-source heat pump", "Modern gas boiler"]}
        rows={[
          ["Install cost (pre-grant)", "£8,000–£14,000", "£2,500–£4,500"],
          ["BUS grant", "−£7,500 (E&W)", "—"],
          ["Net upfront cost", "£1,500–£6,500", "£2,500–£4,500"],
          ["Annual running cost", "£900–£1,400", "£1,000–£1,500"],
          ["Heating-only carbon", "~0.4–0.8 t CO₂/yr", "~2.2 t CO₂/yr"],
          ["Expected lifespan", "15–20 years", "10–15 years"],
          ["Servicing cost", "£100–£180/yr", "£90–£150/yr"],
          ["Flow temperature", "45–55°C", "70–80°C"],
          ["Radiator upgrade needed?", "Often, 1–4 rooms", "No"],
          ["Hot water cylinder", "Yes (~£1,500)", "Combi: no; system: yes"],
          ["Install time", "2–3 days", "1 day"],
          ["Permitted development?", "Yes (most homes)", "Yes"],
        ]}
        footnote="Ranges are typical for a 3-bed semi (~110 m²) on mains gas. Specific quote depends on heat-loss survey + MCS-certified installer assessment."
      />

      <h2>Upfront cost — heat pump often beats a new boiler in 2026</h2>
      <p>
        The headline shift: the Boiler Upgrade Scheme (BUS) pays a
        flat £7,500 toward an air-source heat pump install in England
        and Wales. That deduction makes the heat pump out-of-pocket
        cost LOWER than a new gas boiler for most UK semi-detached
        homes — a reversal from the pre-2023 economics. The boiler is
        cheaper to physically install but not to BUY after the grant
        is netted off.
      </p>
      <p>
        Pre-grant heat-pump cost runs £8,000–£14,000 for a 5–10 kW
        unit with cylinder + 1–4 radiator upgrades. A typical UK
        3-bed semi lands in the middle of that range — call it
        £10,500. After BUS deduction the homeowner pays £3,000. A
        new combi gas boiler in the same property costs £2,500–£3,500
        installed by an A-rated engineer. The maths now favours the
        heat pump on day one, before any running-cost difference.
      </p>

      <h2>Running cost reality — closer than you&rsquo;d think</h2>
      <p>
        On equivalent tariffs (standard variable), a heat pump and a
        modern condensing gas boiler in a typical UK semi run within
        £100–£200 of each other for heat. The heat pump uses about
        3,400 kWh of electricity (SCOP 3.5); the boiler uses about
        13,000 kWh of gas. At 2026 prices that&rsquo;s roughly £600 of
        electricity vs £800 of gas, plus standing charges. The boiler
        edges ahead on per-kWh fuel cost; the heat pump claws it back
        on conversion efficiency.
      </p>
      <p>
        Heat-pump-specific tariffs (Octopus Cosy, British Gas Heat
        Pump Plus, EDF GoElectric) widen the gap further — they price
        electricity at 13–18p per kWh during heat-pump windows vs
        25–35p on standard tariffs. On those tariffs the heat pump
        comes in £200–£400 cheaper than a boiler for the same heat
        demand. The savings compound across the 15–20-year unit
        lifespan.
      </p>

      <h3>The carbon angle</h3>
      <p>
        A UK home heating with gas emits about 2.2 tonnes of CO₂ per
        year. The same home on a heat pump emits 0.4–0.8 tonnes —
        roughly one-quarter, driven by the UK grid&rsquo;s declining
        carbon intensity (~150 g/kWh in 2026 vs 200 g/kWh in 2022).
        That gap widens every year as the grid decarbonises further;
        a gas boiler installed today locks in those 2.2 tonnes for
        the next 10–15 years.
      </p>

      <h2>When a gas boiler still wins (rare in 2026)</h2>
      <p>
        Two scenarios where a new gas boiler remains the right call:
      </p>
      <ul>
        <li>
          <strong>Emergency replacement.</strong> Your boiler died in
          January; you need heat by Friday. A heat-pump install takes
          2–10 weeks from quote to commissioning. A boiler swap takes
          a day. Some installers in 2026 will lend you a portable
          electric heater while a heat-pump install proceeds, but
          most won&rsquo;t.
        </li>
        <li>
          <strong>Severely uninsulated property.</strong> A 1900s
          solid-wall terrace with single-glazing and no loft
          insulation will struggle to maintain comfort on heat-pump
          flow temperatures. The fabric retrofit needs to happen
          first, then the heat pump can size sensibly. In 2026 the
          BUS grant explicitly requires loft + cavity insulation
          recommendations on the EPC to be cleared.
        </li>
      </ul>

      <h2>Resale and futureproofing</h2>
      <p>
        UK estate agents now flag low-carbon heating as a sale
        accelerant for properties marketed above £400,000. A heat
        pump install adds £5,000–£15,000 to the EPC&rsquo;s indicative
        running-cost saving over the certificate&rsquo;s 10-year
        window, which lifts the energy band visibly (D to C is
        common). The 2025 ban on new gas boiler installs in new
        builds, plus the Future Homes Standard, has shifted buyer
        expectation: a 2035-onward boiler purchase is a known
        depreciating-asset decision.
      </p>

      <h2>Switching pathway — what to do this week</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to get the BUS-eligibility verdict for your specific
          property + an installer-ready report.
        </li>
        <li>
          Send the report to 2–3 MCS-certified installers covering
          your area. Compare heat-loss calculation numbers (W/m²) —
          if two installers&rsquo; numbers differ by more than 20%,
          ask why.
        </li>
        <li>
          Lock in a quote before any radiator decisions. Most
          installers absorb radiator swaps within the BUS-grant
          scope.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        For most UK homeowners with the option, the 2026 numbers
        favour an air-source heat pump over a new gas boiler — lower
        out-of-pocket cost after BUS, similar or better running cost,
        longer lifespan, and dramatically lower carbon. The
        exceptions (emergency replacement, severely uninsulated
        properties) are real but increasingly narrow.
      </p>

      <h2>Related reading</h2>
      <ul>
        <li>
          <a href="/guides/heat-pump-running-costs-vs-gas">
            Heat pump vs gas running costs UK 2026: the real numbers
          </a>{" "}
          — worked annual cost figures by house size, tariff, and
          insulation level.
        </li>
        <li>
          <a href="/guides/heat-pump-payback-period-uk">
            Heat pump payback period UK 2026
          </a>{" "}
          — gas-replacement, oil-replacement, LPG-replacement
          scenarios with BUS factored in.
        </li>
        <li>
          <a href="/guides/bus-application-walkthrough">
            BUS grant application walkthrough
          </a>{" "}
          — how the £7,500 actually flows from Ofgem to your
          invoice.
        </li>
        <li>
          <a href="/guides/fabric-first-retrofit-before-heat-pump">
            Fabric-first retrofit before a heat pump
          </a>{" "}
          — clearing the loft + cavity recommendations that
          gate the grant.
        </li>
      </ul>
    </AEOPage>
  );
}
