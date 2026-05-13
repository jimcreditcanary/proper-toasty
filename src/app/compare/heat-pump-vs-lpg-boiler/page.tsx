// /compare/heat-pump-vs-lpg-boiler — head-term comparison page.
//
// ~150k UK homes use LPG for heating — mostly rural properties
// where mains gas isn't available and oil-tank access is awkward.
// Smaller market than oil, but the running-cost case is sharper
// (LPG is the most expensive of the three fossil heating fuels
// per useful kWh in 2026) and the supply-contract overhang is
// uniquely LPG-shaped: most tanks are leased, not owned, with
// multi-year supply contracts that need unwinding on switch.
//
// Editorial bias: lean factual. LPG has narrow legitimate use
// cases (e.g. tanker-access constraints making oil impractical);
// the page acknowledges them without leaning on them.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/compare/heat-pump-vs-lpg-boiler";

export const metadata: Metadata = {
  title: "Heat pump vs LPG boiler in 2026: UK off-grid switch guide",
  description:
    "Head-to-head for UK LPG-heated homes: upfront cost, running cost, tank-lease unwind, carbon and what happens when the supply contract ends.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Heat pump vs LPG boiler in 2026: UK off-grid switch guide",
    description:
      "Cost, running cost, carbon, and tank-lease unwind — worked through with 2026 UK numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpVsLpgBoiler() {
  return (
    <AEOPage
      headline="Heat pump vs LPG boiler in 2026: is the switch worth it?"
      description="Head-to-head for UK LPG-heated homes: upfront cost, running cost, tank-lease unwind, carbon and what happens when the supply contract ends."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heating"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Heat pump vs LPG boiler" },
      ]}
      directAnswer="In 2026 a new LPG boiler costs £3,500–£7,000 installed; an air-source heat pump costs £1,500–£6,500 after the £7,500 Boiler Upgrade Scheme grant — so the heat pump usually wins on day-one cost. Running costs favour the heat pump by £500–£900 a year on typical UK LPG prices, and you free yourself from a multi-year tank-supply contract."
      tldr={[
        "LPG is the most expensive of the three fossil heating fuels per useful kWh in 2026.",
        "Heat-pump install often cheaper than a new LPG boiler after the £7,500 BUS grant.",
        "Most LPG tanks are leased, not owned — switching ends a multi-year supply contract; check the early-termination terms.",
        "Carbon emissions drop ~75% switching from LPG to a heat pump on the 2026 grid.",
        "BUS grant treats LPG-heated homes the same as oil and mains-gas in E&W.",
      ]}
      faqs={[
        {
          question:
            "I lease my LPG tank from Calor or Flogas — can I still switch?",
          answer:
            "Yes. The 2018 CMA Liquefied Petroleum Gas Market Investigation Order made tank-supplier switching and contract exit substantially easier for domestic customers. Most current supply contracts have a maximum 2-year tie-in for new installs and rolling annual terms thereafter. Check your contract for any early-termination fee, then notify your supplier in writing that you intend to switch off LPG. They typically remove the tank within 6 weeks at no charge to you.",
        },
        {
          question: "Why is LPG more expensive than mains gas or heating oil?",
          answer:
            "Three reasons: LPG has lower energy density per litre than oil and is more expensive to produce, the supply chain involves road tankers from regional depots (more handling than pipeline gas), and the market is smaller so per-unit overheads are higher. In 2026 LPG typically lands at 8–11p per useful kWh in a modern boiler — about 30% higher than oil and roughly double mains gas. That's why switching saves more on running cost.",
        },
        {
          question: "Will a heat pump work in my rural LPG-heated home?",
          answer:
            "Almost certainly yes — LPG homes typically have private outdoor space (for the existing tank) and single-phase electricity supplies with headroom, both of which suit air-source heat pumps. The two things to check on a pre-survey are fabric performance (loft + cavity insulation) and the existing radiator sizing; LPG homes are often older rural properties where one or both might need attention.",
        },
        {
          question: "Is the BUS grant the same for LPG-heated homes?",
          answer:
            "Yes — the £7,500 Boiler Upgrade Scheme grant applies equally to England and Wales properties regardless of current fuel. LPG-heated homes have been a growing share of BUS applications since 2023 because the running-cost saving is larger than for mains-gas switches. Eligibility requires loft and cavity insulation recommendations on the EPC to be cleared first.",
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
          name: "GOV.UK — CMA LPG Market Investigation Order 2008 + 2018 updates",
          url: "https://www.gov.uk/cma-cases/liquefied-petroleum-gas-market-investigation",
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
        caption="Heat pump vs LPG boiler — typical UK numbers in 2026"
        headers={["", "Air-source heat pump", "Modern LPG boiler"]}
        rows={[
          ["Install cost (pre-grant)", "£8,000–£14,000", "£3,500–£7,000"],
          ["BUS grant", "−£7,500 (E&W)", "—"],
          ["Net upfront cost", "£1,500–£6,500", "£3,500–£7,000"],
          ["Annual fuel cost", "£900–£1,400", "£1,400–£2,200"],
          ["Carbon emissions", "~0.4–0.8 t CO₂/yr", "~2.7 t CO₂/yr"],
          ["Expected lifespan", "15–20 years", "15–20 years"],
          ["Servicing cost", "£100–£180/yr", "£100–£170/yr"],
          ["Fuel delivery", "Grid — automatic", "Tanker — every 6–10 weeks in winter"],
          ["Tank arrangement", "n/a", "Usually leased + supply contract"],
          ["Price volatility", "Steady", "High (small market, regional)"],
          ["Outdoor footprint", "1 × 1 m unit", "Bulk tank or cylinder bank"],
          ["Contract overhang on switch?", "None", "Up to 2-yr tie-in on new tank installs"],
        ]}
        footnote="Ranges are typical for a 3-bed UK rural property (~110–140 m²). Specific quote depends on heat-loss survey + MCS-certified installer assessment."
      />

      <h2>The LPG-specific economics</h2>
      <p>
        LPG sits in an awkward middle ground between mains gas and
        heating oil. The fuel itself is more expensive per useful kWh
        than either (typically 8–11p per kWh in 2026 vs ~3–5p for
        mains gas and 7–10p for oil), and the supply chain involves
        more handling — regional bulk depots, road tankers, regular
        rotation visits — than either alternative. The Competition
        and Markets Authority has reviewed the domestic LPG market
        twice (2008, 2018) for exactly these competitive dynamics.
      </p>
      <p>
        That all means the running-cost case for switching to a heat
        pump is sharper for LPG-heated homes than for mains-gas or
        oil-heated ones. The £7,500 BUS grant applies equally
        regardless of current fuel, so the day-one numbers also
        favour the switch.
      </p>

      <h2>Upfront cost — heat pump usually cheaper after grant</h2>
      <p>
        A new LPG boiler install runs £3,500–£7,000 in 2026,
        depending on tank arrangement (cylinder bank vs bulk) and
        the boiler position. Higher end of that range applies when
        the existing tank needs replacing or relocating. A typical
        rural 3-bed swap lands around £5,000.
      </p>
      <p>
        Pre-grant heat-pump cost runs £8,000–£14,000 for a 7–14 kW
        unit with cylinder and emitter upgrades; rural LPG homes
        tend to need the higher end because of older fabric and
        larger floor areas. Call it £11,500 for a typical install.
        After the £7,500 BUS deduction the homeowner pays £4,000 —
        close to the new-LPG-boiler figure on a like-for-like basis,
        and the running-cost gap pulls strongly in the heat pump&rsquo;s
        favour from year one.
      </p>

      <h2>Tank lease + supply contract — the unique LPG step</h2>
      <p>
        Unlike heating oil (where the homeowner usually owns the
        tank), most UK domestic LPG installations operate on a
        tank-lease basis: the supplier owns the tank, leases it to
        you for a peppercorn fee, and is your exclusive LPG supplier
        for the contract term. New installs typically come with a
        2-year tie-in, then roll annually.
      </p>
      <p>
        On switch to a heat pump, you&rsquo;ll need to:
      </p>
      <ul>
        <li>
          Check your supply contract for tie-in expiry and any
          early-termination fee. The 2018 CMA Order materially
          loosened these, but they exist on some legacy contracts.
        </li>
        <li>
          Notify your supplier in writing of intent to switch off
          LPG. Standard notice is 4–8 weeks for tank removal.
        </li>
        <li>
          Co-ordinate the tank removal with your heat-pump install
          timeline. Most suppliers remove at no extra charge to the
          homeowner under the standard contract.
        </li>
      </ul>
      <p>
        If your tank is owner-supplied (rare but it happens with
        secondhand purchases or unusual older installs), the
        decommissioning logistics are similar to oil — drain, lift,
        £400–£800.
      </p>

      <h2>Running cost — biggest gap of the three fossil options</h2>
      <p>
        At 2026 prices, heating a typical UK 3-bed semi with LPG
        costs roughly £1,400–£2,200 a year (12,000–15,000 kWh demand
        × 8–11p per kWh delivered fuel cost). A modern air-source
        heat pump in the same property uses 3,000–4,500 kWh of
        electricity (SCOP 3.5) at standard tariffs — about £750–£1,200
        a year. The heat pump saves £500–£900 a year on standard
        tariffs; £700–£1,200 on heat-pump-specific tariffs (Octopus
        Cosy, British Gas Heat Pump Plus, EDF GoElectric).
      </p>

      <h2>The carbon angle</h2>
      <p>
        LPG emits roughly 0.21 kg CO₂ per kWh of fuel burned —
        between mains gas (0.20) and heating oil (0.27). A typical
        LPG-heated home using 13,000 kWh/year emits about 2.7 tonnes
        of CO₂ from heating. The same home on a heat pump emits
        0.4–0.8 tonnes per year on the UK grid&rsquo;s 2026 carbon
        intensity (~150 g/kWh) — roughly a 75% cut. The gap widens
        as the grid continues to decarbonise.
      </p>

      <h2>When LPG still makes sense (rare, but real)</h2>
      <p>
        Three scenarios where staying on LPG can still be the right
        call in 2026:
      </p>
      <ul>
        <li>
          <strong>Properties with no electricity-supply headroom.</strong>{" "}
          A handful of remote rural properties have single-phase
          supplies near capacity and would need an expensive DNO
          upgrade to add a 7+ kW heat pump. Pre-survey the supply
          first.
        </li>
        <li>
          <strong>Listed buildings where the outdoor unit fails
          permitted-development siting.</strong> Rare but possible
          on small-footprint listed cottages with no rear or side
          elevation that satisfies MCS 020 noise rules. Listed
          Building Consent is the first call.
        </li>
        <li>
          <strong>New-build estates where the developer has spec&rsquo;d
          LPG as a stop-gap.</strong> Some 2018–2023 rural new builds
          were spec&rsquo;d for LPG with the understanding the homeowner
          would later switch; the existing pipework and boiler may
          have years of remaining life. Switching still makes sense
          on running cost but may not be urgent until the boiler
          ages out.
        </li>
      </ul>

      <h2>Switching pathway — what to do this week</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to get the BUS-eligibility verdict for your specific
          property + an installer-ready report.
        </li>
        <li>
          Send the report to 2–3 MCS-certified installers covering
          your area. Mention the LPG tank-removal logistics on the
          first conversation — most installers will price the heat
          pump separately from the tank decommissioning so you
          can compare cleanly.
        </li>
        <li>
          Read your LPG supply contract for tie-in expiry; if
          you&rsquo;re mid-contract with a penalty clause, time the
          heat-pump commissioning to align with expiry.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Of the three fossil heating fuels — mains gas, oil, LPG —
        LPG has the strongest running-cost case for switching to a
        heat pump in 2026. Day-one cost is similar after the BUS
        grant; annual savings are £500–£900 on standard electricity
        tariffs and meaningfully more on heat-pump-specific ones.
        The unique LPG step is unwinding the tank-supply contract,
        but the 2018 CMA Order made that materially easier than it
        used to be.
      </p>
    </AEOPage>
  );
}
