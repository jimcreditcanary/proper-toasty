// /compare/heat-pump-vs-night-storage-heaters — head-term comparison.
//
// ~700k UK homes use night storage heaters (NSHs) — mostly older
// flats, ex-council housing, and rural off-gas properties without
// the space or supply for a wet system. NSHs are the other major
// direct-electric heating category alongside flow-heater electric
// boilers, but they sit in a different commercial niche: they
// pair with Economy 7 tariffs and are designed around overnight
// charging.
//
// Editorial framing: the headline issue with modern NSHs isn't
// running cost (Economy 7 night rates are cheap) — it's COMFORT.
// Stored heat dissipates through the day, leaving evenings cold
// when people are home. Modern high-heat-retention storage heaters
// (HHRSHs) help, but a heat pump on a time-of-use tariff matches
// the cheap-overnight-electricity story AND delivers heat when
// you actually want it.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/heat-pump-vs-night-storage-heaters";

export const metadata: Metadata = {
  title:
    "Heat pump vs night storage heaters in 2026: comfort + cost guide",
  description:
    "Storage heaters use cheap overnight electricity but heat dissipates by evening. Heat pump on a time-of-use tariff matches the cost story + delivers heat when you want it.",
  alternates: { canonical: URL },
  openGraph: {
    title:
      "Heat pump vs night storage heaters in 2026: comfort + cost guide",
    description:
      "Worked through with 2026 UK Economy 7 numbers + heat-pump tariff comparisons.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HeatPumpVsNightStorageHeaters() {
  return (
    <AEOPage
      headline="Heat pump vs night storage heaters in 2026: comfort + cost"
      description="Storage heaters use cheap overnight electricity but heat dissipates by evening. Heat pump on a time-of-use tariff matches the cost story + delivers heat when you want it."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heating"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Heat pump vs night storage heaters" },
      ]}
      directAnswer="Night storage heaters use Economy 7's cheap overnight rate to store heat in a thermal core, releasing it through the day. The downside: stored heat is largely gone by evening when most homes want it most. A heat pump on a heat-pump-specific tariff matches the overnight cheap-electricity story and delivers heat on demand. Switching typically saves £400–£900 a year for a typical UK home + materially improves evening comfort."
      tldr={[
        "Storage heaters use cheap Economy 7 electricity (~9–13p/kWh) but heat releases all day, not on demand.",
        "Heat pump on a heat-pump tariff uses similarly cheap electricity windows + delivers heat when you want it.",
        "Running cost: heat pump typically £400–£900/year cheaper than modern HHRSHs, £700–£1,200 cheaper than older NSHs.",
        "Comfort: heat pump heats specific rooms on demand; storage heaters heat everything when the thermal core is full.",
        "BUS grant: same £7,500 applies to storage-heater swaps in E&W.",
      ]}
      faqs={[
        {
          question:
            "Aren't modern high-heat-retention storage heaters (HHRSHs) close to a heat pump on running cost?",
          answer:
            "Closer than older NSHs, but not equivalent. HHRSHs hit ~95% efficiency vs ~99% for a heat pump's compressor cycle but they still output 1 kWh of heat per 1 kWh of electricity used — the same fundamental limit as any direct-electric system. A heat pump at SCOP 3.5 outputs 3.5 kWh of heat per 1 kWh of electricity. Even on identical tariffs the heat pump wins on running cost; on a heat-pump-specific tariff the gap widens to £400–£900/year for a typical UK flat or small house.",
        },
        {
          question:
            "I live in a flat with no outdoor space — can I still get a heat pump?",
          answer:
            "Often yes — air-source units have shrunk substantially and some installs work on private balconies, light wells, or shared roofs with the freeholder's consent. Pre-survey your specific property at propertoasty.com/check; an installer will need to assess the siting, noise compliance (MCS 020), and management-company consent. If outdoor siting genuinely fails, modern HHRSHs are the next-best option — but the running-cost gap to heat pumps stays meaningful.",
        },
        {
          question:
            "What happens to my Economy 7 tariff when I switch to a heat pump?",
          answer:
            "You'd typically switch to a heat-pump-specific tariff (Octopus Cosy, British Gas Heat Pump Plus, EDF GoElectric) at the same time as commissioning. These tariffs work similarly to Economy 7 in spirit — cheap overnight rates plus targeted cheap windows during heat-pump operating hours — but the cheap-rate windows are configured around heat-pump load patterns rather than the fixed 11pm–7am Economy 7 window. Net effect: you keep the cheap-electricity benefit but apply it 3.5× more efficiently.",
        },
        {
          question: "Does the BUS grant apply to storage-heater swaps?",
          answer:
            "Yes — the £7,500 Boiler Upgrade Scheme applies to any home in England or Wales switching to a low-carbon heating system, regardless of the existing setup. Storage-heater swaps are an under-recognised segment of BUS uptake. The grant typically covers most or all of the install cost for a small flat or 1-bed property.",
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
          name: "Energy Saving Trust — Electric storage heaters",
          url: "https://energysavingtrust.org.uk/advice/storage-heaters/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Domestic energy prices (quarterly)",
          url: "https://www.gov.uk/government/collections/domestic-energy-prices",
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
        caption="Heat pump vs storage heaters — typical UK numbers in 2026"
        headers={["", "Air-source heat pump", "Modern HHRSHs", "Older NSHs"]}
        rows={[
          ["Install cost (pre-grant)", "£8,000–£14,000", "£2,500–£4,500", "£1,500–£3,000"],
          ["BUS grant", "−£7,500 (E&W)", "—", "—"],
          ["Net upfront cost", "£1,500–£6,500", "£2,500–£4,500", "£1,500–£3,000"],
          ["Efficiency (heat / kWh in)", "~3.5 (SCOP)", "~0.95", "~0.90"],
          ["Annual fuel cost (typical 70m² flat)", "£600–£900", "£1,000–£1,400", "£1,200–£1,800"],
          ["Comfort — evening heat?", "On demand", "Often depleted", "Mostly depleted"],
          ["Tariff", "Heat-pump TOU", "Economy 7", "Economy 7"],
          ["Outdoor footprint", "1 × 1 m unit", "None (indoor)", "None (indoor)"],
          ["Hot water", "Separate cylinder", "Often immersion (3 kW)", "Often immersion (3 kW)"],
          ["Expected lifespan", "15–20 years", "20–25 years", "20–30 years"],
          ["Install time", "2–3 days", "1 day", "1 day"],
          ["Carbon emissions", "~0.3–0.6 t CO₂/yr", "~1.4–1.7 t CO₂/yr", "~1.6–2.0 t CO₂/yr"],
        ]}
        footnote="Ranges are typical for a 1–2 bed UK flat (~50–80 m²) where storage heaters are most common. Specific quote depends on heat-loss survey + MCS-certified installer assessment."
      />

      <h2>The Economy 7 story — and its weakness</h2>
      <p>
        Night storage heaters were designed in the 1970s to pair
        with Economy 7 tariffs: cheap electricity rates from
        ~11pm–7am, charging the heater&rsquo;s thermal core
        overnight, then releasing that heat slowly through the day.
        Cheap to install, no plumbing required, uses
        spare-capacity nuclear baseload electricity. For households
        out of the house through the day, it worked well.
      </p>
      <p>
        The weakness is what every UK NSH user knows from
        experience: by evening (when most households are home and
        want heat), the thermal core is largely depleted. You can
        boost on the peak-rate tariff but that&rsquo;s exactly when
        electricity is most expensive — typically 3× the overnight
        rate. The result is either cold evenings or expensive boost
        usage, often both.
      </p>

      <h2>How heat pumps change the maths</h2>
      <p>
        A heat pump on a heat-pump-specific tariff (Octopus Cosy,
        British Gas Heat Pump Plus, EDF GoElectric) uses the same
        cheap-overnight-electricity trick that Economy 7 invented,
        but applies it 3.5× more efficiently. Cheap-rate windows
        align with overnight heating + hot-water cylinder charging;
        the system delivers heat on demand during the day rather
        than relying on a thermal core to coast through.
      </p>
      <p>
        For a typical 1–2 bed UK flat needing ~6,000–8,000 kWh of
        heat per year, that translates to:
      </p>
      <ul>
        <li>
          <strong>Older NSHs:</strong> ~7,000 kWh of electricity at
          ~13p/kWh Economy 7 average = £900/year, plus £200–£400 in
          peak-rate boost on cold evenings = £1,100–£1,300/year all-in.
        </li>
        <li>
          <strong>Modern HHRSHs:</strong> Same kWh-in, slightly
          better retention so less peak-rate boost = £1,000–£1,200/yr.
        </li>
        <li>
          <strong>Heat pump on a heat-pump tariff:</strong> ~2,000 kWh
          of electricity at ~15p/kWh average = £300, plus standing
          charges and cylinder heating = £600–£900/year.
        </li>
      </ul>
      <p>
        Annual saving on switching: £400–£900 for a typical UK flat.
        Plus the comfort gain — heat on demand, not heat-when-the-core-
        has-it.
      </p>

      <h2>Comfort, not just running cost</h2>
      <p>
        Storage heaters share an unusual failure mode: they fail to
        deliver heat when you most want it. By evening, when a 1-bed
        flat is occupied + cooling down + wants comfortable
        temperatures, the thermal core has been releasing heat all
        day and is depleted. The mitigation (boost on peak rate)
        works financially up to a point but stops working
        meaningfully on cold weeks when boost usage compounds.
      </p>
      <p>
        Heat pumps don&rsquo;t have this failure mode. They operate
        continuously at low-intensity output, modulated to current
        heat demand. Evening comfort is identical to morning comfort
        because the heat is delivered in real time, not pre-stored.
        Owner-occupiers in flats often describe the switch as the
        first time their home has been comfortable through the
        evening in years.
      </p>

      <h2>The carbon angle</h2>
      <p>
        Both systems run on grid electricity, so per-kWh carbon is
        identical (~150 g CO₂/kWh on the 2026 UK grid). Heat pumps
        buy ~1/3 the kWh, so carbon drops ~70%. For a typical UK
        flat: ~1.6–2.0 t CO₂/yr (older NSHs) drops to ~0.3–0.6 t
        CO₂/yr (heat pump) — a saving comparable to switching off
        mains gas.
      </p>

      <h2>When storage heaters still make sense</h2>
      <ul>
        <li>
          <strong>Listed-building flats where outdoor siting
          genuinely fails.</strong> Same MCS 020 + Listed Building
          Consent constraints as other heat-pump switches.
          Modern HHRSHs are the upgrade path.
        </li>
        <li>
          <strong>Leasehold properties with no consented siting.</strong>{" "}
          Some leasehold management companies don&rsquo;t engage with
          heat-pump consents. Owner-led pressure has shifted this
          since 2023 but pockets remain.
        </li>
        <li>
          <strong>Mid-tenancy rental properties</strong> where the
          landlord won&rsquo;t fund the install. A modern HHRSH
          replacement is a tenant-instigateable upgrade with sensible
          landlord agreement.
        </li>
      </ul>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to confirm BUS eligibility for your specific property
          (flats often need siting + consent steps owner-occupiers
          can flag up-front).
        </li>
        <li>
          If you&rsquo;re leasehold or in a flat with shared
          freeholders, raise the heat-pump siting question with your
          management agent early. Pre-2020 leases rarely contemplated
          heat pumps explicitly so most can&rsquo;t refuse on
          contract grounds, but consent paperwork takes time.
        </li>
        <li>
          Switch to a heat-pump electricity tariff at commissioning.
          Storage-heater households on Economy 7 should expect the
          tariff change too — the new tariff is similarly cheap
          overnight but configured around heat-pump load patterns.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Storage heaters made sense in a 1970s grid with cheap
        overnight baseload and no MCS-certified installer supply
        chain. In 2026, the heat-pump-on-time-of-use-tariff option
        delivers the same cheap-electricity story 3.5× more
        efficiently and removes the &ldquo;cold evening&rdquo;
        failure mode that storage heaters bake in by design. After
        the £7,500 BUS grant, the day-one numbers also favour the
        switch. The edge cases (listed flats, intransigent
        management agents, mid-tenancy rentals) are real but
        narrow.
      </p>
    </AEOPage>
  );
}
