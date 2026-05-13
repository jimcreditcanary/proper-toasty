// /compare/hybrid-vs-full-heat-pump — head-term comparison page.
//
// The "hybrid heat pump vs full heat pump" question is unusually
// time-sensitive: BUS eligibility rules changed in May 2023, when
// the scheme stopped funding hybrid (gas + heat pump) installs.
// Pre-2023 search results still surface hybrid systems as a
// "best of both worlds" answer, which is now misleading for any
// homeowner who'd otherwise claim the £7,500 grant.
//
// Editorial framing: hybrids genuinely remain useful in narrow
// niches (very large old homes where running the heat pump alone
// risks comfort issues on the coldest nights), but the BUS-grant
// exclusion shifted the economic case decisively. Page acknowledges
// both sides — neutral on the technology, clear on the policy.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/hybrid-vs-full-heat-pump";

export const metadata: Metadata = {
  title: "Hybrid vs full heat pump in 2026: BUS rules + UK economics",
  description:
    "Hybrid systems combine a heat pump with a gas/oil boiler. UK BUS grant excludes hybrids since 2023 — here's when each still makes sense.",
  alternates: { canonical: URL },
  openGraph: {
    title: "Hybrid vs full heat pump in 2026: BUS rules + UK economics",
    description:
      "BUS-grant rule changes + lifetime economics worked through with 2026 UK numbers.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function HybridVsFullHeatPump() {
  return (
    <AEOPage
      headline="Hybrid vs full heat pump in 2026: what the BUS rules changed"
      description="Hybrid systems combine a heat pump with a gas/oil boiler. UK BUS grant excludes hybrids since 2023 — here's when each still makes sense."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Heating"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "Hybrid vs full heat pump" },
      ]}
      directAnswer="A hybrid system runs a heat pump alongside a gas or oil boiler, switching between them based on outdoor temperature. The Boiler Upgrade Scheme stopped funding hybrid installs in May 2023, so a full heat pump now usually wins on day-one cost (after the £7,500 grant), running cost (no fossil fuel), and lifespan. Hybrids retain a narrow niche for very large or poorly insulated homes where a full heat pump alone would struggle on the coldest UK days."
      tldr={[
        "BUS grant excludes hybrids since May 2023 — only full heat pumps qualify for £7,500.",
        "Full heat pump after grant usually cheaper to install than a new hybrid system.",
        "Running cost: full heat pump cheaper on most homes; hybrid only wins on the coldest 10–20 days/year.",
        "Hybrid retains a use case for very large old homes (200+ m², solid-wall, F/G band) where peak heat demand can't be met by a single heat pump.",
        "Most pre-2023 \"hybrid is the best of both\" advice is now economically out of date in the UK.",
      ]}
      faqs={[
        {
          question:
            "Why did the BUS scheme stop funding hybrid heat pumps?",
          answer:
            "DESNZ (then BEIS) tightened scheme eligibility in May 2023 to focus the £7,500 grant on full decarbonisation pathways. Hybrid systems still burn fossil fuel for peak loads — typically 15–25% of annual heat — which the scheme's revised goals don't support. Ofgem's BUS guidance is the authoritative current source; the eligibility criteria explicitly require a primary system that doesn't burn fossil fuel.",
        },
        {
          question:
            "I've seen hybrids recommended in older UK articles — why?",
          answer:
            "Pre-2023 advice often framed hybrids as risk mitigation: install a heat pump for the bulk of the year, keep the boiler for the coldest days. That made sense when (1) heat-pump sizing was conservative, (2) BUS funded hybrids, and (3) UK gas prices were lower. All three have shifted: full heat pumps are now routinely sized for 100% of UK heat demand, the grant excludes hybrids, and gas is more expensive relative to electricity. Most pre-2023 hybrid advice is economically out of date.",
        },
        {
          question:
            "When does a hybrid still make sense in 2026?",
          answer:
            "Two scenarios. First: very large old homes (typically 200+ m², solid-wall, EPC band F or G) where peak heat demand exceeds any single residential heat pump's capacity — a hybrid keeps the existing boiler for coldest-day fallback. Second: homeowners willing to forgo the BUS grant for a phased transition (heat pump now, boiler retained for backup, full removal in 5–10 years as the boiler ages out). Both are minority cases.",
        },
        {
          question:
            "Can I install a heat pump and KEEP my old boiler as standby?",
          answer:
            "Yes, but you'd lose BUS-grant eligibility because the scheme requires removal of any fossil-fuel primary heating. A common middle path: install a properly sized full heat pump with the grant, then keep the gas/oil boiler decommissioned but in place as a future-replaceable shell. If you ever want the hybrid setup you can re-commission, though most homeowners find they don't need to.",
        },
      ]}
      sources={[
        {
          name: "Ofgem — Boiler Upgrade Scheme guidance",
          url: "https://www.ofgem.gov.uk/environmental-and-social-schemes/boiler-upgrade-scheme-bus",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — Boiler Upgrade Scheme",
          url: "https://www.gov.uk/apply-boiler-upgrade-scheme",
          accessedDate: "May 2026",
        },
        {
          name: "DESNZ — Heat and Buildings Strategy",
          url: "https://www.gov.uk/government/publications/heat-and-buildings-strategy",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Hybrid heat pumps",
          url: "https://energysavingtrust.org.uk/advice/air-source-heat-pumps/",
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
        caption="Hybrid vs full heat pump — typical UK numbers in 2026"
        headers={["", "Full heat pump", "Hybrid (HP + boiler)"]}
        rows={[
          ["Install cost (pre-grant)", "£8,000–£14,000", "£9,000–£15,000"],
          ["BUS grant", "−£7,500 (E&W)", "— (excluded since 2023)"],
          ["Net upfront cost", "£1,500–£6,500", "£9,000–£15,000"],
          ["Annual fuel cost", "£900–£1,400", "£1,000–£1,500"],
          ["Fossil fuel share of heat", "0%", "15–25% (cold-day fallback)"],
          ["Carbon emissions", "~0.4–0.8 t CO₂/yr", "~0.8–1.2 t CO₂/yr"],
          ["Maintenance", "1 system to service", "2 systems to service"],
          ["Expected lifespan", "15–20 years", "Boiler 10–15, HP 15–20"],
          ["Outdoor footprint", "1 × 1 m unit", "1 × 1 m unit + boiler"],
          ["Install complexity", "Standard MCS install", "More complex controls"],
          ["BUS grant eligible?", "Yes (E&W)", "No"],
        ]}
        footnote="Ranges are typical for a 3–4-bed UK property (~110–180 m²). Specific quote depends on heat-loss survey + MCS-certified installer assessment."
      />

      <h2>The 2023 BUS-rule shift — the headline change</h2>
      <p>
        Until May 2023, the Boiler Upgrade Scheme funded hybrid heat
        pump installs alongside full heat pump installs at the same
        £6,000 (later £7,500) grant rate. DESNZ tightened eligibility
        that month to focus the scheme on full
        fossil-fuel-replacement pathways. Hybrids still burn gas or
        oil to cover peak heat demand on the coldest days — typically
        15–25% of annual heat output — so they don&rsquo;t deliver
        the full decarbonisation the scheme is funding.
      </p>
      <p>
        The practical effect: a full heat pump install gets £7,500
        off the upfront cost, while a hybrid install gets nothing
        from BUS. For a 3-bed UK semi at typical install ranges,
        that&rsquo;s a £7,500+ swing in favour of the full heat
        pump on day one before any running-cost difference is
        counted.
      </p>

      <h2>How the technology differs</h2>
      <p>
        A <strong>full heat pump</strong> handles 100% of your home&rsquo;s
        heat demand year-round. Sizing assumes the coldest plausible
        day for your area (typically -2°C to -5°C depending on UK
        region) and selects unit capacity to maintain comfort at
        that design temperature. Modern variable-speed compressors
        modulate output down to ~30% capacity for mild days, so the
        same unit handles both shoulder-season trickle demand and
        coldest-day peak.
      </p>
      <p>
        A <strong>hybrid system</strong> couples a smaller heat pump
        (typically 4–7 kW) with the existing or a new gas/oil
        boiler. A smart controller decides which system to run based
        on outdoor temperature, electricity vs gas price, and heat
        demand. In practice the heat pump runs above ~3°C outdoor
        temperature and the boiler runs below. The split delivers
        ~75–85% of annual heat via the heat pump and ~15–25% via
        the boiler.
      </p>

      <h2>Running cost — closer than you&rsquo;d think</h2>
      <p>
        On paper, a hybrid uses the cheapest fuel for each operating
        regime — heat pump efficiency on milder days when COP is
        good, gas/oil when it isn&rsquo;t. In practice, the
        difference is modest. A full heat pump at SCOP 3.5 in a
        typical UK home runs £900–£1,400/year; a hybrid runs
        £1,000–£1,500/year. The hybrid&rsquo;s gas/oil contribution
        on the coldest weeks is a small absolute saving once
        you&rsquo;re paying for two fuel supplies and two service
        contracts.
      </p>
      <p>
        Heat-pump-specific electricity tariffs (Octopus Cosy,
        British Gas Heat Pump Plus, EDF GoElectric) tilt the
        comparison further toward the full heat pump — these
        tariffs only meaningfully apply to the heat-pump portion of
        a hybrid&rsquo;s load, so the saving compounds.
      </p>

      <h2>The carbon angle</h2>
      <p>
        A full heat pump emits ~0.4–0.8 tonnes CO₂/year from heat,
        driven by the UK grid&rsquo;s ~150 g/kWh intensity in 2026.
        A hybrid running 80/20 heat pump/gas emits ~0.8–1.2 tonnes —
        roughly double. The gap matters more if you care about
        long-term carbon (each year a hybrid runs is another year
        of fossil-fuel lock-in) and less if you care about today&rsquo;s
        running cost.
      </p>

      <h2>When a hybrid still makes sense (rare in 2026)</h2>
      <p>
        Two narrow scenarios:
      </p>
      <ul>
        <li>
          <strong>Very large, very leaky older homes.</strong> A
          200+ m² solid-wall pre-1900 detached without insulation
          retrofit may have peak heat demand at design temperature
          beyond any single residential heat pump&rsquo;s capacity
          (typically 14–16 kW). A hybrid keeps the boiler for those
          coldest hours rather than scaling up to a commercial-grade
          heat pump. Better answer in most cases: fabric retrofit
          first (loft + cavity / solid wall + glazing), THEN
          properly sized full heat pump. But that&rsquo;s a £15k+
          fabric job before the heating itself.
        </li>
        <li>
          <strong>Phased-transition homeowners.</strong> Some
          homeowners want to keep the existing boiler in commission
          for psychological reassurance through their first 1–2
          winters with a heat pump. Doing so as a hybrid loses BUS
          eligibility. Doing so as &ldquo;decommissioned but in
          place&rdquo; alongside a properly sized full heat pump
          keeps BUS eligibility AND the optionality.
        </li>
      </ul>

      <h2>What homeowners with hybrid quotes should ask</h2>
      <p>
        If your installer is quoting a hybrid in 2026, three
        questions to put to them:
      </p>
      <ol>
        <li>
          <strong>Why aren&rsquo;t you sizing a full heat pump for
          this property?</strong> The honest answer should reference
          a specific calculation — peak heat demand vs available
          heat-pump capacity at design temperature. Vague answers
          about &ldquo;safer&rdquo; or &ldquo;flexibility&rdquo;
          aren&rsquo;t enough.
        </li>
        <li>
          <strong>Is this quote BUS-eligible?</strong> Hybrid
          systems aren&rsquo;t. If the installer says yes, that&rsquo;s
          a serious red flag — either they&rsquo;re selling
          something the scheme won&rsquo;t fund or they&rsquo;re
          unfamiliar with the 2023 rule change.
        </li>
        <li>
          <strong>What fabric improvements would let me skip the
          boiler entirely?</strong> Often a £3k–£8k insulation
          retrofit reduces peak demand enough that a full heat pump
          becomes viable. The grant savings + the simpler system
          usually beats the hybrid lifetime cost.
        </li>
      </ol>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to get the BUS-eligibility verdict for your specific
          property + an installer-ready report.
        </li>
        <li>
          If you&rsquo;ve been told you need a hybrid, get a second
          opinion from an MCS-certified installer who routinely
          installs full systems in older properties. Sizing
          conservatism is a known issue in the trade.
        </li>
        <li>
          Consider a fabric-first conversation if heat-loss numbers
          come in high. Loft + cavity insulation often unlocks a
          full-heat-pump install on properties that look hybrid-only
          at first glance.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        Hybrids were a sensible answer to a 2018–2022 question. The
        2023 BUS-rule change shifted the economics: a full heat pump
        is now £7,500 cheaper upfront, simpler to maintain, lower
        on running cost, and dramatically lower on carbon. The
        narrow cases where hybrids still make sense (very large old
        leaky homes, phased-transition reassurance) are real but
        rare — and both have better answers (fabric retrofit,
        decommissioned-but-retained boiler) that preserve BUS
        eligibility.
      </p>
    </AEOPage>
  );
}
