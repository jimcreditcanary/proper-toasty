// /guides/heat-pump-running-costs-vs-gas — running costs explainer.
//
// High-volume informational query — "heat pump running cost UK".
// Sister page to /compare/heat-pump-vs-gas-boiler but focused on
// the methodology and worked examples rather than the decision.
// The comparison page picks a winner; this page shows the maths.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/heat-pump-running-costs-vs-gas";

export const metadata: Metadata = {
  title: "Heat pump vs gas boiler running costs UK 2026: real numbers",
  description:
    "What does a heat pump actually cost to run in the UK in 2026? Worked examples by house size, tariff, and insulation level — vs a modern gas boiler.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Heat pump vs gas boiler running costs UK 2026: real numbers",
    description:
      "Worked running-cost examples for UK heat pumps in 2026, by house size, tariff, and insulation.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpRunningCosts() {
  return (
    <AEOPage
      headline="Heat pump vs gas boiler running costs in UK 2026: the real numbers"
      description="What does a heat pump actually cost to run in the UK in 2026? Worked examples by house size, tariff, and insulation level — vs a modern gas boiler."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Running costs"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "Heat pump vs gas running costs" },
      ]}
      directAnswer="For a typical UK 3-bed semi consuming around 12,000 kWh/year of heat in 2026, a modern condensing gas boiler costs roughly £780/year to run at the 7p/kWh gas cap. A heat pump on a standard variable electricity tariff (28p/kWh) achieving a seasonal COP of 3.2 costs around £1,050/year — slightly more than gas. The SAME heat pump on a smart tariff like Octopus Cosy (average ~17p/kWh blended) costs around £640/year — about 18% cheaper than gas. Insulation, weather compensation tuning, and tariff choice swing the result; the heat pump is only reliably cheaper than gas when paired with a heat-pump-specific tariff and a well-tuned system."
      tldr={[
        "Gas boiler running cost UK 2026: roughly £780/year for a typical 3-bed semi using 12,000 kWh of heat.",
        "Heat pump on flat 28p/kWh tariff: ~£1,050/year (slightly worse than gas).",
        "Heat pump on Octopus Cosy: ~£640/year (~18% cheaper than gas).",
        "Best-case heat pump: ~£500/year on dynamic tariff + well-insulated home + tuned weather compensation.",
        "Worst-case heat pump: ~£1,400/year in an uninsulated solid-wall home on a flat tariff.",
        "Insulation + tariff + tuning = the three variables that decide the running cost question.",
      ]}
      faqs={[
        {
          question:
            "How much does a heat pump cost to run per year in the UK?",
          answer:
            "Most UK 3-bed semi homes with a heat pump and a heat-pump-specific tariff (Octopus Cosy, BGE HomeEnergy) spend £500–£900/year on heating + hot water. The same home on a flat-rate electricity tariff (single 28p/kWh rate) spends £950–£1,250. Larger detached homes (4-bed, 4,000+ kWh of extra heat demand) spend roughly 50% more. Smaller flats and well-insulated new builds spend roughly 40% less. The headline number is meaningless without specifying property size, insulation level, and tariff — those three swing the answer by a factor of 2-3×.",
        },
        {
          question:
            "Why does the same heat pump cost so differently to run depending on tariff?",
          answer:
            "Heat pumps consume electricity, and the per-kWh price of electricity varies more than 2× across UK tariffs. The standard variable tariff caps at ~28p/kWh in 2026. Heat-pump-specific tariffs with off-peak windows can blend down to 14-18p/kWh if you shift consumption into the cheap hours. Dynamic tariffs (Octopus Agile) can blend below 14p/kWh for households with smart-tariff controllers. Because a heat pump uses 3,000-5,000 kWh/year for a typical 3-bed home, every penny per kWh equals £30-£50/year. So the gap between a 28p flat rate and a 17p blended smart rate is £330-£550/year for the same heat pump in the same house — bigger than the cost gap to gas in most cases.",
        },
        {
          question:
            "Is a heat pump always cheaper than gas to run?",
          answer:
            "No. With a poorly tuned heat pump on a flat-rate tariff in an uninsulated solid-wall home, running costs can be 20-40% higher than the same home on gas. The places heat pumps cleanly beat gas are: well-insulated homes, paired with a heat-pump-specific smart tariff, with weather compensation enabled and tuned, and a properly-sized cylinder. Done right, the running cost is 15-30% below the equivalent gas bill. Done badly, it's worse. The variance is the main reason for the 'heat pumps are expensive to run' anecdotes — they're true in the bad case.",
        },
        {
          question:
            "How do oil and LPG running costs compare?",
          answer:
            "Oil and LPG are both significantly more expensive to run than mains gas in 2026. Heating oil costs roughly 9p/kWh delivered at a typical 88%-efficient boiler, working out at ~£1,200/year for the same 12,000 kWh heat demand. LPG is even worse at ~14p/kWh delivered, ~£1,900/year. Heat pumps comfortably beat both fuels even on flat-rate electricity — typical saving £200-£600/year vs oil, £700-£1,200/year vs LPG. This is why heat pump uptake in off-gas-grid properties has accelerated faster than on-grid: the running-cost case is unambiguous.",
        },
        {
          question:
            "What's the biggest single thing I can do to reduce my heat pump running cost?",
          answer:
            "Switch to a heat-pump-specific tariff and schedule consumption into the cheap-rate hours. This is typically 15-30% off your annual bill for zero capex. After that, enable + tune weather compensation (10-20% more saving). After that, address any uncleared insulation (loft + cavity, ~10-20% reduction in heat demand). The three together can take a heat pump from 'parity with gas' to '25-40% cheaper than gas'. See the smart-tariff setup guide for the implementation details.",
        },
      ]}
      sources={[
        {
          name: "Ofgem — Energy price cap",
          url: "https://www.ofgem.gov.uk/energy-price-cap",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pump running costs",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
        {
          name: "Octopus Energy — Cosy tariff",
          url: "https://octopus.energy/smart/cosy-octopus/",
          accessedDate: "May 2026",
        },
        {
          name: "BEIS / DESNZ — Heat Pump Ready trial findings",
          url: "https://www.gov.uk/government/publications/heat-pump-ready-programme",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>What we&rsquo;re calculating — and why it varies</h2>
      <p>
        Running cost has three components: the heat demand of
        the home (kWh of heat needed per year), the efficiency
        of the heating system (how much fuel turns into useful
        heat), and the price of that fuel per kWh.
      </p>
      <p>
        For gas:
      </p>
      <ul>
        <li><strong>Heat demand</strong> × <strong>1 / boiler efficiency</strong> × <strong>gas price per kWh</strong> = annual cost.</li>
      </ul>
      <p>
        For a heat pump:
      </p>
      <ul>
        <li><strong>Heat demand</strong> × <strong>1 / SCOP</strong> × <strong>blended electricity price per kWh</strong> = annual cost.</li>
      </ul>
      <p>
        The catch: every variable in those equations differs by
        household. The 3-bed semi number is the central anchor;
        your bill scales up or down with house size and
        insulation level.
      </p>

      <h2>Baseline — a typical UK 3-bed semi</h2>
      <p>
        Assumptions:
      </p>
      <ul>
        <li>12,000 kWh/year of useful heat (heating + hot water).</li>
        <li>Modern condensing gas boiler at 90% seasonal efficiency.</li>
        <li>Air-source heat pump at SCOP 3.2 (typical UK installed performance).</li>
        <li>Gas price: 7p/kWh (Ofgem cap, May 2026).</li>
        <li>Standard variable electricity: 28p/kWh.</li>
        <li>Octopus Cosy blended: ~17p/kWh (mix of peak + cheap).</li>
        <li>Octopus Agile (automated): ~14p/kWh blended.</li>
      </ul>
      <p>
        Annual cost calculation:
      </p>

      <h3>Gas boiler baseline</h3>
      <p>
        12,000 ÷ 0.90 × £0.07 = <strong>£933/year</strong> gas
        consumption. Plus standing charges (~£155/year for gas
        and partial standing charge attribution for the
        heating side) = <strong>~£780–£900/year</strong> for
        the heating + hot water side of the bill.
      </p>

      <h3>Heat pump on standard variable</h3>
      <p>
        12,000 ÷ 3.2 × £0.28 = <strong>£1,050/year</strong>{" "}
        electricity for heating. Plus electricity standing
        charge (already partially attributed elsewhere) =
        <strong> ~£1,000–£1,100/year</strong>. Slightly worse
        than gas, before any optimisation.
      </p>

      <h3>Heat pump on Octopus Cosy</h3>
      <p>
        12,000 ÷ 3.2 × £0.17 = <strong>£640/year</strong>{" "}
        electricity for heating. About <strong>18% cheaper
        than gas</strong> on the same heat demand.
      </p>

      <h3>Heat pump on Octopus Agile (smart-controlled)</h3>
      <p>
        12,000 ÷ 3.2 × £0.14 = <strong>£525/year</strong>{" "}
        electricity for heating. Roughly <strong>33% cheaper
        than gas</strong>.
      </p>

      <h2>How insulation changes the picture</h2>
      <p>
        The heat-demand number (the 12,000 kWh in the example
        above) is set by your home&rsquo;s insulation, not your
        heating system. Improvements scale linearly:
      </p>
      <ul>
        <li>
          <strong>Loft top-up (no loft now → 270mm):</strong>{" "}
          ~20% reduction in heat demand. 9,600 kWh/year instead
          of 12,000. Annual saving on Cosy: ~£128.
        </li>
        <li>
          <strong>Cavity wall (unfilled → filled):</strong>{" "}
          ~25% reduction. 9,000 kWh/year. Annual saving on
          Cosy: ~£160.
        </li>
        <li>
          <strong>Loft + cavity + draughtproofing:</strong>{" "}
          ~40% combined reduction. 7,200 kWh/year. Annual
          saving on Cosy: ~£256.
        </li>
      </ul>
      <p>
        See the <a href="/guides/fabric-first-retrofit-before-heat-pump">fabric-first retrofit guide</a>{" "}
        for the implementation order and grant routes.
      </p>

      <h2>How weather compensation tuning matters</h2>
      <p>
        SCOP is sensitive to flow temperature. Every 5°C lower
        flow temperature improves COP by 10-15%. A typical
        installer commissions at a conservative flow-temp
        curve; tuning down across the first winter typically
        improves SCOP from 3.0 to 3.5+.
      </p>
      <p>
        Worked impact: a household with SCOP 3.0 on Cosy spends
        12,000 ÷ 3.0 × £0.17 = £680/year. Tuned to SCOP 3.5:
        12,000 ÷ 3.5 × £0.17 = £583/year. Saving: ~£100/year
        from a control setting tweak.
      </p>

      <h2>Scaling to other house sizes</h2>
      <p>
        Rule of thumb for heat demand by house type in UK 2026:
      </p>
      <ul>
        <li><strong>1-bed flat (well-insulated):</strong> 4,000-6,000 kWh/year</li>
        <li><strong>2-bed terrace:</strong> 8,000-10,000 kWh/year</li>
        <li><strong>3-bed semi (typical):</strong> 11,000-13,000 kWh/year</li>
        <li><strong>4-bed detached:</strong> 15,000-18,000 kWh/year</li>
        <li><strong>5-bed+ or solid-wall detached:</strong> 20,000+ kWh/year</li>
      </ul>
      <p>
        Multiply your kWh by the SCOP-divided cost figure
        relevant to your tariff. The proportions stay constant —
        a heat pump on Cosy is roughly 80% of the gas cost
        regardless of house size.
      </p>

      <h2>Comparison to oil and LPG</h2>
      <p>
        Heat pumps decisively beat oil and LPG, and the gap
        widens with house size:
      </p>
      <ul>
        <li>
          <strong>Heating oil</strong> at 9p/kWh delivered, 88%
          boiler efficiency: 12,000 ÷ 0.88 × £0.09 =
          £1,227/year. Heat pump on Cosy saves <strong>~£600/year</strong>.
        </li>
        <li>
          <strong>LPG</strong> at 14p/kWh delivered, 88%
          boiler efficiency: 12,000 ÷ 0.88 × £0.14 =
          £1,909/year. Heat pump on Cosy saves <strong>~£1,270/year</strong>.
        </li>
        <li>
          <strong>Electric resistance / panel heaters</strong>{" "}
          at 28p/kWh flat: 12,000 × £0.28 = £3,360/year. Heat
          pump on Cosy saves <strong>~£2,720/year</strong>.
        </li>
      </ul>
      <p>
        Off-gas-grid properties have the strongest running-cost
        case for switching, which is why DESNZ statistics show
        heat pump uptake accelerating fastest in rural areas.
      </p>

      <h2>What this means for payback</h2>
      <p>
        See the dedicated <a href="/guides/heat-pump-payback-period-uk">payback period guide</a>{" "}
        for the full IRR calculation. Short version: a £7,500
        BUS grant cuts net install cost to ~£6,000–£8,000.
        Running-cost savings of £200–£500/year vs gas put
        payback at 12-25 years on gas, 5-10 years on oil, 3-7
        years on LPG.
      </p>

      <h2>The summary</h2>
      <p>
        The headline &ldquo;is a heat pump cheaper than gas?&rdquo;{" "}
        is the wrong question — it depends on tariff,
        insulation, and tuning. A heat pump on a smart tariff,
        with weather compensation enabled, in a home with loft
        and cavity insulation cleared, is reliably 15-30%
        cheaper than gas. The same heat pump on a flat-rate
        tariff in an uninsulated home is 10-20% more expensive
        than gas. The system design choices determine which
        side of break-even you land. Oil and LPG comparisons
        are unambiguous: heat pumps beat both in every realistic
        configuration.
      </p>
    </AEOPage>
  );
}
