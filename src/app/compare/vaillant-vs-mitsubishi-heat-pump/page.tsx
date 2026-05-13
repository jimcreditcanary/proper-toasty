// /compare/vaillant-vs-mitsubishi-heat-pump — head-term brand comparison.
//
// Third brand-comparison page. Completes the top-3 UK air-source
// heat-pump brand pair set (Daikin / Vaillant / Mitsubishi). Same
// strictly-objective editorial line as the other brand pages —
// published spec data, no quality editorializing, no reliability
// claims. UK CAP code compliance.
//
// Spec figures from each manufacturer's 2025/2026 UK product
// brochures: Vaillant aroTHERM plus / perform; Mitsubishi Ecodan
// PUZ-WM / QUHZ.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/vaillant-vs-mitsubishi-heat-pump";

export const metadata: Metadata = {
  title: "Vaillant vs Mitsubishi heat pump in 2026: UK spec comparison",
  description:
    "Side-by-side spec comparison of Vaillant aroTHERM and Mitsubishi Ecodan ranges in the UK. SCOP, refrigerant, sound, warranty — published data only.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Vaillant vs Mitsubishi heat pump in 2026: UK spec comparison",
    description:
      "Objective brand comparison from published UK product data.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function VaillantVsMitsubishiHeatPump() {
  return (
    <AEOPage
      headline="Vaillant vs Mitsubishi heat pump in 2026: what the spec sheets say"
      description="Side-by-side spec comparison of Vaillant aroTHERM and Mitsubishi Ecodan ranges in the UK. SCOP, refrigerant, sound, warranty — published data only."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Brand"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Vaillant vs Mitsubishi heat pump" },
      ]}
      directAnswer="Vaillant aroTHERM and Mitsubishi Ecodan are both top-five UK air-source heat pump ranges. Both deliver BUS-grant-eligible installs with overlapping capacities (3–14 kW), SCOP figures within ~5% (4.4–5.0 at W35), and similar warranty terms. The standout spec difference is refrigerant: Vaillant aroTHERM plus runs R290 propane (lowest GWP); Mitsubishi Ecodan PUZ-WM runs R32 (industry mainstream). Practical pick depends on installer preference and refrigerant choice."
      tldr={[
        "Both brands deliver MCS-compliant, BUS-eligible installs across the typical UK 4–14 kW capacity range.",
        "SCOP at W35 (low-temp): Vaillant aroTHERM plus 4.4–5.0, Mitsubishi Ecodan PUZ-WM 4.4–4.8 — overlapping.",
        "Refrigerant: Vaillant R290 propane (GWP 3); Mitsubishi R32 (GWP 675) on current Ecodan range.",
        "Cylinder pairing: Vaillant uniTOWER / uniSTOR; Mitsubishi pre-plumbed cylinder kits.",
        "Installer footprint: Vaillant strongest with installers from its gas-boiler network; Mitsubishi has long-established UK heat-pump installer base.",
      ]}
      faqs={[
        {
          question:
            "What's the practical difference between R290 (propane) and R32?",
          answer:
            "Both are widely used in UK heat pumps and accepted under MCS + BUS. R290 has a global warming potential of 3 (the lowest in mainstream residential heat pumps); R32 has GWP 675. In normal operation the difference is invisible. The practical contrast shows up in two places: long-term environmental footprint over the system's 15–20 year lifespan, and service-tech availability — R290 is flammable so service engineers need additional certifications, which can be slightly thinner outside major metros. Both are F-gas-regulated; neither requires special homeowner training.",
        },
        {
          question:
            "Does the brand affect BUS grant eligibility?",
          answer:
            "No. The £7,500 Boiler Upgrade Scheme grant requires an MCS-certified product + an MCS-certified installer. Both Vaillant aroTHERM and Mitsubishi Ecodan have MCS-certified models across their UK ranges. Brand choice doesn't affect grant amount or eligibility. Check the MCS product database (mcscertified.com/find-a-product) for the specific model your installer quotes.",
        },
        {
          question:
            "I'm in Scotland — does the cold-weather rating matter?",
          answer:
            "Less than the spec sheet suggests. Both ranges operate well below typical UK winter design temperatures. Vaillant aroTHERM perform rates down to -25°C; Mitsubishi Ecodan QUHZ rates down to -25°C as well. Coldest UK design temperatures (Scottish Highlands, far rural North-East England) hit -10 to -15°C in cold years. Both brands handle this comfortably. Practical performance gap at design temperature is minimal; installer commissioning of the weather-compensation curve matters more.",
        },
        {
          question:
            "Which brand has wider UK installer support?",
          answer:
            "Both have well-established UK installer footprints. Mitsubishi has been positioning the Ecodan range to UK installers since the 2010s, building one of the largest heat-pump-specialist installer bases. Vaillant's footprint is unusually skewed because many MCS installers came through the company's gas-boiler dealer network — this can show up as stronger Vaillant presence in regions with traditional plumbing trade strength (Midlands, North-West). Check 2–3 local quotes; the brand each defaults to is usually a strong signal for your area.",
        },
      ]}
      sources={[
        {
          name: "Vaillant UK — aroTHERM range",
          url: "https://www.vaillant.co.uk/homeowners/products/heat-pumps/",
          accessedDate: "May 2026",
        },
        {
          name: "Mitsubishi Electric UK — Ecodan range",
          url: "https://les.mitsubishielectric.co.uk/products/ecodan-air-source-heat-pumps",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find a product (certified heat-pump database)",
          url: "https://mcscertified.com/find-a-product/",
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
      ]}
    >
      <ComparisonTable
        caption="Vaillant aroTHERM vs Mitsubishi Ecodan — UK published specs (2026 ranges)"
        headers={[
          "",
          "Vaillant aroTHERM plus / perform",
          "Mitsubishi Ecodan PUZ-WM / QUHZ",
        ]}
        rows={[
          ["Typical UK capacity range", "3–15 kW", "5–14 kW"],
          ["SCOP @ W35 (low-temp)", "4.4–5.0", "4.4–4.8"],
          ["SCOP @ W55 (high-temp)", "2.9–3.3", "2.9–3.2"],
          ["Min outdoor operating temp", "-20 °C (plus), -25 °C (perform)", "-20 °C (PUZ-WM), -25 °C (QUHZ)"],
          ["Refrigerant", "R290 (propane, GWP 3)", "R32 (GWP 675)"],
          ["Sound power (typical 8 kW unit)", "51–58 dB(A)", "55–61 dB(A)"],
          ["Format", "Monobloc + split available", "Monobloc + split available"],
          ["Native cylinder pairing", "uniTOWER / uniSTOR (150–500 L)", "Pre-plumbed cylinder kits (170–300 L)"],
          ["Smart controls", "myVAILLANT app + sensoCOMFORT", "MELCloud app"],
          ["Standard warranty", "5–7 years (range-dependent)", "5 years (extendable to 7)"],
          ["MCS-certified", "Yes (most models)", "Yes (most models)"],
          ["BUS-eligible", "Yes (MCS-certified models)", "Yes (MCS-certified models)"],
          ["Typical UK install range (pre-grant)", "£9,000–£14,500", "£8,500–£14,000"],
        ]}
        footnote="Spec figures are from published 2025/2026 UK product literature. Exact figures vary by specific model + capacity. Verify the spec sheet for the model your installer quotes."
      />

      <h2>What&rsquo;s actually different between them</h2>
      <p>
        Headline efficiency (SCOP at W35) ranges overlap almost
        entirely. The spec-sheet difference is smaller than installer
        commissioning quality typically contributes to real-world
        efficiency. As with all brand-vs-brand heat-pump comparisons,
        chasing the 0.1–0.2 SCOP gap on paper rarely changes the
        bill outcome.
      </p>
      <p>
        Where the brands meaningfully diverge:
      </p>
      <ul>
        <li>
          <strong>Refrigerant.</strong> The single most material
          spec difference. Vaillant&rsquo;s current aroTHERM plus
          runs R290 (propane, GWP 3) — the lowest-GWP refrigerant
          in mainstream UK residential heat pumps. Mitsubishi&rsquo;s
          current Ecodan PUZ-WM range runs R32 (GWP 675) across the
          board. R32 is the current industry mainstream; R290 is
          where new product ranges are heading. Practical
          implications during normal operation are minor; service
          tech pool may be slightly thinner for R290 outside major
          metros because of the additional flammable-refrigerant
          certifications required.
        </li>
        <li>
          <strong>Sound power.</strong> Vaillant publishes sound
          power figures at the lower end of the typical range for
          comparable capacities — around 51–58 dB(A) on the
          aroTHERM plus 8 kW unit vs 55–61 dB(A) on the Mitsubishi
          Ecodan PUZ-WM equivalent. As always, MCS 020 compliance
          is determined at the neighbour boundary (≤42 dB(A) at 1m
          from the boundary), so siting distance and screening
          dwarf the 3–4 dB(A) source difference. Useful at the
          margin if siting is tight.
        </li>
        <li>
          <strong>Cylinder pairing.</strong> Vaillant&rsquo;s
          integrated uniTOWER (heat pump + cylinder + buffer in
          one enclosure) is unusual in the UK market and saves
          floor space in homes where the airing cupboard is
          oversized. Mitsubishi offers pre-plumbed cylinder kits
          that simplify install but keep the cylinder as a
          separate enclosure. Both ranges work with third-party
          cylinders; the integrated option is a Vaillant
          differentiator.
        </li>
        <li>
          <strong>Controls + app.</strong> myVAILLANT (paired with
          the sensoCOMFORT controller) and Mitsubishi&rsquo;s
          MELCloud are mature mobile apps with remote control,
          scheduling, weather-compensation tuning and energy
          monitoring. Feature sets are broadly equivalent in 2026.
          Try both in a demo store if you have a strong UI
          preference.
        </li>
      </ul>

      <h2>UK installer footprint</h2>
      <p>
        Both brands have well-established UK installer networks but
        through different channels. Mitsubishi has positioned Ecodan
        to UK installers since the 2010s as a heat-pump-primary
        product, building one of the largest heat-pump-specialist
        installer bases — geographically even, biased toward
        installers who lead with heat pumps rather than retrofit
        from gas-boiler work. Vaillant&rsquo;s heat-pump installer
        base is unusually skewed by the company&rsquo;s long-
        established UK gas-boiler dealer network: many Vaillant
        heat-pump installers came through a Vaillant gas-boiler
        training pathway, which shows up as stronger Vaillant
        presence in regions with traditional plumbing trade
        strength.
      </p>
      <p>
        Practical effect: in your specific area, you&rsquo;ll
        typically see one brand quoted more often than the other.
        That signal is worth more than the headline spec gap.
        Installer familiarity with their preferred brand&rsquo;s
        commissioning quirks routinely delivers better real-world
        efficiency than the alternative would on paper.
      </p>

      <h2>What doesn&rsquo;t matter as much as people think</h2>
      <ul>
        <li>
          <strong>The 0.1–0.2 SCOP gap.</strong> Roughly £20–£40/yr
          on a typical home&rsquo;s electricity bill — well below
          the swing from installer commissioning quality.
        </li>
        <li>
          <strong>Anecdotal reliability claims.</strong> Both
          manufacturers publish multi-year MTBF figures well above
          the 15–20 year UK system lifespan. Forum reports of
          failures exist for both. Real-world longevity correlates
          with install quality + maintenance schedule, not brand.
        </li>
        <li>
          <strong>The brand of your existing boiler.</strong>{" "}
          Vaillant gas-boiler owners sometimes assume Vaillant heat
          pump is the right pick by default. The technical
          continuity is minimal; the only practical advantage is
          installer-relationship continuity if you&rsquo;ve had a
          good experience with a Vaillant-trained installer.
        </li>
      </ul>

      <h2>How most UK homeowners actually decide</h2>
      <ol>
        <li>
          <strong>Your installer&rsquo;s preferred range.</strong>{" "}
          MCS installers typically have a primary brand they specify
          by default; their familiarity with the commissioning
          quirks matters more than the ~5% spec gap on paper.
        </li>
        <li>
          <strong>Refrigerant preference.</strong> If lowest GWP
          matters to you long-term and your installer is comfortable
          servicing R290, Vaillant aroTHERM plus is the choice. If
          you&rsquo;d rather stay on the industry-mainstream R32
          (broader service tech pool, more competing models),
          Mitsubishi Ecodan PUZ-WM is the choice. Both deliver the
          same BUS-eligible install.
        </li>
        <li>
          <strong>Space constraint.</strong> If your indoor
          cylinder location is tight (small airing cupboard,
          shared boiler-room space with stored items),
          Vaillant&rsquo;s integrated uniTOWER may save floor
          area. Mitsubishi&rsquo;s pre-plumbed kits assume a
          separate cylinder enclosure.
        </li>
      </ol>

      <h2>What to ask your installer</h2>
      <ol>
        <li>
          Which specific model are you quoting (full part number),
          and can you send me the MCS product certificate?
        </li>
        <li>
          What flow temperature have you sized for, and what
          radiator changes does that imply?
        </li>
        <li>
          What refrigerant does this model use, and what does
          servicing it look like 5 years from now?
        </li>
        <li>
          Are you a manufacturer-accredited installer for this
          brand, and what extended warranty does that unlock?
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
          Get 2–3 quotes from MCS-certified installers locally. If
          two quote different brands, ask each why they recommend
          theirs — the reasoning matters more than the
          recommendation.
        </li>
        <li>
          Check the MCS product database for the specific model
          number on each quote; verify the certs are current.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Vaillant aroTHERM and Mitsubishi Ecodan are both
        well-engineered UK heat-pump ranges delivering BUS-eligible
        installs across the typical home. The most material spec
        difference is refrigerant (R290 vs R32); on most other
        axes the published figures are within ~5%. Installer
        familiarity with the brand they&rsquo;re commissioning
        matters more in practice than headline efficiency. Get 2–3
        quotes locally, ask why each installer defaults to their
        brand, and verify the specific model on the MCS product
        database.
      </p>
    </AEOPage>
  );
}
