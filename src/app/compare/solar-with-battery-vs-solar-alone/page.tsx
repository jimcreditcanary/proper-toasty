// /compare/solar-with-battery-vs-solar-alone — head-term comparison.
//
// The "should I add a battery to my solar install" question is the
// highest-commercial-intent search in the UK solar segment. Most
// solar buyers in 2026 face this exact decision because installers
// routinely quote both options + the price gap is meaningful (~£3-
// £5k for a 5 kWh battery). Search results are dominated by
// installer-affiliate content; an editorial comparison page that
// surfaces the actual cashflow numbers + the times-of-day logic
// fills a genuine gap.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/solar-with-battery-vs-solar-alone";

export const metadata: Metadata = {
  title: "Solar + battery vs solar alone in 2026: when adding a battery pays back",
  description:
    "Adding a 5–10 kWh battery to a UK solar install costs £3,500–£6,500. Worked through with self-consumption numbers, SEG tariffs and 20-year cashflow.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Solar + battery vs solar alone in 2026: when adding a battery pays back",
    description:
      "When the battery pays back, when it doesn't — worked through with 2026 UK numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function SolarWithBatteryVsSolarAlone() {
  return (
    <AEOPage
      headline="Solar + battery vs solar alone in 2026: when adding a battery actually pays back"
      description="Adding a 5–10 kWh battery to a UK solar install costs £3,500–£6,500. Worked through with self-consumption numbers, SEG tariffs and 20-year cashflow."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Solar"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Solar + battery vs solar alone" },
      ]}
      directAnswer="Adding a 5–10 kWh battery to a UK solar install costs £3,500–£6,500 extra. It pays back over 9–14 years on most homes by storing midday solar generation for evening use instead of exporting at 5–15p/kWh and re-buying at 25–35p/kWh. Battery pays back fastest on homes with high evening electricity use, a heat pump, or an EV; least well on homes that are out all day and use most electricity overnight."
      tldr={[
        "Battery cost: £3,500–£6,500 for 5–10 kWh capacity, on top of the solar install.",
        "Self-consumption: solar-only ~30–40%; solar + battery 60–80%.",
        "Pays back fastest on homes with heat pump, EV, or high-evening consumption.",
        "Pays back slowest on homes out all day with overnight Economy 7 use.",
        "Smart Export Guarantee (SEG) tariff selection still matters — 3p–15p/kWh spread.",
      ]}
      faqs={[
        {
          question:
            "Why doesn't the battery just pay back on the export-vs-buy spread?",
          answer:
            "It does, but the spread isn't as large as it looks. Standard SEG tariffs are 5–15p/kWh export; standard import tariffs are 25–35p/kWh. That's a 10–30p/kWh spread per stored kWh. A 5 kWh battery cycled once daily stores ~1,800 kWh/year, so the maximum theoretical saving is £180–£540/year. Real savings come in at 70–85% of theoretical (battery round-trip efficiency, partial cycling, summer surplus that exceeds battery capacity). Payback on a £4,500 battery investment lands at 9–14 years on most UK homes.",
        },
        {
          question: "How big a battery should I get?",
          answer:
            "Match it to your evening consumption pattern. A typical UK 3-bed home uses 4–6 kWh between 5pm and 11pm — a 5 kWh battery covers most evenings and is the sweet spot for payback. Homes with a heat pump add ~5–10 kWh of evening/overnight load in winter, which justifies 10 kWh capacity. Homes with an EV charged overnight don't benefit from extra battery capacity unless they also have V2G capability; the EV battery itself acts as storage.",
        },
        {
          question: "Does the BUS grant or any UK subsidy cover batteries?",
          answer:
            "No. The Boiler Upgrade Scheme covers heat pumps only, not batteries or solar. There's no current UK government grant specifically for residential batteries. Some regional schemes (Welsh Government Nest, certain council-led initiatives) offer means-tested support for solar + battery; these change frequently and have small caps. Most UK households pay the full battery cost upfront.",
        },
        {
          question:
            "I'm on Octopus Cosy / a smart tariff already — does that change the maths?",
          answer:
            "Yes, materially. Smart tariffs price overnight electricity at 7–18p/kWh during cheap windows. With a battery you can charge from the grid at the cheap rate AND store midday solar, so the battery cycles more than once daily. That doubles the annual storage throughput and roughly halves the payback period — 5–8 years rather than 9–14 — for homes that can take advantage of both arbitrage opportunities.",
        },
      ]}
      sources={[
        {
          name: "Ofgem — Smart Export Guarantee",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Solar batteries",
          url: "https://energysavingtrust.org.uk/advice/solar-panels/solar-batteries/",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Domestic energy prices (quarterly)",
          url: "https://www.gov.uk/government/collections/domestic-energy-prices",
          accessedDate: "May 2026",
        },
        {
          name: "PVGIS — Photovoltaic Geographical Information System",
          url: "https://re.jrc.ec.europa.eu/pvg_tools/en/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="Solar + battery vs solar alone — typical UK numbers in 2026"
        headers={["", "Solar alone (4 kW)", "Solar + 5 kWh battery", "Solar + 10 kWh battery"]}
        rows={[
          ["Install cost", "£5,000–£7,500", "£8,500–£12,500", "£11,500–£16,500"],
          ["Annual generation", "3,500–4,200 kWh", "3,500–4,200 kWh", "3,500–4,200 kWh"],
          ["Self-consumption ratio", "30–40%", "60–75%", "70–85%"],
          ["Exported to grid", "60–70%", "25–40%", "15–30%"],
          ["Annual SEG income", "£100–£300", "£60–£200", "£30–£150"],
          ["Annual bill saving", "£400–£700", "£700–£1,100", "£850–£1,300"],
          ["Total annual benefit", "£500–£900", "£800–£1,250", "£900–£1,400"],
          ["Payback period", "7–11 years", "9–13 years", "11–14 years"],
          ["20-year net benefit", "£8,000–£15,000", "£10,000–£18,000", "£11,000–£20,000"],
          ["Smart-tariff arbitrage?", "No", "Yes", "Yes"],
          ["Power-cut backup?", "No", "Some inverters", "Most inverters"],
        ]}
        footnote="Ranges are typical for a 3-bed UK semi with a south or east/west facing roof. Specific numbers depend on roof orientation, shading, household consumption pattern, and SEG tariff choice."
      />

      <h2>The self-consumption story</h2>
      <p>
        A 4 kW UK solar install generates 3,500–4,200 kWh per year,
        most of it between 10am and 4pm. The problem: typical UK
        homes use most of their electricity between 5pm and 11pm
        (cooking, lighting, TV, hot water heating). Solar without a
        battery only directly serves 30–40% of generation —
        what&rsquo;s used by the fridge, daytime occupants,
        always-on devices. The remaining 60–70% gets exported to the
        grid at the SEG tariff rate (3–15p/kWh depending on
        supplier) and the household re-buys electricity in the
        evening at the import tariff rate (25–35p/kWh).
      </p>
      <p>
        Adding a 5 kWh battery flips this. Midday surplus charges
        the battery; evening demand draws from it. Self-consumption
        rises to 60–75%, exports fall, evening grid purchases
        roughly halve. On a 10 kWh battery, self-consumption can
        reach 80%+ but the incremental gain over 5 kWh is small
        unless you have a heat pump or EV adding evening load.
      </p>

      <h2>The cashflow maths</h2>
      <p>
        At 2026 UK prices, the economics for a typical 3-bed semi
        with a 4 kW solar install (no smart tariff):
      </p>
      <ul>
        <li>
          <strong>Solar alone:</strong> £6,000 install. Self-consumption
          1,200 kWh/year × ~30p saved = £360. Export 2,500 kWh/year
          × 10p SEG = £250. Total benefit £610/year. Payback ~10
          years; 20-year net £6,200.
        </li>
        <li>
          <strong>Solar + 5 kWh battery:</strong> £10,000 install.
          Self-consumption 2,500 kWh/year × ~30p = £750. Export
          1,200 kWh × 10p = £120. Total £870/year. Payback ~11.5
          years; 20-year net £7,400.
        </li>
        <li>
          <strong>Solar + 10 kWh battery:</strong> £14,000 install.
          Self-consumption 2,800 kWh × ~30p = £840. Export 900 kWh ×
          10p = £90. Total £930/year. Payback ~15 years; 20-year
          net £4,600.
        </li>
      </ul>
      <p>
        The 5 kWh battery is usually the sweet spot. Adding the
        second 5 kWh ladders the install cost up by £3,500–£4,000
        but only adds ~£60/year of benefit — marginal saving at the
        upper end of capacity. Exception: homes with a heat pump
        AND an EV may justify 10 kWh because the evening / overnight
        load is genuinely 8–12 kWh/day.
      </p>

      <h2>When the battery pays back fastest</h2>
      <p>
        Three home profiles where the battery payback shortens to
        5–9 years:
      </p>
      <ul>
        <li>
          <strong>Heat pump in the home.</strong> Heat pumps add
          ~10–15 kWh/day of electricity demand in winter, concentrated
          in evening and overnight hours. A battery storing midday
          solar generation directly offsets this load at the highest
          import rate of the day. Saving widens to £150–£300/year
          on top of the headline number.
        </li>
        <li>
          <strong>Smart tariff arbitrage (Octopus Cosy + similar).</strong>{" "}
          Cheap-rate overnight electricity (7–18p/kWh) lets the battery
          cycle twice per day — once on solar surplus in the day,
          once on cheap-rate import overnight. Annual throughput
          doubles, payback halves to 5–8 years on a 5 kWh battery.
        </li>
        <li>
          <strong>High-evening-consumption households.</strong>{" "}
          Families with school-age kids, gaming/streaming setups,
          or work-from-home households with heavy evening computing
          benefit more than averages assume. Self-consumption can
          hit 75–85% on a 5 kWh battery alone.
        </li>
      </ul>

      <h2>When the battery doesn&rsquo;t pay back well</h2>
      <ul>
        <li>
          <strong>Out-all-day households on Economy 7.</strong> If
          the home is empty 7am–6pm and most consumption is overnight
          via Economy 7, the battery has limited daytime demand to
          cycle against and the cheap-rate overnight already removes
          most arbitrage. Payback stretches to 15+ years.
        </li>
        <li>
          <strong>Excellent SEG tariff.</strong> A few UK suppliers
          offer SEG export rates of 13–15p/kWh. At that level, the
          benefit of exporting vs storing narrows substantially.
          Solar-only is sometimes the better economic call on those
          tariffs.
        </li>
        <li>
          <strong>Planning to move within 7 years.</strong> Property
          listings price in solar but only weakly price batteries.
          The £4–£6k battery investment is hard to recover in resale
          if you move before payback.
        </li>
      </ul>

      <h2>Smart-tariff arbitrage — the underappreciated kicker</h2>
      <p>
        The big shift in 2026 economics is that batteries pair with
        smart tariffs in a way solar-only doesn&rsquo;t. Octopus
        Cosy, Octopus Agile, EDF GoElectric and similar tariffs
        price electricity at 7–18p/kWh during off-peak windows and
        25–35p during peak. A battery owner can grid-charge cheaply
        AND store solar — two arbitrage opportunities daily. On
        Cosy specifically, the typical saving is £200–£400/year
        beyond the solar-only baseline. This is what shortens
        battery payback from &ldquo;11 years standalone&rdquo; to
        &ldquo;6–8 years on a smart tariff&rdquo;.
      </p>

      <h2>Power-cut backup — a real but secondary feature</h2>
      <p>
        Some inverter + battery combos can island during a grid
        outage, powering essential circuits (fridge, router, a few
        lights). This is a UPS-grade feature, not full home backup —
        the heat pump, kettle and electric shower typically aren&rsquo;t
        on the backed-up circuit. UK grid outages are rare enough
        (~50 minutes per customer per year on average) that this
        shouldn&rsquo;t be the primary purchase driver, but for
        rural homes with longer typical outages it shifts the
        decision.
      </p>

      <h2>What to ask your installer</h2>
      <ol>
        <li>
          <strong>What&rsquo;s the projected self-consumption for
          MY consumption pattern?</strong> Good installers will ask
          for half-hourly smart-meter data and model the actual
          fit. Bad ones quote 70% self-consumption as a default
          for everyone.
        </li>
        <li>
          <strong>Which SEG tariff are you assuming?</strong> The
          payback maths is highly tariff-dependent. The installer
          should show working at 5p, 10p and 15p export rates.
        </li>
        <li>
          <strong>What&rsquo;s the battery&rsquo;s warranty period
          and cycle limit?</strong> 10-year warranties are standard
          in 2026; <strong>look for ≥6,000 cycles</strong> as that
          comfortably exceeds 20 years of daily cycling. Avoid
          batteries with 3,000-cycle warranties — they degrade
          before payback completes.
        </li>
        <li>
          <strong>Is the inverter sized for future heat-pump or EV
          load?</strong> A 5 kW hybrid inverter is the floor; 8 kW
          is sensible if you plan to add a heat pump or charge an
          EV from solar.
        </li>
      </ol>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to get the solar roof fit + indicative system size for
          your property.
        </li>
        <li>
          Get 2–3 quotes for both options (solar-only AND solar +
          battery) from MCS-certified installers. Compare the
          payback assumptions, not just the headline cost.
        </li>
        <li>
          Check your half-hourly smart-meter usage data before
          deciding. The battery&rsquo;s value is entirely about
          when you use electricity vs when solar generates;
          modelling this against your actual data is worth more
          than installer averages.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        For most UK homes, a 5 kWh battery alongside a 4 kW solar
        install pays back in 9–13 years on standard tariffs and 5–8
        years on smart tariffs. The single biggest payback
        accelerator is a heat pump or EV that adds evening /
        overnight electrical load. The single biggest payback drag
        is an out-all-day Economy 7 household where overnight
        cheap-rate already does the arbitrage the battery would
        otherwise capture. Sizing matters: 5 kWh is the sweet spot
        for most homes, 10 kWh only justifies the extra cost if
        you&rsquo;ve also got heat pump + EV evening load.
      </p>
    </AEOPage>
  );
}
