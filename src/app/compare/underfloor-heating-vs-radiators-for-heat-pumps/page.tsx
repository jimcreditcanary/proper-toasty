// /compare/underfloor-heating-vs-radiators-for-heat-pumps — head-term
// install-decision comparison.
//
// Heat-pump-specific: a heat pump pairs well with both emitter
// types, but the choice between retrofit underfloor (UFH) and
// upgraded radiators is the most consequential install-time
// decision a UK homeowner makes after the brand pick. UFH delivers
// better SCOP through lower flow temperatures but costs much more
// to retrofit on existing floors; oversized radiators are cheaper
// but lose some efficiency.
//
// Editorial framing: neither emitter is universally right. The
// page works through the trade-offs (floor disruption, lifetime
// SCOP, install cost, BUS-grant treatment) so homeowners can have
// a concrete conversation with their installer.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/underfloor-heating-vs-radiators-for-heat-pumps";

export const metadata: Metadata = {
  title:
    "Underfloor heating vs radiators for heat pumps in 2026: UK install guide",
  description:
    "Heat pumps work with both, but the choice affects SCOP, install cost, and disruption. £1,500–£5,500 for radiator upgrades vs £6,000–£15,000 for retrofit UFH.",
  alternates: { canonical: URL },
  openGraph: {
    title:
      "Underfloor heating vs radiators for heat pumps in 2026: UK install guide",
    description:
      "Emitter choice for a UK heat-pump install — cost, efficiency, and disruption trade-offs.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function UnderfloorVsRadiatorsForHeatPumps() {
  return (
    <AEOPage
      headline="Underfloor heating vs radiators for heat pumps in 2026: what to choose"
      description="Heat pumps work with both, but the choice affects SCOP, install cost, and disruption. £1,500–£5,500 for radiator upgrades vs £6,000–£15,000 for retrofit UFH."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Install"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Underfloor heating vs radiators for heat pumps" },
      ]}
      directAnswer="Heat pumps work efficiently with both underfloor heating (UFH) and properly-sized radiators. UFH typically delivers a slightly higher SCOP (4.5–5.0 vs 3.8–4.5 on rads) because it runs at lower flow temperatures (35–40°C vs 45–55°C). The trade-off is cost: retrofitting wet UFH to an existing UK home costs £6,000–£15,000 vs £1,500–£5,500 to upgrade radiators. For new builds and renovations where floors are already up, UFH usually wins. For most retrofit installs, upgraded rads are the cheaper, faster path."
      tldr={[
        "Heat pumps work with both — neither is mandatory.",
        "SCOP advantage to UFH (4.5–5.0 vs 3.8–4.5 on rads) translates to £80–£200/year of running-cost saving.",
        "Retrofit UFH costs £6,000–£15,000 + significant floor disruption; radiator upgrades cost £1,500–£5,500.",
        "BUS grant £7,500 applies whether you choose UFH or radiators — both are MCS-eligible.",
        "Hybrid approach (UFH on ground floor, radiators upstairs) is common and works well.",
      ]}
      faqs={[
        {
          question:
            "Can I just keep my existing radiators when I install a heat pump?",
          answer:
            "Sometimes, but usually 1–4 rooms need radiator upgrades. Heat pumps deliver heat at 45–55°C vs a gas boiler's 70–80°C — to deliver the same room-warming watts, the radiators need to be physically larger (more surface area). A heat-loss survey tells you which rooms need upgrades; small bedrooms often pass, larger living rooms often don't. Some installers absorb 2–4 rad upgrades within the BUS-funded scope. Don't assume universal upgrade or universal keep — depends on each room.",
        },
        {
          question:
            "Why is underfloor heating more efficient with a heat pump?",
          answer:
            "Heat pumps work most efficiently at low flow temperatures (35–40°C) because the compressor doesn't have to work as hard to compress the refrigerant to a higher temperature. UFH spreads heat across a large surface area (the entire floor), so it can warm a room effectively at 35–40°C; radiators are concentrated heat sources, so they need 45–55°C to deliver equivalent room warming. Every 5°C lower on flow temperature is roughly 10% better SCOP. The full UFH-vs-rads gap is typically 10–20% SCOP advantage.",
        },
        {
          question:
            "Is there any BUS grant boost for choosing underfloor heating?",
          answer:
            "No — the £7,500 Boiler Upgrade Scheme grant is flat regardless of emitter choice. The grant covers the heat pump unit + standard install. UFH adds onto the project cost on top of the grant. Some installers will absorb part of the rad-upgrade cost within the BUS scope; very few will absorb the much larger UFH retrofit cost. Get explicit quotes for the heat pump alone, heat pump + radiator upgrades, and heat pump + UFH so you can compare.",
        },
        {
          question:
            "Can I retrofit UFH on top of existing floors without lifting them?",
          answer:
            "There are low-profile retrofit UFH systems (~15–25mm) that lay on top of existing floors and beneath new flooring. They cost less than full lift-and-install UFH but more than radiator upgrades. Practical implications: doorways need rehanging, room heights drop slightly, and the warming-up time is longer than embedded UFH because there's less thermal mass. Worth getting a quote if you're refurbishing flooring anyway; usually not worth doing as a standalone project.",
        },
      ]}
      sources={[
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Underfloor heating",
          url: "https://energysavingtrust.org.uk/advice/underfloor-heating/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Air source heat pumps",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "BSRIA — Underfloor heating design guidance",
          url: "https://www.bsria.com/uk/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="Underfloor heating vs radiators with a heat pump — typical UK numbers"
        headers={[
          "",
          "Wet underfloor heating (UFH)",
          "Upgraded radiators",
          "Hybrid (UFH downstairs + rads up)",
        ]}
        rows={[
          ["Typical retrofit cost", "£6,000–£15,000", "£1,500–£5,500", "£4,500–£10,000"],
          ["Best-case flow temperature", "35–40 °C", "45–55 °C", "40–50 °C blended"],
          ["Typical heat-pump SCOP", "4.5–5.0", "3.8–4.5", "4.2–4.7"],
          ["Running cost on typical home", "£800–£1,200/yr", "£900–£1,400/yr", "£850–£1,300/yr"],
          ["Floor disruption", "Significant (lift, screed, re-floor)", "None", "Significant on ground floor only"],
          ["Install time", "1–3 weeks", "1–3 days", "1–2 weeks"],
          ["Warm-up time room → comfort", "2–4 hours", "30–60 minutes", "Room-dependent"],
          ["Comfort character", "Even, gentle", "Localised, faster", "Mixed by room"],
          ["BUS grant eligible?", "Yes (with MCS heat pump)", "Yes (with MCS heat pump)", "Yes (with MCS heat pump)"],
          ["Best fit", "New build / renovation", "Most retrofits", "Mixed: refurbishing ground floor only"],
        ]}
        footnote="Cost ranges are for a typical UK 3-bed semi (~110 m²). Specific numbers depend on existing floor construction, radiator sizing, and installer quote."
      />

      <h2>Why flow temperature matters</h2>
      <p>
        A heat pump&rsquo;s efficiency (SCOP) depends heavily on how
        much it has to lift the refrigerant temperature. At a flow
        temperature of 35°C, a typical air-source heat pump runs at
        SCOP 4.8–5.0. At 55°C the same unit drops to 3.8–4.2. The
        physics is unavoidable: the bigger the temperature delta
        the compressor has to span, the more electricity it uses
        per kWh of heat delivered.
      </p>
      <p>
        Underfloor heating works at 35–40°C because it spreads heat
        across the entire floor — a 16 m² living-room floor at
        38°C delivers more warming power than a 1.5 m² radiator at
        55°C, even though the radiator is hotter per square metre.
        Radiators concentrate the heat, so they need to be hotter
        (or much bigger) to deliver equivalent room warming.
      </p>
      <p>
        Upgrading radiators to oversized &ldquo;low-temperature&rdquo; versions
        (typically 30–50% larger surface area than gas-boiler-era
        rads) closes most of the efficiency gap. A properly-sized
        radiator system runs at 45–50°C with the heat pump at
        SCOP 4.2–4.5 — close to but not matching UFH&rsquo;s
        4.8–5.0.
      </p>

      <h2>The retrofit cost story</h2>
      <p>
        Where UFH and radiators diverge sharply is install cost in
        existing homes. A typical 3-bed UK semi:
      </p>
      <ul>
        <li>
          <strong>Radiator upgrades:</strong> £1,500–£5,500 to
          swap 4–8 rads for low-temperature versions, plus any
          pipework if existing 10mm microbore needs upsizing to
          15mm. Disruption is minimal — installer in for 1–3 days,
          minor decorating where rads are replaced.
        </li>
        <li>
          <strong>Full wet UFH retrofit:</strong> £6,000–£15,000
          depending on floor construction. Suspended timber floors
          mean lifting boards + insulating beneath + laying pipe;
          solid concrete means either chasing in or building up
          (with the screed / new floor finish that implies). 1–3
          weeks of disruption per area; you typically can&rsquo;t
          live in the room while UFH is being installed.
        </li>
        <li>
          <strong>Low-profile retrofit UFH:</strong> £4,000–£10,000.
          15–25mm panels laid on top of existing floors then
          covered by new flooring. Less efficient than embedded UFH
          (less thermal mass) but much less disruptive. Doorways
          often need rehanging.
        </li>
      </ul>
      <p>
        The £6,000–£15,000 cost gap means UFH retrofit needs to
        recover ~£300–£700/year of running-cost saving to pay back
        in 20 years. In practice the SCOP advantage delivers
        £80–£200/year. UFH retrofit doesn&rsquo;t pay back on
        running cost alone — it pays back on comfort, resale value,
        and the absence of visible radiators.
      </p>

      <h2>When UFH is the right call</h2>
      <p>
        Three scenarios where UFH makes sense even with the cost
        premium:
      </p>
      <ul>
        <li>
          <strong>New builds and major renovations.</strong> If
          the floors are coming up anyway (renovation, extension,
          new build), the incremental UFH cost shrinks dramatically
          — typically £40–£70/m² vs £150–£250/m² for retrofit on
          existing floors. The SCOP advantage compounds over 20
          years.
        </li>
        <li>
          <strong>Solid floors with no thermal break.</strong>{" "}
          Some older ground-floor concrete slabs benefit from the
          insulation work that UFH retrofit includes. The fabric
          improvement is real even before accounting for the
          heating efficiency.
        </li>
        <li>
          <strong>Comfort priority.</strong> Underfloor heat
          delivers an even, draught-free warmth that radiators
          can&rsquo;t match. For owner-occupiers with long-term
          comfort priorities (children playing on floors, bare
          feet, large open-plan spaces), the cost premium maps to
          a lived-experience improvement.
        </li>
      </ul>

      <h2>When upgraded radiators are the right call</h2>
      <ul>
        <li>
          <strong>Most existing-home retrofits.</strong> The
          cost-per-comfort calculation usually favours rads in a
          property where you don&rsquo;t need to disturb floors.
          The 0.3–0.5 SCOP advantage of UFH translates to
          £80–£200/year on a typical home — slow payback against
          the £4,500+ incremental cost.
        </li>
        <li>
          <strong>Older properties with sensitive floors.</strong>{" "}
          Original Victorian / Edwardian floor tiling, parquet, or
          listed-building heritage flooring often can&rsquo;t be
          disturbed. Radiator upgrade keeps the floor intact.
        </li>
        <li>
          <strong>Phased retrofit.</strong> Some homeowners install
          a heat pump now with existing radiators and upgrade
          rooms-by-room over time as decoration cycles allow.
          That&rsquo;s a sensible spread-the-cost strategy.
        </li>
      </ul>

      <h2>The hybrid approach (UFH downstairs, rads upstairs)</h2>
      <p>
        A common UK heat-pump install pattern: UFH on the ground
        floor (where floors are easier to lift, especially in
        properties already getting solid-floor work), upgraded
        radiators on the first floor and above. The heat pump runs
        at the lower of the two zone setpoints, blending toward
        UFH&rsquo;s 35–40°C in mild weather and stepping up toward
        50°C for the radiator circuit only on cold days.
      </p>
      <p>
        Cost typically lands between full UFH and full rads —
        £4,500–£10,000 for a 3-bed UK semi depending on ground-floor
        size. SCOP lands at 4.2–4.7, capturing most of UFH&rsquo;s
        efficiency advantage without the upstairs retrofit cost.
        Probably the best practical answer for most retrofitters
        in 2026 if they have the budget headroom for a partial UFH
        install.
      </p>

      <h2>What to ask your installer</h2>
      <ol>
        <li>
          What flow temperature have you sized for, and what SCOP
          does that imply? Anything above 50°C should prompt a
          discussion about rad upgrades.
        </li>
        <li>
          Which rooms can keep existing radiators? Which need
          upgrades? Get the heat-loss survey breakdown per room.
        </li>
        <li>
          What does a UFH option for the ground floor add to the
          quote, and how does that change the projected SCOP?
        </li>
        <li>
          Will rad upgrades or UFH be funded within the BUS scope,
          or quoted separately?
        </li>
      </ol>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to get the BUS-eligibility verdict + indicative system
          size for your property.
        </li>
        <li>
          When briefing installers, ask for three options:
          heat pump alone (with existing emitters), heat pump +
          rad upgrades, heat pump + ground-floor UFH. The
          incremental cost-per-SCOP-point is what to compare.
        </li>
        <li>
          If you&rsquo;re doing any flooring work in the next 2–3
          years anyway (kitchen refurb, extension, new build),
          time the UFH install to coincide. The incremental cost
          drops by 50–70% when the floor is already up.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Heat pumps work efficiently with both UFH and properly-sized
        radiators. UFH delivers a real but modest SCOP advantage
        (~£80–£200/year on a typical home). Retrofit UFH costs
        £6,000–£15,000 on existing floors — the cost gap means
        UFH retrofit doesn&rsquo;t pay back on running-cost alone;
        it pays back on comfort and resale. For new builds and
        major renovations, UFH is usually the right call. For
        most retrofits, radiator upgrades are the cheaper, faster
        path. The hybrid approach (UFH on ground floor, rads
        upstairs) is the practical middle ground.
      </p>
    </AEOPage>
  );
}
