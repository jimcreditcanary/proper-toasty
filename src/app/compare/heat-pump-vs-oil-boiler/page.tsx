// /compare/heat-pump-vs-oil-boiler — head-term comparison page.
//
// Off-gas-grid UK has ~1.1M oil-heated homes (DESNZ, "Sub-national
// gas consumption"). They're the Boiler Upgrade Scheme's biggest
// commercial opportunity because the heat-pump running-cost
// advantage over oil is much larger than over mains gas — oil's
// price-per-kWh is roughly double gas, and pricing is volatile in
// a way grid electricity isn't.
//
// Editorial bias: lean factual, no anti-oil rhetoric. Oil heating
// genuinely still has narrow use cases (e.g. very remote properties
// with constrained electricity supply); the page acknowledges them.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/compare/heat-pump-vs-oil-boiler";

export const metadata: Metadata = {
  title: "Heat pump vs oil boiler in 2026: UK off-gas-grid switch guide",
  description:
    "Head-to-head for the ~1M UK homes on heating oil: upfront cost, running cost, lifespan, carbon, and what happens to the oil tank when you switch.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Heat pump vs oil boiler in 2026: UK off-gas-grid switch guide",
    description:
      "Cost, running cost, carbon, and tank-removal — worked through with 2026 UK numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpVsOilBoiler() {
  return (
    <AEOPage
      headline="Heat pump vs oil boiler in 2026: should off-gas-grid homes switch?"
      description="Head-to-head for the ~1M UK homes on heating oil: upfront cost, running cost, lifespan, carbon, and what happens to the oil tank when you switch."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-12"
      dateModified="2026-05-12"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heating"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Heat pump vs oil boiler" },
      ]}
      directAnswer="In 2026 a new oil boiler costs £3,000–£6,500 installed; an air-source heat pump costs £1,500–£6,500 after the £7,500 Boiler Upgrade Scheme grant — so the heat pump usually wins on day-one cost. Running costs favour the heat pump by £300–£700 a year on typical UK oil prices, plus you reclaim the oil tank's footprint."
      tldr={[
        "Out-of-pocket install: heat pump beats oil for most UK homes after the BUS grant.",
        "Running costs typically £300–£700/year lower than oil on standard tariffs; more on heat-pump-specific tariffs.",
        "Oil prices are volatile; grid electricity for a heat pump is steadier and trending down on cost per useful kWh.",
        "The £7,500 BUS grant is the same whether you're off-gas or on the gas grid in England and Wales.",
        "You reclaim 1–2 m² of garden / driveway when the oil tank comes out.",
      ]}
      faqs={[
        {
          question:
            "Will a heat pump work for my rural off-gas-grid property?",
          answer:
            "Yes — most off-gas-grid UK homes are good heat-pump candidates because they have private outdoor space for the unit and often a single-phase electricity supply with headroom. The two things to check on a pre-survey are fabric performance (loft + cavity insulation) and the existing emitter sizing. Off-gas homes are the BUS's biggest segment by recent uptake.",
        },
        {
          question: "What happens to my oil tank when I switch?",
          answer:
            "Your heat-pump installer can co-ordinate tank decommissioning (drain residual oil, disconnect, lift) with a specialist; cost is typically £400–£900 depending on tank size, contamination and access. You reclaim 1–2 m² of garden or driveway. If the tank is bunded and serviceable, some owners keep it for a generator or skip it entirely — your call.",
        },
        {
          question: "How much does heating oil actually cost in 2026?",
          answer:
            "UK kerosene heating oil typically runs 70–100p per litre in 2026, with significant regional and seasonal variation. One litre delivers ~10 kWh of useful heat in a modern condensing oil boiler, so raw fuel cost lands at 7–10p per kWh. Add delivery surcharges + the small loss to standing-charge equivalents and the effective heating cost is broadly comparable to gas — but with much sharper price spikes.",
        },
        {
          question: "Is the BUS grant the same for off-gas-grid homes?",
          answer:
            "Yes — the £7,500 Boiler Upgrade Scheme grant applies equally to England and Wales properties regardless of whether they're on the gas grid. Oil-heated homes have actually been over-represented in BUS applications since 2023 because the running-cost case is stronger. Eligibility requires loft and cavity recommendations on the EPC to be cleared first.",
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
          name: "DESNZ — Sub-national consumption of gas + oil heating households",
          url: "https://www.gov.uk/government/collections/sub-national-gas-consumption-data",
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
        caption="Heat pump vs oil boiler — typical UK numbers in 2026"
        headers={["", "Air-source heat pump", "Modern oil boiler"]}
        rows={[
          ["Install cost (pre-grant)", "£8,000–£14,000", "£3,000–£6,500"],
          ["BUS grant", "−£7,500 (E&W)", "—"],
          ["Net upfront cost", "£1,500–£6,500", "£3,000–£6,500"],
          ["Annual fuel cost", "£900–£1,400", "£1,200–£2,000"],
          ["Carbon emissions", "~0.4–0.8 t CO₂/yr", "~2.5–3.5 t CO₂/yr"],
          ["Expected lifespan", "15–20 years", "15–25 years"],
          ["Servicing cost", "£100–£180/yr", "£100–£170/yr"],
          ["Fuel delivery", "Grid — automatic", "4–6 tanker deliveries/yr"],
          ["Price volatility", "Steady (regulated tariff)", "High (geopolitical)"],
          ["Outdoor footprint", "1 × 1 m unit", "1,200–2,500 L tank"],
          ["Install time", "2–3 days", "1–2 days"],
          ["Tank removal on switch?", "n/a", "£400–£900"],
        ]}
        footnote="Ranges are typical for a 3-bed UK semi or rural cottage (~110–140 m²). Specific quote depends on heat-loss survey + MCS-certified installer assessment."
      />

      <h2>Why the off-gas-grid case is stronger than mains gas</h2>
      <p>
        The Boiler Upgrade Scheme pays the same £7,500 toward an
        air-source heat pump install regardless of whether your home
        is on the gas grid or off it. But the underlying economics
        favour off-gas homes more: oil is more expensive per useful
        kWh than mains gas, and its price moves sharply with
        geopolitics in a way grid electricity doesn&rsquo;t. The
        running-cost saving from switching off oil to a heat pump is
        therefore typically larger than the saving from switching off
        mains gas.
      </p>
      <p>
        About 1.1 million UK homes currently heat with oil — most in
        rural Scotland, Wales, the South-West, East Anglia and
        Northern Ireland. Almost all have the private outdoor space
        and electricity-supply headroom that air-source heat pumps
        need, which is why oil-heated homes have been
        over-represented in BUS applications since the grant was
        increased in 2023.
      </p>

      <h2>Upfront cost — heat pump usually cheaper after grant</h2>
      <p>
        Oil-boiler installs run £3,000–£6,500 in 2026 — more than a
        gas-boiler swap because the tank, fuel line and flue
        configuration add work. A new external tank alone runs
        £1,000–£2,500 if yours needs replacing. A typical rural 3-bed
        oil install lands around £4,500.
      </p>
      <p>
        Pre-grant heat-pump cost runs £8,000–£14,000 for a 7–14 kW
        unit with cylinder and emitter upgrades (off-gas properties
        often need larger pump capacity than mains-gas homes because
        they tend to be older and less insulated). Call it £11,000
        for a typical rural semi. After the £7,500 BUS deduction the
        homeowner pays £3,500 — slightly below the new-oil-boiler
        figure on a like-for-like basis, before any running-cost
        difference is counted.
      </p>

      <h2>Running cost — the gap is bigger than for gas</h2>
      <p>
        At 2026 prices, heating a typical UK 3-bed semi with oil
        costs roughly £1,200–£2,000 a year (12,000–15,000 kWh demand
        × 7–10p per kWh effective fuel cost + delivery). A modern
        air-source heat pump in the same property uses 3,000–4,500
        kWh of electricity (SCOP 3.5) at standard tariffs — about
        £750–£1,200 a year. Even on the lower-bound oil price the
        heat pump comes in £300–£500 cheaper; at the upper bound
        (post-supply-shock) the gap widens to £600–£900.
      </p>
      <p>
        Heat-pump-specific tariffs (Octopus Cosy, British Gas Heat
        Pump Plus, EDF GoElectric) price electricity at 13–18p per
        kWh during heat-pump windows vs 25–35p on standard tariffs.
        Off-gas homeowners on these tariffs typically save £500–£900
        a year over oil — and the saving doesn&rsquo;t depend on
        favourable kerosene pricing.
      </p>

      <h2>The carbon angle</h2>
      <p>
        Heating oil emits roughly 0.27 kg CO₂ per kWh of fuel
        burned. A typical oil-heated UK home using 13,000 kWh/year
        emits about 3.5 tonnes of CO₂ from heating alone — higher
        than the mains-gas equivalent (2.2 tonnes) because oil&rsquo;s
        carbon intensity is denser.
      </p>
      <p>
        The same home on a heat pump emits 0.4–0.8 tonnes per year
        from heating, using the UK grid&rsquo;s ~150 g/kWh
        intensity in 2026. That&rsquo;s an 80–85% cut against oil.
        The gap widens every year as the grid decarbonises; an oil
        boiler installed today locks in those 3.5 tonnes annually
        for the next 15–25 years.
      </p>

      <h2>Reclaiming the tank footprint</h2>
      <p>
        A typical domestic oil tank holds 1,200–2,500 litres and
        occupies 1–2 m² of garden or driveway, often with a 1.8 m
        clearance perimeter. When you switch to a heat pump, that
        space becomes garden, parking, shed footprint or general
        storage. Decommissioning is straightforward:
      </p>
      <ul>
        <li>Drain residual oil (your supplier can usually recover and credit it).</li>
        <li>Disconnect and cap the fuel line.</li>
        <li>Lift the empty tank (single tanker call; specialist contractor).</li>
        <li>Remediate the standing base if needed.</li>
      </ul>
      <p>
        Combined cost: £400–£900 depending on tank size, contamination
        history and access. Many heat-pump installers co-ordinate
        this as part of the project so you don&rsquo;t have to manage
        two trades separately.
      </p>

      <h2>When oil still makes sense (rare, but real)</h2>
      <p>
        Three scenarios where staying on oil is the right call in 2026:
      </p>
      <ul>
        <li>
          <strong>Very remote properties with constrained electricity
          supply.</strong> A handful of Scottish island and far-rural
          properties have single-phase supplies near capacity; a
          7+ kW heat pump can&rsquo;t safely add load without an
          expensive supply upgrade. Distribution network operator
          (DNO) review is the first call here.
        </li>
        <li>
          <strong>Listed or conservation-area exteriors where
          outdoor-unit siting genuinely fails permitted-development.</strong>{" "}
          Most listed properties CAN host a heat pump with sensitive
          siting (rear elevation, screened); a small minority
          can&rsquo;t. Listed Building Consent is the first call.
        </li>
        <li>
          <strong>Emergency replacement in February.</strong> Same
          logic as the gas-boiler case — if your oil boiler died this
          week, a like-for-like swap takes a day and a heat-pump
          install takes 2–10 weeks. Some homeowners run a temporary
          electric heater for the gap; not everyone can.
        </li>
      </ul>

      <h2>Switching pathway — what to do this week</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to get the BUS-eligibility verdict for your specific
          off-gas property + an installer-ready report.
        </li>
        <li>
          Send the report to 2–3 MCS-certified installers covering
          your area. Off-gas properties have more variance in
          heat-loss calculation than mains-gas semis, so compare the
          W/m² figures carefully — a 20%+ gap between installers is
          a flag to ask why.
        </li>
        <li>
          Get a tank-decommissioning quote in parallel; the lead
          installer can usually fold this into the project.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        For most UK off-gas-grid homeowners with reasonable
        insulation, the 2026 numbers favour an air-source heat pump
        over a new oil boiler comfortably — similar or lower
        upfront cost after the BUS grant, £300–£700 a year of
        running-cost saving (more on heat-pump tariffs), 80%+
        carbon reduction, and you reclaim the tank&rsquo;s
        footprint. The cases where staying on oil makes sense
        (constrained electricity supply, listed exteriors,
        emergency replacement) are real but narrow.
      </p>

      <h2>Related reading</h2>
      <ul>
        <li>
          <a href="/guides/heat-pump-payback-period-uk">
            Heat pump payback period UK 2026
          </a>{" "}
          — oil-replacement scenarios typically pay back in
          3–9 years; worked examples inside.
        </li>
        <li>
          <a href="/guides/heat-pump-running-costs-vs-gas">
            Heat pump vs gas running costs UK 2026
          </a>{" "}
          — covers oil and LPG running costs alongside gas.
        </li>
        <li>
          <a href="/guides/bus-application-walkthrough">
            BUS grant application walkthrough
          </a>{" "}
          — how the £7,500 grant flows from Ofgem to your
          invoice, including off-grid eligibility.
        </li>
      </ul>
    </AEOPage>
  );
}
