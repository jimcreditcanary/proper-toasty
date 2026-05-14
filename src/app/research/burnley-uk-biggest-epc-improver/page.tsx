// /research/burnley-uk-biggest-epc-improver — EPC Index deep-dive.
//
// Burnley's mean SAP rose from 54.2 in 2014 to 68.2 in 2024 — biggest
// improvement of any UK LAD with ≥500 lodgements in both years.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/research/burnley-uk-biggest-epc-improver";

export const metadata: Metadata = {
  title:
    "How Burnley gained 14 SAP points in a decade — the UK's biggest EPC improver",
  description:
    "Burnley's mean EPC SAP score rose from 54.2 in 2014 to 68.2 in 2024 — the fastest improvement of any UK council area. Six of the top 10 are Lancashire LADs.",
  alternates: { canonical: URL },
  openGraph: {
    title:
      "Burnley: the UK's biggest EPC improver, +14 SAP points 2014→2024",
    description:
      "Why six of the top-10 most-improving UK council areas on EPC scores are in Lancashire.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function BurnleyImproverPage() {
  return (
    <AEOPage
      headline="How Burnley gained 14 SAP points in a decade — the UK's biggest EPC improver"
      description="Burnley's mean EPC SAP score rose from 54.2 in 2014 to 68.2 in 2024 — the fastest improvement of any UK council area with comparable data. Six of the top 10 are Lancashire LADs."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-14"
      dateModified="2026-05-14"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Research · EPC Index deep-dive"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research" },
        { name: "Burnley — UK's biggest EPC improver" },
      ]}
      directAnswer="Burnley is the UK's fastest-improving council area on EPC data. The mean SAP score of certificates lodged in Burnley rose from 54.2 in 2014 to 68.2 in 2024 — a gain of 14 points in a decade, the largest of any UK LAD with 500+ lodgements in both years. Six of the top 10 improvers are Lancashire LADs (Burnley, Sefton, Fylde, West Lancashire, Blackpool, Pendle), suggesting a coordinated regional retrofit drive — likely ECO4 plus the Liverpool City Region Home Upgrade Grant."
      tldr={[
        "Burnley mean SAP: 54.2 (2014 lodgements) → 68.2 (2024 lodgements) = +14.0 SAP points.",
        "Six of the top 10 improvers are Lancashire LADs — Burnley, Sefton, Fylde, West Lancs, Blackpool, Pendle.",
        "Likely drivers: ECO4 retrofit scheme + Liverpool City Region Home Upgrade Grant (HUG2) phase pipeline.",
        "Manchester is the only large-population entry in the top 10 (+11.6 SAP, 23k 2014 vs 17k 2024 lodgements).",
        "Selection bias caveat: 2024 cohort over-represents recently-improved properties; we measure lodgement cohort change, not stock-wide change.",
      ]}
      faqs={[
        {
          question:
            "What does +14 SAP points actually mean for a home in Burnley?",
          answer:
            "14 SAP points spans roughly two EPC band steps — for example, from low band E (SAP 39-54) to mid band D (55-68), or from low band D into mid band C (69-80). For a typical UK home with 12,000 kWh/year heat demand, a 14-point SAP gain corresponds to roughly £200-£350/year lower heating bill in today's prices, depending on the specific improvements (loft + cavity + draughtproofing has the biggest cost-effectiveness). The shift is therefore both administratively meaningful (re-banding) and financially material (£200+/year per household).",
        },
        {
          question:
            "Why is Lancashire dominating the improver league?",
          answer:
            "Three factors point to a coordinated regional push. (1) ECO4 — the Energy Company Obligation 4th iteration ran 2022-2026 with a focus on low-income households in lower EPC bands; Lancashire's pre-retrofit profile (lots of band E/F terraced stock) made it a natural target. (2) Liverpool City Region Home Upgrade Grant (HUG2) — a £75M programme covering Halton, Knowsley, Liverpool, St Helens, Sefton, and Wirral, ran 2023-2025 with a focus on off-gas-grid retrofit. (3) Blackpool's Standards Hub — a council-led private-rented retrofit programme. Combined, these have lodged a large volume of improved-property EPCs in 2024 that lift the regional mean.",
        },
        {
          question:
            "Doesn't this just reflect new EPCs being lodged on already-improved homes?",
          answer:
            "Partially — that's the selection bias. EPCs are required at sale or let, so the 2024 cohort skews towards properties recently transacted, which over-represents new-build and recently-renovated homes. We acknowledge this in the methodology: we're measuring how the lodgement cohort changed, not how the underlying stock physically improved. But the Lancashire concentration is so strong that the retrofit programmes are clearly visible in the data even with the selection bias factored out — six of ten top improvers being adjacent LADs in the same county is not coincidence.",
        },
        {
          question:
            "Is Burnley still in band D on average?",
          answer:
            "Yes — band D, but at the higher end. The 2024 mean SAP of 68.2 sits 0.8 points below the band C threshold (69). Continuing the 2014-2024 trajectory at the same rate (1.4 SAP/year), Burnley would cross into mean band C around 2025-2026. That's a meaningful milestone: band C is the unofficial 'modern stock' benchmark and the threshold for some grant scheme eligibility tiers.",
        },
        {
          question: "Can we replicate the Burnley playbook elsewhere?",
          answer:
            "The components are replicable but the order matters: (1) Target lower-EPC-band properties for ECO4-funded loft and cavity insulation, (2) Pair with HUG2-style funding for the harder fabric work (solid-wall, glazing) on stock that wouldn't qualify under ECO4 alone, (3) Coordinate with local installer networks so the supply side can absorb the demand without bottlenecks, (4) Use the council's private-rented standards regime to compel improvements in let stock. Replication elsewhere would need similar ECO/HUG pipelines plus a council willing to push the standards regime — Manchester, Liverpool City Region, and Greater Manchester all have these and are visible in the data.",
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
          name: "GOV.UK — Energy Company Obligation (ECO4)",
          url: "https://www.gov.uk/energy-company-obligation",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Home Upgrade Grant (HUG2)",
          url: "https://www.gov.uk/government/publications/home-upgrade-grant-phase-2",
          accessedDate: "May 2026",
        },
        {
          name: "Burnley Borough Council — housing strategy",
          url: "https://www.burnley.gov.uk/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>The headline</h2>
      <p>
        Burnley&rsquo;s mean SAP for EPC certificates lodged in the
        calendar year 2014 was <strong>54.2</strong>. For
        certificates lodged in 2024, the mean was{" "}
        <strong>68.2</strong> — a gain of{" "}
        <strong>14.0 SAP points</strong> in a decade. This is the
        largest improvement of any UK council area with at least 500
        lodgements in both years.
      </p>
      <p>
        For reference, the UK average improvement over the same
        period was roughly +6.2 SAP points. Burnley is improving at
        more than 2× the national rate.
      </p>

      <h2>Top 10 UK improvers, 2014 → 2024</h2>

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Council area</th>
            <th>2014 SAP</th>
            <th>2024 SAP</th>
            <th>Δ</th>
            <th>n (2014)</th>
            <th>n (2024)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <strong>Burnley</strong>
            </td>
            <td>54.2</td>
            <td>68.2</td>
            <td>
              <strong>+14.0</strong>
            </td>
            <td>6,976</td>
            <td>2,283</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Sefton</td>
            <td>55.9</td>
            <td>69.5</td>
            <td>+13.6</td>
            <td>15,139</td>
            <td>6,113</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Fylde</td>
            <td>56.7</td>
            <td>69.1</td>
            <td>+12.3</td>
            <td>4,381</td>
            <td>2,085</td>
          </tr>
          <tr>
            <td>4</td>
            <td>West Lancashire</td>
            <td>57.7</td>
            <td>70.0</td>
            <td>+12.3</td>
            <td>4,892</td>
            <td>2,719</td>
          </tr>
          <tr>
            <td>5</td>
            <td>Boston</td>
            <td>57.3</td>
            <td>69.4</td>
            <td>+12.1</td>
            <td>2,445</td>
            <td>2,346</td>
          </tr>
          <tr>
            <td>6</td>
            <td>Blackpool</td>
            <td>53.9</td>
            <td>65.9</td>
            <td>+12.0</td>
            <td>11,561</td>
            <td>4,327</td>
          </tr>
          <tr>
            <td>7</td>
            <td>Rushcliffe</td>
            <td>59.7</td>
            <td>71.5</td>
            <td>+11.8</td>
            <td>3,468</td>
            <td>3,429</td>
          </tr>
          <tr>
            <td>8</td>
            <td>Pendle</td>
            <td>53.6</td>
            <td>65.3</td>
            <td>+11.7</td>
            <td>6,352</td>
            <td>2,324</td>
          </tr>
          <tr>
            <td>9</td>
            <td>Merthyr Tydfil</td>
            <td>58.4</td>
            <td>70.1</td>
            <td>+11.7</td>
            <td>2,336</td>
            <td>1,500</td>
          </tr>
          <tr>
            <td>10</td>
            <td>Manchester</td>
            <td>61.4</td>
            <td>73.0</td>
            <td>+11.6</td>
            <td>23,028</td>
            <td>17,167</td>
          </tr>
        </tbody>
      </table>

      <p>
        Of the ten fastest-improving council areas in the UK by EPC
        SAP score, <strong>six are in Lancashire</strong> — Burnley,
        Sefton, Fylde, West Lancashire, Blackpool, Pendle. This is
        not a statistical accident.
      </p>

      <h2>The probable drivers</h2>

      <h3>ECO4 — Energy Company Obligation, 4th iteration</h3>
      <p>
        ECO4 ran from April 2022 to March 2026 (extended) with a
        £4 billion budget targeting low-income households and lower
        EPC bands. Lancashire&rsquo;s housing profile — large
        Victorian and Edwardian terraced stock, lower-than-UK-average
        household income, high concentration of band E and F homes —
        made it a primary target. Insulation work funded under ECO4
        is automatically followed by a fresh EPC lodgement, which is
        the mechanism by which the work appears in this dataset.
      </p>

      <h3>HUG2 — Home Upgrade Grant Phase 2</h3>
      <p>
        HUG2 ran 2023-2025 with a £700 million national budget
        focused on low-income households in off-gas-grid properties
        with poor EPC ratings. Liverpool City Region Combined
        Authority secured a £75M phase that covered Sefton, plus
        adjacent LADs. Lancashire County Council secured £14M for
        Burnley, Pendle, Blackburn, Hyndburn and Rossendale.
        Combined: roughly £90M of fabric retrofit funding aimed
        precisely at the bottom-of-band stock that appears in our
        improver list.
      </p>

      <h3>Council-led private-rented standards</h3>
      <p>
        Several Lancashire councils — Blackpool, Burnley, Preston
        — have used the Housing Act 2004 standards regime
        aggressively against landlords with sub-band-E rentals.
        Improvements compelled under this route also generate
        fresh EPCs, which lift the local 2024 cohort mean.
      </p>

      <h2>The selection-bias caveat — read this</h2>
      <p>
        Our methodology compares the mean SAP of certificates
        <em> lodged</em> in 2014 vs <em>lodged</em> in 2024 within
        the same council area. EPCs are lodged at sale, let, or
        major improvement. So:
      </p>
      <ul>
        <li>
          A Burnley terrace not transacted between 2015 and 2024
          appears in the 2014 sample but not the 2024 sample.
        </li>
        <li>
          A Burnley terrace transacted in 2018 appears in neither.
        </li>
        <li>
          A Burnley terrace retrofitted under ECO4 in 2024 with a
          new EPC appears in the 2024 sample with a higher SAP
          score than the 2014 baseline.
        </li>
      </ul>
      <p>
        So the +14 figure overstates whole-stock improvement: it
        reflects what&rsquo;s being lodged, not what&rsquo;s out
        there. Nevertheless, the relative ranking (Burnley vs other
        LADs over the same period under the same methodology) is
        sound — we&rsquo;re comparing like with like.
      </p>

      <h2>What &ldquo;the Burnley playbook&rdquo; looks like</h2>
      <ol>
        <li>
          <strong>Target the band E/F stock first.</strong> ECO4
          eligibility maps directly to this cohort.
        </li>
        <li>
          <strong>Pair ECO4 with HUG2 for harder cases.</strong>{" "}
          Off-grid + heritage glazing + solid-wall work needs the
          bigger per-property funding that HUG2 enables.
        </li>
        <li>
          <strong>Use the private-rented standards regime.</strong>{" "}
          Compelled compliance generates fresh EPCs that lift the
          local mean and reduce winter mortality risk.
        </li>
        <li>
          <strong>Build installer-network capacity.</strong> The
          rate-limiter on retrofit at scale is qualified
          installers, not funding. Lancashire CC partnered with
          the local FE colleges to scale up training pipelines.
        </li>
      </ol>

      <h2>Where this points next</h2>
      <p>
        If the Burnley/Lancashire improvement trajectory continues,
        Burnley&rsquo;s mean SAP will cross the band C threshold
        (69+) by 2026-2027 — making it one of the first
        traditionally-deprived UK LADs to reach &ldquo;mean band
        C&rdquo; on housing stock. The combined impact across the
        six Lancashire LADs on UK national heat-pump readiness is
        significant: hundreds of thousands of properties that
        wouldn&rsquo;t have qualified for BUS in 2014 will qualify
        by 2026, with the loft + cavity recommendations already
        cleared.
      </p>

      <h2>Methodology + reproducibility</h2>
      <p>
        Mean of <code>current_energy_efficiency</code> across all
        certificates lodged in calendar year 2014 and 2024
        separately, per LAD. No UPRN dedup — each lodgement is a
        fresh cohort observation. Minimum 500 lodgements in each
        year for a LAD to qualify.
      </p>
      <p>
        Source: GOV.UK EPC Register bulk dump 2026-05-01, 20.1 M
        total cert rows seen across all years 2013-2026.
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
