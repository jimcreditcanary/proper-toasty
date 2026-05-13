// /compare/solar-pv-vs-solar-thermal — head-term comparison.
//
// Niche-but-asked question. Solar thermal (panels that heat water
// directly via a circulating fluid into a cylinder coil) was a
// significant UK market through 2010-2016 under RHI funding. The
// 2022 RHI close + falling solar PV prices + heat-pump uptake has
// largely outcompeted solar thermal: solar PV plus a heat pump
// (or PV-only with an immersion diverter) covers the same use
// case more flexibly.
//
// Editorial framing: not "solar thermal is dead", but "the UK
// 2026 economics favour solar PV almost everywhere; here's when
// solar thermal still makes sense" — narrow but real.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/solar-pv-vs-solar-thermal";

export const metadata: Metadata = {
  title: "Solar PV vs solar thermal in 2026: UK cost + payback guide",
  description:
    "Solar PV generates electricity; solar thermal heats water directly. In 2026 UK economics PV almost always wins — but solar thermal retains a narrow niche.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Solar PV vs solar thermal in 2026: UK cost + payback guide",
    description:
      "PV vs thermal — cost, payback, flexibility, and when each still makes sense in 2026.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function SolarPvVsSolarThermal() {
  return (
    <AEOPage
      headline="Solar PV vs solar thermal in 2026: which still makes sense for UK homes?"
      description="Solar PV generates electricity; solar thermal heats water directly. In 2026 UK economics PV almost always wins — but solar thermal retains a narrow niche."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Solar"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Solar PV vs solar thermal" },
      ]}
      directAnswer="Solar PV generates electricity that can power anything in the home (or export to the grid for SEG income). Solar thermal generates heat for the hot-water cylinder only. In 2026 UK economics, solar PV almost always wins: PV install costs £5,000–£7,500 for a 4 kWp system that saves £500–£900/year on bills + earns SEG export income; solar thermal costs £3,500–£6,000 and saves £150–£300/year by displacing hot-water heating. PV is more flexible, scales better, and pairs natively with heat pumps."
      tldr={[
        "Solar PV: electricity → powers anything. Solar thermal: heat → hot water only.",
        "UK install cost 2026: PV £5,000–£7,500 (4 kWp); thermal £3,500–£6,000 (2-panel).",
        "Annual saving: PV £500–£900 + SEG income; thermal £150–£300 hot-water displacement.",
        "Payback: PV 7–11 years; thermal 15+ years on most UK homes.",
        "Solar thermal retains a niche for very high hot-water demand (large families, gym home use) where PV + cylinder immersion still costs more to run.",
      ]}
      faqs={[
        {
          question: "What's actually different about the two technologies?",
          answer:
            "Solar PV panels contain silicon cells that convert sunlight to DC electricity, which an inverter converts to AC for use in the home or export to the grid. Solar thermal panels (flat-plate or evacuated-tube) circulate a heat-transfer fluid through dark absorbers; the heated fluid carries heat into a coil inside your hot water cylinder. PV is a more flexible product — its output is electricity, which is fungible across every domestic appliance, EV charging, heat-pump electricity etc. Solar thermal's output is heat, which is only useful for hot water (or low-grade space heating in unusual setups).",
        },
        {
          question: "Does solar thermal still get any UK government support?",
          answer:
            "Limited. The Renewable Heat Incentive (RHI) closed to new applicants in March 2022 and was the main UK funding stream for residential solar thermal installs. The Boiler Upgrade Scheme (BUS) does NOT cover solar thermal — it's heat-pump-only. Some regional schemes (Welsh Government Nest, certain local council initiatives) include solar thermal in fabric-and-heat retrofit grants, but the major national scheme that drove pre-2022 installs is gone. Most 2026 solar thermal installs are paid for fully by the homeowner.",
        },
        {
          question:
            "I want lower bills AND a heat pump — should I pick PV or thermal?",
          answer:
            "Almost certainly PV. A heat pump runs on electricity; a PV array generates electricity that can offset the heat-pump's electricity draw at no incremental fuel cost. Solar thermal heats your hot water, which a heat pump would do anyway via the cylinder coil — so thermal duplicates capability the heat pump already provides. Solar PV + heat pump is the dominant 2026 UK pathway; solar thermal + heat pump rarely makes economic sense because the thermal install displaces a capability you're already paying for.",
        },
        {
          question:
            "Can I have both solar PV and solar thermal on the same roof?",
          answer:
            "Technically yes, but rarely worth it. Roof space is the constraint. A standard UK 2-panel solar thermal install occupies ~3–4 m² of south-facing roof; the same area could host 1.2–1.5 kWp of solar PV. The marginal PV (~1.5 kWp) typically delivers more annual cash benefit than the thermal install via either bill saving or SEG export income, and the PV electricity can power anything (including a hot-water immersion). Roof area better-spent on more PV than dual-tech.",
        },
      ]}
      sources={[
        {
          name: "Energy Saving Trust — Solar thermal",
          url: "https://energysavingtrust.org.uk/advice/solar-water-heating/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Solar PV",
          url: "https://energysavingtrust.org.uk/advice/solar-panels/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Smart Export Guarantee",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/smart-export-guarantee-seg",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Domestic Renewable Heat Incentive (closed)",
          url: "https://www.gov.uk/domestic-renewable-heat-incentive",
          accessedDate: "May 2026",
        },
        {
          name: "MCS — Find an installer",
          url: "https://mcscertified.com/find-an-installer/",
          accessedDate: "May 2026",
        },
      ]}
    >
      <ComparisonTable
        caption="Solar PV vs solar thermal — typical UK numbers in 2026"
        headers={["", "Solar PV (4 kWp)", "Solar thermal (2 panels)"]}
        rows={[
          ["Install cost", "£5,000–£7,500", "£3,500–£6,000"],
          ["What it produces", "Electricity (3,500–4,200 kWh/yr)", "Heat (1,500–2,500 kWh/yr)"],
          ["Roof area required", "~16–20 m²", "~3–4 m²"],
          ["Powers what?", "Anything in the home + EV + grid export", "Hot water cylinder only"],
          ["Annual bill saving", "£500–£900", "£150–£300"],
          ["Annual export income", "£100–£300 (SEG)", "£0 (no export route)"],
          ["Payback period", "7–11 years", "15+ years"],
          ["20-year net benefit", "£8,000–£15,000", "£500–£3,000"],
          ["Pairs with heat pump?", "Yes (electricity offsets heat-pump load)", "Duplicates heat pump cylinder coil"],
          ["UK government funding (2026)", "None (SEG market-based only)", "None (RHI closed Mar 2022)"],
          ["MCS-certified installers", "Wide UK coverage", "Shrinking — fewer specialists"],
          ["Best fit", "Almost every UK home with south/east/west roof", "Very high hot-water demand, off-grid"],
        ]}
        footnote="Ranges are typical for a 3-bed UK semi (~110 m²). Specific numbers depend on roof orientation, shading, household consumption pattern, and choice of SEG tariff."
      />

      <h2>The economic shift since 2022</h2>
      <p>
        Solar thermal had a meaningful UK market through the 2010s,
        funded primarily by the Renewable Heat Incentive (RHI) which
        paid quarterly subsidies per kWh of useful heat output for
        seven years. The RHI closed to new applicants in March
        2022. At the same time, solar PV prices fell ~40% between
        2018 and 2024, and the Boiler Upgrade Scheme (BUS)
        positioned heat pumps + cylinder heating as the
        decarbonisation pathway. The result: solar thermal&rsquo;s
        market shrank from ~10,000 installs/year in 2015 to
        &lt;500/year by 2024.
      </p>
      <p>
        The technology still works — solar thermal in mid-summer
        UK conditions can supply 100% of a household&rsquo;s hot
        water for weeks at a time. The problem is that the same
        roof area used for solar PV delivers more annual cash
        benefit because the electricity output is fungible (can
        offset anything), while thermal output is constrained to
        hot-water demand.
      </p>

      <h2>Why solar PV usually wins</h2>
      <p>
        Three structural reasons solar PV beats solar thermal on
        2026 UK economics:
      </p>
      <ul>
        <li>
          <strong>Flexibility of output.</strong> 1 kWh of PV
          electricity can run the fridge, charge an EV, power the
          heat pump, or export to the grid. 1 kWh of solar-thermal
          heat can only warm your hot water cylinder. Once your
          cylinder is at temperature, additional thermal output is
          wasted (the system stops circulating); PV electricity
          beyond self-consumption gets exported under the Smart
          Export Guarantee for cash income.
        </li>
        <li>
          <strong>Coverage of summer demand.</strong> A 4 kWp PV
          system covers most of a UK household&rsquo;s daytime
          electricity demand from April through September. Solar
          thermal covers hot-water heating in the same months but
          the household doesn&rsquo;t need MORE hot water in
          summer — usage is roughly flat year-round, so summer
          surplus is wasted. The mismatch between thermal output
          (peaks in summer) and demand (flat) hurts thermal&rsquo;s
          effective utilisation.
        </li>
        <li>
          <strong>Heat-pump compatibility.</strong> Solar PV +
          heat pump is multiplicative: the PV offsets the
          heat-pump&rsquo;s electricity bill at no extra fuel cost.
          Solar thermal + heat pump is duplicative: the heat pump
          already heats the cylinder via its coil, so the thermal
          panels displace capability the heat pump already
          provides. Most modern UK home decarbonisation pathways
          end up with a heat pump; PV is the natural addition.
        </li>
      </ul>

      <h2>When solar thermal still makes sense (rare)</h2>
      <p>
        Two narrow scenarios where solar thermal is still
        defensible in 2026:
      </p>
      <ul>
        <li>
          <strong>Very high hot-water demand.</strong> Large
          families (5+ residents), households with a home gym +
          frequent showers/baths, or properties with significant
          live-in carer arrangements can have hot-water demand 3–4×
          a typical 3-bed household. Solar thermal&rsquo;s direct
          heat-into-cylinder pathway becomes more competitive when
          the cylinder is being recharged constantly. Even so, PV
          + larger cylinder + immersion diverter often delivers
          equivalent benefit with more flexibility.
        </li>
        <li>
          <strong>Off-grid properties without grid-export option.</strong>{" "}
          A few rural UK properties have no grid-export path
          (typically remote locations with constrained connections).
          Solar thermal&rsquo;s output is consumed at source
          regardless of grid status, which can simplify the
          off-grid setup. Solar PV with a battery + diverter
          system covers the same scenario and is the dominant
          off-grid pathway, but thermal can be a simpler retrofit.
        </li>
      </ul>

      <h2>The hybrid approach (PV + cylinder diverter)</h2>
      <p>
        A solar-thermal-style outcome can usually be achieved with
        PV alone using a cylinder diverter: when PV is generating
        surplus electricity (export-bound), the diverter routes it
        to the cylinder&rsquo;s electric immersion element instead.
        Equivalent to solar-thermal&rsquo;s hot-water displacement
        AND retains the option to use PV electricity for anything
        else when the cylinder is up to temperature.
      </p>
      <p>
        Diverters cost £200–£500 fitted onto an existing PV system.
        Most modern UK PV installs include one as standard. This is
        why &ldquo;should I add solar thermal?&rdquo; usually answers itself:
        the PV system you&rsquo;re already considering covers the
        same hot-water capability with more flexibility.
      </p>

      <h2>If you&rsquo;re still considering solar thermal</h2>
      <p>
        Three questions worth asking an installer pitching solar
        thermal in 2026:
      </p>
      <ol>
        <li>
          <strong>Why aren&rsquo;t you proposing solar PV with a
          cylinder diverter instead?</strong> The honest answer
          should reference your specific hot-water demand or
          off-grid context. Vague answers about &ldquo;thermal being
          more efficient&rdquo; don&rsquo;t hold up — PV + diverter
          delivers equivalent hot-water displacement with more
          flexibility.
        </li>
        <li>
          <strong>What&rsquo;s the projected payback period?</strong>{" "}
          Without RHI, solar thermal payback periods on a typical
          UK home are 15+ years. If the installer is quoting much
          shorter payback, ask which assumptions they&rsquo;re
          using and how those align with current UK energy prices.
        </li>
        <li>
          <strong>How does this interact with future heat-pump
          plans?</strong> If you&rsquo;re likely to install a heat
          pump in the next 5–10 years, the solar thermal system
          may become redundant. Better to plan the heat-pump path
          first and add PV to support it.
        </li>
      </ol>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to confirm your roof&rsquo;s solar PV potential + indicative
          system size.
        </li>
        <li>
          Get 2–3 PV quotes from MCS-certified installers. Ask
          about cylinder diverters as standard inclusion.
        </li>
        <li>
          If your installer is also pitching solar thermal, ask
          them to quote PV with diverter as an alternative —
          easier to compare like-for-like.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Solar PV almost always wins on 2026 UK economics. The
        underlying reason is structural — electricity output is
        more flexible than heat output, and the PV market has
        scaled while solar thermal&rsquo;s subsidy regime closed
        in 2022. The narrow remaining solar thermal use cases
        (very high hot-water demand, off-grid simplicity) are
        real but covered better in most homes by PV with a
        cylinder diverter at a fraction of the install cost.
      </p>
    </AEOPage>
  );
}
