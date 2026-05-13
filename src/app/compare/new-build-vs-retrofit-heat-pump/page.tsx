// /compare/new-build-vs-retrofit-heat-pump — install-context page.
//
// Different shape from a brand or fuel-type comparison: this is
// about the SAME heat-pump technology installed in two very
// different contexts. The 2025 ban on new fossil-fuel heating in
// new builds (Future Homes Standard) means new-build installs are
// now mandatory from gas; retrofit installs remain elective. The
// economics, BUS treatment, and install complexity all differ.

import type { Metadata } from "next";
import { AEOPage, ComparisonTable } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";

const URL =
  "https://www.propertoasty.com/compare/new-build-vs-retrofit-heat-pump";

export const metadata: Metadata = {
  title:
    "New build vs retrofit heat pump in 2026: UK Future Homes Standard guide",
  description:
    "Heat-pump install economics + complexity differ sharply between new build and retrofit. Future Homes Standard 2025 + BUS grant — what each path actually costs.",
  alternates: { canonical: URL },
  openGraph: {
    title:
      "New build vs retrofit heat pump in 2026: UK Future Homes Standard guide",
    description:
      "Future Homes Standard + BUS — what changes when the heat pump goes into a new build vs retrofit.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

export default function NewBuildVsRetrofitHeatPump() {
  return (
    <AEOPage
      headline="New build vs retrofit heat pump in 2026: what changes between them?"
      description="Heat-pump install economics + complexity differ sharply between new build and retrofit. Future Homes Standard 2025 + BUS grant — what each path actually costs."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Comparison · Install context"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Compare", url: "/compare" },
        { name: "New build vs retrofit heat pump" },
      ]}
      directAnswer="New-build heat pumps are now standard under the Future Homes Standard (no gas-boiler installs in English new builds from 2025). The heat pump is spec'd in at construction — radiator/UFH sizing, cylinder location, electrical capacity all designed for it from the start. Retrofit installs adapt the heat pump to an existing home's fabric, emitters and electrical supply. New-build installs typically cost £6,500–£10,000 inclusive in the build budget; retrofits cost £8,000–£14,000 pre-grant, £1,500–£6,500 net after the £7,500 BUS grant — which new builds aren't eligible for."
      tldr={[
        "Future Homes Standard from 2025 banned gas-boiler installs in English new builds — heat pumps are now mandatory.",
        "BUS grant £7,500 covers RETROFIT only; new-build heat pumps aren't BUS-eligible (because they're not replacing a fossil-fuel system).",
        "New-build install cost: £6,500–£10,000 inclusive of fabric + UFH already sized for the heat pump.",
        "Retrofit install cost: £8,000–£14,000 pre-grant, £1,500–£6,500 net — but you keep an existing home you can otherwise live in.",
        "Heat pump SCOP is typically higher in new builds (4.5–5.0) because fabric performance + UFH set up for low-temperature heating.",
      ]}
      faqs={[
        {
          question:
            "Why don't new-build heat pumps qualify for the BUS grant?",
          answer:
            "BUS funds the REPLACEMENT of an existing fossil-fuel heating system in England and Wales. New builds don't have an existing fossil-fuel system to replace — they're built with the heat pump from day one, so there's nothing for the scheme to fund a switch from. Ofgem's BUS guidance is explicit on this. New-build heat pumps are mandatory under the Future Homes Standard, so the funding model shifted to the developer's build cost rather than a homeowner grant.",
        },
        {
          question:
            "Is the Future Homes Standard the same as the BUS scheme?",
          answer:
            "No — they're separate UK government interventions with different goals. The Future Homes Standard (FHS) is a Building Regulations Part L update that takes effect for new builds from 2025: new English homes must achieve 75-80% lower CO₂ emissions than the 2013 baseline, which effectively requires a heat pump or other low-carbon heating system. BUS is a separate grant scheme that funds RETROFIT heat-pump installs in existing homes. FHS regulates what NEW builds must have; BUS funds what EXISTING homes can switch to.",
        },
        {
          question:
            "Do new-build heat pumps perform better than retrofit ones?",
          answer:
            "On average yes, for two reasons. First, new-build homes have better fabric (Part L 2021 thermal performance), so peak heat demand is lower and the heat pump runs at lower flow temperatures (35–40°C UFH design), pushing SCOP toward 4.5–5.0. Second, the heat pump is sized for the actual building rather than retrofitted to whatever pipework and emitters exist. Retrofit installs in well-insulated UK homes regularly hit SCOP 4.0–4.5; in older leaky homes they land at 3.2–3.8. The fabric difference is the main lever — fabric retrofit (loft + cavity) before a retrofit heat pump install typically narrows the gap.",
        },
        {
          question:
            "I'm buying a new build — does the developer choose the heat pump brand?",
          answer:
            "Yes, almost always. Developers spec the heating system as part of the construction package, choosing the brand based on supply contracts, installer training, and price. Common new-build heat pumps in 2026 are Mitsubishi Ecodan, Daikin Altherma, and Samsung EHS — chosen for cost-effective per-unit pricing at developer volumes. Homebuyers can ask which brand and model is specified, but usually can't change it without the developer's accommodation. After completion you own the heat pump and can service / replace it on your terms.",
        },
      ]}
      sources={[
        {
          name: "GOV.UK — Future Homes Standard",
          url: "https://www.gov.uk/government/consultations/the-future-homes-and-buildings-standards-2023-consultation",
          accessedDate: "May 2026",
        },
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
          name: "Energy Saving Trust — Air source heat pumps",
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
        caption="New build vs retrofit heat pump install — typical UK numbers in 2026"
        headers={["", "New build (Future Homes Standard)", "Retrofit (existing home)"]}
        rows={[
          ["Heat-pump status", "Mandatory (gas boilers banned 2025)", "Elective (homeowner choice)"],
          ["BUS grant £7,500", "No (no fossil-fuel system to replace)", "Yes (E&W)"],
          ["Typical heat-pump install cost", "£6,500–£10,000 (inclusive in build)", "£8,000–£14,000 pre-grant"],
          ["Net cost to homeowner", "Folded into build price", "£1,500–£6,500 after grant"],
          ["Fabric performance", "Part L 2021+ — high standard", "Variable — typically D/E EPC band"],
          ["Emitter design", "Low-temperature UFH (35–40°C)", "Existing rads or upgrades (45–55°C)"],
          ["Typical SCOP", "4.5–5.0", "3.2–4.5 (depends on fabric)"],
          ["Cylinder + hot water", "Designed in (200–300L typical)", "Retrofit cylinder space"],
          ["Outdoor unit siting", "Pre-planned, screening designed in", "Subject to MCS 020 + permitted development"],
          ["Brand choice", "Developer's spec", "Homeowner's installer choice"],
          ["Warranty + service", "Often via builder for first 2 years, then homeowner", "Homeowner from day one"],
          ["Typical capacity", "5–8 kW (well-insulated)", "7–14 kW (variable insulation)"],
        ]}
        footnote="New-build figures are typical for a 3-bed property under Future Homes Standard. Retrofit ranges depend heavily on the existing home's fabric, electrical supply, and emitter sizing."
      />

      <h2>The 2025 policy shift</h2>
      <p>
        Building Regulations Part L was updated in 2021 to require
        new English homes to achieve 75–80% lower CO₂ emissions
        than the 2013 baseline. The Future Homes Standard (FHS)
        timeline phased the new requirements: full implementation
        from 2025, with fossil-fuel heating systems effectively
        excluded by the emissions limits. Heat pumps + occasional
        district heating became the dominant new-build choice.
      </p>
      <p>
        Wales (Building Regulations Part L, Wales: 2022) and
        Scotland (New Build Heat Standard, 2024) have parallel
        regulations on similar timelines. Northern Ireland&rsquo;s
        equivalent is in consultation as of 2026.
      </p>

      <h2>What new-build heat pumps look like</h2>
      <p>
        A new-build heat-pump install is designed-in from
        construction, not bolted on:
      </p>
      <ul>
        <li>
          <strong>Fabric does most of the work.</strong> Part L
          2021 fabric performance means peak heat demand is
          typically 4–6 kW for a 3-bed (vs 8–12 kW for a typical
          retrofit equivalent). Smaller heat pump, lower running
          cost, lower service profile.
        </li>
        <li>
          <strong>UFH on the ground floor as standard.</strong>{" "}
          Developers spec UFH because it&rsquo;s easier to install
          before the floor is finished and pairs with the heat
          pump at 35–40°C flow temperature for SCOP 4.5–5.0.
          Radiators upstairs are common; some new builds run UFH
          throughout.
        </li>
        <li>
          <strong>Cylinder + plant room designed-in.</strong> A
          properly sized hot-water cylinder (200–300L) sits in a
          purpose-built location. The buffer vessel and controls
          are co-located.
        </li>
        <li>
          <strong>Outdoor unit pre-sited.</strong> MCS 020 noise
          compliance is designed at the planning stage — no
          retrofit siting compromise.
        </li>
      </ul>
      <p>
        Practical implication: new-build heat-pump installs tend
        to run smoothly, deliver high SCOP, and require minimal
        intervention from the homeowner. The cost is folded into
        the build price, typically £6,500–£10,000 inclusive of
        UFH and cylinder.
      </p>

      <h2>What retrofit heat pumps look like</h2>
      <p>
        Retrofit is heterogeneous — the same heat pump can fit
        very differently into a 1930s solid-wall semi vs a 2010s
        cavity-wall detached:
      </p>
      <ul>
        <li>
          <strong>Heat-loss survey drives sizing.</strong> A BS
          EN 12831 calc determines peak demand for your specific
          property. Older / leaky homes need bigger heat pumps
          (10–14 kW) and benefit hugely from fabric improvements
          before sizing.
        </li>
        <li>
          <strong>Emitter upgrades often needed.</strong> Radiators
          sized for a 70–80°C gas boiler are too small for a
          heat pump&rsquo;s 45–55°C flow. Typical retrofit: 1–4
          radiators upgraded per home.
        </li>
        <li>
          <strong>Cylinder space found.</strong> The airing
          cupboard becomes the cylinder location in most retrofit
          installs. Some homes need extension or relocation to
          fit a properly sized cylinder.
        </li>
        <li>
          <strong>Outdoor siting compromise.</strong> MCS 020
          noise compliance + permitted development siting in an
          existing garden. Sometimes constrained.
        </li>
      </ul>
      <p>
        Net upfront cost: £8,000–£14,000 pre-grant, £1,500–£6,500
        after the £7,500 BUS grant. Real-world SCOP typically
        3.2–4.5 depending on fabric, with the difference between
        the bounds dominated by insulation quality.
      </p>

      <h2>Why fabric matters more for retrofits</h2>
      <p>
        The single biggest performance lever for a retrofit heat
        pump is fabric performance. Loft insulation (typically
        £500–£1,500 to top up to 300mm) cuts peak heat demand by
        15–25%. Cavity wall insulation (typically £1,500–£3,000
        for a 3-bed semi) cuts another 15–20%. Solid wall
        insulation (£8,000–£15,000) is bigger but transformative.
      </p>
      <p>
        The order matters: fabric first, then heat pump. A
        properly insulated retrofit lets you spec a smaller
        cheaper heat pump at higher SCOP — often £1,000–£2,000
        saved on the heat-pump capital cost AND £200–£400/year
        of running-cost saving compounded over 15–20 years. The
        BUS grant explicitly requires loft + cavity recommendations
        on the EPC to be cleared before the heat-pump install can
        proceed.
      </p>

      <h2>Looking ahead — the regulatory direction</h2>
      <p>
        Three trends worth knowing if you&rsquo;re buying or
        building in 2026:
      </p>
      <ul>
        <li>
          <strong>FHS 2025 extension.</strong> The 2025
          regulations apply to new builds; transitional
          arrangements still allow some gas-boiler installs in
          builds that started before the regulation date. By 2027
          the transitional window closes — all new English homes
          will be FHS-compliant.
        </li>
        <li>
          <strong>BUS scheme continuity.</strong> Funded through
          to at least 2028; £7,500 grant set in 2023. Future
          reviews may adjust the amount but the scheme is a
          decade-long government commitment to heat-pump retrofit
          subsidy.
        </li>
        <li>
          <strong>Gas boiler installs (existing homes).</strong>{" "}
          Government consulted in 2023 on banning new gas boiler
          installs in EXISTING homes from 2035. The consultation
          outcome was deferred; current direction is to encourage
          rather than mandate switching for existing homes. Most
          UK homes will still have the choice to replace gas
          boiler with gas boiler at end of life through 2030+.
        </li>
      </ul>

      <h2>What this means for you</h2>
      <p>
        If you&rsquo;re <strong>buying a new build</strong> in
        2026: confirm with the developer which brand and model of
        heat pump is specified, what UFH layout is included, and
        what handover documentation (commissioning report, MCS
        certificate, warranty registration) you&rsquo;ll receive.
        Push for an MCS-installer service contract from day one.
      </p>
      <p>
        If you&rsquo;re <strong>retrofitting an existing home</strong>:
        run a fabric-first conversation before the heat-pump
        install. Loft + cavity insulation typically pays back
        within the heat-pump system&rsquo;s lifespan and lets
        you spec a smaller heat pump at higher efficiency. Get
        2–3 MCS-certified installer quotes including the
        heat-loss survey results.
      </p>

      <h2>Switching pathway</h2>
      <ol>
        <li>
          Run a free pre-survey at <a href="/check">propertoasty.com/check</a>{" "}
          to confirm BUS eligibility (retrofit) or generate an
          MCS-installer-ready report (new build).
        </li>
        <li>
          For retrofit: get 2–3 quotes from MCS-certified
          installers in your area. Ask about fabric-first
          improvements before sizing.
        </li>
        <li>
          For new build: get the developer&rsquo;s full
          heating-system spec sheet + commissioning documentation
          at handover. Register the manufacturer warranty in
          your name promptly.
        </li>
      </ol>

      <h2>The takeaway</h2>
      <p>
        New-build heat pumps are now standard in English new homes
        under the Future Homes Standard — designed in,
        well-matched to fabric performance, typically high SCOP.
        The cost is folded into the build price; no BUS grant
        applies. Retrofit heat pumps are a homeowner choice in
        existing homes, BUS-eligible at £7,500 net of grant,
        £1,500–£6,500 net cost. The retrofit performance lever is
        fabric — loft and cavity insulation before the heat-pump
        install typically pays back in shorter time than the
        heat-pump itself.
      </p>
    </AEOPage>
  );
}
