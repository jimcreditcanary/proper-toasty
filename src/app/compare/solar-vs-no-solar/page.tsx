// /compare/solar-vs-no-solar — comparison page for the decision
// "should I install solar PV at all".

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL = "https://www.propertoasty.com/compare/solar-vs-no-solar";

export const metadata: Metadata = {
  title: "Solar panels vs no solar 2026: UK payback + lifetime maths",
  description:
    "Head-to-head: 20-year cashflow of installing rooftop solar vs sticking with grid-only electricity. Worked through for a typical UK home.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Solar panels vs no solar 2026: UK payback + lifetime maths",
    description:
      "20-year cashflow of installing rooftop solar vs sticking with grid-only. Worked through with 2026 numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-solar.jpg", width: 1200, height: 630 }],
  },
};

export default function SolarVsNoSolar() {
  return (
    <AEOPage
      headline="Solar panels vs no solar in 2026: does the cashflow stack up?"
      description="Head-to-head: 20-year cashflow of installing rooftop solar vs sticking with grid-only electricity. Worked through for a typical UK home."
      url={URL}
      image="/hero-solar.jpg"
      datePublished="2026-05-12"
      dateModified="2026-05-12"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Solar PV"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Solar vs no solar" },
      ]}
      directAnswer="A 4 kW UK solar PV install costs £5,000–£7,500 and saves £500–£900 a year on electricity plus Smart Export Guarantee income. Payback in 7–11 years on most south-facing roofs; lifetime saving over 25 years is £8,000–£15,000. Adding a 5 kWh battery roughly doubles self-consumption and shifts payback closer to 9–13 years."
      tldr={[
        "Typical install: £5,000–£7,500 for a 4 kW system without battery.",
        "Annual save + earn: £500–£900 combined (offset + SEG export income).",
        "Payback: 7–11 years on south-facing UK roof; longer on east/west.",
        "Lifetime net: £8,000–£15,000 ahead vs not installing.",
        "Battery doubles self-consumption; pushes payback to 9–13 years.",
      ]}
      faqs={[
        {
          question: "Are solar panels worth it in the UK in 2026?",
          answer:
            "Yes, for most south or south-west facing roofs with limited shading. A 4 kW system pays back in 7–11 years and continues delivering free electricity for 15+ years after that. The maths is tightest for north-facing roofs and heavily shaded properties — those should consider a smaller 2–3 kW system or skip.",
        },
        {
          question: "How much does a 4kW solar system cost in 2026?",
          answer:
            "£5,000–£7,500 installed for a panels-only system (10–12 panels, inverter, all DC + AC wiring, scaffolding, DNO sign-off). Adding a 5 kWh battery brings the total to £8,000–£10,500. Adding 10 kWh battery + EV-ready inverter: £11,500–£14,500.",
        },
        {
          question: "What is the Smart Export Guarantee actually worth?",
          answer:
            "The Smart Export Guarantee (SEG) pays you for solar electricity you export to the grid. Rates run from 3p/kWh at the cheapest suppliers to 15p/kWh at Octopus + a few others. A typical 4 kW system exports about 1,700 kWh per year (the half you don't self-consume), so SEG income at 10p/kWh comes to ~£170/year. Picking the right tariff matters as much as picking the right installer.",
        },
      ]}
      sources={[
        {
          name: "Ofgem — Smart Export Guarantee (SEG)",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Solar panels",
          url: "https://energysavingtrust.org.uk/advice/solar-panels/",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer (solar PV)",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Solar PV permitted development",
          url: "https://www.gov.uk/guidance/when-is-permission-required",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="20-year cashflow: install solar vs do nothing (typical UK 3-bed semi, south roof)"
        headers={["", "Install solar (4 kW)", "Do nothing"]}
        rows={[
          ["Upfront cost", "£6,500", "£0"],
          ["Annual electricity bill (before)", "£1,400", "£1,400"],
          ["Annual self-consumption saving", "−£420", "—"],
          ["Annual SEG export income", "+£170", "—"],
          ["Net annual benefit (Year 1)", "£590", "£0"],
          ["Cumulative benefit at Year 10", "£5,900 (paid back at ~Yr 11)", "£0"],
          ["Cumulative benefit at Year 20", "£11,800 net (£18,300 gross − £6,500 cost)", "£0"],
          ["Cumulative benefit at Year 25", "£14,750 net", "£0"],
          ["Carbon avoided (per year)", "~750 kg CO₂", "0"],
          ["House resale uplift (estate-agent estimate)", "£3,000–£6,000", "£0"],
          ["Maintenance over 25 yrs", "1 inverter swap (~£1,200)", "£0"],
        ]}
        footnote="Benchmarks: 4 kW system, south-facing 35° roof, 50% self-consumption rate, 30p/kWh import rate, 10p/kWh SEG export rate. Real cashflow varies with tariff + roof orientation."
      />

      <h2>The 2026 maths in one paragraph</h2>
      <p>
        A standard 4 kW UK solar PV install (10–12 panels, no battery)
        costs around £6,500 today. A south-facing roof at typical UK
        pitch generates ~3,400 kWh a year. About half of that is used
        directly in the home — offsetting electricity at full retail
        rate (~30p/kWh) — saving roughly £420/year. The other half
        gets exported and paid at the SEG rate (3–15p/kWh; ~10p
        midpoint) — earning about £170/year. Total Year-1 net benefit:
        £590. The system pays for itself in ~11 years and earns
        £14,750 net over its 25-year lifespan. Year 26 onward it&rsquo;s
        free electricity.
      </p>

      <h2>The &ldquo;do nothing&rdquo; baseline</h2>
      <p>
        Doing nothing means paying full retail electricity rates for
        every kWh used, for the next 25 years, with rates likely to
        rise (UK retail electricity has compounded at ~6%/year since
        2015 in nominal terms). A house using 3,800 kWh of electricity
        per year at 30p/kWh spends £1,140/year today. Over 25 years
        with 4% real inflation that&rsquo;s £47,500 in real terms. Even
        partial offset from solar materially shifts that envelope.
      </p>

      <h2>When solar doesn&rsquo;t pay back</h2>
      <p>
        Three configurations push payback past 15 years and may not
        be worth it:
      </p>
      <ul>
        <li>
          <strong>Pure north-facing roof</strong> — output drops 30–40%
          vs south. Payback pushes to 14–18 years. Look at the south
          face of an outbuilding or a ground-mount option instead.
        </li>
        <li>
          <strong>Heavy shading from neighbours / trees</strong> for
          more than 4 hours per day during peak generation (10am–4pm).
          Microinverters or DC optimisers can partially compensate
          but add £800–£1,500 to the install.
        </li>
        <li>
          <strong>Properties you plan to leave within 7 years.</strong>{" "}
          The system holds resale value (estate agents quote
          £3,000–£6,000 uplift) but doesn&rsquo;t pay back the full
          install before you exit. Make the decision deliberate.
        </li>
      </ul>

      <h2>Does adding a battery change the answer?</h2>
      <p>
        A 5 kWh battery costs £2,500–£4,000 installed (additional to
        panels). It shifts your self-consumption ratio from 50% to
        about 80% — most of your evening usage comes from the battery
        rather than the grid. Annual benefit lifts by ~£150–£250 from
        higher self-consumption + lower export. So a £3,000 battery
        adds maybe £200/year of value — 15-year payback on the battery
        alone, dragging the system&rsquo;s overall payback from 11 to
        13 years.
      </p>
      <p>
        Worth doing if: you spend &gt;£1,500/year on electricity, have
        a heat pump or EV (high evening + winter draw), or value
        resilience against grid outages. Skip if: you&rsquo;re on a
        tight budget — get panels first, add a battery later when
        prices drop further (battery prices have fallen 25% since
        2023).
      </p>

      <h2>The SEG tariff matters more than people realise</h2>
      <p>
        SEG rates vary 5× between UK suppliers. At 3p/kWh
        (minimum-compliance suppliers) a 4 kW system earns £50/year on
        export. At 15p/kWh (Octopus + a few competitors) the same
        system earns £255/year. That&rsquo;s £200/year of difference
        for a 30-second tariff-switch decision. Worth re-evaluating
        every year — SEG rates compete for your business in a way
        that the old Feed-in-Tariff regime didn&rsquo;t.
      </p>

      <h2>Bottom line</h2>
      <p>
        For most UK homeowners with a south-or-near-south facing roof
        and limited shading, 2026 is a &ldquo;yes&rdquo; on solar — the payback
        is faster than UK fixed-term savings rates can match, and
        the carbon and resale upside come free. The pre-survey check
        at <a href="/check">propertoasty.com/check</a> uses the
        Google Solar API&rsquo;s roof segmentation to give a
        property-specific answer: panel count, expected kWh/yr,
        payback in years.
      </p>
    </AEOPage>
  );
}
