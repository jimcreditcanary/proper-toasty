// /compare/air-to-air-vs-air-to-water-heat-pump — head-term comparison.
//
// Heat-pump-type comparison most UK homeowners don't realise they
// need until an installer mentions both. Air-to-air heat pumps
// (basically reverse-cycle air conditioning) deliver heat as warm
// air via wall-mounted indoor units; air-to-water heat pumps
// circulate heated water through radiators / underfloor.
//
// The BUS asymmetry is the headline: only air-to-WATER qualifies
// for the £7,500 grant. Air-to-air typically costs £3,000-£8,000
// to install — cheaper than air-to-water pre-grant, much more
// expensive than air-to-water AFTER the grant. The comparison
// favours air-to-water for almost every UK home except specific
// niches (no wet-system property, rental units, summer cooling
// priority).

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/air-to-air-vs-air-to-water-heat-pump";

export const metadata: Metadata = {
  title:
    "Air-to-air vs air-to-water heat pump in 2026: UK BUS + cooling guide",
  description:
    "Only air-to-WATER qualifies for the £7,500 BUS grant. Air-to-air heat pumps are cheaper to install but lose the grant + can't heat your hot water.",
  alternates: { canonical: URL },
  openGraph: {
    title:
      "Air-to-air vs air-to-water heat pump in 2026: UK BUS + cooling guide",
    description:
      "When each type makes sense for UK homes — worked through with 2026 numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function AirToAirVsAirToWaterHeatPump() {
  return (
    <AEOPage
      headline="Air-to-air vs air-to-water heat pump in 2026: which fits a UK home?"
      description="Only air-to-WATER qualifies for the £7,500 BUS grant. Air-to-air heat pumps are cheaper to install but lose the grant + can't heat your hot water."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heat pump type"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Air-to-air vs air-to-water heat pump" },
      ]}
      directAnswer="Air-to-water heat pumps circulate heated water through your existing or upgraded radiators/underfloor heating, plus a cylinder for hot water — and they qualify for the £7,500 Boiler Upgrade Scheme grant. Air-to-air heat pumps deliver heat as warm air via wall-mounted indoor units (like reverse-cycle air conditioning) and don't qualify for BUS. After the grant, air-to-water typically costs £1,500–£6,500 net vs air-to-air's £3,000–£8,000 unfunded — so for most UK homes with a wet heating system, air-to-water wins decisively."
      tldr={[
        "BUS grant £7,500: air-to-WATER eligible; air-to-air NOT eligible.",
        "Heat delivery: air-to-water via radiators/UFH + cylinder; air-to-air via wall-mounted indoor cassettes only.",
        "Hot water: air-to-water heats it via cylinder coil; air-to-air can't — you need separate hot-water heating.",
        "Net upfront cost: air-to-water £1,500–£6,500 after BUS; air-to-air £3,000–£8,000 unfunded.",
        "Air-to-air's niche: properties with no wet system (some flats, rentals, summer-cooling-priority homes).",
      ]}
      faqs={[
        {
          question:
            "Why doesn't the BUS grant cover air-to-air heat pumps?",
          answer:
            "Ofgem's BUS guidance restricts the £7,500 grant to systems that replace fossil-fuel-based wet heating — i.e. systems that deliver heat via a hydronic (water-based) circuit, which is what UK homes overwhelmingly use. Air-to-air heat pumps deliver heat as air directly into rooms and don't connect to a hot-water cylinder, so they don't replace the wet heating system in the way the scheme is designed to fund. Air-to-water heat pumps (mainstream UK heat pumps) replace the boiler in the wet system and qualify for the grant.",
        },
        {
          question:
            "Can air-to-air heat pumps actually heat a UK home in winter?",
          answer:
            "Yes — modern air-to-air units (often marketed as 'air conditioning with heating mode') maintain output to -15°C and beyond, well within typical UK winter conditions. The practical limits are: each indoor cassette only heats the room it's in, so multi-room coverage requires multiple cassettes (typically £800-£1,500 each); rooms cool quickly when the unit is off because there's no thermal mass like a hot-water radiator system; and they don't provide hot water. For whole-home heating they work but cost more in install + electricity than a properly-sized air-to-water heat pump on the BUS grant.",
        },
        {
          question:
            "What does air-to-air do for hot water?",
          answer:
            "Nothing directly. Air-to-air heat pumps only heat air — they have no water circuit. Homes with air-to-air heat pumps still need a separate hot-water solution: a stand-alone electric immersion cylinder (1:1 efficiency, expensive to run), an instant electric shower system, or a gas / oil-fired water heater (defeats the decarbonisation purpose). This is one of the main reasons air-to-water wins for most UK homes: the heat pump heats the cylinder via a coil, so one system handles both space heating AND hot water.",
        },
        {
          question:
            "Is air-to-air a sensible choice for a flat or rental property?",
          answer:
            "Sometimes. Flats with no existing wet heating system (direct-electric or storage-heater homes) face a high cost to retrofit a wet system to support air-to-water — pipework, radiators, cylinder, all new. Air-to-air installs without that pipework cost: wall-mount the indoor unit, run a refrigerant pipe to the outdoor unit. For some flats and rental properties, air-to-air's lower install cost is the practical answer even without the BUS grant. For properties that ALREADY have a wet system, air-to-water is the cleaner upgrade path.",
        },
      ]}
      sources={[
        {
          name: "Ofgem — Boiler Upgrade Scheme eligibility",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
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
          name: "DESNZ — Heat and Buildings Strategy",
          url: "https://www.gov.uk/government/publications/heat-and-buildings-strategy",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="Air-to-water vs air-to-air heat pump — typical UK numbers in 2026"
        headers={[
          "",
          "Air-to-water heat pump",
          "Air-to-air heat pump",
        ]}
        rows={[
          ["What it heats", "Radiators / UFH + hot water cylinder", "Air direct into rooms via cassettes"],
          ["Hot water?", "Yes (cylinder coil)", "No (separate system needed)"],
          ["Install cost (pre-grant)", "£8,000–£14,000", "£3,000–£8,000"],
          ["BUS grant", "−£7,500 (E&W)", "— (not eligible)"],
          ["Net upfront cost", "£1,500–£6,500", "£3,000–£8,000"],
          ["Typical SCOP", "3.8–5.0 (W35–W55)", "3.5–4.5"],
          ["Cold-weather performance", "Strong — radiators have thermal mass", "Drops off — no thermal mass"],
          ["Cooling capability?", "Some models (reversible)", "Yes (it IS air conditioning)"],
          ["Multi-room install", "1 outdoor + cylinder, all radiators heat", "1 outdoor + cassette per room"],
          ["Indoor unit visibility", "None (it's plumbed)", "Wall-mounted cassette in each room"],
          ["Lifespan", "15–20 years", "10–15 years"],
          ["MCS-certified products?", "Yes (BUS requires)", "Yes (for ErP rating, but BUS-irrelevant)"],
        ]}
        footnote="Ranges are typical for a 3-bed UK semi (~110 m²). Multi-cassette air-to-air installs scale linearly with room count; air-to-water uses one outdoor unit for the whole home."
      />

      <h2>The BUS-grant gap is the headline</h2>
      <p>
        Ofgem&rsquo;s Boiler Upgrade Scheme funds heat-pump installs
        that replace fossil-fuel wet heating. Air-to-water heat
        pumps replace a gas/oil boiler in a hydronic system —
        squarely in scope. Air-to-air heat pumps deliver heat as
        air directly into rooms and don&rsquo;t connect to a wet
        system; they fall outside scope.
      </p>
      <p>
        The practical effect: a typical 3-bed UK home installing
        air-to-water pays £1,500–£6,500 net after the £7,500
        grant. The same home installing air-to-air pays
        £3,000–£8,000 (whole-home multi-cassette) with no grant
        offset. Air-to-air&rsquo;s lower pre-grant cost looks
        attractive in isolation; the grant turns the comparison
        decisively toward air-to-water.
      </p>

      <h2>What each actually delivers</h2>
      <p>
        <strong>Air-to-water:</strong> One outdoor unit (the heat
        pump itself) connects to your home&rsquo;s wet heating
        system. Heated water circulates through radiators or
        underfloor heating. The same heat pump also heats a hot
        water cylinder via a coil, so one system handles both
        space heating AND hot water. Lifespan 15–20 years.
        Mainstream UK heat-pump pattern; what every BUS-funded
        install looks like.
      </p>
      <p>
        <strong>Air-to-air:</strong> One outdoor unit (typically
        an air conditioning condenser) connects to one or more
        indoor wall-mounted cassettes. Each cassette heats the
        room it&rsquo;s in by blowing warm air. No water circuit,
        no radiators, no underfloor, no cylinder integration. For
        whole-home heating you need a cassette per room or zone
        — typically 4–8 cassettes for a 3-bed home. Lifespan
        10–15 years (air-conditioning lifespan, shorter than
        hydronic heat pumps). Common in countries without wet-
        heating traditions; less common in UK retrofits but
        growing in new builds + rentals.
      </p>

      <h2>When air-to-water wins (almost always)</h2>
      <p>
        Three reasons air-to-water is the right pick for most UK
        homes:
      </p>
      <ul>
        <li>
          <strong>The £7,500 BUS grant.</strong> Air-to-water nets
          out cheaper than air-to-air after the grant for a typical
          3-bed semi. Hard to overstate this — the grant is the
          decisive economic difference.
        </li>
        <li>
          <strong>Hot water included.</strong> Air-to-water heats
          your hot water cylinder as part of the same system. Air-
          to-air needs a separate hot-water solution (immersion,
          dedicated electric water heater, or — defeating the
          decarbonisation purpose — a retained fossil-fuel water
          heater).
        </li>
        <li>
          <strong>Wet-system continuity.</strong> Most UK homes
          have existing radiators and pipework. Air-to-water uses
          that system (with rad upgrades where needed). Air-to-air
          requires installing a new heat distribution method
          (cassettes per room) parallel to your existing
          radiators, which become defunct.
        </li>
      </ul>

      <h2>When air-to-air still makes sense (narrow but real)</h2>
      <ul>
        <li>
          <strong>Properties with no existing wet heating
          system.</strong> Direct-electric or storage-heater homes
          would need a full wet-system retrofit (pipework,
          radiators, cylinder) to support air-to-water — typically
          £4,000–£10,000 on top of the heat pump. For smaller
          properties (1–2 bed flats), air-to-air avoids that
          retrofit cost entirely. The maths sometimes favours
          air-to-air for these properties even without BUS, but
          for properties that ALREADY have radiators it&rsquo;s
          almost never the right call.
        </li>
        <li>
          <strong>Rental properties where landlords block
          plumbing work.</strong> Some leasehold or rental
          situations prevent the pipework / radiator changes that
          air-to-water needs. Air-to-air&rsquo;s wall-mounted
          format requires only a wall penetration for the
          refrigerant pipe, which is more often consentable.
          Tenant- or short-term-owner-installable.
        </li>
        <li>
          <strong>Summer cooling priority.</strong> Air-to-air
          provides genuine air-conditioning cooling in summer (the
          same equipment runs in reverse). UK summers are warming
          and home cooling demand is rising; air-to-air covers
          this natively. Air-to-water heat pumps can do some
          cooling via cooled-water radiators or fan coils, but
          the cooling effect is much smaller than air-blown
          cassettes. Households where summer cooling matters as
          much as winter heating sometimes choose air-to-air on
          this basis alone, accepting the BUS grant loss.
        </li>
      </ul>

      <h2>Hybrid configurations</h2>
      <p>
        Some properties run BOTH systems: an air-to-water heat
        pump on a BUS-funded install for whole-home space + hot
        water heating, AND a smaller air-to-air unit (typically
        a 2.5–3.5 kW single split) in a living room or master
        bedroom for summer cooling. The air-to-water is the BUS-
        funded primary system; the air-to-air is a separate, much
        smaller, cooling-focused install at £1,500–£3,500. This
        is increasingly common in 2026 UK installs where comfort
        considerations span both winter heating and summer
        cooling.
      </p>

      <h2>What to ask your installer</h2>
      <ol>
        <li>
          If you&rsquo;ve been quoted air-to-air: <strong>Why
          aren&rsquo;t you proposing air-to-water with the BUS
          grant?</strong> If the property has any wet heating, the
          honest answer should reference a specific reason (cost
          of pipework retrofit, lease restrictions, etc.).
        </li>
        <li>
          If your property has no wet heating: <strong>What does
          the full wet-system retrofit + air-to-water cost vs
          air-to-air?</strong> Sometimes air-to-water still wins
          on net cost after the BUS grant absorbs the heat-pump
          portion, but the pipework + radiator cost can flip the
          maths.
        </li>
        <li>
          If summer cooling matters: <strong>Can you spec an
          air-to-water heat pump with reversible operation, OR
          air-to-water + a small air-to-air unit as a hybrid?</strong>{" "}
          Most installers will know either path.
        </li>
      </ol>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to confirm BUS eligibility + get an installer-ready
          report for your property.
        </li>
        <li>
          If you&rsquo;re leaning air-to-air, ask 2–3 installers
          to ALSO quote air-to-water with BUS — comparing net
          costs after grant.
        </li>
        <li>
          For new-build / pipework-free properties, get explicit
          quotes for both options and the wet-system retrofit
          cost separately, so the maths is transparent.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        For most UK homes with existing wet heating (radiators or
        underfloor), air-to-water heat pumps are decisively the
        right pick because the £7,500 BUS grant + the integrated
        hot-water capability tilt the economics hard in their
        favour. Air-to-air retains a real niche for properties
        with no wet system, lease-restricted properties, and
        households where summer cooling priority matters more
        than the grant saving. Hybrid configurations (air-to-water
        primary + small air-to-air for cooling) are growing in
        2026 as summer cooling demand rises.
      </p>
    </AEOPage>
  );
}
