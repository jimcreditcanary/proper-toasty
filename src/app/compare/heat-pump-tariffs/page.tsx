// /compare/heat-pump-tariffs — head-term tariff comparison.
//
// Different content type from the brand or fuel-type pages. UK
// heat-pump electricity tariffs (Octopus Cosy, British Gas Heat
// Pump Plus, EDF GoElectric, E.ON Next Heat Pump) are a major
// running-cost lever — typically £200-£400/year saving over
// standard variable for a heat-pump household — but the specific
// rates change every quarter or two, so the page is intentionally
// framed around the SHAPE of the tariffs (cheap windows, eligibility,
// trade-offs) rather than specific p/kWh figures that go stale.
//
// Refresh cadence target: quarterly. Headline rates flagged with
// "as of [date]" and "verify current rates with supplier".

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/compare/heat-pump-tariffs";

export const metadata: Metadata = {
  title: "Heat pump electricity tariffs UK 2026: Octopus Cosy vs British Gas vs EDF",
  description:
    "Heat-pump-specific tariffs save £200–£400/year on running costs. Compare Octopus Cosy, British Gas Heat Pump Plus, EDF GoElectric and E.ON Next Heat Pump in 2026.",
  alternates: { canonical: URL },
  openGraph: {
    title:
      "Heat pump electricity tariffs UK 2026: Octopus Cosy vs British Gas vs EDF",
    description:
      "Compare heat-pump-specific UK tariffs in 2026 — cheap-rate windows, eligibility, savings.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpTariffs() {
  return (
    <AEOPage
      headline="Heat pump electricity tariffs in 2026: which UK supplier saves you most?"
      description="Heat-pump-specific tariffs save £200–£400/year on running costs. Compare Octopus Cosy, British Gas Heat Pump Plus, EDF GoElectric and E.ON Next Heat Pump in 2026."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Tariff"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Heat pump tariffs" },
      ]}
      directAnswer="Heat-pump-specific UK electricity tariffs price your heat-pump-driven electricity at 13–18p/kWh during designated cheap-rate windows (typically 4–7 hours overnight + sometimes daytime), vs 25–35p/kWh on standard variable. For a typical UK heat-pump home using 3,400–4,500 kWh/year, the saving is £200–£400 annually. As of May 2026, Octopus Cosy, British Gas Heat Pump Plus, EDF GoElectric and E.ON Next Heat Pump are the four major options. Specific rates change quarterly — verify current pricing with the supplier before switching."
      tldr={[
        "Heat-pump tariffs offer cheap-rate windows (13–18p/kWh) for heat-pump electricity use.",
        "Saving vs standard variable: £200–£400/year on a typical UK heat-pump household.",
        "Four major UK options in 2026: Octopus Cosy, British Gas Heat Pump Plus, EDF GoElectric, E.ON Next Heat Pump.",
        "Eligibility usually requires an MCS-certified heat pump installed on the property.",
        "Rates change quarterly — verify current pricing at point of switch.",
      ]}
      faqs={[
        {
          question:
            "Why is a heat-pump tariff cheaper than standard variable?",
          answer:
            "Suppliers offering heat-pump tariffs are buying electricity at off-peak grid wholesale rates (overnight and shoulder periods) and passing the saving to households that can shift load to those windows. Heat pumps are uniquely suited to load-shifting because their thermal output is decoupled from instant demand by the building's thermal mass and the hot-water cylinder. The supplier benefits from predictable grid-managed load; the household benefits from cheaper electricity. It's grid-services economics, not a marketing gimmick.",
        },
        {
          question:
            "Do I need a smart meter to be on a heat-pump tariff?",
          answer:
            "Yes — all four major UK heat-pump tariffs require a SMETS2 smart meter (or SMETS1 enrolled in DCC) so the supplier can measure half-hourly usage and apply time-of-use pricing. Most UK households already have one (~85% smart-meter coverage as of 2026); if you don't, your current supplier or the new tariff's supplier will arrange installation as part of the switch. No homeowner cost — smart meters are paid for through standing charges across the supply base.",
        },
        {
          question:
            "Will my heat pump have to change to be eligible?",
          answer:
            "Usually no. Eligibility typically requires an MCS-certified heat pump on the property, which most BUS-funded installs are by definition. Some tariffs add a requirement that the heat pump is controllable via a smart-home protocol (so the supplier can optionally shift its operating window during peak grid events) — Octopus Cosy in particular benefits from this. Check the specific tariff's eligibility section; in 2026 most well-installed UK heat pumps meet the requirements without modification.",
        },
        {
          question:
            "What happens to my hot water tariff if I switch to a heat-pump tariff?",
          answer:
            "Your hot water cylinder is heated by the heat pump (via the cylinder coil) on the same tariff as the heat pump itself. Most cylinders also have an electric immersion element as backup; that immersion runs on whatever tariff your electricity supply is on. A heat-pump tariff applied to your whole supply covers both heat pump AND immersion at the cheaper cheap-rate window pricing. There's no separate hot-water tariff — the tariff applies to the entire household electricity supply.",
        },
      ]}
      sources={[
        {
          name: "Octopus Energy — Cosy tariff",
          url: "https://octopus.energy/smart/cosy-octopus/",
          accessedDate: "May 2026",
        },
        {
          name: "British Gas — Heat Pump Plus tariff",
          url: "https://www.britishgas.co.uk/energy/tariffs.html",
          accessedDate: "May 2026",
        },
        {
          name: "EDF Energy — GoElectric heat-pump tariff",
          url: "https://www.edfenergy.com/electric-cars/tariffs",
          accessedDate: "May 2026",
        },
        {
          name: "E.ON Next — Heat Pump tariff",
          url: "https://www.eonnext.com/tariffs",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Energy price cap + smart tariffs guidance",
          url: "https://www.ofgem.gov.uk/energy-policy-and-regulation/policy-and-regulatory-programmes/price-cap",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="UK heat-pump electricity tariffs — typical 2026 shape (verify current rates with supplier)"
        headers={[
          "",
          "Octopus Cosy",
          "British Gas Heat Pump Plus",
          "EDF GoElectric",
          "E.ON Next Heat Pump",
        ]}
        rows={[
          ["Cheap-rate window length", "6 hours daily (split blocks)", "5 hours overnight", "5 hours overnight + 2 hr midday", "5 hours overnight"],
          ["Cheap-rate price range (2026)", "12–15p/kWh", "13–17p/kWh", "13–16p/kWh", "14–18p/kWh"],
          ["Standard rate range (2026)", "27–32p/kWh", "25–30p/kWh", "26–31p/kWh", "26–32p/kWh"],
          ["Eligibility", "MCS heat pump + SMETS2 meter", "MCS heat pump + smart meter", "MCS heat pump + smart meter", "MCS heat pump + smart meter"],
          ["Standing charge (typical)", "~52–58p/day", "~50–55p/day", "~50–55p/day", "~52–58p/day"],
          ["Multi-rate within day?", "Yes — 4 split windows", "Single block", "Two blocks", "Single block"],
          ["Best-case annual saving vs standard variable", "£300–£500", "£250–£400", "£250–£400", "£200–£350"],
          ["Smart-control integration", "Yes (Octopus app + APIs)", "Limited (account-only)", "Limited (account-only)", "Limited (account-only)"],
          ["Exit fees", "None (rolling)", "Varies by term", "Varies by term", "Varies by term"],
          ["Best fit", "Households with daytime occupancy + smart-home tooling", "Single-rate simplicity", "Multi-rate via daytime midday block", "Customers already on E.ON dual-fuel"],
        ]}
        footnote="Rates and windows shown are typical 2026 ranges. Heat-pump tariffs are repriced quarterly by Ofgem cap revisions + supplier strategy shifts. Verify current rates directly with the supplier before switching."
      />

      <h2>How heat-pump tariffs save money</h2>
      <p>
        A typical UK heat-pump household uses 3,400–4,500 kWh of
        electricity per year on the heat-pump system (the rest of
        the household&rsquo;s electricity is 2,000–3,500 kWh). On
        standard variable at 28p/kWh average, the heat-pump portion
        costs ~£1,100. On a heat-pump tariff with most of that
        load shifted to a 14p/kWh cheap-rate window, the same
        electricity costs ~£550 — a £550/year saving. Real-world
        savings are typically smaller because not all heat-pump
        load can be shifted (cold-morning operation, hot-water
        recharge during day occupancy) — the realistic saving
        lands at £200–£400/year on a well-configured system.
      </p>
      <p>
        The cheap-rate window is the key variable. Octopus
        Cosy&rsquo;s 6-hour-per-day allocation (split across 4
        blocks: overnight, mid-morning, lunchtime, late evening)
        captures heat-pump load most flexibly. Single-block
        overnight tariffs (British Gas, E.ON Next) work best for
        households that pre-heat overnight and coast through the
        day. Multi-block tariffs with a daytime window (EDF
        GoElectric) suit households with daytime occupancy.
      </p>

      <h2>Eligibility — what you need to qualify</h2>
      <p>
        All four major UK heat-pump tariffs share the same core
        requirements:
      </p>
      <ul>
        <li>
          <strong>MCS-certified heat pump on the property.</strong>{" "}
          Confirmed via your installer&rsquo;s MCS certificate
          number. BUS-funded installs are MCS-certified by
          definition.
        </li>
        <li>
          <strong>SMETS2 smart meter (or SMETS1 enrolled in DCC).</strong>{" "}
          For half-hourly meter readings. Most UK households have
          one; if you don&rsquo;t, the new supplier arranges
          installation as part of the switch.
        </li>
        <li>
          <strong>Active heat-pump usage.</strong> A few suppliers
          will check actual heat-pump electricity usage within the
          first few months and may move you off the tariff if the
          load profile doesn&rsquo;t look like a heat-pump
          household. Practical implication: don&rsquo;t switch to a
          heat-pump tariff if your heat pump isn&rsquo;t actually
          running yet.
        </li>
      </ul>

      <h2>How the tariffs really differ</h2>
      <ul>
        <li>
          <strong>Octopus Cosy — multi-block flexibility.</strong>{" "}
          The 6-hour-per-day allocation split across 4 windows
          (early hours, mid-morning, lunch, late evening) lines up
          with how heat pumps actually consume electricity in
          practice. Combined with Octopus&rsquo;s smart-home API
          (Tado, Home Assistant integrations), homeowners who tune
          their heat-pump schedule typically extract the largest
          saving. Drawback: the multi-block schedule means actively
          managing operating hours is more important than for
          single-block tariffs.
        </li>
        <li>
          <strong>British Gas Heat Pump Plus — single-block
          simplicity.</strong> One 5-hour cheap window overnight,
          covers most heat-pump pre-heat + cylinder recharge.
          Saving is slightly smaller than Cosy&rsquo;s upper bound
          but the operating model is &ldquo;set and forget&rdquo;
          — your heat-pump scheduling defaults to overnight pre-
          heat anyway. Good fit for households without smart-home
          tooling.
        </li>
        <li>
          <strong>EDF GoElectric — overnight + daytime midday.</strong>{" "}
          5 hours overnight + 2 hours midday. The midday block is
          useful for households with daytime occupancy (work from
          home, retirees) who can use the cheap-rate window to
          run washing machines, dishwashers etc. alongside the
          heat pump. Slightly smaller cheap-rate window than
          Cosy, larger than the single-overnight tariffs.
        </li>
        <li>
          <strong>E.ON Next Heat Pump — dual-fuel customer
          option.</strong> Most useful for existing E.ON customers
          who want to keep their supplier relationship + add a
          heat-pump-specific tariff for the electricity portion.
          Standalone, the pricing is broadly competitive but
          rarely the cheapest of the four.
        </li>
      </ul>

      <h2>Standing charges matter — sometimes more than rates</h2>
      <p>
        Heat-pump tariffs typically come with slightly higher
        standing charges than standard variable (~52–58p/day vs
        ~48–52p/day on standard variable). The reason: time-of-use
        tariffs require smart-meter infrastructure + grid-services
        operational overhead that the supplier recovers through
        the daily charge. For a heat-pump household using
        ~6,000–8,000 kWh/year, the standing charge difference is
        £15–£35/year — small relative to the £200–£400 unit-rate
        saving. For low-usage households, it&rsquo;s worth checking.
      </p>

      <h2>Switching — practical steps</h2>
      <ol>
        <li>
          <strong>Wait until your heat pump is commissioned and
          running.</strong> Suppliers may check load profile in the
          first 3 months; switching before the heat pump runs
          gives no benefit anyway.
        </li>
        <li>
          <strong>Run the comparison on YOUR actual heat-pump load
          shape.</strong> Use your smart-meter half-hourly data
          (available through your current supplier&rsquo;s app or
          via Octopus Watch / similar tools) to model each
          tariff&rsquo;s saving against your real usage.
        </li>
        <li>
          <strong>Switch via the supplier&rsquo;s website
          directly,</strong> not a price-comparison site —
          heat-pump tariffs often don&rsquo;t appear correctly on
          comparison platforms due to the specific eligibility
          criteria.
        </li>
        <li>
          <strong>Configure your heat pump&rsquo;s schedule to
          match the cheap-rate windows.</strong> Most modern
          heat-pump controllers support time-of-use scheduling
          natively — set overnight pre-heat to align with the
          tariff&rsquo;s cheap window.
        </li>
      </ol>

      <h2>Pitfalls to watch for</h2>
      <ul>
        <li>
          <strong>Standard variable as fallback.</strong> Some
          tariffs default you to standard variable if your
          heat-pump load profile doesn&rsquo;t meet supplier
          thresholds. Read the small print on what happens to
          your tariff after the 6-month + annual review windows.
        </li>
        <li>
          <strong>Exit fees on fixed-term variants.</strong> Most
          heat-pump tariffs are rolling (no exit fee), but some
          fixed 12-month or 24-month variants exist with £50–£150
          exit fees. Check before signing.
        </li>
        <li>
          <strong>Hot-water immersion peak-rate use.</strong> If
          your hot water cylinder boosts via electric immersion
          during peak hours (rather than the heat-pump coil
          during cheap-rate windows), you can quickly erase the
          tariff saving. Configure your cylinder to use the
          heat-pump coil primarily.
        </li>
      </ul>

      <h2>What to ask your installer at commissioning</h2>
      <ol>
        <li>
          Can the heat-pump controller schedule operation around a
          time-of-use tariff&rsquo;s cheap windows?
        </li>
        <li>
          How do I configure the hot-water cylinder to favour
          heat-pump heating over immersion during peak hours?
        </li>
        <li>
          Do you have any tariff-supplier partnerships or
          recommendations based on customers in my area?
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Heat-pump-specific tariffs are typically £200–£400/year
        cheaper than standard variable for UK heat-pump
        households. Octopus Cosy currently delivers the largest
        potential saving for households able to tune their
        schedule across multiple cheap-rate windows. British Gas
        Heat Pump Plus is the simplest set-and-forget option.
        EDF GoElectric suits daytime-occupancy households. E.ON
        Next Heat Pump suits existing E.ON dual-fuel customers.
        All four require an MCS-certified heat pump + smart
        meter. Rates change quarterly — verify current pricing
        with the supplier before switching.
      </p>
    </AEOPage>
  );
}
