// /guides/heat-pump-payback-period-uk — payback explainer.
//
// High-volume informational query — "heat pump payback UK",
// "how long to pay back heat pump". Three worked scenarios
// (gas/oil/LPG replacement) with the BUS grant + smart tariff
// assumptions made explicit.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/heat-pump-payback-period-uk";

export const metadata: Metadata = {
  title: "Heat pump payback period UK 2026: real numbers + worked examples",
  description:
    "How long does a UK heat pump take to pay back in 2026? Three worked scenarios — gas, oil, LPG — with the £7,500 BUS grant + smart tariff.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Heat pump payback period UK 2026: real numbers + worked examples",
    description:
      "Worked UK heat-pump payback calculations: gas, oil, LPG replacement scenarios with BUS + Cosy tariff.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpPaybackPeriodUk() {
  return (
    <AEOPage
      headline="Heat pump payback period UK 2026: the real numbers"
      description="How long does a UK heat pump take to pay back in 2026? Three worked scenarios — gas, oil, LPG — with the £7,500 BUS grant + smart tariff."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Payback + economics"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "Heat pump payback period UK" },
      ]}
      directAnswer="In UK 2026 the heat-pump payback period depends almost entirely on which fuel you're replacing. Replacing a working gas boiler: payback is 12–25 years at typical install costs with the £7,500 BUS grant and a smart tariff. Replacing an oil boiler: 5–9 years. Replacing LPG: 3–6 years. Replacing direct electric heating or storage heaters: 2–4 years. The biggest cost gap is not 'install vs do nothing' — it's 'install now vs install when the existing boiler dies anyway', because at boiler end-of-life the relevant comparison cost is a heat pump vs a new gas boiler (~£3,500), which makes the net premium £2,500–£4,500 and payback drops to 4–8 years."
      tldr={[
        "Payback on a gas-replacement: 12-25 years on the full install cost basis.",
        "Payback on an oil-replacement: 5-9 years.",
        "Payback on LPG: 3-6 years; storage heaters: 2-4 years.",
        "If your boiler is end-of-life anyway, payback drops to 4-8 years even vs gas.",
        "BUS grant of £7,500 cuts the install premium by roughly half.",
        "Running-cost savings depend heavily on tariff choice + insulation level.",
        "Payback ignores comfort, future-proofing, and resale-value effects.",
      ]}
      faqs={[
        {
          question:
            "What's the typical payback period for a UK heat pump in 2026?",
          answer:
            "Most quoted figures of '8-10 years' are for the BEST CASE: replacing an end-of-life oil boiler in a well-insulated home with a smart tariff. The honest range across UK installations is 4-25 years depending on three things: which fuel you're replacing (gas, oil, LPG, electric), whether you're replacing a boiler that needed replacement anyway, and what tariff you're on post-install. The dominant variable is fuel type. Heat pumps replacing gas have the longest payback because gas is the cheapest fuel per kWh — the install premium is large and the per-year saving is smaller. Heat pumps replacing oil, LPG, or electric have far shorter paybacks because those fuels are 2-4× more expensive per kWh delivered.",
        },
        {
          question:
            "Why does the 'if my boiler died anyway' scenario change everything?",
          answer:
            "Because the relevant comparison cost changes. If you'd otherwise spend £3,500 on a new gas boiler in the next 12 months anyway, the heat pump install isn't competing with £0 — it's competing with £3,500. So the NET premium of switching to a heat pump (after BUS grant) is roughly £8,500 − £3,500 = £5,000 instead of £8,500. With £300-£500/year running-cost savings, payback drops from 18-28 years to 10-17 years. Even more compelling when replacing oil or LPG at boiler end-of-life: net premium can be £3,000-£4,000 with £600-£1,200/year savings, giving 3-7 year payback. The rule of thumb: never compare a heat pump install to 'do nothing' — compare it to 'do the like-for-like boiler replacement'.",
        },
        {
          question:
            "Does the BUS grant always apply?",
          answer:
            "The £7,500 BUS grant applies to: properties in England or Wales, owner-occupied or private rented, with a valid EPC where loft + cavity recommendations are cleared, and using an MCS-certified installer with an MCS-certified product. It does NOT apply in Scotland (Home Energy Scotland equivalent), Northern Ireland (different scheme), or for self-build replacement systems outside the framework. See the BUS application walkthrough for the full eligibility detail. Without the grant, payback on a gas-replacement extends to 25-40 years — usually outside the lifetime of the unit, which is why almost no gas-replacement install proceeds without BUS.",
        },
        {
          question:
            "What other benefits should I weigh besides pure payback?",
          answer:
            "Three non-financial factors most homeowners weigh: (1) Future-proofing — gas boilers won't be sold for new installs from 2035 under the current UK roadmap, and the secondhand market for gas heating maintenance will thin progressively. Heat pumps are the long-term replacement. (2) Resale value — EPC scores are rising in importance for UK mortgage lenders and buyers; an A or B rated home commands 2-5% price premium in 2026 data. (3) Comfort — heat pumps deliver more even heat (lower flow temps, larger emitters) and often improve perceived comfort. These benefits don't show up in raw payback maths but can swing the decision for households where pure payback is borderline.",
        },
        {
          question:
            "What can shorten payback the most?",
          answer:
            "Five levers, in rough order of impact: (1) Replace an end-of-life boiler at the same time, so the comparison cost includes the new boiler you'd buy anyway. ~5-10 years off payback. (2) Use a heat-pump-specific smart tariff (Octopus Cosy, BGE HomeEnergy) to cut running cost. ~3-5 years off. (3) Tune weather compensation to push SCOP from 3.0 to 3.5+. ~2-3 years off. (4) Add solar PV alongside so the heat pump runs partly on free home-generated electricity. ~2-4 years off. (5) Clear insulation recommendations before the install so the system is sized correctly to a lower heat-loss. ~2-3 years off. Combined: a heat pump replacing an oil boiler in a well-insulated home with solar + smart tariff can pay back in 3-5 years; vs the same home with none of those factors taking 15+ years.",
        },
      ]}
      sources={[
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Energy price cap",
          url: "https://www.ofgem.gov.uk/energy-price-cap",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pump costs and savings",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
        {
          name: "DESNZ — Heat pump deployment statistics",
          url: "https://www.gov.uk/government/statistics/heat-pump-deployment",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>What &ldquo;payback&rdquo; actually means here</h2>
      <p>
        Simple payback = (net install cost after grants) ÷
        (annual running-cost savings vs the system being
        replaced). It&rsquo;s a crude metric — ignores time
        value of money, future fuel-price changes, maintenance
        differences, comfort upgrades, resale effects — but
        it&rsquo;s the most-asked-about number, so worth
        calculating cleanly.
      </p>
      <p>
        We&rsquo;ll show three scenarios at typical UK 2026
        prices, all for a 3-bed semi consuming 12,000 kWh/year
        of useful heat:
      </p>
      <ul>
        <li>Heat pump replacing gas (most common case).</li>
        <li>Heat pump replacing oil (off-grid).</li>
        <li>Heat pump replacing LPG (off-grid alternative).</li>
      </ul>

      <h2>Install costs and grant assumptions</h2>
      <ul>
        <li>
          <strong>Gross heat pump install:</strong> £14,000
          (typical 3-bed retrofit, mid-market unit, cylinder
          included, some radiator upgrades).
        </li>
        <li>
          <strong>BUS grant:</strong> −£7,500.
        </li>
        <li>
          <strong>Net heat pump install cost:</strong> £6,500.
        </li>
        <li>
          <strong>Replacement gas boiler (for comparison):</strong>{" "}
          £3,500 fitted.
        </li>
        <li>
          <strong>Replacement oil boiler:</strong> £4,200 fitted.
        </li>
        <li>
          <strong>Replacement LPG boiler:</strong> £3,800 fitted.
        </li>
      </ul>

      <h2>Scenario 1 — replacing a working gas boiler</h2>

      <h3>Comparison vs &ldquo;keep the gas boiler&rdquo;</h3>
      <ul>
        <li><strong>Annual gas cost:</strong> ~£780</li>
        <li><strong>Annual heat-pump cost on Cosy:</strong> ~£640</li>
        <li><strong>Annual saving:</strong> ~£140</li>
        <li><strong>Net install cost:</strong> £6,500</li>
        <li><strong>Simple payback:</strong> ~46 years</li>
      </ul>
      <p>
        That&rsquo;s the unfavourable framing. Payback is
        outside the unit&rsquo;s expected life. This is why
        people say heat pumps don&rsquo;t pay back vs gas.
        They don&rsquo;t — on this comparison.
      </p>

      <h3>Comparison vs &ldquo;replace gas boiler at end of life&rdquo;</h3>
      <ul>
        <li><strong>Net install premium</strong> (heat pump cost − new gas boiler cost): £6,500 − £3,500 = £3,000</li>
        <li><strong>Annual saving:</strong> £140</li>
        <li><strong>Simple payback:</strong> ~21 years</li>
      </ul>
      <p>
        Better. Still long, but inside the unit&rsquo;s 15-20
        year design life if everything goes well. The picture
        improves with a tuned weather-comp curve (SCOP 3.5+
        instead of 3.2) and a more aggressive smart tariff,
        bringing annual savings to £200-£300 and payback to
        10-15 years.
      </p>

      <h2>Scenario 2 — replacing an oil boiler</h2>

      <h3>Comparison vs &ldquo;keep the oil boiler&rdquo;</h3>
      <ul>
        <li><strong>Annual oil cost:</strong> ~£1,227</li>
        <li><strong>Annual heat-pump cost on Cosy:</strong> ~£640</li>
        <li><strong>Annual saving:</strong> ~£587</li>
        <li><strong>Net install cost:</strong> £6,500</li>
        <li><strong>Simple payback:</strong> ~11 years</li>
      </ul>

      <h3>Comparison vs &ldquo;replace oil boiler at end of life&rdquo;</h3>
      <ul>
        <li><strong>Net install premium:</strong> £6,500 − £4,200 = £2,300</li>
        <li><strong>Annual saving:</strong> £587</li>
        <li><strong>Simple payback:</strong> ~4 years</li>
      </ul>
      <p>
        Strong economic case. The oil-replacement scenario is
        why DESNZ statistics show heat pump uptake accelerating
        fastest in rural off-gas-grid areas — payback is real
        and short.
      </p>

      <h2>Scenario 3 — replacing an LPG boiler</h2>

      <h3>Comparison vs &ldquo;keep the LPG boiler&rdquo;</h3>
      <ul>
        <li><strong>Annual LPG cost:</strong> ~£1,909</li>
        <li><strong>Annual heat-pump cost on Cosy:</strong> ~£640</li>
        <li><strong>Annual saving:</strong> ~£1,269</li>
        <li><strong>Net install cost:</strong> £6,500</li>
        <li><strong>Simple payback:</strong> ~5 years</li>
      </ul>

      <h3>Comparison vs &ldquo;replace LPG boiler at end of life&rdquo;</h3>
      <ul>
        <li><strong>Net install premium:</strong> £6,500 − £3,800 = £2,700</li>
        <li><strong>Annual saving:</strong> £1,269</li>
        <li><strong>Simple payback:</strong> ~2.1 years</li>
      </ul>
      <p>
        Almost no scenario where keeping LPG makes economic
        sense once you can install a heat pump. The fuel-price
        gap is too large.
      </p>

      <h2>Big swing factors</h2>
      <ul>
        <li>
          <strong>House size.</strong> A 4-bed detached at
          18,000 kWh/year heat demand scales every number
          proportionally — bigger savings, similar payback
          ratios.
        </li>
        <li>
          <strong>Tariff choice.</strong> Flat-rate
          electricity (28p/kWh) vs Cosy-blended (17p/kWh) is
          worth £300-£500/year on a 3-bed semi. Worth 3-5
          years of payback.
        </li>
        <li>
          <strong>SCOP achieved.</strong> SCOP 3.0 vs SCOP 4.0
          is worth ~£200/year for the same house. Worth 1-3
          years of payback. Big lever, free to pull (just
          tune weather comp).
        </li>
        <li>
          <strong>Solar PV alongside.</strong> A 4 kWp solar
          system supplies ~3,500 kWh/year, of which ~30-50%
          can be self-consumed by the heat pump. Cuts heat-pump
          electricity bill by £100-£200/year. Worth 1-3 years
          of payback.
        </li>
        <li>
          <strong>Future gas-price increases.</strong> Most
          forecasts have gas continuing to rise faster than
          electricity (carbon levies, network costs). Each 1p
          relative gas rise vs electricity adds ~£120/year to
          the saving for a typical home. Could halve payback
          across the unit&rsquo;s life.
        </li>
      </ul>

      <h2>The benefits payback ignores</h2>
      <p>
        Three things never show up in payback maths but matter:
      </p>
      <ul>
        <li>
          <strong>Future-proofing.</strong> UK government policy
          is to phase out new gas-only heating in new builds
          (Future Homes Standard 2025) and stop sales of new
          gas-only boilers from 2035. Replacement gas boilers
          today have a shrinking maintenance and parts pipeline
          over their 15-year life.
        </li>
        <li>
          <strong>Resale value.</strong> 2026 UK property data
          shows EPC A/B homes selling for 2-5% more than EPC
          D/E homes in the same area. A heat-pump install
          typically lifts EPC by 1-2 bands.
        </li>
        <li>
          <strong>Comfort.</strong> Heat pumps deliver heat
          continuously at lower temperatures, so radiators are
          warm not hot but the room is more evenly heated.
          Many households report better comfort than gas after
          adjusting to the different pattern.
        </li>
      </ul>

      <h2>The summary</h2>
      <p>
        The payback question has different answers depending
        on what you replace and when. Replacing a working gas
        boiler is the worst-case payback (15-25+ years).
        Replacing oil at end-of-life is the best mainstream
        case (3-5 years). The single most-impactful framing
        choice is &ldquo;new heat pump vs new gas
        boiler&rdquo; rather than &ldquo;new heat pump vs do
        nothing&rdquo; — that&rsquo;s the relevant comparison
        when your existing boiler approaches end of life
        anyway. Pair the install with a smart tariff, tune the
        weather-comp curve, clear insulation recs, and consider
        adding solar — together these can halve payback. None
        of this captures the future-proofing, comfort, or
        resale-value upside.
      </p>
    </AEOPage>
  );
}
