// /guides/mcs-site-visit-what-to-expect — MCS site visit explainer.
//
// Second production guide. Walks homeowners through what
// actually happens during an MCS-certified installer's site
// visit — typically 60-120 minutes, covers heat-loss survey,
// emitter assessment, outdoor unit siting + acoustic check,
// electrical assessment, cylinder/buffer location, and the
// final quote conversation. Most search results for this query
// are installer-affiliate fluff; an editorial step-by-step from
// the homeowner's perspective fills a gap.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/mcs-site-visit-what-to-expect";

export const metadata: Metadata = {
  title: "MCS heat pump site visit: what to expect in 2026 (UK homeowner guide)",
  description:
    "Step-by-step of what happens during an MCS-certified installer's heat-pump site visit. Timeline, what they check, what they ask, what to prepare.",
  alternates: { canonical: URL },
  openGraph: {
    title: "MCS heat pump site visit: what to expect in 2026 (UK homeowner guide)",
    description:
      "Practical walkthrough of an MCS heat-pump site visit from the homeowner's perspective.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function McsSiteVisitWhatToExpect() {
  return (
    <AEOPage
      headline="What happens during an MCS heat-pump site visit in 2026"
      description="Step-by-step of what happens during an MCS-certified installer's heat-pump site visit. Timeline, what they check, what they ask, what to prepare."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · Install process"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "MCS site visit: what to expect" },
      ]}
      directAnswer="An MCS-certified installer's site visit takes 60–120 minutes and produces the data needed for a binding quote: a room-by-room heat-loss survey (BS EN 12831), assessment of existing radiators / pipework / cylinder, outdoor unit siting + MCS 020 acoustic check, electrical supply review, and a final discussion of system size, BUS grant, and timeline. The homeowner's job is to give the installer access to every room, the loft, the consumer unit, and the proposed outdoor location."
      tldr={[
        "Duration: 60–120 minutes for a typical UK 3-bed home.",
        "Heat-loss survey (BS EN 12831): room-by-room measurement, fabric assessment, calculated peak heat demand.",
        "Existing-system check: radiator sizes + pipework + cylinder + electrical capacity.",
        "Outdoor unit: siting, MCS 020 noise compliance, permitted-development check.",
        "End state: installer has everything needed to issue a binding quote within 1–2 weeks.",
      ]}
      faqs={[
        {
          question: "How long does an MCS site visit take?",
          answer:
            "Typically 60-90 minutes for a 1-2 bed flat, 90-120 minutes for a 3-bed semi, 2-3 hours for larger or more complex properties. The installer needs to access every heated room (for the heat-loss survey), the loft and walls (for fabric assessment), the consumer unit (for electrical capacity), the proposed outdoor unit location, and the airing cupboard or proposed cylinder location. Block out 2 hours in your diary as a planning rule.",
        },
        {
          question: "What is BS EN 12831 and why does the installer need to do it?",
          answer:
            "BS EN 12831 is the European standard for calculating the heat loss of a building, room by room. The installer measures each heated room's dimensions, identifies the wall + window + floor construction, and calculates the peak heat demand at the local design temperature (typically -2 to -5°C for UK locations). The room-level numbers add up to a whole-house figure that determines what size heat pump you need. MCS requires this calculation for BUS-grant installs — informally, it's the single most important number in the quote and is worth comparing between installers.",
        },
        {
          question: "What should I prepare before the installer arrives?",
          answer:
            "Five things speed up the visit: (1) your current EPC certificate (gov.uk/find-energy-certificate), (2) your last year's gas + electricity bills, (3) clear access to the loft, (4) clear access to the consumer unit (often in a meter cupboard), and (5) a rough idea of where you'd want the outdoor unit (back garden, side return, etc.). If you've already had a previous heat-pump quote, having that documentation lets the new installer benchmark or query the previous numbers.",
        },
        {
          question: "Can I get the installer's heat-loss survey results in writing?",
          answer:
            "Yes — you should. Ask for the room-by-room heat-loss calculation as a deliverable, not just a final number. Some installers send the calculation as a PDF appendix to the quote; some only share it on request. Two reasons to get it: (1) you can compare the survey results between installers, which catches sizing inconsistencies, and (2) the room-level numbers tell you which rooms need radiator upgrades + by how much. If an installer refuses to share the survey, treat it as a flag.",
        },
        {
          question:
            "Will the installer measure the outdoor unit noise at my neighbour's boundary?",
          answer:
            "They'll calculate the projected sound pressure at the boundary, not measure it (the unit isn't installed yet to measure). The MCS 020 calculation models the unit's published sound power, projects it through air over the distance to the neighbour boundary, accounts for screening (walls, fences), and confirms the projected level is at or below 42 dB(A). For most UK gardens this is straightforward; tight back-to-back terraces or houses with narrow side returns sometimes need siting compromise or a screen wall. The installer should walk through the MCS 020 numbers with you during the visit.",
        },
      ]}
      sources={[
        {
          name: "MCS — Heat pump installer standard MIS 3005",
          url: "https://mcscertified.com/standards-and-guidelines/",
          accessedDate: "May 2026",
        },
        {
          name: "MCS 020 — Permitted Development Noise Calculation",
          url: "https://mcscertified.com/mcs-020-noise-calculator/",
          accessedDate: "May 2026",
        },
        {
          name: "BSI — BS EN 12831 Heating systems in buildings",
          url: "https://www.bsigroup.com/en-GB/standards/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Boiler Upgrade Scheme guidance",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Choosing a heat pump installer",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>What the visit is actually for</h2>
      <p>
        The MCS site visit produces the data your installer needs
        to issue a binding quote. It&rsquo;s not a sales call —
        you should already have decided you want a heat pump
        before booking it. The output of the visit is a properly
        sized system specification and a complete cost breakdown
        for your specific property.
      </p>
      <p>
        For comparison: getting a gas boiler quote takes a 15-
        minute phone call and a Google Streetview check. Getting
        a heat-pump quote takes 90 minutes of an MCS engineer
        physically measuring your home. That difference is what
        the BUS grant + MCS certification framework requires
        — and why heat-pump quotes are more rigorous than
        boiler quotes you may be used to.
      </p>

      <h2>Step 1: Heat-loss survey (BS EN 12831)</h2>
      <p>
        This is the biggest single piece of work in the visit.
        The installer goes room by room with a tape measure (or
        laser distance meter), measuring:
      </p>
      <ul>
        <li>
          Room dimensions — floor area, ceiling height.
        </li>
        <li>
          Exterior wall area + assessed construction (solid wall,
          cavity wall, internal wall insulation, external wall
          insulation).
        </li>
        <li>
          Window area + glazing type (single, double, triple).
        </li>
        <li>
          Floor construction + insulation (suspended timber,
          solid concrete, screed-on-insulation).
        </li>
        <li>
          Roof + loft insulation depth.
        </li>
        <li>
          Air-tightness indication (gaps around windows, doors,
          unsealed loft hatch).
        </li>
      </ul>
      <p>
        From this they calculate room-level heat-loss in watts.
        Sum across rooms gives the whole-house peak demand at the
        local design temperature. Typical 3-bed UK semi: 8–14 kW
        peak demand. Better insulated → smaller heat pump
        needed.
      </p>
      <p>
        Ask for the room-by-room numbers in writing. If you get
        2 quotes and the heat-loss figures differ by more than
        20%, that&rsquo;s a flag — one installer is sizing
        conservatively (which costs you more on the heat pump)
        or another is sizing tight (which risks comfort
        problems).
      </p>

      <h2>Step 2: Existing-system assessment</h2>
      <p>
        The installer checks what&rsquo;s already in the property:
      </p>
      <ul>
        <li>
          <strong>Radiators:</strong> measured and sized against the
          room-level heat-loss numbers at the proposed flow
          temperature (45–55°C typical). Rooms where the
          radiator is too small get flagged for upgrade.
        </li>
        <li>
          <strong>Pipework:</strong> the existing primary pipework
          (between boiler and radiators) is inspected for sizing.
          Microbore (10mm) systems often need upgrading to 15mm
          for adequate flow with a heat pump.
        </li>
        <li>
          <strong>Hot water cylinder:</strong> if you have one,
          its size and coil suitability are checked. Most gas-
          boiler-era cylinders need replacing for heat-pump
          operation; the heat pump heats water more slowly than
          a gas boiler, so the cylinder needs to be sized to
          smooth that.
        </li>
        <li>
          <strong>Boiler / fuel source:</strong> they note what
          they&rsquo;ll be removing (combi gas, system gas, oil,
          LPG, electric, storage) — relevant for cylinder
          decisions and grant eligibility.
        </li>
      </ul>

      <h2>Step 3: Outdoor unit siting</h2>
      <p>
        The installer walks the property exterior to identify
        outdoor unit locations. The key constraints are:
      </p>
      <ul>
        <li>
          <strong>Permitted-development criteria.</strong> Most
          UK homes can install a heat-pump unit without planning
          permission IF: the unit is at least 1m from the property
          boundary, no more than 1m³ in volume, not on a
          principal elevation facing a road, and not within a
          conservation area or listed building.
        </li>
        <li>
          <strong>MCS 020 noise.</strong> The unit&rsquo;s sound
          pressure at the neighbour boundary, calculated using
          the manufacturer&rsquo;s published sound power +
          distance + screening, must be ≤42 dB(A). Most 5–10 kW
          units satisfy this at typical garden distances; tight
          back gardens may need screening.
        </li>
        <li>
          <strong>Refrigerant pipe distance.</strong> Shorter is
          better for efficiency + lower install cost. Most
          installers want the unit within 10m of the indoor
          plant location.
        </li>
        <li>
          <strong>Access for service + future replacement.</strong>{" "}
          The installer needs 0.5–1m clearance around the unit
          for service. Don&rsquo;t plan to wall the unit in.
        </li>
      </ul>

      <h2>Step 4: Electrical assessment</h2>
      <p>
        Heat pumps draw 1.5–4 kW continuously at peak (depending
        on capacity), with start-up spikes of 6–8 kW briefly.
        The installer checks:
      </p>
      <ul>
        <li>
          <strong>Consumer unit capacity.</strong> Most UK
          properties have 60–100A supplies; a heat pump usually
          adds a dedicated 32A or 40A breaker. Properties with
          near-capacity consumer units may need an upgrade.
        </li>
        <li>
          <strong>Single-phase vs three-phase.</strong> Most UK
          homes are single-phase. A handful of larger or older
          rural properties have three-phase, which makes bigger
          heat pumps easier. The installer notes which you have.
        </li>
        <li>
          <strong>Earthing arrangement.</strong> Older homes
          sometimes have TT earthing (earth rod) instead of TN-S
          or TN-C-S (network earthing). Heat-pump installs
          generally prefer TN earthing; TT-earthed homes may
          need earth-rod work.
        </li>
      </ul>

      <h2>Step 5: Cylinder + plant location</h2>
      <p>
        Where the hot water cylinder + buffer vessel + controls
        will live. Three typical options:
      </p>
      <ul>
        <li>
          <strong>Airing cupboard.</strong> Standard for most
          UK homes — the old hot-water cylinder location. Usually
          fits a 200–250 L heat-pump cylinder with controls.
        </li>
        <li>
          <strong>Utility / garage.</strong> If the airing
          cupboard is too small or you want it back as storage,
          some installers can locate the cylinder in a utility
          room or attached garage.
        </li>
        <li>
          <strong>Loft.</strong> Less common but possible. Loft
          locations need accessible servicing routes + insulation
          + freeze protection.
        </li>
      </ul>

      <h2>Step 6: The quote conversation</h2>
      <p>
        After the survey work, the installer typically sits down
        with you to discuss what they&rsquo;ve found. Topics
        covered:
      </p>
      <ul>
        <li>
          Indicative heat-pump capacity + brand they&rsquo;d
          recommend.
        </li>
        <li>
          Which radiators (if any) need upgrading + why.
        </li>
        <li>
          Cylinder choice + location.
        </li>
        <li>
          Outdoor unit siting + MCS 020 confirmation.
        </li>
        <li>
          Indicative pre-grant + net-of-grant cost ranges.
        </li>
        <li>
          BUS application timing + paperwork.
        </li>
        <li>
          Install timeline if you proceed.
        </li>
      </ul>
      <p>
        Don&rsquo;t commit on the day. You should receive a
        written quote within 1–2 weeks for considered review.
      </p>

      <h2>What to prepare before the visit</h2>
      <ol>
        <li>
          <strong>EPC certificate.</strong> Download from
          gov.uk/find-energy-certificate. Check expiry — fresh
          one needed if &gt;10 years old.
        </li>
        <li>
          <strong>Last 12 months of gas + electricity bills.</strong>{" "}
          Helps the installer calibrate the heat-loss assumption
          against actual usage.
        </li>
        <li>
          <strong>Loft access.</strong> Confirm you can open the
          loft hatch + that there&rsquo;s safe access. Some
          installers bring their own ladder; most prefer your
          existing access.
        </li>
        <li>
          <strong>Consumer unit access.</strong> Usually in a
          meter cupboard or under the stairs. Clear anything in
          front of it.
        </li>
        <li>
          <strong>Outdoor unit location idea.</strong> Walk your
          garden / side return + identify candidate spots for
          the outdoor unit. The installer will refine, but
          knowing your preference saves time.
        </li>
        <li>
          <strong>Questions list.</strong> Prepare 4–6 questions
          on what you care about — efficiency, brand preference,
          warranty, install timeline, finance options.
        </li>
      </ol>

      <h2>What to look out for during the visit</h2>
      <ul>
        <li>
          <strong>Does the installer measure every heated
          room?</strong> A proper BS EN 12831 calc requires it. If
          they skip rooms, the heat-loss number is approximate
          at best.
        </li>
        <li>
          <strong>Do they ask about your usage pattern?</strong>{" "}
          Heat-pump sizing depends on how you actually use your
          home — out at work all day vs WFH, large family vs
          single occupant. A good installer asks; a bad one
          assumes.
        </li>
        <li>
          <strong>Do they walk you through the MCS 020 numbers?</strong>{" "}
          Outdoor siting + noise is a frequent quote blocker.
          The installer should explain the calculation.
        </li>
        <li>
          <strong>Are they pushy on signing the same day?</strong>{" "}
          Good installers issue written quotes for considered
          review. High-pressure tactics aren&rsquo;t standard
          and are a flag.
        </li>
      </ul>

      <h2>After the visit</h2>
      <p>
        Expect the written quote within 1–2 weeks. It should
        include:
      </p>
      <ul>
        <li>Room-by-room heat-loss calculation as an appendix.</li>
        <li>Specific heat-pump make + model with MCS product ref.</li>
        <li>Gross install cost + £7,500 BUS deduction + net amount.</li>
        <li>Radiator/pipework/cylinder/electrical line items.</li>
        <li>Warranty terms + extended warranty options.</li>
        <li>Install timeline + payment schedule.</li>
        <li>Finance options if relevant.</li>
      </ul>
      <p>
        Compare 2–3 quotes side by side. If the heat-loss figures
        differ by more than 20%, query the discrepancy with the
        installers directly. Heat-pump quoting variance is mostly
        about sizing assumptions, not unit pricing.
      </p>

      <h2>The pre-survey shortcut</h2>
      <p>
        Before booking any installer visit, run the free
        pre-survey at <a href="/check">propertoasty.com/check</a>:
      </p>
      <ul>
        <li>BUS eligibility confirmed (or flagged for clearance).</li>
        <li>Property heat-loss indication (informs which sizing range to expect).</li>
        <li>Roof + outdoor space check for siting.</li>
        <li>Installer-ready report to send with quote requests.</li>
      </ul>
      <p>
        Doing this before the site visit saves the first 30
        minutes of the installer&rsquo;s time (and yours) on
        eligibility / orientation questions — they can dive
        straight to the heat-loss survey.
      </p>

      <h2>The summary</h2>
      <p>
        An MCS heat-pump site visit is a 60–120 minute survey
        that produces a binding-quote-grade specification for
        your specific property. The five things they check
        — heat-loss room by room, existing system, outdoor siting,
        electrical supply, cylinder location — feed a quote you
        receive within 1–2 weeks. Prepare your EPC, gas bills,
        and a candidate outdoor location; ask for the heat-loss
        calculation in writing; compare 2–3 quotes before
        committing. Variance between quotes is mostly about
        sizing assumptions — query 20%+ gaps directly.
      </p>

      <h2>Related reading</h2>
      <ul>
        <li>
          <a href="/guides/mcs-020-noise-rules-explained">
            MCS 020 noise rules explained
          </a>{" "}
          — the most common reason a site visit produces a
          &ldquo;planning permission needed&rdquo; flag
          rather than permitted development.
        </li>
        <li>
          <a href="/guides/bus-application-walkthrough">
            BUS grant application walkthrough
          </a>{" "}
          — the grant paperwork side that follows from the
          site visit&rsquo;s quote.
        </li>
        <li>
          <a href="/compare/air-source-vs-ground-source-heat-pump">
            ASHP vs GSHP comparison
          </a>{" "}
          — if the site visit flags issues with MCS 020 or
          outdoor siting, GSHP becomes the natural alternative.
        </li>
      </ul>
    </AEOPage>
  );
}
