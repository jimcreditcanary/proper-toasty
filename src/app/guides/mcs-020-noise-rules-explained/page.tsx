// /guides/mcs-020-noise-rules-explained — MCS 020 compliance primer.
//
// High-intent niche query — homeowners and installers searching
// "MCS 020 noise" are usually at the siting decision stage. This
// is the single most common cause of a heat-pump install needing
// planning permission rather than permitted development.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/guides/mcs-020-noise-rules-explained";

export const metadata: Metadata = {
  title: "MCS 020 heat pump noise rules: UK 2026 guide for homeowners",
  description:
    "What MCS 020 is, the 42 dB(A) limit, how the calculation works, and how to fix a failing siting before you commission an install.",
  alternates: { canonical: URL },
  openGraph: {
    title: "MCS 020 heat pump noise rules: UK 2026 guide for homeowners",
    description:
      "MCS 020 explained for UK homeowners — the 42 dB(A) limit, the calculation, common siting fixes.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function Mcs020NoiseRulesExplained() {
  return (
    <AEOPage
      headline="MCS 020 heat pump noise rules in UK 2026: the homeowner's guide"
      description="What MCS 020 is, the 42 dB(A) limit, how the calculation works, and how to fix a failing siting before you commission an install."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Guide · MCS 020 noise"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: "MCS 020 noise rules explained" },
      ]}
      directAnswer="MCS 020 is the planning-standard noise calculation that every MCS-certified air-source heat pump install in England, Wales, Scotland, and Northern Ireland must satisfy to qualify as permitted development (PD) — bypassing the need for planning permission. The rule: the calculated sound pressure level at the nearest neighbour's habitable window must not exceed 42 dB(A) at 1 metre from the wall. If it does, the install needs full planning permission. Most installs pass MCS 020 with the heat pump sited 3+ metres from any neighbour boundary and with no acoustic barriers in the line of sight. Fixing a failing calculation usually means relocating the unit, adding an acoustic barrier, or switching to a quieter model."
      tldr={[
        "MCS 020 is the noise standard that gates permitted development (PD) status.",
        "Pass = no planning permission needed. Fail = full planning application required.",
        "Limit: 42 dB(A) at 1 metre from the nearest neighbour's habitable-room window.",
        "Calculation accounts for sound power level, distance, reflections, and barriers.",
        "Most heat pumps in detached or semi homes pass easily; terraces are tight.",
        "Fixes: relocate, acoustic enclosure, quieter model, or planning application.",
        "Installer runs the calc as part of MCS site visit; ask to see the workings.",
      ]}
      faqs={[
        {
          question:
            "What is MCS 020 and why does it matter?",
          answer:
            "MCS 020 (officially: 'MCS Planning Standards for Permitted Development Installations of Wind Turbines and Air Source Heat Pumps on Domestic Premises') is a UK-wide standard that calculates the expected noise level from a heat pump at the nearest neighbour's habitable-room window. If the calculation shows 42 dB(A) or less at 1 metre from the window, the install qualifies as permitted development under Class G of the Town and Country Planning (General Permitted Development) Order — no planning application needed. If it exceeds 42 dB(A), you need full planning permission, which adds 8-12 weeks and £200-£500 in fees, with no guarantee of approval. Almost every MCS install runs MCS 020 as part of the design.",
        },
        {
          question:
            "Does MCS 020 apply to ground source and water source heat pumps too?",
          answer:
            "No. MCS 020 is specifically for air-source heat pumps (ASHP) because they have outdoor units with fans + compressors that produce audible noise. Ground-source heat pumps (GSHP) have their entire unit indoors (in a plant room, garage, or utility), so they don't produce external noise that affects neighbours — they're treated as plant equipment under different planning rules. The Section 60 / Section 61 noise rules under the Control of Pollution Act still apply, but MCS 020 specifically is an ASHP standard.",
        },
        {
          question:
            "How is the 42 dB(A) calculation done?",
          answer:
            "Three inputs feed the calculation: (1) the heat pump's declared sound power level (SWL) in dB(A) — the manufacturer provides this, typically 50-65 dB(A) for modern units; (2) the straight-line distance from the heat pump to the nearest neighbour habitable-room window; (3) reflection corrections for nearby walls and barriers. The MCS 020 tool (free download from mcscertified.com) takes these inputs and outputs the calculated sound pressure level at the window. Sound attenuates by ~6 dB per doubling of distance, so a unit 4m from the window is 6 dB quieter than one at 2m. Adding an acoustic barrier in the line of sight can subtract another 5-10 dB.",
        },
        {
          question:
            "What if my install fails MCS 020 — what are the options?",
          answer:
            "Five options, in increasing cost order: (1) Relocate the outdoor unit further from the neighbour's window. Often the easiest fix — moving from a 2m boundary placement to a 4m placement halves the noise (in dB terms). (2) Switch to a quieter model. Quiet variants (R290 units in particular) can be 4-8 dB quieter than equivalent capacity R32 units. (3) Add an acoustic barrier or enclosure. Off-the-shelf heat pump acoustic fences cost £400-£1,200, drop apparent noise by 5-8 dB if line-of-sight is broken. (4) Apply for planning permission via a Section 60 noise mitigation plan. ~£200-£500 fee, 8-12 week timeline. Not guaranteed. (5) Reconsider whether the property is suitable — some terrace and end-terrace properties genuinely cannot site an outdoor unit within MCS 020 limits.",
        },
        {
          question:
            "Does MCS 020 still apply if my neighbours have given written consent?",
          answer:
            "Yes. MCS 020 is part of permitted development rights under planning law — it's about whether you NEED planning permission, not about whether neighbours object. Even if neighbours sign written consent, the calculation must still pass for the install to qualify as PD. If it doesn't pass, you must apply for planning permission and the application is processed normally, with neighbour comments being one of several considerations. Written consent does NOT bypass the MCS 020 calculation requirement.",
        },
        {
          question:
            "How quiet are heat pumps in 2026?",
          answer:
            "Modern UK 2026 heat pumps run at sound power levels of 50-65 dB(A) at typical operating conditions. The quietest R290 propane units (Vaillant Arotherm Plus, Daikin Altherma 3 R Quiet, Mitsubishi Ecodan QUHZ) declare 50-54 dB(A). Mid-range R32 units sit at 55-60 dB(A). At the typical 3-4m boundary distance with no reflections, those translate to sound pressure levels at the neighbour window of 30-40 dB(A) — comfortably below the 42 dB(A) limit. The PERCEIVED noise at typical operating conditions is around the same as a domestic fridge or quiet conversation; it's much quieter than a typical air conditioning unit.",
        },
      ]}
      sources={[
        {
          name: "MCS — MCS 020 Planning Standards",
          url: "https://mcscertified.com/standards/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Permitted development rights Class G",
          url: "https://www.legislation.gov.uk/uksi/2015/596/contents",
          accessedDate: "May 2026",
        },
        {
          name: "Planning Portal — Heat pumps and planning",
          url: "https://www.planningportal.co.uk/permission/common-projects/heat-pumps",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Heat pump noise",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <h2>Why MCS 020 matters more than the headline number</h2>
      <p>
        The 42 dB(A) figure isn&rsquo;t about whether you can
        hear the heat pump — modern heat pumps in normal
        operation are quieter than a fridge. The figure is the
        threshold that determines whether your install qualifies
        as permitted development.
      </p>
      <p>
        Permitted development = no planning application, no
        £200-£500 fee, no 8-12 week wait, no risk of refusal.
        Fall outside PD and you face a full application, which
        can be refused on noise, visual amenity, or neighbour
        objection grounds.
      </p>
      <p>
        So MCS 020 is a planning gate, not a comfort threshold.
        Worth understanding because most installs CAN pass it
        with thoughtful siting — and a small minority of homes
        genuinely cannot, in which case the conversation moves
        to planning permission early in the process.
      </p>

      <h2>The full permitted development criteria — MCS 020 is one of five</h2>
      <p>
        Class G of the Town and Country Planning Order grants
        PD rights for ASHPs subject to FIVE conditions, all of
        which must be met:
      </p>
      <ul>
        <li>
          <strong>MCS 020 noise calc</strong> showing ≤42 dB(A)
          at the nearest neighbour&rsquo;s habitable-room
          window.
        </li>
        <li>
          <strong>Single unit only</strong> — one ASHP per
          dwelling under PD.
        </li>
        <li>
          <strong>Volume ≤1 m³</strong> for the outdoor unit
          (the indoor unit doesn&rsquo;t count).
        </li>
        <li>
          <strong>Not on a wall or roof</strong> facing a
          highway (for properties in conservation areas / Article
          4 zones).
        </li>
        <li>
          <strong>Listed buildings excluded</strong> from PD —
          always need planning consent.
        </li>
      </ul>
      <p>
        MCS 020 is the noise gate; the other four are siting
        constraints. All five must pass for PD.
      </p>

      <h2>How the MCS 020 calculation actually works</h2>
      <p>
        The calculation uses three primary inputs:
      </p>

      <h3>1. Sound Power Level (SWL)</h3>
      <p>
        The heat pump&rsquo;s declared dB(A) output, measured
        per ISO 9614-2. Manufacturers publish this on the
        technical datasheet. Typical UK 2026 figures:
      </p>
      <ul>
        <li><strong>Quiet R290 units:</strong> 50–54 dB(A)</li>
        <li><strong>Standard R32 units:</strong> 55–60 dB(A)</li>
        <li><strong>Older / larger units:</strong> 60–68 dB(A)</li>
      </ul>

      <h3>2. Direct distance to nearest habitable window</h3>
      <p>
        Straight-line distance from the proposed outdoor unit
        location to the nearest neighbour&rsquo;s habitable-room
        window — bedroom, living room, kitchen-diner.
        Bathrooms, hallways, and stairwells don&rsquo;t count.
      </p>
      <p>
        Sound pressure level halves (drops by ~6 dB) for every
        doubling of distance. So:
      </p>
      <ul>
        <li>1m: full SWL minus minor distance correction.</li>
        <li>2m: SWL − 6 dB.</li>
        <li>4m: SWL − 12 dB.</li>
        <li>8m: SWL − 18 dB.</li>
      </ul>

      <h3>3. Reflection and barrier corrections</h3>
      <p>
        Walls behind the unit reflect sound forward, adding
        +3 dB. Walls or fences in the line of sight to the
        receiver block direct sound, subtracting up to 10 dB
        depending on height and material. The MCS 020 tool
        applies these automatically once the installer enters
        the geometry.
      </p>

      <h2>Worked example — a typical UK semi</h2>
      <p>
        Scenario: 3-bed semi, heat pump on the side wall, 5m
        line-of-sight to the neighbour kitchen window. No
        fence in between.
      </p>
      <ul>
        <li>SWL: 56 dB(A) (mid-range R32).</li>
        <li>Distance correction at 5m: −14 dB.</li>
        <li>Reflection from rear wall: +3 dB.</li>
        <li>No barrier: 0 dB.</li>
        <li>
          <strong>Calculated SPL at window:</strong> 56 − 14 +
          3 = 45 dB(A). <strong>Fails MCS 020 by 3 dB.</strong>
        </li>
      </ul>
      <p>
        Two fixes available:
      </p>
      <ul>
        <li>
          <strong>Add an acoustic fence</strong> in the line of
          sight, ~1.8m high, between the unit and the
          neighbour boundary. Drops apparent noise by 5-8 dB.
          New result: 45 − 6 = 39 dB(A). <strong>Passes</strong>.
        </li>
        <li>
          <strong>Move the unit to the rear of the
          property</strong>, increasing distance to 8m, away
          from the kitchen window. 56 − 18 + 3 = 41 dB(A).
          <strong> Passes</strong>.
        </li>
      </ul>

      <h2>Properties most at risk of failing</h2>
      <ul>
        <li>
          <strong>Terraced houses with narrow side passages.</strong>{" "}
          Outdoor unit usually has to go in the back garden
          near the neighbouring fence — short distances to two
          adjacent properties&rsquo; rear windows.
        </li>
        <li>
          <strong>End-of-terrace with the &ldquo;outside&rdquo; wall facing
          a neighbour.</strong> Often a 1-2m alley between
          houses; insufficient distance.
        </li>
        <li>
          <strong>Maisonettes and small flats</strong> where
          the only outdoor space is balcony or shared back
          court.
        </li>
        <li>
          <strong>Older Victorian terraces in conservation
          areas</strong> with the added Article 4 visual
          constraint on top of MCS 020.
        </li>
      </ul>

      <h2>What to do at the site visit stage</h2>
      <p>
        During the{" "}
        <a href="/guides/mcs-site-visit-what-to-expect">MCS site visit</a>{" "}
        your installer should:
      </p>
      <ol>
        <li>
          <strong>Identify the nearest habitable window</strong>{" "}
          on the closest neighbouring property.
        </li>
        <li>
          <strong>Measure the proposed unit location distance</strong>{" "}
          to that window.
        </li>
        <li>
          <strong>Note any reflective surfaces or barriers.</strong>
        </li>
        <li>
          <strong>Run the MCS 020 spreadsheet calculation</strong>{" "}
          (either on site or in the quote follow-up).
        </li>
        <li>
          <strong>Document the calculation in your quote</strong>{" "}
          with the SWL of the proposed unit, the geometry, and
          the result.
        </li>
      </ol>
      <p>
        Ask to see the calculation. If the installer can&rsquo;t
        produce it on request, that&rsquo;s a flag — every
        MCS-certified install needs it for the MCS Installation
        Certificate.
      </p>

      <h2>If you genuinely cannot pass MCS 020</h2>
      <p>
        A small minority of UK homes (perhaps 5-10% of urban
        terraces) genuinely cannot site an air-source heat pump
        within MCS 020 limits. Options:
      </p>
      <ul>
        <li>
          <strong>Apply for planning permission</strong> with a
          full noise impact statement. £200-£500 fee, 8-12
          weeks, refusal possible.
        </li>
        <li>
          <strong>Consider ground-source heat pump</strong>{" "}
          which has no external noise but needs ~80m² of garden
          for slinky loops, or ~30m depth for a borehole. See
          the <a href="/compare/air-source-vs-ground-source-heat-pump">ASHP vs GSHP comparison</a>.
        </li>
        <li>
          <strong>Consider a hybrid system</strong> with a
          smaller heat pump for off-peak heating + retained
          gas boiler for cold-snap peaks. The smaller unit may
          satisfy MCS 020 where a full-size one wouldn&rsquo;t.
        </li>
        <li>
          <strong>Wait for newer quieter models.</strong> R290
          and 2026-generation R32 units are 4-8 dB quieter than
          the 2020 generation. The bar may move.
        </li>
      </ul>

      <h2>The summary</h2>
      <p>
        MCS 020 is a planning calculation, not a comfort
        threshold — modern heat pumps are very quiet in
        operation. The 42 dB(A) limit at the nearest neighbour
        habitable window is the gate that separates
        permitted-development installs from planning-permission
        installs. Most UK semis and detached homes pass with
        sensible siting; terraces are tight; some genuinely
        fail. Ask your installer for the MCS 020 workings on
        any quote and confirm the result before signing — it
        determines whether your install timeline is 4-10 weeks
        or 12-22 weeks.
      </p>
    </AEOPage>
  );
}
