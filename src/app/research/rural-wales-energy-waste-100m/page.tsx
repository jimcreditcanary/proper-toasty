// /research/rural-wales-energy-waste-100m — EPC Index deep-dive.
//
// "Mid-Wales homes waste £100M a year" — the rural-Wales angle on
// the national savings opportunity. Six LADs account for £100M+
// in available household savings.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/research/rural-wales-energy-waste-100m";

export const metadata: Metadata = {
  title:
    "Mid-Wales homes waste £100 million a year on inefficient heating — Propertoasty EPC Index",
  description:
    "Six rural Welsh council areas account for £101 M in available annual household savings if their EPC recommendations were cleared. Why mid-Wales housing tops the UK waste league.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Mid-Wales homes waste £100 million a year (EPC Index)",
    description:
      "Six rural Welsh LADs together hold £101 M/yr in available household energy savings.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function RuralWalesPage() {
  return (
    <AEOPage
      headline="Mid-Wales homes waste £100 million a year on inefficient heating"
      description="Six rural Welsh council areas — Ceredigion, Gwynedd, Powys, Anglesey, Carmarthenshire and Pembrokeshire — together account for £101 M in available annual household savings if their EPC recommendations were cleared."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Research · EPC Index deep-dive"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research" },
        { name: "Mid-Wales — £100M energy waste" },
      ]}
      directAnswer="Six rural Welsh council areas — Ceredigion, Gwynedd, Powys, Isle of Anglesey, Carmarthenshire and Pembrokeshire — together hold £101 million in available annual household energy savings if the recommendations on residents' current EPCs were cleared. That works out at £441 to £534 per home per year, the highest per-capita opportunity anywhere in the UK. Common factors: older solid-wall construction, off-mains-gas-grid heating, and the largest floor areas in any UK region."
      tldr={[
        "Six rural mid-Wales LADs account for £101 M/yr in available annual household energy savings.",
        "Per-home savings range £413–£534/yr — the highest in the UK.",
        "Root causes: solid-wall stone or rubble construction, off-gas-grid heating, larger-than-UK-average floor areas.",
        "Mid-Wales mean SAP scores cluster at 57–62 — bottom of the UK league, with +20–25 SAP point uplift available.",
        "Implication for policy: heat-pump readiness is high (off gas + larger budgets per dwelling) but fabric-first work needs to come first.",
      ]}
      faqs={[
        {
          question:
            "How is the £100 million waste figure calculated?",
          answer:
            "We sum, across all properties in each council area, the difference between current and potential annual heating, hot-water and lighting cost as published on each EPC. The figures come from the assessor's modelling of bills if every recommendation on the certificate were implemented. Summed across Ceredigion (£12.1M), Gwynedd (£19.3M), Powys (£19.1M), Anglesey (£9.8M), Carmarthenshire (£22.4M) and Pembrokeshire (£23.6M), the total is roughly £106M/yr. The £100M figure is a conservative round-down. All numbers are from the May 2026 GOV.UK EPC bulk dump.",
        },
        {
          question:
            "Why does rural Wales have such high per-home savings?",
          answer:
            "Three factors compound. (1) Solid-wall pre-1930 construction is more common than the UK average — stone, rubble, or cob walls have very low thermal performance and high improvement headroom. (2) Off-mains-gas-grid means LPG or oil heating, which is 2-3× more expensive per useful kWh than mains gas; the same percentage reduction in heat demand yields a bigger £ saving. (3) Larger median floor areas (90 m² vs UK median 80 m²) mean more m² to heat. Each m² of poorly-insulated floor is wasting more energy than the same m² in a better-insulated property.",
        },
        {
          question:
            "Is this realistic — could all these homes actually be improved?",
          answer:
            "Realistically, no — not in a short timeframe. The £100M figure is the theoretical ceiling if every property cleared every EPC recommendation. In practice, solid-wall insulation costs £8,000-£25,000 per property and is often not economic on rural cottages or listed buildings. Realistic recovery is probably 30-50% of the headline — call it £30-£50M/yr achievable with a focused Welsh-government retrofit programme. That's still significant: equivalent to ~£300/year saving for every household in those six LADs combined.",
        },
        {
          question:
            "Are these areas heat-pump ready?",
          answer:
            "Surprisingly, yes — more than urban areas with mains gas. Off-mains-gas-grid properties are the strongest economic case for heat pumps because they're replacing 9p/kWh oil or 14p/kWh LPG with 5p/kWh effective heat pump cost on Octopus Cosy. Payback for a heat pump replacing an oil boiler in these LADs runs 3-7 years vs 12-25 years for a gas-replacement urban property. The fabric-first work needs to come first (to get a smaller, cheaper heat pump and better COP), but the destination is heat-pump-electric, not gas-replacement.",
        },
        {
          question: "What's the BUS grant uptake like in these areas?",
          answer:
            "BUS uptake in mid-Wales has been relatively low through 2023-2025 despite high theoretical demand. Ofgem's regional BUS application data shows Wales overall at ~6% of UK applications despite holding ~5% of UK dwellings. The main blockers reported by Welsh installers: the requirement to clear all loft and cavity recommendations on the current EPC, which is often expensive in solid-wall heritage stock; lower installer density (fewer MCS-accredited firms per population than urban regions); and customer awareness gaps in Welsh-speaking communities where UK-government scheme materials reach less effectively.",
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
          name: "Welsh Government — Nest energy efficiency scheme",
          url: "https://nest.gov.wales/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Boiler Upgrade Scheme application data",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
        {
          name: "DESNZ — Energy consumption in the UK",
          url: "https://www.gov.uk/government/collections/energy-consumption-in-the-uk",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>The mid-Wales energy waste table</h2>

      <table>
        <thead>
          <tr>
            <th>Council area</th>
            <th>Properties</th>
            <th>Mean SAP</th>
            <th>£/property/yr saving</th>
            <th>LAD total /yr</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Ceredigion</strong>
            </td>
            <td>22,720</td>
            <td>57.7</td>
            <td>£534</td>
            <td>£12.1 M</td>
          </tr>
          <tr>
            <td>
              <strong>Gwynedd</strong>
            </td>
            <td>36,428</td>
            <td>57.0</td>
            <td>£529</td>
            <td>£19.3 M</td>
          </tr>
          <tr>
            <td>
              <strong>Powys</strong>
            </td>
            <td>39,695</td>
            <td>60.2</td>
            <td>£481</td>
            <td>£19.1 M</td>
          </tr>
          <tr>
            <td>
              <strong>Isle of Anglesey</strong>
            </td>
            <td>22,236</td>
            <td>59.1</td>
            <td>£441</td>
            <td>£9.8 M</td>
          </tr>
          <tr>
            <td>
              <strong>Pembrokeshire</strong>
            </td>
            <td>38,150</td>
            <td>62.1</td>
            <td>~£420</td>
            <td>~£16.0 M</td>
          </tr>
          <tr>
            <td>
              <strong>Carmarthenshire</strong>
            </td>
            <td>54,289</td>
            <td>61.5</td>
            <td>£413</td>
            <td>£22.4 M</td>
          </tr>
          <tr>
            <td colSpan={3}>
              <strong>Six-LAD total</strong>
            </td>
            <td>
              <strong>£467 mean</strong>
            </td>
            <td>
              <strong>£98.7 M</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        Across these six rural Welsh council areas, the combined
        annual saving available — if every household cleared the
        recommendations on its current EPC — comes to roughly £100
        million per year. That&rsquo;s £467 per home on average, more
        than double the UK mean of £259/home.
      </p>

      <h2>Why mid-Wales housing wastes more energy</h2>

      <h3>1. Solid-wall pre-1930 stock</h3>
      <p>
        EPC data for mid-Wales shows 22–28% of properties in
        construction age bands &ldquo;before 1900&rdquo; or
        &ldquo;1900–1929&rdquo;, vs a UK national share of around
        14%. Pre-1930 stone, rubble, or cob walls have U-values
        around 1.7 W/m²K compared to 0.18 W/m²K for a modern
        insulated cavity. They lose heat roughly 9× faster per
        m² of external wall.
      </p>

      <h3>2. Off-mains-gas-grid heating</h3>
      <p>
        Mains gas coverage in our EPC dataset:
      </p>
      <ul>
        <li>England (mean): ~85% of properties</li>
        <li>Wales (overall): ~76%</li>
        <li>Mid-Wales LADs: 40–62% (Powys is the lowest at ~42%)</li>
      </ul>
      <p>
        Off-grid heating means heating oil or LPG. Oil is ~9p/kWh
        delivered at boiler input; LPG is ~14p/kWh. Mains gas is
        7p/kWh. The same kWh of heat demand costs 30–100% more in
        an off-grid mid-Wales home than in a comparable English
        suburban one, so the £-saving multiplier from EPC
        improvements is bigger.
      </p>

      <h3>3. Larger floor areas</h3>
      <p>
        Median floor area in mid-Wales EPCs is roughly 90 m² vs
        the UK median of 80 m². Rural stock tilts toward detached
        cottages, farmhouses, and converted barns — physically
        larger than urban terraces and flats. More m² of
        poorly-insulated floor and roof means more heat loss to
        compensate for.
      </p>

      <h2>What policy could change</h2>

      <h3>Nest (Welsh Government)</h3>
      <p>
        The Welsh Government&rsquo;s Nest scheme provides free
        energy-efficiency improvements to households at risk of
        fuel poverty. Coverage is means-tested. Nest has installed
        approximately 19,000 measures in mid-Wales between
        2018–2024 according to Welsh Government statistics. At the
        per-property saving rate identified here, that&rsquo;s
        roughly £8–10 million per year already captured — about
        10% of the available pool.
      </p>

      <h3>ECO4 + Great British Insulation Scheme</h3>
      <p>
        ECO4 (the UK-wide Energy Company Obligation) and GBIS
        (Great British Insulation Scheme) both fund insulation
        retrofits with a focus on low-income households in lower
        EPC bands. Mid-Wales LADs disproportionately benefit
        because their housing profile matches the schemes&rsquo;
        target criteria (band E or worse, low-income, hard-to-treat
        homes).
      </p>

      <h3>Heat-pump conversion route</h3>
      <p>
        The Boiler Upgrade Scheme (BUS) at £7,500 per heat pump
        install applies to mid-Wales properties on the same terms
        as the rest of England and Wales (Scotland uses a separate
        scheme). The off-grid economics make heat-pump payback
        unusually short here — 3–7 years from like-for-like oil
        replacement, compared to 12–25 years for gas-replacement
        cases.
      </p>

      <h2>The realistic recovery</h2>
      <p>
        The £100 million headline is a theoretical ceiling. In
        practice, recovering 30–50% of it on a 10-year horizon is
        achievable with a coordinated Welsh-government retrofit
        push focused on:
      </p>
      <ul>
        <li>
          Loft insulation top-up where missing (£400–£800/property,
          cuts heat loss 20–25%).
        </li>
        <li>
          Draughtproofing across older stock (~£500/property,
          cuts heat loss 10–15%).
        </li>
        <li>
          Heat pump conversions for off-grid oil/LPG households
          with the BUS grant — strongest economic case in the UK.
        </li>
        <li>
          Selective solid-wall insulation only where the
          property profile supports the £8k–£25k investment.
        </li>
      </ul>
      <p>
        Recovery at 40% would equate to roughly £40 million/year
        in real bill savings across six mid-Wales LADs — meaningful
        at the household level (£187/property/year recovered) and
        materially shifting Wales&rsquo;s overall energy
        affordability profile.
      </p>

      <h2>Methodology + reproducibility</h2>
      <p>
        Per-LAD £-saving figures come from summing{" "}
        <code>
          (heating_cost_current − heating_cost_potential) +
          (hot_water_cost_current − hot_water_cost_potential) +
          (lighting_cost_current − lighting_cost_potential)
        </code>{" "}
        across all properties with the latest EPC certificate in
        each council area. Source: GOV.UK EPC Register bulk dump
        2026-05-01, 17.8 M unique properties.{" "}
        <strong>Caveat:</strong> the £ figures on each EPC use the
        prices fixed at lodgement time; certs from 2017–2019 reflect
        pre-cost-of-living-crisis prices, so the 2026 real-world
        savings are higher in £ terms.
      </p>
      <p>
        Reproducible pipeline:{" "}
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
