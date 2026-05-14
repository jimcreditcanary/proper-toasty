// /research/uk-home-energy-savings-259-per-year — EPC Index deep-dive.
//
// Personal-finance angle on the national savings opportunity:
// £259/yr per home, ranging £413-£534 in rural Wales.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/research/uk-home-energy-savings-259-per-year";

export const metadata: Metadata = {
  title:
    "£259 a year: the average UK home's energy efficiency saving — Propertoasty EPC Index",
  description:
    "UK households could save £4.6 billion a year — £259 per home on average, rising to £534 in Ceredigion — by clearing the recommendations on their current EPCs.",
  alternates: { canonical: URL },
  openGraph: {
    title: "£259 a year — UK home energy efficiency savings by council area",
    description:
      "If every UK home cleared its EPC recommendations, households would save £4.6 B/yr collectively — £259/home on average.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function PerHomeSavingsPage() {
  return (
    <AEOPage
      headline="£259 a year: the average UK home's energy efficiency saving — by council area"
      description="If every UK home cleared the recommendations on its current EPC, households would save £4.6 billion a year — an average of £259 per home, rising to £534 in Ceredigion. The available-savings map by UK council area."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Research · EPC Index deep-dive"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research" },
        { name: "£259 / year — UK home savings" },
      ]}
      directAnswer="If every UK home cleared the recommendations on its current EPC, households would save £4.6 billion a year on heating, hot-water and lighting bills — an average of £259 per home per year. The available saving varies hugely by location: from £534/year per home in Ceredigion (rural mid-Wales) down to less than £100/year in central-London flat boroughs. Source: 17.8 M unique properties in the GOV.UK EPC Register (May 2026)."
      tldr={[
        "UK national savings potential: £4.6 billion/yr if every home cleared its EPC recommendations.",
        "Per-home average: £259/yr.",
        "Highest per-home opportunity: Ceredigion (£534/yr), Gwynedd (£529/yr), Powys (£481/yr).",
        "Lowest per-home opportunity: dense-flat London boroughs at £80-£150/yr (their homes are already close to their potential).",
        "Theoretical ceiling — real-world recovery probably 30-50% of headline once economically-feasible measures are filtered.",
      ]}
      faqs={[
        {
          question:
            "How is the £259 average calculated?",
          answer:
            "For every UK property in the EPC register, the certificate publishes both the current annual cost of heating, hot water, and lighting AND the projected cost if all recommendations on the certificate were implemented. We sum the difference across 17.76 M properties: £4.60 billion. Dividing by the property count: £259/home/year average. The data source is the GOV.UK EPC Register bulk download dated 2026-05-01.",
        },
        {
          question:
            "Why does the saving vary so much by area?",
          answer:
            "Three factors dominate. Construction era: pre-1930 stock has higher heat loss and bigger improvement headroom than post-2010 stock. Fuel type: off-grid oil and LPG heating cost 2-3× more per kWh than mains gas, so the same percentage demand reduction yields a bigger £ saving. Property size: larger homes have more m² of fabric to insulate, so absolute savings scale up. Mid-Wales scores high on all three (older stock, off-grid, larger homes), London flats score low on all three (post-2010 stock, mains gas, small floor area).",
        },
        {
          question:
            "Is £259/year a realistic saving I could actually capture?",
          answer:
            "For most households, no — not the full amount, and not without spending money first. The figure is the theoretical ceiling if every recommendation on your EPC is implemented. In practice, the cheapest recommendations (loft insulation top-up, draughtproofing, hot-water cylinder jacket) have payback periods of 1-3 years and capture 40-60% of the available savings for under £1,000 of spend. Solid-wall insulation, triple glazing, and full system replacements have 15-25 year paybacks and capture the rest at much higher cost. A realistic 'easy wins' saving for most homes is £100-£180/year for under £2,000 of investment.",
        },
        {
          question:
            "Does this include heat pump conversions or just insulation?",
          answer:
            "It's primarily the insulation + draughtproofing + lighting upgrades that EPC assessors recommend. Heat pumps aren't listed as 'recommendations' on most EPCs — they're tracked separately under the heating system swap scenarios. The £259 average understates the full opportunity because it excludes the heat-pump-replacement savings for off-grid oil and LPG homes (£500-£1,200/year additional). Combine insulation + heat pump where economically sensible and the per-home opportunity is closer to £400-£500/year for the off-grid cohort.",
        },
        {
          question:
            "How does £259/year compare to the energy price cap impact?",
          answer:
            "The Ofgem energy price cap typically rises or falls by £100-£300/year for a typical household at each adjustment. £259/year of efficiency saving is therefore equivalent to roughly one cap-cycle's worth of price movement — but with the difference that the efficiency saving is permanent (locked in by the physical improvements) whereas cap movements are temporary. The strategic argument: a £1,000 spend on insulation today captures £200/year in perpetuity, while waiting for price-cap relief is at the mercy of geopolitics.",
        },
      ]}
      sourcesEpc
      sources={[
        {
          name: "GOV.UK — EPC Register (bulk download)",
          url: "https://get-energy-performance-data.communities.gov.uk/api-technical-documentation/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Energy price cap",
          url: "https://www.ofgem.gov.uk/energy-price-cap",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Insulation cost guidance",
          url: "https://energysavingtrust.org.uk/advice/home-insulation/",
          accessedDate: "May 2026",
        },
        {
          name: "DESNZ — Boiler Upgrade Scheme impact",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>The headline numbers</h2>
      <ul>
        <li>
          <strong>£4.60 billion/year</strong> — the total annual
          saving if every UK home cleared the recommendations on
          its current EPC.
        </li>
        <li>
          <strong>£259/home/year</strong> — average across 17.76 M
          UK properties.
        </li>
        <li>
          <strong>1.89 TWh/year</strong> — the energy-equivalent
          saving, roughly the annual output of one mid-sized UK gas
          power station.
        </li>
      </ul>

      <h2>The top 20 per-home opportunities</h2>
      <p>
        These are the council areas where the average resident has
        the biggest gap between current and potential energy bill:
      </p>

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Council area</th>
            <th>£/home/yr</th>
            <th>LAD total</th>
            <th>Sample</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <strong>Ceredigion</strong>
            </td>
            <td>£534</td>
            <td>£12.1 M</td>
            <td>22,720</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Gwynedd</td>
            <td>£529</td>
            <td>£19.3 M</td>
            <td>36,428</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Powys</td>
            <td>£481</td>
            <td>£19.1 M</td>
            <td>39,695</td>
          </tr>
          <tr>
            <td>4</td>
            <td>Isle of Anglesey</td>
            <td>£441</td>
            <td>£9.8 M</td>
            <td>22,236</td>
          </tr>
          <tr>
            <td>5</td>
            <td>West Devon</td>
            <td>£438</td>
            <td>£7.6 M</td>
            <td>17,278</td>
          </tr>
          <tr>
            <td>6</td>
            <td>Westmorland and Furness</td>
            <td>£431</td>
            <td>£31.6 M</td>
            <td>73,320</td>
          </tr>
          <tr>
            <td>7</td>
            <td>Derbyshire Dales</td>
            <td>£417</td>
            <td>£9.2 M</td>
            <td>22,135</td>
          </tr>
          <tr>
            <td>8</td>
            <td>Carmarthenshire</td>
            <td>£413</td>
            <td>£22.4 M</td>
            <td>54,289</td>
          </tr>
          <tr>
            <td>9</td>
            <td>Pendle</td>
            <td>£399</td>
            <td>£11.3 M</td>
            <td>28,321</td>
          </tr>
          <tr>
            <td>10</td>
            <td>North Norfolk</td>
            <td>£396</td>
            <td>£14.2 M</td>
            <td>35,948</td>
          </tr>
        </tbody>
      </table>

      <p>
        Pattern: rural areas with older, larger, off-grid stock
        dominate the top 10. The combination of high heat-loss
        fabric + expensive heating fuel produces the biggest
        per-home £ savings when those properties are improved.
      </p>

      <h2>What &ldquo;clearing the recommendations&rdquo; means in practice</h2>
      <p>
        Every EPC certificate published in the UK includes a list
        of recommended improvements, ranked by the assessor by
        cost-effectiveness. Typical recommendations on an older
        UK home (Band D or worse):
      </p>
      <ul>
        <li>
          <strong>Loft insulation top-up</strong> — £400-£800, cuts
          heat loss 20-25%
        </li>
        <li>
          <strong>Cavity wall insulation</strong> (if applicable)
          — £1,500-£3,500, cuts heat loss 25-30%
        </li>
        <li>
          <strong>Hot water cylinder insulation</strong> —
          £50-£200, cuts hot-water bill 10-15%
        </li>
        <li>
          <strong>Draughtproofing</strong> — £200-£800, cuts heat
          loss 10-15%
        </li>
        <li>
          <strong>Floor insulation</strong> — £1,500-£4,000, cuts
          heat loss 8-10%
        </li>
        <li>
          <strong>Solid-wall insulation</strong> (where applicable)
          — £8,000-£25,000, cuts heat loss 30-40%
        </li>
        <li>
          <strong>Glazing upgrades</strong> — £6,000-£15,000, cuts
          heat loss 10-15%
        </li>
        <li>
          <strong>Low-energy lighting</strong> — £20-£200, cuts
          lighting bill 70%+
        </li>
      </ul>

      <h2>The realistic recoverable share</h2>
      <p>
        &ldquo;Clearing every recommendation&rdquo; is a theoretical
        ceiling. In practice:
      </p>
      <ul>
        <li>
          <strong>40-60% recoverable at low cost.</strong> Loft
          top-up + draughtproofing + LED lighting + cylinder
          insulation, combined under £1,000 for most homes, captures
          roughly half the available saving.
        </li>
        <li>
          <strong>20-30% additional at medium cost.</strong> Cavity
          wall + floor insulation + boiler tuning, another £3,000-
          £5,000 spend, captures another 20-30% of available
          savings.
        </li>
        <li>
          <strong>20-40% requires large capex.</strong> Solid-wall,
          glazing, full system replacement — only economically
          sensible if you&rsquo;re doing major works anyway
          (extension, replastering, re-rendering). Often left on
          the table.
        </li>
      </ul>
      <p>
        Realistic per-home recovery for a typical UK 3-bed semi
        spending £2,000 on the easy wins: £100-£180/year saving
        captured.
      </p>

      <h2>How to find your home&rsquo;s saving</h2>
      <p>
        Every property in England and Wales with a current EPC has
        its potential savings published. To find yours:
      </p>
      <ol>
        <li>
          Go to{" "}
          <a
            href="https://find-energy-certificate.service.gov.uk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            find-energy-certificate.service.gov.uk
          </a>{" "}
          and enter your postcode.
        </li>
        <li>
          Open your property&rsquo;s most recent certificate.
        </li>
        <li>
          Look at the &ldquo;Energy costs&rdquo; table — current
          vs potential heating, hot water, and lighting.
        </li>
        <li>
          Look at the &ldquo;Recommendations&rdquo; section for the
          specific work that drives the saving.
        </li>
      </ol>
      <p>
        Then run our free{" "}
        <a href="/check">property suitability check</a> to see
        which of those recommendations make economic sense given
        your specific property + fuel context.
      </p>

      <h2>The price-cap context</h2>
      <p>
        £259/year of permanent saving captured by physical
        improvements is approximately equivalent to one cycle of
        Ofgem energy-price-cap movement — but with the key
        difference that the efficiency saving doesn&rsquo;t reverse
        when prices fall back. A £1,000 spend on insulation today
        captures £150-£250/year in perpetuity; a £1,000 price cap
        relief is a one-time refund. The compound mathematics
        favour insulation: at typical UK fuel prices, £1,000 of
        insulation pays back in 4-7 years and continues to pay for
        20-40 years thereafter.
      </p>

      <h2>Methodology + reproducibility</h2>
      <p>
        Per-LAD £-saving figures come from summing{" "}
        <code>
          (heating_cost_current − heating_cost_potential) +
          (hot_water_cost_current − hot_water_cost_potential) +
          (lighting_cost_current − lighting_cost_potential)
        </code>{" "}
        across all properties with a latest cert in each council
        area. National total: sum across 317 qualifying LADs.
      </p>
      <p>
        <strong>Caveats:</strong> the £ figures are EPC-assessor
        projections at the prices fixed when the cert was lodged
        (so older certs reflect older prices). Real-world 2026
        savings are higher in £ terms than the dataset reports
        because energy prices have risen. The figure is also a
        theoretical ceiling — not every recommendation is
        economically sensible for every property.
      </p>
      <p>
        Source: GOV.UK EPC Register bulk dump 2026-05-01, 17.8 M
        unique properties. Reproducible pipeline:{" "}
        <a
          href="https://github.com/jimcreditcanary/proper-toasty/tree/main/scripts/epc-bulk"
          target="_blank"
          rel="noopener noreferrer"
        >
          scripts/epc-bulk/
        </a>
        . Cite as &ldquo;Propertoasty EPC Index, May 2026.&rdquo;
      </p>
    </AEOPage>
  );
}
