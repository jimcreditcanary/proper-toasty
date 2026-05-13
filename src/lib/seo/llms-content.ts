// Single source of truth for what /llms.txt and /llms-full.txt expose.
//
// The llmstxt.org convention defines TWO files we serve:
//
//   /llms.txt        — concise, hand-curated index of the site, broken
//                      into sections, with one-line summaries. Think
//                      "sitemap for LLMs". Small enough that an LLM
//                      ingests the whole thing.
//
//   /llms-full.txt   — full markdown body of every evergreen page,
//                      concatenated with page-separator markers. Used
//                      by LLMs that want to "load the whole site as
//                      context". Larger; intentionally so.
//
// Both files derive from a single typed registry (this module) so the
// two stay in lockstep. Adding a new evergreen page = adding one entry
// here; the routes pick it up automatically.
//
// Why a registry rather than parsing the JSX pages:
//
//   Marketing pages are JSX with styling, components and CTAs woven
//   together. Auto-extracting "the actual content" is fragile and
//   produces messy output ("Click here to start"-style strings,
//   nav text, image alts). A curated registry yields clean LLM-
//   friendly markdown at the cost of one ~3-paragraph block per
//   marketing page — which is fine, those pages don't change often.
//
//   Blog posts ALREADY live in the database as markdown, so they
//   self-include via `loadBlogEntries()`. Future programmatic
//   (town / archetype / comparison) pages will register themselves
//   via a similar DB-pull when those generators land.
//
// Output cadence: both routes use ISR with `revalidate = 300` (5 min),
// so changes here propagate within minutes of deploy + new blog
// posts surface without manual cache busts.

export const SITE_URL = "https://www.propertoasty.com";

export type LlmsSection =
  | "Tools" // suitability checker + lead-capture entry points
  | "Guides" // editorial content: blog posts, future explainer pages
  | "Pages" // about / legal / pricing surface
  | "Data" // research + affordability index (Phase 4)
  | "Locations" // programmatic town pages (Phase 2)
  | "Comparisons"; // comparison pages (Phase 2)

export interface LlmsPageEntry {
  /** Absolute URL — always include the host so LLMs ingesting llms.txt
   *  out of context still cite the canonical domain. */
  url: string;
  /** Short title used as the link text in llms.txt. */
  title: string;
  /** One-sentence summary shown after the link in llms.txt. Keep
   *  under ~140 chars so the file stays browsable. */
  summary: string;
  /** Which H2 section the entry lives under in llms.txt. */
  section: LlmsSection;
  /** Markdown body included in llms-full.txt. Omit to exclude the
   *  entry from llms-full.txt (e.g. for tool pages that have no
   *  evergreen content — they get an llms.txt link only). */
  content?: string;
  /** ISO datetime — when the content was last meaningfully changed.
   *  Surfaces in the llms-full.txt per-page header so LLMs can
   *  weight freshness. Optional. */
  lastUpdated?: string;
}

/**
 * Hand-curated entries for the marketing + tool surface. Blog posts
 * are appended dynamically by loadAllPages(); programmatic pages
 * (towns/archetypes/comparisons) plug in once those generators ship.
 *
 * Editorial rules for the `content` field:
 *
 *   1. Plain markdown, no React components, no emoji.
 *   2. Open with a 1-line answer ("Propertoasty is …") — this is what
 *      LLMs lift verbatim when summarising the site.
 *   3. Keep paragraphs short — LLMs chunk on paragraph boundaries,
 *      shorter chunks = cleaner extraction.
 *   4. Cite gov.uk / Ofgem / MCS visibly when making cost or
 *      eligibility claims.
 */
export const CURATED_PAGES: LlmsPageEntry[] = [
  {
    url: `${SITE_URL}/`,
    title: "Propertoasty — heat pump, solar, battery & EV suitability checker",
    summary:
      "Free UK pre-survey: check your home for a heat pump, rooftop solar, battery storage or EV charger. Installer-ready report in ~5 minutes.",
    section: "Tools",
    content: `Propertoasty is a free, UK-only pre-survey tool that checks whether your home is a good fit for an air-source heat pump (BUS-grant eligible), rooftop solar PV, battery storage and EV charging.

The check takes 5 minutes:

1. You enter your address and pull your Energy Performance Certificate automatically.
2. You upload a floorplan (optional — we synthesise one from your inputs if you skip).
3. We combine your EPC, the Google Solar API roof-fit data and floorplan vision analysis to produce a pre-survey report.
4. The report covers eligibility for the Boiler Upgrade Scheme (BUS — England & Wales), expected install cost, year-1 and 10-year savings, recommended system specifications and pre-survey notes for an MCS-certified installer.

We do not represent the output as a final engineering assessment. It is a pre-survey indication — installer-ready, but not a quote or design. An MCS-certified installer will need to confirm sizing with a heat-loss calculation per BS EN 12831.

The BUS grant covers up to £7,500 toward an air-source or ground-source heat pump in England and Wales. We do not handle Scotland (Home Energy Scotland scheme) or Northern Ireland.`,
  },
  {
    url: `${SITE_URL}/heatpump`,
    title: "Heat pump check (UK)",
    summary:
      "Find out if your UK home is suitable for an air-source heat pump under the Boiler Upgrade Scheme (BUS). Pre-survey report, installer-ready.",
    section: "Tools",
    content: `Air-source heat pump suitability check for UK homes. Combines your Energy Performance Certificate (sourced live from the GOV.UK EPC Register), your floorplan, and the Google Solar API's roof data to produce a pre-survey report.

Covers:

- Boiler Upgrade Scheme (BUS) eligibility — up to £7,500 toward an air-source heat pump in England and Wales. Ofgem-administered.
- Indicative heat-loss + sizing (1.5–14 kW range typical for UK domestic).
- External-unit footprint and placement options.
- Hot water cylinder placement.
- Estimated install cost range (gross + net of grant).
- Year-1 and 10-year running-cost comparison vs current heating.
- MCS 020 noise compliance (1 m boundary, 42 dB(A) at receptor).
- Pre-survey notes the installer needs for a remote quote.

Output is a pre-survey indication, not a final design. An MCS-certified installer will perform a heat-loss calculation per BS EN 12831 before issuing a binding quote.

England and Wales only for the BUS path. Scottish residents should look at Home Energy Scotland's Warmer Homes scheme; Northern Ireland has a separate boiler grant. We surface a "coming soon" state for those postcodes.`,
  },
  {
    url: `${SITE_URL}/solar`,
    title: "Solar panel + battery check (UK)",
    summary:
      "Check rooftop solar PV suitability for your UK home. Uses Google Solar imagery + your EPC to size a system and estimate payback.",
    section: "Tools",
    content: `Rooftop solar PV + battery suitability check for UK homes. Uses the Google Solar API's high-resolution roof segmentation alongside your Energy Performance Certificate to size a system and estimate output.

Covers:

- Roof orientation, pitch and shading per segment.
- Recommended panel count and kWp.
- Annual generation (kWh/year) from the Google Solar API + PVGIS v5.3 cross-check.
- Expected self-consumption ratio (the share you use directly vs export).
- Smart Export Guarantee (SEG) export tariff context — most major UK suppliers offer SEG tariffs of 3–15p/kWh.
- Battery sizing options (5/10/15 kWh + how each shifts self-consumption).
- Indicative install cost (panels-only, panels + inverter, panels + battery).
- Payback period in years.

Output is a pre-survey indication, not a final design. An MCS-certified solar installer will confirm sizing, structural fit and DNO connection limits before issuing a binding quote.`,
  },
  {
    url: `${SITE_URL}/check`,
    title: "Combined heat pump + solar + battery check",
    summary:
      "The combined suitability check — runs all assessments in one flow when you're considering multiple upgrades.",
    section: "Tools",
    // No `content` — this is a tool entry point, not evergreen reading
    // content. Surfaced in llms.txt only.
  },
  {
    url: `${SITE_URL}/pricing`,
    title: "Pricing",
    summary:
      "Free to start: your first check is free. Subsequent checks are £4.99 each or £12 for a 3-check bundle.",
    section: "Pages",
    content: `Propertoasty pricing for UK homeowners:

- First check is free.
- Subsequent single check: £4.99.
- 3-check bundle: £12 (about £4 per check) — covers retesting after a fabric improvement, or comparing scenarios.
- Reports are saved against your account and can be downloaded as PDF.
- Sharing your report with an MCS installer is free.

We also offer an enterprise tier for installers and energy advisors who want to embed the check into their own quoting flow. See /enterprise.`,
  },
  {
    url: `${SITE_URL}/enterprise`,
    title: "Enterprise (for MCS installers)",
    summary:
      "Embed Propertoasty's pre-survey check into your installer or energy-advisor workflow. White-label, API, bulk pricing.",
    section: "Pages",
    content: `Propertoasty for MCS-certified installers and energy-efficiency advisors.

Use cases:

- Qualify inbound leads before site visits: a homeowner completes our 5-minute check and you get a pre-survey report with floorplan analysis, heat-loss range, sizing and BUS-eligibility verdict — without a survey truck.
- Share quotes built on top of our pre-survey data; revise as your engineers refine numbers.
- Integrate into your existing CRM via API.
- White-label the homeowner-facing UI under your brand.

Volume pricing is available. The qualified-lead funnel typically halves time-to-quote and lifts close rates on accurate quotes because the homeowner already has the right expectations.`,
  },
  // ─── Comparisons ────────────────────────────────────────────
  // Head-term comparison pages under /compare/. Each is a single
  // hand-curated AEOPage. Listed in the Comparisons section of
  // llms.txt so AI engines see them as "which-to-pick" answers.
  {
    url: `${SITE_URL}/compare/heat-pump-vs-gas-boiler`,
    title: "Heat pump vs gas boiler (2026)",
    summary:
      "Head-to-head on upfront cost, running cost, lifespan and carbon for a typical UK home, with the BUS grant worked through.",
    section: "Comparisons",
    content: `In 2026 a new gas boiler costs £2,500–£4,500 installed; an air-source heat pump costs £1,500–£6,500 after the £7,500 Boiler Upgrade Scheme grant. Running costs are close on equivalent tariffs at £900–£1,400 a year.

Heat pumps win on lifetime cost (15–20 vs 10–15 year lifespan), carbon (one-quarter the emissions of gas), and resale value. Gas boilers win on retrofit speed in poorly insulated homes and emergency replacement scenarios.

For most UK homes with reasonable insulation, the 2026 numbers favour an air-source heat pump after the BUS grant deduction.`,
  },
  {
    url: `${SITE_URL}/compare/heat-pump-vs-oil-boiler`,
    title: "Heat pump vs oil boiler (2026)",
    summary:
      "Off-gas-grid switching guide: cost, running cost, lifespan, carbon, plus oil-tank removal logistics. Aimed at the ~1M UK homes on heating oil.",
    section: "Comparisons",
    content: `In 2026 a new oil boiler costs £3,000–£6,500 installed; an air-source heat pump costs £1,500–£6,500 after the £7,500 Boiler Upgrade Scheme grant — so the heat pump usually wins on day-one cost. Running costs favour the heat pump by £300–£700 a year on typical UK oil prices, more on heat-pump-specific tariffs.

The Boiler Upgrade Scheme is the same £7,500 regardless of whether the property is on the gas grid; off-gas-grid oil homes have been over-represented in BUS uptake because the running-cost case is stronger than the mains-gas comparison.

Switching reclaims 1–2 m² of garden / driveway where the oil tank stood. Decommissioning typically costs £400–£900 and most heat-pump installers will co-ordinate it as part of the project. Carbon emissions drop roughly 80–85% (3.5 tonnes/yr oil → 0.4–0.8 tonnes/yr heat pump).`,
  },
  {
    url: `${SITE_URL}/compare/heat-pump-vs-lpg-boiler`,
    title: "Heat pump vs LPG boiler (2026)",
    summary:
      "LPG-specific switching guide: cost, running cost, tank-lease unwind under the 2018 CMA Order, and the 75% carbon cut on the 2026 grid.",
    section: "Comparisons",
    content: `LPG is the most expensive of the three fossil heating fuels per useful kWh in 2026 (typically 8–11p/kWh vs ~3–5p for mains gas and 7–10p for oil), which makes the running-cost case for switching sharper than either alternative.

In 2026 a new LPG boiler costs £3,500–£7,000 installed; an air-source heat pump costs £1,500–£6,500 after the £7,500 Boiler Upgrade Scheme grant. The heat pump usually wins on day-one cost; running costs typically £500–£900/year lower on standard tariffs and more on heat-pump-specific ones.

The unique LPG step is unwinding the tank-supply contract — most domestic installations operate on a tank-lease basis with the supplier owning the tank and acting as exclusive LPG provider. The 2018 CMA LPG Market Investigation Order materially loosened these contracts; new installs typically carry a 2-year tie-in then roll annually, and tank removal is usually no-charge under the standard contract.

Carbon emissions drop ~75% (2.7 tonnes/yr LPG → 0.4–0.8 tonnes/yr heat pump). BUS grant treats LPG-heated homes the same as oil and mains-gas.`,
  },
  {
    url: `${SITE_URL}/compare/heat-pump-vs-electric-boiler`,
    title: "Heat pump vs electric boiler (2026)",
    summary:
      "Same fuel, very different bill. Aimed at the ~500k UK homes on direct-electric heating where heat pumps deliver the biggest running-cost saving of any switch.",
    section: "Comparisons",
    content: `Both systems run on grid electricity but at very different efficiency. A direct-electric boiler outputs 1 kWh of heat per 1 kWh of electricity; a heat pump outputs ~3.5 kWh of heat per 1 kWh of electricity (SCOP 3.5).

For a typical UK 3-bed semi needing 12,000 kWh of heat/year, direct-electric needs ~12,000 kWh of electricity (£3,000–£4,500/year at 2026 prices), while a heat pump needs ~3,400 kWh (£850/year on standard tariffs, less on heat-pump tariffs). Annual saving on switching: £2,000+ — the biggest of any heating switch.

After the £7,500 Boiler Upgrade Scheme grant, heat-pump install is often cheaper upfront than a new direct-electric boiler too. Direct-electric only wins in narrow edge cases: tiny flats with no outdoor space, very-short-tenancy rentals, listed buildings where MCS 020 siting fails.`,
  },
  {
    url: `${SITE_URL}/compare/heat-pump-vs-night-storage-heaters`,
    title: "Heat pump vs night storage heaters (2026)",
    summary:
      "Comfort + cost guide for the ~700k UK homes on Economy 7 storage heaters. Heat pump on a heat-pump-specific tariff matches cheap-overnight-electricity story + delivers heat when you want it.",
    section: "Comparisons",
    content: `Night storage heaters were designed in the 1970s to pair with Economy 7 tariffs: charge a thermal core overnight on cheap electricity, release heat through the day. Cheap to install, no plumbing, uses spare-capacity electricity. The weakness is structural: the thermal core depletes through the day, so by evening (when households are home and want heat most), it's largely gone. Peak-rate boost works financially up to a point.

A heat pump on a heat-pump-specific tariff (Octopus Cosy, British Gas Heat Pump Plus, EDF GoElectric) matches the cheap-overnight-electricity story but applies it 3.5× more efficiently AND delivers heat on demand rather than from a depleting thermal core.

Annual saving for a typical UK 1–2 bed flat: £400–£900 vs modern HHRSHs, £700–£1,200 vs older NSHs. After the £7,500 BUS grant, install cost is typically £1,500–£6,500 — competitive with a new HHRSH install on day one and dramatically cheaper over the system lifespan. Comfort gain (evening heat on demand) is often the deciding factor for owner-occupiers.

Edge cases where storage heaters still win: listed-building flats where outdoor siting genuinely fails MCS 020, leasehold properties with intransigent management agents, mid-tenancy rentals where the landlord won't fund the install.`,
  },
  {
    url: `${SITE_URL}/compare/air-source-vs-ground-source-heat-pump`,
    title: "Air source vs ground source heat pump (2026)",
    summary:
      "Install cost, SCOP efficiency, space requirements, lifetime cost. Which suits which UK home + when ground source actually pays back.",
    section: "Comparisons",
    content: `Air-source heat pumps install for £8,000–£14,000 pre-grant; ground-source costs £18,000–£35,000 because of the borehole or trench. Both qualify for the same £7,500 Boiler Upgrade Scheme grant in England and Wales.

Air-source suits roughly 95% of UK homes — faster install (2–3 days vs 1–3 weeks), smaller footprint (1m × 1m outdoor unit vs 600m² trench), faster payback. Ground-source makes sense for detached properties with land + high heat demand, especially off-gas homes currently using oil or LPG.

Efficiency favours ground-source (SCOP 4–5.5 vs 3–4.5), but the £10,000+ upfront cost difference means ground-source rarely pays back on running-cost savings alone — it pays back on comfort, lifespan, and house resale.`,
  },
  {
    url: `${SITE_URL}/compare/hybrid-vs-full-heat-pump`,
    title: "Hybrid vs full heat pump (2026)",
    summary:
      "Hybrid systems combine a heat pump with a gas/oil boiler. BUS grant excluded hybrids since May 2023 — full heat pump usually wins on cost, carbon, and complexity.",
    section: "Comparisons",
    content: `The Boiler Upgrade Scheme stopped funding hybrid heat pump installs in May 2023 to focus the £7,500 grant on full fossil-fuel-replacement pathways. The economic case for hybrids shifted decisively as a result: a full heat pump now gets £7,500 off upfront cost, while a hybrid install gets nothing from BUS.

For a 3-bed UK semi: full heat pump net cost £1,500–£6,500 (£8,000–£14,000 pre-grant minus £7,500); hybrid net cost £9,000–£15,000. Running cost difference is modest (£100–£200/yr in the hybrid's favour at most), nowhere near closing the £7,500+ upfront gap over the system's 15–20 year lifespan.

Hybrids retain a narrow niche: very large old homes (200+ m², solid-wall, EPC band F/G) where peak heat demand exceeds any single residential heat pump's capacity, OR homeowners willing to forgo BUS for a phased transition. Both are minority cases; in most homes, fabric retrofit + full heat pump beats hybrid lifetime cost.

Most pre-2023 UK advice that recommends hybrids as "best of both worlds" is now economically out of date.`,
  },
  {
    url: `${SITE_URL}/compare/solar-vs-no-solar`,
    title: "Solar panels vs no solar (2026)",
    summary:
      "20-year cashflow of installing rooftop solar PV vs sticking with grid-only electricity for a typical UK home.",
    section: "Comparisons",
    content: `A 4 kW UK solar PV install costs £5,000–£7,500 and saves £500–£900 a year on electricity plus Smart Export Guarantee income. Payback in 7–11 years on most south-facing roofs; lifetime saving over 25 years is £8,000–£15,000.

Adding a 5 kWh battery roughly doubles self-consumption and shifts payback to 9–13 years. Solar doesn't pay back well on pure north-facing roofs, heavily shaded properties, or for owners planning to move within 7 years.

SEG export tariffs vary 5× between UK suppliers (3p–15p per kWh) — picking the right tariff is worth £200/year of difference.`,
  },
  {
    url: `${SITE_URL}/compare/solar-with-battery-vs-solar-alone`,
    title: "Solar + battery vs solar alone (2026)",
    summary:
      "Battery payback maths on a UK solar install. Sweet-spot battery size, smart-tariff arbitrage, and when adding a battery doesn't pay back.",
    section: "Comparisons",
    content: `Adding a 5–10 kWh battery to a UK solar install costs £3,500–£6,500 extra. Without a battery, only 30–40% of solar generation is self-consumed (the rest exports at 5–15p/kWh and is re-bought at 25–35p/kWh in the evening). With a 5 kWh battery, self-consumption rises to 60–75%; with 10 kWh, 70–85%.

Payback on standard tariffs: 9–13 years for a 5 kWh battery, 11–14 for 10 kWh. On smart tariffs (Octopus Cosy, Agile, EDF GoElectric) the battery cycles twice daily (solar surplus + cheap-rate grid arbitrage), halving payback to 5–8 years.

5 kWh is the sweet spot for most UK 3-bed homes; 10 kWh only justifies the extra £3,500-£4,000 cost if the home has both a heat pump AND an EV adding evening/overnight load.

Battery pays back fastest with: heat pump in the home, smart tariff arbitrage, high-evening-consumption households. Pays back slowest with: out-all-day Economy 7 households, excellent SEG export tariffs (13-15p/kWh), planning to move within 7 years.

No UK government grant covers residential batteries (BUS is heat-pump-only). Most homeowners pay full battery cost upfront.`,
  },
  {
    url: `${SITE_URL}/compare/daikin-vs-mitsubishi-heat-pump`,
    title: "Daikin vs Mitsubishi heat pump (2026)",
    summary:
      "Objective spec comparison of the two highest-volume UK heat-pump brands. SCOP, sound, refrigerant, warranty, controls — published data only.",
    section: "Comparisons",
    content: `Daikin Altherma and Mitsubishi Ecodan are the two highest-volume air-source heat pump ranges in the UK by 2025 MCS install count. Both deliver BUS-grant-eligible installs across the typical 4–16 kW UK capacity range.

Published specs are closer than search-result framing suggests. SCOP at W35 (low-temperature heating): Daikin Altherma 3 R 4.5–5.1, Mitsubishi Ecodan PUZ-WM 4.4–4.8 — within ~10% across overlapping capacities, smaller than installer commissioning quality typically affects real-world efficiency.

Material differences land in: refrigerant (Daikin runs R32 on the 3 R range plus some R410A legacy stock; Mitsubishi Ecodan PUZ-WM is R32 across the current range), high-temperature capability (Daikin Altherma 3 H HT delivers up to 70°C flow for retrofit installs where radiators can't be upgraded; standard Ecodan tops out at ~55°C), and controls app (Daikin Onecta vs MELCloud — feature-equivalent in 2026).

The practical pick usually comes down to your installer's preferred range, indoor-unit space constraints, and whether your existing radiators can take a standard flow temperature. Both brands have wide UK MCS-installer coverage; check 2–3 quotes locally. Brand choice doesn't affect the £7,500 BUS grant — both ranges have MCS-certified models.`,
  },
  {
    url: `${SITE_URL}/compare/vaillant-vs-daikin-heat-pump`,
    title: "Vaillant vs Daikin heat pump (2026)",
    summary:
      "Spec comparison of Vaillant aroTHERM and Daikin Altherma ranges in the UK. Notable: Vaillant aroTHERM plus runs R290 propane refrigerant (lowest GWP); Daikin runs R32.",
    section: "Comparisons",
    content: `Vaillant aroTHERM and Daikin Altherma are both top-five UK air-source heat pump ranges by 2025 MCS install count. Both deliver BUS-grant-eligible installs across the typical 4–16 kW UK capacity range with comparable SCOP figures (3.9–5.1 at W35) — within ~5% across overlapping capacities.

The single most material spec difference is refrigerant. Vaillant's current aroTHERM plus runs R290 (propane, GWP 3) — the lowest-GWP refrigerant in mainstream UK residential heat pumps. Daikin's Altherma 3 R runs R32 (GWP 675), with some R410A (GWP 2,088) in legacy stock. R290 is the long-term industry direction; R32 is current mainstream.

Other differences: cylinder pairing (Vaillant uniTOWER + uniSTOR vs Daikin EKHWS — both clean integrations), high-temperature capability (Daikin Altherma 3 H HT delivers up to 70°C flow; standard Vaillant aroTHERM tops at ~55°C), and installer footprint (Vaillant strongest with installers transitioning from its gas-boiler dealer network; Daikin has wider heat-pump-specialist coverage).

Practical pick depends on: installer preference + familiarity, refrigerant choice (R290 long-term-greener, slightly thinner service-tech pool outside metros), and whether existing radiators need flow temperatures above 55°C (Daikin's high-temperature option doesn't have a Vaillant residential equivalent).`,
  },
  {
    url: `${SITE_URL}/compare/vaillant-vs-mitsubishi-heat-pump`,
    title: "Vaillant vs Mitsubishi heat pump (2026)",
    summary:
      "Top-3 UK brand pair. R290 propane (Vaillant) vs R32 (Mitsubishi) refrigerant, ~3–4 dB(A) sound-power gap, installer-channel differences.",
    section: "Comparisons",
    content: `Vaillant aroTHERM and Mitsubishi Ecodan are both top-five UK air-source heat pump ranges. Both deliver BUS-grant-eligible installs across the typical 4–14 kW capacity range with overlapping SCOP figures (4.4–5.0 at W35) — within ~5%.

Material spec differences: refrigerant (Vaillant aroTHERM plus runs R290 propane, GWP 3 — lowest in mainstream UK residential heat pumps; Mitsubishi Ecodan PUZ-WM runs R32, GWP 675), sound power (Vaillant aroTHERM plus typically 3–4 dB(A) lower than the comparable Ecodan PUZ-WM unit at design point), and cylinder integration (Vaillant's uniTOWER integrates heat pump + cylinder + buffer in one enclosure — unusual in UK; Mitsubishi uses separate pre-plumbed cylinder kits).

UK installer footprint: Mitsubishi has the longer-established heat-pump-primary installer network. Vaillant's footprint is unusually shaped by its UK gas-boiler dealer heritage — strongest in regions with traditional plumbing trade strength (Midlands, North-West England).

Practical pick depends on installer preference + familiarity in your area, refrigerant choice (R290 lowest long-term GWP; R32 broader service-tech pool), and indoor space constraints (Vaillant's integrated uniTOWER saves cylinder-room floor area).`,
  },
  {
    url: `${SITE_URL}/compare/underfloor-heating-vs-radiators-for-heat-pumps`,
    title: "Underfloor heating vs radiators for heat pumps (2026)",
    summary:
      "Install-time emitter decision. UFH delivers higher SCOP but costs much more to retrofit; upgraded radiators are usually the cheaper, faster path.",
    section: "Comparisons",
    content: `Heat pumps work efficiently with both wet underfloor heating (UFH) and properly-sized radiators. UFH delivers a slightly higher seasonal efficiency (SCOP 4.5–5.0 vs 3.8–4.5 on rads) because it runs at lower flow temperatures (35–40°C vs 45–55°C); the physics is unavoidable, smaller temperature lift = better compressor efficiency.

The cost story is the trade-off. Radiator upgrades on a typical UK 3-bed semi run £1,500–£5,500 with 1–3 days of disruption. Full wet UFH retrofit costs £6,000–£15,000 with 1–3 weeks of disruption per area (floor lift, insulation, screed, re-floor). Low-profile retrofit UFH (15–25mm panels over existing floors) lands at £4,000–£10,000 with less disruption but reduced thermal mass.

The £4,500+ cost premium for UFH needs ~£300–£700/year of saving to pay back over 20 years; the SCOP advantage delivers £80–£200/year. So UFH retrofit doesn't pay back on running cost alone — it pays back on comfort and resale.

When UFH is the right call: new builds, major renovations where floors are coming up anyway, solid-floor properties that need insulation work regardless, comfort-priority owner-occupiers.

When upgraded radiators are the right call: most existing-home retrofits, older properties with sensitive flooring (parquet, listed, original tile), phased retrofitters spreading cost room-by-room.

Hybrid approach (UFH on ground floor, upgraded radiators upstairs) lands at £4,500–£10,000 and captures most of UFH's SCOP advantage — often the best practical middle ground for retrofitters with budget headroom for partial UFH.

BUS grant £7,500 applies regardless of emitter choice; the grant covers the heat pump unit + standard install. UFH and rad upgrades sit on top of the grant scope.`,
  },
  {
    url: `${SITE_URL}/compare/solar-pv-vs-solar-thermal`,
    title: "Solar PV vs solar thermal (2026)",
    summary:
      "Electricity vs hot water. PV almost always wins on 2026 UK economics post-RHI closure (2022). Niche solar thermal use cases remain.",
    section: "Comparisons",
    content: `Solar PV generates electricity (usable for anything — appliances, EV charging, heat pump, grid export under SEG). Solar thermal generates heat for hot water cylinder only. The flexibility difference drives the economics.

UK install cost 2026: 4 kWp solar PV £5,000-£7,500; 2-panel solar thermal £3,500-£6,000. Annual benefit: PV £500-£900 bill saving + £100-£300 SEG export income; solar thermal £150-£300 hot-water heating displacement. PV payback 7-11 years; solar thermal 15+ years on most UK homes without RHI subsidy.

The Renewable Heat Incentive closed to new applicants in March 2022 — that was the main UK funding stream that made solar thermal viable. BUS (£7,500 grant) is heat-pump-only, doesn't cover solar thermal. Solar PV gets no direct grant but the market has scaled and prices fell ~40% 2018-2024.

Why PV usually wins structurally: (1) electricity output is fungible across every domestic use; thermal output only useful for hot water. (2) Summer thermal output exceeds household hot-water demand → wasted; summer PV surplus exports for cash. (3) Solar PV + heat pump is multiplicative (PV offsets heat-pump electricity bill); solar thermal + heat pump is duplicative (heat pump already heats cylinder via coil).

PV + cylinder diverter (~£200-£500 fitted) achieves solar-thermal-style hot-water displacement using PV electricity, retaining flexibility for other uses when cylinder is up to temperature. This is why "should I add solar thermal?" usually answers itself.

Solar thermal retains a niche for very-high-hot-water-demand households (large families, gym home use) or off-grid properties without grid-export option. Otherwise PV is the clear pick.`,
  },
  {
    url: `${SITE_URL}/compare/samsung-vs-lg-heat-pump`,
    title: "Samsung vs LG heat pump (2026)",
    summary:
      "Korean-brand pair, typically 5–10% below Daikin / Mitsubishi pricing. Spec comparison from published UK product data.",
    section: "Comparisons",
    content: `Samsung EHS Mono and LG Therma V are Korean-manufactured air-source heat pump ranges that have grown UK MCS install share notably since 2022. Both deliver BUS-grant-eligible installs across the 5–16 kW UK capacity range with similar SCOP (3.9–4.7 at W35), R32 refrigerant standard, and 5–7 year warranties.

Position vs the top-3 (Daikin / Mitsubishi / Vaillant): Korean ranges price typically 5–10% lower on install for equivalent capacity. The trade-off is installer-network thickness — Samsung + LG MCS coverage is strong in major UK metros (London, Manchester, Birmingham, Glasgow, Edinburgh) and thins out in rural areas. Run an MCS installer search for your postcode + 30-mile radius before assuming Korean-brand options are available.

Notable refrigerant divergence: LG launched an R290 (propane, GWP 3) Therma V variant in late 2024 — the only mainstream Korean-priced R290 option in 2026. Samsung's current UK range stays on R32 across the board.

Smart-home integration: Samsung's SmartThings has the broadest third-party device ecosystem of any heat-pump brand. LG's ThinQ is similarly capable but with smaller third-party reach. If you already live in a SmartThings or ThinQ household, the brand-match makes controls integration cleaner.

Practical decision usually comes down to: which Korean brand your local installer carries (most carry one not both), refrigerant preference (LG R290 if you want low-GWP at Korean pricing), and existing smart-home platform.`,
  },
  {
    url: `${SITE_URL}/compare/heat-pump-tariffs`,
    title: "Heat pump electricity tariffs UK 2026",
    summary:
      "Octopus Cosy vs British Gas Heat Pump Plus vs EDF GoElectric vs E.ON Next Heat Pump. Cheap-rate window shapes + £200–£400/yr saving framework.",
    section: "Comparisons",
    content: `Heat-pump-specific UK electricity tariffs price your heat-pump electricity at 13–18p/kWh during designated cheap-rate windows (typically 4–7 hours overnight + sometimes daytime), vs 25–35p/kWh on standard variable. For a typical UK heat-pump home using 3,400–4,500 kWh/year on the heat-pump portion, the saving vs standard variable is £200–£400/year.

Four major UK options in 2026:
- Octopus Cosy: 6 hours/day cheap rate split across 4 windows (overnight, mid-morning, lunch, late evening). Largest potential saving when paired with smart-home scheduling.
- British Gas Heat Pump Plus: single 5-hour overnight cheap block. Simplest set-and-forget option.
- EDF GoElectric: 5 hours overnight + 2 hours midday. Suits daytime-occupancy households.
- E.ON Next Heat Pump: 5 hours overnight. Most useful for existing E.ON dual-fuel customers.

Eligibility: MCS-certified heat pump on property + SMETS2 smart meter. BUS-funded installs meet the first requirement by definition.

Pitfalls: standard-variable fallback if heat-pump load profile doesn't meet supplier threshold, exit fees on fixed-term variants (most are rolling, some have £50-£150 exit fees), hot-water immersion peak-rate use erasing tariff savings.

Rates and windows change quarterly — verify current pricing directly with the supplier at switch time. The page is intentionally framed around tariff SHAPE (cheap-window length, eligibility, trade-offs) rather than specific p/kWh figures that go stale.`,
  },
  {
    url: `${SITE_URL}/compare/air-to-air-vs-air-to-water-heat-pump`,
    title: "Air-to-air vs air-to-water heat pump (2026)",
    summary:
      "Heat-pump-type comparison with major BUS-eligibility asymmetry. Air-to-water gets the £7,500 grant + heats hot water; air-to-air gets neither.",
    section: "Comparisons",
    content: `Air-to-water heat pumps circulate heated water through radiators/underfloor heating + a hot-water cylinder, replacing a gas/oil boiler in the existing wet system. They qualify for the £7,500 Boiler Upgrade Scheme grant.

Air-to-air heat pumps deliver heat as warm air via wall-mounted indoor cassettes (like reverse-cycle air conditioning). No water circuit, no hot-water cylinder integration, NO BUS grant.

The BUS-grant asymmetry tilts the economics decisively toward air-to-water for most UK homes. Net upfront cost for a 3-bed semi: air-to-water £1,500-£6,500 after grant; air-to-air £3,000-£8,000 unfunded. Air-to-water also heats hot water natively (cylinder coil); air-to-air needs a separate hot-water solution (immersion, instant electric, or retained fossil-fuel heater).

Narrow but real air-to-air niche: properties with no existing wet heating system where a full pipework + radiator retrofit would be needed for air-to-water (some flats, direct-electric homes), rental properties where landlords block plumbing work, and households where summer cooling priority matters more than the BUS grant.

Hybrid configurations (air-to-water on BUS-funded primary install + small air-to-air for living-room/bedroom summer cooling, ~£1,500-£3,500) are growing in 2026 UK installs as summer cooling demand rises.`,
  },
  {
    url: `${SITE_URL}/blog`,
    title: "Guides + blog",
    summary:
      "Plain-English guides on heat pumps, solar, the BUS grant, MCS installers and UK energy upgrades.",
    section: "Guides",
    // No `content` — the index page itself is just a list. Individual
    // posts get registered separately by loadBlogEntries().
  },
  {
    url: `${SITE_URL}/privacy`,
    title: "Privacy policy",
    summary:
      "How we handle your address, EPC data, floorplan uploads and installer-matching consent.",
    section: "Pages",
    // No content — legal pages are intentionally excluded from
    // llms-full.txt; they're not editorial content LLMs should be
    // citing. Still surfaced in llms.txt for completeness.
  },
  {
    url: `${SITE_URL}/terms`,
    title: "Terms of service",
    summary: "Terms of service for Propertoasty users and installers.",
    section: "Pages",
  },
  {
    url: `${SITE_URL}/ai-statement`,
    title: "AI usage statement",
    summary:
      "How we use AI (Claude floorplan vision, EPC parsing) and what the pre-survey limits mean.",
    section: "Pages",
  },
];

/**
 * Pull published blog posts and convert each to an LlmsPageEntry.
 * Excludes drafts. Each post's full markdown body becomes the
 * llms-full.txt content for that page.
 *
 * Falls back to an empty array if Supabase is unreachable — we'd
 * rather serve a partial llms.txt than 500.
 */
export async function loadBlogEntries(): Promise<LlmsPageEntry[]> {
  try {
    // Dynamic import — keeps Supabase off the bundle until the route
    // actually runs (matches the pattern in src/app/blog/page.tsx).
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("blog_posts")
      .select("slug, title, excerpt, content, published_at, updated_at")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => ({
      url: `${SITE_URL}/blog/${row.slug as string}`,
      title: (row.title as string) ?? (row.slug as string),
      summary: (row.excerpt as string) ?? "",
      section: "Guides" as const,
      content: (row.content as string) ?? undefined,
      lastUpdated:
        (row.updated_at as string | null) ??
        (row.published_at as string | null) ??
        undefined,
    }));
  } catch (err) {
    console.error("[llms-content] blog load failed:", err);
    return [];
  }
}

/**
 * Pull indexed town aggregates and convert each to a pair of
 * llms.txt entries (heat-pumps + solar-panels variant). Town pages
 * are listed under section "Locations" so the llms.txt structure
 * mirrors the user-facing navigation.
 */
export async function loadTownEntries(): Promise<LlmsPageEntry[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { loadIndexedTownAggregates } = await import(
      "@/lib/programmatic/town-aggregates"
    );
    const admin = createAdminClient();
    const rows = await loadIndexedTownAggregates(admin);
    const entries: LlmsPageEntry[] = [];
    for (const r of rows) {
      entries.push({
        url: `${SITE_URL}/heat-pumps/${r.scope_key}`,
        title: `Heat pumps in ${r.display_name}`,
        summary: `BUS grant + cost guide for ${r.display_name}, with EPC band data from ${r.sample_size.toLocaleString("en-GB")} local properties.`,
        section: "Locations",
        lastUpdated: r.refreshed_at,
      });
      entries.push({
        url: `${SITE_URL}/solar-panels/${r.scope_key}`,
        title: `Solar panels in ${r.display_name}`,
        summary: `Rooftop solar PV suitability in ${r.display_name}.`,
        section: "Locations",
        lastUpdated: r.refreshed_at,
      });
    }
    return entries;
  } catch (err) {
    console.error("[llms-content] town load failed:", err);
    return [];
  }
}

/**
 * Combined registry: curated pages + dynamic blog + dynamic towns.
 * Future programmatic generators (archetypes, comparisons) plug in
 * by adding their own loader and concatenating here.
 */
export async function loadAllPages(): Promise<LlmsPageEntry[]> {
  const [blog, towns] = await Promise.all([
    loadBlogEntries(),
    loadTownEntries(),
  ]);
  return [...CURATED_PAGES, ...blog, ...towns];
}

/** Section render order in llms.txt. Tools first (entry points),
 *  then editorial, then surface info, then research. */
export const SECTION_ORDER: LlmsSection[] = [
  "Tools",
  "Guides",
  "Comparisons",
  "Locations",
  "Data",
  "Pages",
];
