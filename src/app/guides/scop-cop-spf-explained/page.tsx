// /guides/scop-cop-spf-explained — heat pump efficiency primer.
//
// High-volume informational query — "what is SCOP", "COP vs SCOP",
// "SPF heat pump". Three different efficiency metrics that
// homeowners encounter at different stages: COP (test conditions
// in the brochure), SCOP (annual seasonal in the MCS quote), SPF
// (real-world measured by an MID meter post-install).

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/scop-cop-spf-explained";

export const metadata: Metadata = {
  title: "SCOP, COP, SPF explained: heat pump efficiency metrics (UK 2026)",
  description:
    "What COP, SCOP, and SPF actually mean for a UK heat pump — when each is used, typical 2026 numbers, and what to look for in an installer quote.",
  alternates: { canonical: URL },
  openGraph: {
    title: "SCOP, COP, SPF explained: heat pump efficiency metrics (UK 2026)",
    description:
      "The three efficiency metrics for UK heat pumps — when each is used and what to look for in a quote.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function ScopCopSpfExplained() {
  return (
    <AEOPage
      headline="SCOP, COP, SPF explained: UK heat pump efficiency metrics in 2026"
      description="What COP, SCOP, and SPF actually mean for a UK heat pump — when each is used, typical 2026 numbers, and what to look for in an installer quote."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Efficiency metrics"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "SCOP, COP, SPF explained" },
      ]}
      directAnswer="A heat pump's efficiency is measured by three related but distinct numbers. COP (Coefficient of Performance) is the instantaneous ratio of heat output to electricity input at fixed test conditions — typically 7°C outside, 35°C flow. SCOP (Seasonal COP) is the annual-average COP across a defined climate zone, accounting for varying outdoor temperatures and flow temperatures throughout the year — this is the number on MCS quotes. SPF (Seasonal Performance Factor) is the real-world measured efficiency from a calibrated electricity + heat meter once the pump is installed. Typical UK 2026 numbers: COP 4.5–5.5 in brochures, SCOP 3.5–4.5 on MCS quotes, SPF 2.8–3.8 measured in the field."
      tldr={[
        "COP = lab test condition efficiency (brochure number, optimistic).",
        "SCOP = seasonal annual-average efficiency (MCS quote number, realistic).",
        "SPF = measured real-world efficiency from your meter (truth number, post-install).",
        "MCS quotes must declare SCOP, not COP — check this in any quote you receive.",
        "Higher flow temperature = lower SCOP. A 35°C system has SCOP 3.8-4.5; a 55°C system 2.5-3.0.",
        "SCOP gap between brand A and brand B at the same flow temp is usually 10-20%, not 50%.",
      ]}
      faqs={[
        {
          question:
            "What does COP actually measure?",
          answer:
            "COP is the ratio of useful heat output (in kW) to electrical input (in kW) at a single fixed operating point. For air-source heat pumps the standard test point is 7°C outside air, 35°C flow temperature — this gives the highest COP because both conditions are mild. A heat pump rated COP 5.0 at A7/W35 produces 5 kW of heat for every 1 kW of electricity at that specific condition. The catch: real UK winters spend most hours well below 7°C, and most installations run flow temperatures higher than 35°C. So the brochure COP is the best case, not the typical case.",
        },
        {
          question:
            "How is SCOP different from COP?",
          answer:
            "SCOP is COP averaged across a full year's typical operating conditions in a defined climate zone (the UK is in the 'Average' climate zone under EN 14825). The calculation weights different outdoor-temperature bins by the number of hours per year they occur, runs the heat pump's performance map at each bin, and produces a single annual efficiency number. For a heat pump rated COP 5.0 at A7/W35, the SCOP at the same W35 flow temp is typically 4.0-4.5 — about 10-20% lower. The reason: the SCOP includes the cold winter hours where COP drops to 2.5-3.0. SCOP is the more useful number for sizing annual running cost.",
        },
        {
          question:
            "What is SPF and how do I measure it?",
          answer:
            "SPF (Seasonal Performance Factor) is what the heat pump actually achieves in your specific home — measured by accumulating kWh of heat output and kWh of electricity input over a full year. Requires two meters: a heat meter (MID Class 2 calibrated, ~£400 fitted) on the flow + return pipework, and an electricity sub-meter on the dedicated heat pump circuit. SPF = (annual kWh heat) ÷ (annual kWh electricity). Real-world UK SPF data from Energy Systems Catapult's Electrification of Heat trial shows median ~2.8 for older retrofits, ~3.4 for newer well-tuned systems. SPF is always lower than SCOP because real homes have non-ideal conditions: under-sized radiators forcing higher flow temps, defrost cycles in winter, poor weather-compensation tuning, cylinder cycling at 60°C for Legionella, etc.",
        },
        {
          question:
            "What's a good SCOP to expect in a UK installer quote?",
          answer:
            "Depends entirely on flow temperature. At 35°C flow (underfloor heating or oversized radiators): SCOP 3.8–4.5 is typical for a quality unit. At 45°C flow (most radiator retrofits): SCOP 3.2–3.8. At 50–55°C flow (small or under-sized radiators): SCOP 2.6–3.2. If a quote gives you SCOP without specifying flow temperature, ask — it's meaningless without the temperature context. MCS-compliant quotes should always include SCOP at the design flow temperature. R290 propane heat pumps tend to top the league at low flow temps; R32 units are solid mid-range; R410A is older refrigerant phasing out.",
        },
        {
          question:
            "Why does the brand-A vs brand-B SCOP difference look small?",
          answer:
            "Because at the same flow temperature and same climate zone, all quality heat pumps from major manufacturers (Daikin, Mitsubishi, Vaillant, Samsung, LG, Bosch, Panasonic) are within a 10-20% SCOP band. Heat pump physics is the same; the marginal gains come from compressor design, refrigerant choice, control sophistication. So a quote showing Daikin SCOP 4.2 vs Vaillant SCOP 4.4 at the same flow temperature reflects roughly £40-£80/year running-cost difference for a typical 3-bed semi — real but small. The bigger swing factor is install quality (flow temperature, weather-comp tuning, sizing) — a good install of a 'worse' brand outperforms a poor install of a 'better' brand by 30%+ regularly.",
        },
        {
          question:
            "How does SCOP relate to my electricity bill?",
          answer:
            "Annual heat demand (kWh) ÷ SCOP = annual electricity consumption (kWh). For a typical UK 3-bed semi at 12,000 kWh heat demand: SCOP 3.5 means 3,430 kWh electricity; SCOP 4.0 means 3,000 kWh; SCOP 4.5 means 2,667 kWh. At a flat 28p/kWh tariff: SCOP 3.5 = £960/year, SCOP 4.5 = £747/year — a £213 difference. On a Cosy-blended 17p/kWh: £583 vs £453, a £130 difference. The SCOP gap matters but is dwarfed by tariff choice (worth £300-£500/year vs flat rate). Conclusion: SCOP is important but tariff selection is more important.",
        },
      ]}
      sources={[
        {
          name: "MCS — Heat pump installation standard MIS 3005",
          url: "https://mcscertified.com/standards/",
          accessedDate: "May 2026",
        },
        {
          name: "EN 14825 — Climate Zone definitions",
          url: "https://www.en-standard.eu/bs-en-14825/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Systems Catapult — Electrification of Heat trial",
          url: "https://es.catapult.org.uk/report/electrification-of-heat-final-report/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pump efficiency",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>The three numbers, in order of how you encounter them</h2>
      <p>
        Most UK homeowners meet these metrics in a specific
        sequence during the heat-pump journey:
      </p>
      <ol>
        <li>
          <strong>COP</strong> on the manufacturer&rsquo;s
          brochure and on price-comparison sites. Big number,
          optimistic, useful for cross-brand comparison only.
        </li>
        <li>
          <strong>SCOP</strong> on the MCS installer&rsquo;s
          quote. Annual-average number for the UK climate zone.
          This is the number that drives your running-cost
          estimate.
        </li>
        <li>
          <strong>SPF</strong> on your own meter once the
          install is commissioned. Real-world performance.
          Usually lower than the quoted SCOP by ~10-20%.
        </li>
      </ol>

      <h2>COP — what the brochure tells you</h2>
      <p>
        COP (Coefficient of Performance) is the instantaneous
        ratio of useful heat output to electricity input at a
        single defined operating point. The standard reference
        point is &ldquo;A7/W35&rdquo;: 7°C outside air, 35°C
        flow temperature.
      </p>
      <p>
        Example: a heat pump rated 8 kW heating capacity with
        2 kW electrical input at A7/W35 has a COP of 4.0 — for
        every 1 kWh of electricity it draws, it produces 4 kWh
        of heat.
      </p>
      <p>
        Because both A7 and W35 are mild operating conditions,
        COP is always the highest efficiency number you&rsquo;ll
        see. The brochure may also quote A2/W35 (2°C outside,
        the typical UK winter point) which is more honest but
        less flattering; COP at A2/W35 is typically 3.5-4.2 for
        the same unit that hits 5.0 at A7/W35.
      </p>

      <h2>SCOP — what your installer quote should declare</h2>
      <p>
        SCOP (Seasonal Coefficient of Performance) integrates
        COP across a whole year&rsquo;s typical conditions in
        a defined climate zone. EN 14825 defines three zones:
        Warm (e.g. southern Europe), Average (covering the UK),
        and Cold (e.g. Scandinavia).
      </p>
      <p>
        The calculation takes the heat pump&rsquo;s performance
        map (heat output and electricity input across a grid
        of outdoor-temperature × flow-temperature combinations)
        and weights it by the hours per year the UK climate
        spends at each outdoor-temperature bin. The result is
        a single annual-average efficiency.
      </p>
      <p>
        Typical UK 2026 SCOP figures by flow temperature for
        quality mid-market heat pumps:
      </p>
      <ul>
        <li><strong>W35 (underfloor or oversized rads):</strong> SCOP 3.8–4.5</li>
        <li><strong>W45 (typical radiator retrofit):</strong> SCOP 3.2–3.8</li>
        <li><strong>W50 (smaller existing rads):</strong> SCOP 2.9–3.4</li>
        <li><strong>W55 (under-sized rads, not ideal):</strong> SCOP 2.5–3.0</li>
      </ul>
      <p>
        SCOP without flow temperature is meaningless — always
        check the quote specifies both.
      </p>

      <h2>SPF — the truth metric</h2>
      <p>
        SPF (Seasonal Performance Factor) is the ONLY number
        that reflects how your specific heat pump performs in
        your specific home. SPF = (annual kWh of heat delivered)
        ÷ (annual kWh of electricity consumed by the heat pump).
      </p>
      <p>
        To measure SPF you need:
      </p>
      <ul>
        <li>
          <strong>A heat meter</strong> on the flow + return
          pipework between the heat pump and the rest of the
          system. MID Class 2 calibrated, ~£400 fitted. Most
          new MCS installs include one as standard.
        </li>
        <li>
          <strong>An electricity sub-meter</strong> on the
          dedicated heat pump circuit. Some units have this
          built into the indoor controller; others require a
          separate clamp + display.
        </li>
        <li>
          <strong>12 months of continuous logging</strong> —
          SPF only stabilises across a full heating season.
        </li>
      </ul>
      <p>
        Real-world UK SPF data from DESNZ-funded trials:
      </p>
      <ul>
        <li>
          <strong>Older retrofits (2015-2019):</strong> median SPF 2.6-2.9.
        </li>
        <li>
          <strong>Newer well-tuned installs (2022+):</strong> median SPF 3.2-3.6.
        </li>
        <li>
          <strong>Best-in-class examples:</strong> SPF 3.8-4.2 (well-insulated, W35 flow, smart tariff).
        </li>
      </ul>

      <h2>Why SPF is always lower than SCOP</h2>
      <p>
        SCOP assumes a single design flow temperature and
        well-tuned weather compensation. SPF reflects all the
        real-world deductions:
      </p>
      <ul>
        <li>
          <strong>Defrost cycles</strong> — air-source pumps
          periodically reverse to clear ice from the outdoor
          coil. Costs 5-10% of annual output.
        </li>
        <li>
          <strong>Cylinder reheat to 60°C</strong> for the
          weekly Legionella cycle. Forces flow temp above the
          design point briefly. Costs 1-2% annually.
        </li>
        <li>
          <strong>Suboptimal flow-temperature tuning.</strong>{" "}
          Most installers commission conservatively warm. Costs
          5-15% until the curve is tuned down.
        </li>
        <li>
          <strong>Cycling and standby losses</strong> — small
          but persistent.
        </li>
      </ul>
      <p>
        Sum of deductions: SPF typically 10-20% below quoted
        SCOP. So a SCOP-4.0 quote usually delivers SPF 3.2-3.6
        measured.
      </p>

      <h2>What this means for your decisions</h2>
      <p>
        Three practical implications:
      </p>
      <ol>
        <li>
          <strong>When comparing quotes:</strong> compare SCOP
          at the same flow temperature. A Vaillant W45 SCOP
          3.6 quote is roughly equivalent to a Daikin W45 SCOP
          3.7 quote — within measurement noise.
        </li>
        <li>
          <strong>When sizing radiators:</strong> oversize where
          you can. Going from W50 to W45 design temperature
          improves SCOP by ~10%; from W45 to W40 another ~10%.
          Larger radiators (or low-temp emitters like fan
          convectors) pay back across the 15-year pump life.
        </li>
        <li>
          <strong>When you have a metered install:</strong>{" "}
          check SPF at month 6 and month 12. If it&rsquo;s 25%+
          below the quoted SCOP, ring the installer — usually
          a weather-comp or sizing tweak fixes it.
        </li>
      </ol>

      <h2>The summary</h2>
      <p>
        COP is the brochure number; SCOP is the quote number;
        SPF is the truth number. SCOP varies primarily with
        flow temperature, not brand — so the most impactful
        decision is how to size emitters for low flow temps,
        not which manufacturer you pick. After install, measure
        SPF and tune the weather-comp curve to close the gap
        between SCOP and SPF. The combined effect of low flow
        temp + tuned controls + heat-pump-specific tariff is
        what makes a heat pump cleanly cheaper to run than gas.
      </p>
    </AEOPage>
  );
}
