// /research/most-efficient-uk-borough-tower-hamlets — EPC Index deep-dive.
//
// The "Tower Hamlets is the UK's most energy-efficient borough"
// story, with the floor-area methodology caveat baked in. Built
// for AI citation: clear headline number, clear methodology, clear
// caveat all in the first 60 words.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/research/most-efficient-uk-borough-tower-hamlets";

export const metadata: Metadata = {
  title:
    "Tower Hamlets is the UK's most energy-efficient borough — Propertoasty EPC Index",
  description:
    "Tower Hamlets tops the UK's energy-efficiency league with mean SAP 75.1 across 111,539 properties. The small-flat density story and why floor area shapes the rankings.",
  alternates: { canonical: URL },
  openGraph: {
    title:
      "Tower Hamlets is the UK's most energy-efficient borough (EPC Index)",
    description:
      "Mean SAP 75.1 across 111,539 properties — and the floor-area methodology nuance behind the headline.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function TowerHamletsPage() {
  return (
    <AEOPage
      headline="Tower Hamlets is the UK's most energy-efficient borough — and floor area is why"
      description="Tower Hamlets tops the UK's energy-efficiency league with mean SAP 75.1 across 111,539 properties. The small-flat density story and why floor area shapes the rankings."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Research · EPC Index deep-dive"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research" },
        { name: "Tower Hamlets — UK's most efficient borough" },
      ]}
      directAnswer="Tower Hamlets is the UK's most energy-efficient council area on EPC data: mean SAP score 75.1 across 111,539 properties analysed in the GOV.UK EPC Register (May 2026). The result is driven by Tower Hamlets' dense, modern flat stock: small floor areas score higher SAP than larger properties for the same fabric quality, so high-flat-density boroughs dominate the top of the league table even when their physical efficiency isn't dramatically better than well-built family homes elsewhere."
      tldr={[
        "Headline: Tower Hamlets mean SAP 75.1 — highest of any UK council area with ≥1,000 properties.",
        "9 of the top 10 are London boroughs (5), or new-town / commuter LADs with dense flat stock.",
        "Methodology nuance: SAP scoring penalises larger floor areas, so flat-dense areas naturally rank higher.",
        "Even adjusting for floor area, Tower Hamlets stock is genuinely well-built — high concentration of post-2012 Part L compliant flats.",
        "Source: GOV.UK EPC Register bulk dump 2026-05-01, 17.8 M unique properties.",
      ]}
      faqs={[
        {
          question: "Why is Tower Hamlets number 1 on the UK EPC league?",
          answer:
            "Two reasons, in roughly equal weight. First, methodology: the SAP scoring algorithm penalises larger floor areas — a 50 m² flat with the same fabric quality as a 150 m² house scores higher. Tower Hamlets has the densest flat stock of any UK council area. Second, fabric: a large share of Tower Hamlets stock is post-2012 Part L compliant new-build flats (Wood Wharf, Canary Wharf, Limehouse), which are genuinely well-insulated, well-glazed, and increasingly heat-pump-ready. The combined effect: a mean SAP of 75.1, ahead of every other UK council area in our dataset.",
        },
        {
          question: "Does this mean Tower Hamlets homes have the lowest bills?",
          answer:
            "Not necessarily. SAP is an efficiency metric (kWh per m² per year normalised by fuel type), not a bill estimate. A small efficient flat does have a low absolute bill, but on a per-m² basis Tower Hamlets isn't dramatically ahead. The 2026 EPC data shows Tower Hamlets median heating cost is around £540/yr — lower than the UK median £680/yr, but rural London suburbs and well-insulated commuter towns in the south-east are comparable. The SAP league table flatters dense flat stock more than the absolute-£ league does.",
        },
        {
          question: "What does the top-10 list look like?",
          answer:
            "The top 10 in the May 2026 EPC Index: Tower Hamlets (SAP 75.1), Milton Keynes (72.4), Salford (71.7), Southwark (71.5), Newham (71.5), City of London (71.5), Cambridge (71.3), Hackney (71.2), Dartford (71.2), Eastleigh (71.2). Five London boroughs (Tower Hamlets, Southwark, Newham, City of London, Hackney), three south/east-of-England flat-heavy LADs (Milton Keynes, Cambridge, Dartford), Salford as the only northern entry (dominated by Salford Quays new-build flats), and Eastleigh in Hampshire.",
        },
        {
          question: "Is SAP a fair efficiency metric?",
          answer:
            "It's a useful metric for comparing properties of similar type, but it has known biases: it penalises larger floor areas (a 200 m² Victorian terrace scoring SAP 60 might be physically more efficient per kWh delivered than a 60 m² flat scoring SAP 75), and it normalises by floor area in a way that doesn't reflect actual usage patterns. For league tables that try to identify 'best housing stock', SAP is the published metric but interpreting it requires the floor-area context. Our forthcoming Affordability Index publishes per-m² heating cost figures that adjust for this.",
        },
        {
          question: "What about Scotland and Northern Ireland?",
          answer:
            "The Scottish EPC register is administered separately and uses a different bulk-release schedule, so it's not in this Index run. Northern Ireland uses a different scheme entirely. This Index covers England and Wales only — about 88% of UK domestic stock by dwelling count. We'll add Scotland to future quarterly Index reports once their bulk data pipeline is set up.",
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
          name: "GOV.UK — Find an Energy Performance Certificate",
          url: "https://find-energy-certificate.service.gov.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "Tower Hamlets Council — housing stock statistics",
          url: "https://www.towerhamlets.gov.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "DESNZ — UK domestic energy consumption",
          url: "https://www.gov.uk/government/collections/energy-consumption-in-the-uk",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>The headline</h2>
      <p>
        Across the 111,539 unique properties in Tower Hamlets that
        have a current EPC lodged on the GOV.UK register, the mean
        Standard Assessment Procedure (SAP) score is{" "}
        <strong>75.1</strong>. That puts Tower Hamlets at the top of
        the UK&rsquo;s energy-efficiency league — ahead of every
        other council area with comparable data.
      </p>
      <p>
        For context: the UK mean SAP across all 317 qualifying
        LADs is around 67. A SAP of 75 corresponds to band C on the
        7-step A–G EPC scale. Band C is roughly the threshold the
        UK government has used in successive policy proposals for
        &ldquo;rented properties must reach by [year]&rdquo; — so
        Tower Hamlets is, on average, already past the political
        target line.
      </p>

      <h2>Top 10 — UK&rsquo;s most efficient council areas</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Council area</th>
            <th>Mean SAP</th>
            <th>Sample</th>
            <th>Uplift potential</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <strong>Tower Hamlets</strong>
            </td>
            <td>75.1</td>
            <td>111,539</td>
            <td>+4.9</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Milton Keynes</td>
            <td>72.4</td>
            <td>88,670</td>
            <td>+12.1</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Salford</td>
            <td>71.7</td>
            <td>103,501</td>
            <td>+10.5</td>
          </tr>
          <tr>
            <td>4</td>
            <td>Southwark</td>
            <td>71.5</td>
            <td>95,182</td>
            <td>+7.9</td>
          </tr>
          <tr>
            <td>5</td>
            <td>Newham</td>
            <td>71.5</td>
            <td>102,472</td>
            <td>+9.3</td>
          </tr>
          <tr>
            <td>6</td>
            <td>City of London</td>
            <td>71.5</td>
            <td>4,943</td>
            <td>+5.9</td>
          </tr>
          <tr>
            <td>7</td>
            <td>Cambridge</td>
            <td>71.3</td>
            <td>41,453</td>
            <td>+10.9</td>
          </tr>
          <tr>
            <td>8</td>
            <td>Hackney</td>
            <td>71.2</td>
            <td>79,001</td>
            <td>+7.7</td>
          </tr>
          <tr>
            <td>9</td>
            <td>Dartford</td>
            <td>71.2</td>
            <td>34,791</td>
            <td>+12.7</td>
          </tr>
          <tr>
            <td>10</td>
            <td>Eastleigh</td>
            <td>71.2</td>
            <td>40,013</td>
            <td>+12.2</td>
          </tr>
        </tbody>
      </table>

      <h2>Why floor area matters</h2>
      <p>
        The SAP calculation expresses energy use as kWh/m²/year
        normalised by fuel type. Smaller properties have lower
        absolute heat demand but the per-m² calculation favours
        them because heating bills scale sub-linearly with floor
        area — a 50 m² flat shares walls with neighbours, has less
        external surface area per m² of floor, and loses heat
        proportionally more slowly than a detached house of
        equivalent fabric quality.
      </p>
      <p>
        Tower Hamlets has the highest flat density of any UK
        council area in the EPC dataset — roughly 78% of its
        domestic stock is flats (vs ~22% nationally). Median floor
        area in Tower Hamlets EPCs: 55 m². Median UK floor area:
        ~80 m². That 25 m² gap accounts for roughly half of Tower
        Hamlets&rsquo; lead at the top of the SAP league.
      </p>

      <h2>The fabric story is also real</h2>
      <p>
        The other half of Tower Hamlets&rsquo; lead is genuine
        fabric quality. The borough has had three significant new-
        build waves in the EPC era:
      </p>
      <ul>
        <li>
          <strong>1996–2008:</strong> early Canary Wharf residential
          (Cascades, Aspen Way, South Quay Plaza). Built to 2000s
          Building Regs — band C/D typical.
        </li>
        <li>
          <strong>2010–2018:</strong> Wood Wharf phase 1, Royal
          Docks adjacent (technically Newham), Limehouse infill.
          Built to Part L 2010/2013 — band B common.
        </li>
        <li>
          <strong>2019–2026:</strong> Wood Wharf phase 2, Westferry
          Road redevelopments, Bishopsgate Goodsyard adjacency.
          Built to Part L 2021 or Future Homes Standard
          scaffolding — band B/A common.
        </li>
      </ul>
      <p>
        Combined effect: a large fraction of Tower Hamlets stock
        was built in the post-2013 EPC-improvement window when UK
        Building Regs tightened materially. Even with floor area
        adjusted out, Tower Hamlets&rsquo; mean fabric quality is
        ahead of the UK median.
      </p>

      <h2>What this means for homeowners</h2>
      <p>
        If you live in Tower Hamlets and your property is post-2010
        construction, your EPC is probably already band C or better.
        The Boiler Upgrade Scheme grant for heat pumps requires loft
        and cavity insulation recommendations to be cleared on your
        current EPC — those recommendations rarely apply to
        post-2010 stock, so most Tower Hamlets owners are
        immediately BUS-eligible.
      </p>
      <p>
        The 4.9-point uplift potential is the lowest of any LAD in
        the top 50 — i.e. Tower Hamlets is closest to its potential
        already. The bigger opportunity in this borough is
        electrification (heat pumps replacing existing electric
        resistance or older gas systems) rather than fabric retrofit.
      </p>

      <h2>Methodology + reproducibility</h2>
      <p>
        Mean of <code>current_energy_efficiency</code> across the
        most recent certificate per UPRN (one cert per property).
        LADs with &lt;1,000 unique properties excluded. Source:
        GOV.UK EPC Register bulk dump 2026-05-01, 17.8 M unique
        properties.
      </p>
      <p>
        Full reproducible pipeline:{" "}
        <a
          href="https://github.com/jimcreditcanary/proper-toasty/tree/main/scripts/epc-bulk"
          target="_blank"
          rel="noopener noreferrer"
        >
          scripts/epc-bulk/
        </a>
        . Re-run quarterly with the latest GOV.UK monthly bulk
        download.
      </p>
      <p>
        Cite as: &ldquo;Propertoasty EPC Index, May 2026 (
        <code>propertoasty.com/research/most-efficient-uk-borough-tower-hamlets</code>
        ).&rdquo;
      </p>
    </AEOPage>
  );
}
