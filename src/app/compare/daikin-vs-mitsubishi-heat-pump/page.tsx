// /compare/daikin-vs-mitsubishi-heat-pump — head-term brand comparison.
//
// First brand-comparison page in the series. Editorial line is
// STRICTLY objective: published spec data only, no quality
// editorializing, no reliability anecdotes. UK CAP code (comparative
// advertising) requires comparisons to be verifiable + based on
// material features; both Daikin and Mitsubishi Electric are
// reputable publicly-listed manufacturers with widely-distributed
// product literature.
//
// Spec ranges below are taken from each manufacturer's published
// 2025/2026 UK product brochures (Daikin Altherma 3 R + Altherma 3 H
// HT; Mitsubishi Ecodan QUHZ + PUZ-WM ranges). Cite the SOURCES at
// the bottom of the page when readers want to verify a claim.
//
// Tone: "here's what differs and when each fits" — not "which is
// better". Homeowners pick based on installer availability,
// indoor-unit space, controls preference and price; both brands
// deliver MCS-compliant, BUS-eligible installs in 2026.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/daikin-vs-mitsubishi-heat-pump";

export const metadata: Metadata = {
  title: "Daikin vs Mitsubishi heat pump in 2026: UK spec comparison",
  description:
    "Side-by-side spec comparison of Daikin Altherma and Mitsubishi Ecodan ranges in the UK. SCOP, sound, warranty, controls, install cost — published data only.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Daikin vs Mitsubishi heat pump in 2026: UK spec comparison",
    description:
      "Objective brand comparison from published UK product data.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function DaikinVsMitsubishiHeatPump() {
  return (
    <AEOPage
      headline="Daikin vs Mitsubishi heat pump in 2026: what the spec sheets say"
      description="Side-by-side spec comparison of Daikin Altherma and Mitsubishi Ecodan ranges in the UK. SCOP, sound, warranty, controls, install cost — published data only."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Brand"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Daikin vs Mitsubishi heat pump" },
      ]}
      directAnswer="Daikin Altherma and Mitsubishi Ecodan are the two highest-volume air-source heat pump ranges in the UK by 2025 MCS install count. Both deliver BUS-grant-eligible installs with similar SCOP figures (3.8–5.0 at W35), similar warranty terms (5–7 years standard) and overlapping capacity (4–16 kW). Differences land in indoor-unit format, refrigerant choice, controls software, and installer availability — the practical pick comes down to your installer's preferred range, not headline efficiency."
      tldr={[
        "Both brands deliver MCS-compliant, BUS-eligible installs across the typical UK 4–16 kW capacity range.",
        "SCOP at W35 (low-temperature heating): Daikin Altherma 3 R 4.5–5.1, Mitsubishi Ecodan PUZ-WM 4.4–4.8.",
        "Refrigerant: Daikin R32 (newer ranges) + some R410A legacy stock; Mitsubishi R32 across the current Ecodan range.",
        "Warranty: 5–7 years standard for both; extended cover to 10 years available on registration.",
        "Practical decision: your local MCS installer's preferred range matters more than headline spec differences.",
      ]}
      faqs={[
        {
          question:
            "Which brand has more UK installers?",
          answer:
            "Both are widely supported. The MCS-certified installer database (mcscertified.com) shows comparable coverage for Daikin Altherma and Mitsubishi Ecodan across England and Wales; Scotland coverage is also broadly even. Most heat-pump installers carry training certifications for both manufacturers, but individual installers often have a primary preference. Check 2–3 installer quotes locally; you'll typically see one brand quoted more often than the other in your area.",
        },
        {
          question:
            "Does the brand affect BUS grant eligibility?",
          answer:
            "No. The £7,500 Boiler Upgrade Scheme grant requires an MCS-certified product + an MCS-certified installer. Both Daikin Altherma and Mitsubishi Ecodan have MCS-certified models across their UK ranges, so brand choice doesn't affect eligibility. The grant amount is the same regardless of make. Check the MCS product database (mcscertified.com/find-a-product) for the specific model your installer is quoting.",
        },
        {
          question:
            "Is one brand quieter than the other for MCS 020 noise compliance?",
          answer:
            "Both publish sound power figures in the 50–62 dB(A) range for typical residential capacities (5–11 kW outdoor units). The exact figure depends on the model and operating mode (defrost cycles run louder than steady-state). MCS 020 noise compliance is determined at the neighbour receptor (≤42 dB(A) at 1m from the boundary), so the unit's source dB is only one factor — siting distance, screening and ambient sound matter more. A competent installer will run the MCS 020 calculation for your specific siting; the brand difference here is small relative to siting decisions.",
        },
        {
          question:
            "What about refrigerant — R32 vs R410A?",
          answer:
            "R32 is the current standard for new UK heat pumps because it has a lower global warming potential (GWP 675) than R410A (GWP 2,088). Mitsubishi's current Ecodan PUZ-WM range is R32 across the board. Daikin's Altherma 3 R range is R32; some legacy Daikin stock and the Altherma 3 H HT (high-temperature) variant may use R410A. Ask your installer which refrigerant the specific quoted model uses — R32 is preferred for future-proofing and lower service-cost implications.",
        },
      ]}
      sources={[
        {
          name: "Daikin UK — Altherma 3 R brochure + data sheets",
          url: "https://www.daikin.co.uk/en_gb/product-group/air-to-water-heat-pump-low-temperature.html",
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
        caption="Daikin Altherma vs Mitsubishi Ecodan — UK published specs (2026 ranges)"
        headers={[
          "",
          "Daikin Altherma 3 R / 3 H HT",
          "Mitsubishi Ecodan PUZ-WM / QUHZ",
        ]}
        rows={[
          ["Typical UK capacity range", "4–16 kW", "5–14 kW"],
          ["SCOP @ W35 (low-temp)", "4.5–5.1", "4.4–4.8"],
          ["SCOP @ W55 (high-temp)", "3.0–3.4", "2.9–3.2"],
          ["Min outdoor operating temp", "-25 °C (3 R), -28 °C (HT)", "-20 °C (PUZ-WM), -25 °C (QUHZ)"],
          ["Refrigerant", "R32 (3 R), R410A (some HT)", "R32 (current range)"],
          ["Sound power (typical 8 kW unit)", "54–60 dB(A)", "55–61 dB(A)"],
          ["Format", "Monobloc + split available", "Monobloc + split available"],
          ["Indoor cylinder options", "150–500 L integrated/standalone", "170–300 L integrated/standalone"],
          ["Smart controls", "Daikin Onecta app", "MELCloud app"],
          ["Standard warranty", "5–7 years (range-dependent)", "5 years (extendable to 7)"],
          ["MCS-certified", "Yes (most models)", "Yes (most models)"],
          ["BUS-eligible", "Yes (MCS-certified models)", "Yes (MCS-certified models)"],
          ["Typical UK install range (pre-grant)", "£8,500–£14,500", "£8,500–£14,000"],
        ]}
        footnote="Spec figures are from published 2025/2026 UK product literature. Exact figures vary by specific model + capacity. Verify the spec sheet for the model your installer quotes."
      />

      <h2>What&rsquo;s actually different between them</h2>
      <p>
        On headline efficiency (SCOP at W35), both ranges land within
        ~10% of each other across overlapping capacities. That spread
        is below the noise floor for real-home performance, which
        depends much more on heat-loss calculation accuracy, emitter
        sizing, controls setup, and weather-compensation curve tuning
        than on the manufacturer&rsquo;s lab SCOP figure.
      </p>
      <p>
        Where the brands meaningfully diverge:
      </p>
      <ul>
        <li>
          <strong>Cold-weather rating.</strong> Both operate to
          -20 °C or below, well outside typical UK winter design
          temperatures (-3 to -5 °C). Mitsubishi&rsquo;s QUHZ range
          publishes operation down to -25 °C; Daikin&rsquo;s
          Altherma 3 H HT publishes -28 °C. Outside Scotland and
          rural upland England, both are well within margin.
        </li>
        <li>
          <strong>High-temperature capability.</strong> Daikin
          Altherma 3 H HT can deliver flow temperatures up to 70 °C
          for retrofit installs where radiator upgrades aren&rsquo;t
          feasible. Mitsubishi&rsquo;s standard Ecodan range tops
          out at ~55 °C; the QUHZ delivers up to 75 °C for sanitary
          hot water. Practical relevance: in older UK homes with
          undersized cast-iron radiators that can&rsquo;t be
          replaced, the high-temperature Daikin option avoids the
          emitter-upgrade conversation.
        </li>
        <li>
          <strong>Indoor unit format.</strong> Both brands offer
          monobloc (outdoor-only refrigerant circuit) and split
          (indoor + outdoor unit) configurations. Monobloc is
          simpler to install — no F-gas qualification needed on the
          install team — and is the default for most UK homes.
          Split units suit some retrofit scenarios where the
          indoor cylinder location is constrained.
        </li>
        <li>
          <strong>Controls + app.</strong> Daikin&rsquo;s Onecta and
          Mitsubishi&rsquo;s MELCloud are both mature mobile apps
          with remote control, scheduling and energy monitoring.
          Feature sets are broadly equivalent in 2026. Try both
          apps in a demo store if you have a strong UI preference.
        </li>
      </ul>

      <h2>What doesn&rsquo;t matter as much as people think</h2>
      <p>
        Three factors that show up in search results but rarely
        decide the right choice for a typical UK home:
      </p>
      <ul>
        <li>
          <strong>The 0.1–0.3 SCOP gap.</strong> A SCOP difference
          of 4.5 vs 4.8 sounds material but translates to roughly
          £20–£50 a year on a typical home&rsquo;s heat-pump
          electricity bill. Installer calibration of the
          weather-compensation curve typically affects real-world
          efficiency more than the unit&rsquo;s lab figure.
        </li>
        <li>
          <strong>Brand-by-brand &ldquo;reliability&rdquo; claims.</strong>{" "}
          Both Daikin and Mitsubishi publish multi-year MTBF data
          well above the 15–20 year UK system lifespan. Anecdotal
          forum reports of failures exist for both. Real-world
          longevity correlates with install quality + maintenance
          schedule far more than brand.
        </li>
        <li>
          <strong>The exact dB(A) figure.</strong> MCS 020
          compliance is determined at the neighbour boundary, not
          at the unit. Siting distance, fence screening and ambient
          sound dwarf the 1–2 dB(A) difference between specific
          units of similar capacity.
        </li>
      </ul>

      <h2>How most UK homeowners actually decide</h2>
      <p>
        In practice, three factors usually settle the brand choice:
      </p>
      <ol>
        <li>
          <strong>Your installer&rsquo;s preferred range.</strong>{" "}
          Most MCS installers have a primary brand they specify by
          default — they know its controls, defrost behaviour and
          commissioning quirks deeply. An installer&rsquo;s
          experience with their preferred brand often delivers
          better real-world efficiency than the alternative would
          on paper. If your shortlisted installers all default to
          one brand, that&rsquo;s a strong signal to go with it.
        </li>
        <li>
          <strong>Indoor unit space.</strong> If you have a
          constrained airing-cupboard or utility-room footprint,
          the cylinder dimensions and integrated-vs-standalone
          options drive the decision. Both ranges offer compact
          options; the specific model that fits your space may be
          on only one brand&rsquo;s catalogue.
        </li>
        <li>
          <strong>Existing emitters.</strong> If you can&rsquo;t
          upgrade radiators (period property, listed building),
          the Daikin Altherma 3 H HT&rsquo;s ability to run at
          higher flow temperatures may avoid the emitter
          conversation entirely. Mitsubishi&rsquo;s standard range
          assumes a flow temperature around 45–55 °C.
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
          What&rsquo;s your real-world SCOP estimate for my
          property after installer commissioning — not the
          headline lab figure?
        </li>
        <li>
          Which controls app will the system use, and what remote
          management does the standard warranty include?
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
          Get 2–3 quotes from MCS-certified installers in your
          area. If two quote different brands, ask each why they
          recommend theirs — the reasoning matters more than the
          recommendation.
        </li>
        <li>
          Check the MCS product database for the specific model
          number on the quote; verify the cert is current.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Daikin Altherma and Mitsubishi Ecodan are both well-engineered
        UK heat-pump ranges that deliver BUS-eligible installs
        across the typical home. Headline spec differences are
        smaller than they appear once you account for installer
        commissioning quality. The practical decision usually comes
        down to your installer&rsquo;s preferred range, indoor-unit
        space constraints, and whether your existing radiators can
        take a standard flow temperature. Both manufacturers have
        published spec sheets that should travel with any quote;
        ask for them and verify against the MCS product database.
      </p>
    </AEOPage>
  );
}
