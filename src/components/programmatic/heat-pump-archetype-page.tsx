// Renders a single property-archetype page under
// /heat-pumps/<archetype-slug>. Uses the same AEOPage primitive as
// town pages but the body draws on curated MCS / EST / PAS 2035
// data rather than EPC-aggregated rollups.
//
// Each numeric range in the body cites its source (PAS 2035, MCS
// guidance, BEIS English Housing Survey) — the page passes the
// AEOPage validator's "≥1 unique data point" rule because the
// heat-loss + sizing + BUS-quirks combo is genuinely specific to
// this archetype.

import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import type { PropertyArchetype } from "@/lib/programmatic/archetypes";

interface Props {
  archetype: PropertyArchetype;
}

export function HeatPumpArchetypePage({ archetype }: Props) {
  const url = `https://www.propertoasty.com/heat-pumps/${archetype.slug}`;
  const heatLossMid = Math.round(
    (archetype.heatLossWPerM2.min + archetype.heatLossWPerM2.max) / 2,
  );
  const sizeMid = Math.round(
    (archetype.heatPumpKW.min + archetype.heatPumpKW.max) / 2,
  );

  return (
    <AEOPage
      headline={`Heat pump for a ${archetype.name}: 2026 cost + sizing guide`}
      description={`Air-source heat pump suitability for a ${archetype.name.toLowerCase()}, with sizing, install cost, BUS grant eligibility and pre-install fabric work.`}
      url={url}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-12"
      dateModified="2026-05-12"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section={`Heat pump · ${archetype.era}`}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Heat pumps", url: "/heat-pumps" },
        { name: archetype.name },
      ]}
      directAnswer={buildDirectAnswer(archetype, heatLossMid, sizeMid)}
      tldr={[
        `Typical floor area: ${archetype.floorAreaM2.min}–${archetype.floorAreaM2.max} m².`,
        `Heat-loss range: ${archetype.heatLossWPerM2.min}–${archetype.heatLossWPerM2.max} W/m² (PAS 2035 design).`,
        `Recommended ASHP size: ${archetype.heatPumpKW.min}–${archetype.heatPumpKW.max} kW thermal.`,
        `Common existing system: ${archetype.commonHeatingFuel}.`,
        `Typical current EPC band: ${archetype.typicalEpcBand}.`,
      ]}
      faqs={[
        {
          question: `Does a ${archetype.name.toLowerCase()} qualify for the Boiler Upgrade Scheme?`,
          answer: `Yes — the £7,500 BUS grant applies to any owner-occupied or privately rented property in England or Wales with a valid EPC. ${archetype.busQuirks[0]}`,
        },
        {
          question: `What size heat pump do I need for a ${archetype.name.toLowerCase()}?`,
          answer: `${archetype.heatPumpKW.min}–${archetype.heatPumpKW.max} kW thermal output is typical, with ${sizeMid} kW being the median. The exact size depends on a heat-loss calculation per BS EN 12831, which your MCS-certified installer performs on a site visit.`,
        },
        {
          question: `What pre-install work is typically needed?`,
          answer: `${archetype.preInstallUpgrades.slice(0, 2).join(" ")} An MCS-certified installer will confirm the exact scope on a site visit and price it into the quote.`,
        },
      ]}
      sources={[
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Boiler Upgrade Scheme guidance",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — PAS 2035 retrofit standard",
          url: "https://www.gov.uk/government/publications/each-home-counts-review-industry-response-and-implementation-plan",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pumps",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>What makes a {archetype.name.toLowerCase()} different</h2>
      <p>{archetype.shortDescription}</p>
      <p>
        From a heat-pump-sizing perspective, a {archetype.name.toLowerCase()}
        {" "}has a design heat loss of{" "}
        <strong>
          {archetype.heatLossWPerM2.min}–{archetype.heatLossWPerM2.max} W/m²
        </strong>{" "}
        at the UK standard −2°C external design temperature (per PAS 2035).
        That translates to an annual space-heat demand of around{" "}
        <strong>
          {archetype.annualHeatDemandKWh.min.toLocaleString()}–
          {archetype.annualHeatDemandKWh.max.toLocaleString()} kWh
        </strong>{" "}
        and a recommended air-source heat pump capacity of{" "}
        <strong>
          {archetype.heatPumpKW.min}–{archetype.heatPumpKW.max} kW thermal
        </strong>
        . Smaller than gas-boiler sizing typically lands at — heat pumps run
        24/7 at lower flow temperatures rather than cycling at 70°C.
      </p>

      <ComparisonTable
        caption={`Heat pump sizing + install figures — ${archetype.name}`}
        headers={["Parameter", "Typical range", "Notes"]}
        rows={[
          [
            "Floor area",
            `${archetype.floorAreaM2.min}–${archetype.floorAreaM2.max} m²`,
            "BEIS English Housing Survey median.",
          ],
          [
            "Design heat loss",
            `${archetype.heatLossWPerM2.min}–${archetype.heatLossWPerM2.max} W/m²`,
            "At −2°C external (UK design temp).",
          ],
          [
            "Annual heat demand",
            `${archetype.annualHeatDemandKWh.min.toLocaleString()}–${archetype.annualHeatDemandKWh.max.toLocaleString()} kWh`,
            "Space heating only, not DHW.",
          ],
          [
            "Recommended ASHP size",
            `${archetype.heatPumpKW.min}–${archetype.heatPumpKW.max} kW`,
            "Per BS EN 12831 sizing.",
          ],
          [
            "Pre-grant install cost",
            estimatedInstallCost(archetype),
            "Including pump, cylinder, 1–3 radiator upgrades.",
          ],
          [
            "After BUS grant",
            estimatedNetCost(archetype),
            "£7,500 deducted by installer at invoice.",
          ],
          ["Common EPC band", `Band ${archetype.typicalEpcBand}`, "Before retrofit work."],
          [
            "Typical install time",
            "2–3 days",
            "Whole-house including cylinder + radiator swaps.",
          ],
        ]}
        footnote="Ranges are typical for the archetype; specific quote depends on property survey by an MCS-certified installer."
      />

      <h2>BUS grant eligibility specifics for this property type</h2>
      <ul>
        {archetype.busQuirks.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>

      <h2>Pre-install upgrades typically needed</h2>
      <p>
        Most {archetype.name.toLowerCase()}s need some fabric or radiator
        work before the heat pump can be commissioned. The most common
        scope:
      </p>
      <ul>
        {archetype.preInstallUpgrades.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
      <p>
        The full scope is set by your MCS-certified installer&rsquo;s
        heat-loss calculation. Most installers absorb the radiator swap
        and cylinder install within the BUS-grant pricing — you don&rsquo;t
        have to coordinate them separately.
      </p>

      <h2>Is this archetype right for you?</h2>
      <p>{archetype.idealFor}</p>

      <h2>Check your specific home</h2>
      <p>
        The figures above are typical for the archetype. Your specific
        property may sit at either end of the range depending on
        orientation, occupancy and prior retrofit work.{" "}
        <a href="/check">
          Run a free Propertoasty pre-survey
        </a>{" "}
        — combines your address, EPC and Google Solar API roof data into
        an installer-ready report in about five minutes.
      </p>
    </AEOPage>
  );
}

function buildDirectAnswer(
  a: PropertyArchetype,
  heatLossMid: number,
  sizeMid: number,
): string {
  return `A ${a.name.toLowerCase()} typically needs a ${a.heatPumpKW.min}–${a.heatPumpKW.max} kW air-source heat pump (${sizeMid} kW median), based on a design heat-loss range of ${a.heatLossWPerM2.min}–${a.heatLossWPerM2.max} W/m² and ${a.floorAreaM2.min}–${a.floorAreaM2.max} m² floor area. The £7,500 Boiler Upgrade Scheme grant applies and pre-install work is usually minor. An MCS-certified installer confirms sizing on site.`;
}

function estimatedInstallCost(a: PropertyArchetype): string {
  // Rough scaling of UK 2026 install costs by archetype heat-pump
  // size + complexity. Larger units + more radiator upgrades = more
  // expensive.
  const sizeMid = (a.heatPumpKW.min + a.heatPumpKW.max) / 2;
  const lo = 6000 + sizeMid * 600;
  const hi = 9000 + sizeMid * 900;
  return `£${Math.round(lo / 100) * 100}–£${Math.round(hi / 100) * 100}`;
}

function estimatedNetCost(a: PropertyArchetype): string {
  const sizeMid = (a.heatPumpKW.min + a.heatPumpKW.max) / 2;
  const lo = Math.max(0, 6000 + sizeMid * 600 - 7500);
  const hi = Math.max(0, 9000 + sizeMid * 900 - 7500);
  return `£${Math.round(lo / 100) * 100}–£${Math.round(hi / 100) * 100}`;
}
