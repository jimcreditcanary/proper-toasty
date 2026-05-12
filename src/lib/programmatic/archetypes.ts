// Property archetype seed — pilot batch of 3 UK property types.
//
// Each archetype is a property × era combination ("Victorian
// terrace", "1930s semi", "new build"). The page lives at
// /heat-pumps/<slug> and is served by the same dynamic route that
// handles town pages — the route dispatches based on which seed the
// slug matches.
//
// Why static data rather than EPC-aggregated:
//
//   The current epc_area_aggregates rollups only carry the current
//   energy band per town. Property-type + construction-age fields
//   need the bulk EPC dump (future deliverable). Until then, each
//   archetype carries CURATED data sourced from:
//
//     - PAS 2035 retrofit standard (heat-loss assumptions)
//     - MCS heat pump installer guidance (sizing rules)
//     - BEIS English Housing Survey (floor area + heating system mix)
//     - gov.uk Boiler Upgrade Scheme rules (BUS quirks per property)
//
//   Each number is citable and traceable.
//
// Slug collision check: when adding new archetypes, ensure the slug
// doesn't clash with an existing PILOT_TOWNS slug — they share the
// /heat-pumps/<slug> namespace.

export interface PropertyArchetype {
  /** URL slug. Must NOT collide with any PILOT_TOWNS slug. */
  slug: string;
  /** Display name shown on the page + indexes. */
  name: string;
  /** Free-form short description for index cards. */
  shortDescription: string;
  /** Era label (e.g. "1837-1901", "1930s", "Post-2010"). */
  era: string;
  /** Built-form label ("Mid-terrace", "Semi-detached", etc.). */
  builtForm: string;
  /** Typical floor area in square metres, range. */
  floorAreaM2: { min: number; max: number };
  /** Typical heat loss in watts per square metre at design temp
   *  (−2°C external). Lower = better insulated. Source: PAS 2035. */
  heatLossWPerM2: { min: number; max: number };
  /** Typical annual space-heat demand (kWh/yr). */
  annualHeatDemandKWh: { min: number; max: number };
  /** Recommended ASHP capacity range (kW thermal). */
  heatPumpKW: { min: number; max: number };
  /** Most common existing heating fuel for this archetype. */
  commonHeatingFuel: string;
  /** What the most common EPC band is for this archetype today. */
  typicalEpcBand: "C" | "D" | "E" | "F";
  /** Specific BUS-eligibility considerations. */
  busQuirks: string[];
  /** Pre-install upgrades commonly needed before BUS sign-off. */
  preInstallUpgrades: string[];
  /** Free-text "ideal for" hook. */
  idealFor: string;
}

export const PILOT_ARCHETYPES: PropertyArchetype[] = [
  {
    slug: "victorian-terrace",
    name: "Victorian terrace",
    shortDescription:
      "Pre-1900 mid- or end-terrace house with solid walls, sash windows and a typical 80–110 m² floorplate.",
    era: "1837-1901",
    builtForm: "Mid-terrace house",
    floorAreaM2: { min: 80, max: 110 },
    heatLossWPerM2: { min: 75, max: 110 },
    annualHeatDemandKWh: { min: 14000, max: 22000 },
    heatPumpKW: { min: 8, max: 14 },
    commonHeatingFuel: "Mains gas (combi or system boiler)",
    typicalEpcBand: "E",
    busQuirks: [
      "Solid-wall recommendation often present on EPC — needs a documented exemption OR completion before BUS sign-off.",
      "Many Victorian terraces in conservation areas — heat pump external unit placement requires planning consent in some boroughs.",
      "Original sash windows trigger draughtproofing recommendation; cheap to clear but must be addressed.",
    ],
    preInstallUpgrades: [
      "Loft insulation to 270 mm (gov.uk-compliant) — cheap fix, often present already.",
      "Draughtproofing around sash windows + suspended floor — £200–£500 of work, reduces heat-loss by 10–15%.",
      "Radiator upgrade in 1–3 rooms (typically large reception, kitchen, main bedroom).",
      "Hot water cylinder install if currently on a combi boiler (~£1,500–£2,500).",
    ],
    idealFor:
      "Owner-occupiers who want a permanent heating upgrade, can absorb the modest pre-install fabric work, and have a single suitable outdoor wall for the ASHP unit.",
  },
  {
    slug: "1930s-semi",
    name: "1930s semi-detached",
    shortDescription:
      "Inter-war semi-detached house with cavity walls, bay windows and typical 85–115 m² floorplate.",
    era: "1930-1939",
    builtForm: "Semi-detached house",
    floorAreaM2: { min: 85, max: 115 },
    heatLossWPerM2: { min: 55, max: 80 },
    annualHeatDemandKWh: { min: 11000, max: 17000 },
    heatPumpKW: { min: 6, max: 10 },
    commonHeatingFuel: "Mains gas (combi or system boiler)",
    typicalEpcBand: "D",
    busQuirks: [
      "Cavity walls almost universal — cavity wall insulation recommendation easy to clear if not already done.",
      "Side-passage often gives an ideal ASHP location with minimal sightlines from front of property.",
      "Most 1930s semis qualify for BUS with no significant pre-install fabric work required.",
    ],
    preInstallUpgrades: [
      "Cavity wall insulation if not already present (~£500–£1,500, often free via ECO4).",
      "Loft insulation to 270 mm.",
      "Radiator upgrade in 1–2 rooms (typically lounge + main bedroom).",
      "Hot water cylinder install if currently on combi.",
    ],
    idealFor:
      "The single most common UK retrofit profile in 2026. Standard install, predictable cost, minimal fabric work, BUS-grant eligible without exemption paperwork.",
  },
  {
    slug: "new-build",
    name: "New-build (post-2010)",
    shortDescription:
      "Newly-built UK home with modern insulation, double or triple glazing and typical 70–130 m² floorplate.",
    era: "Post-2010",
    builtForm: "Mixed (detached, semi, terrace, flat)",
    floorAreaM2: { min: 70, max: 130 },
    heatLossWPerM2: { min: 25, max: 45 },
    annualHeatDemandKWh: { min: 4500, max: 8500 },
    heatPumpKW: { min: 3, max: 6 },
    commonHeatingFuel:
      "Mains gas (pre-2025 builds) OR heat pump (Future Homes Standard, 2025+)",
    typicalEpcBand: "C",
    busQuirks: [
      "Properties built since 2025 under the Future Homes Standard ship with heat pumps as default — BUS does NOT apply to replacement of an existing low-carbon heating system.",
      "Pre-2025 new-builds on gas DO qualify for BUS to switch — no fabric work typically required.",
      "Some new-builds have wet underfloor heating, which is ideal for heat-pump flow temperatures — confirm with installer.",
    ],
    preInstallUpgrades: [
      "Usually none. New-build fabric performance is already heat-pump-compatible.",
      "Radiator upgrade rarely needed — modern radiator sizing handles 50°C flow.",
      "Hot water cylinder install if currently on combi (varies — many new-builds already have an unvented cylinder).",
    ],
    idealFor:
      "Owners of post-2010 new-builds on gas. Cleanest possible install — usually 1 day work, smallest pump size, lowest install cost, fastest payback.",
  },
  {
    slug: "edwardian-semi",
    name: "Edwardian semi-detached",
    shortDescription:
      "Early-20th-century semi-detached house with solid walls, large bay windows and typical 95–140 m² floorplate.",
    era: "1901-1914",
    builtForm: "Semi-detached house",
    floorAreaM2: { min: 95, max: 140 },
    heatLossWPerM2: { min: 70, max: 100 },
    annualHeatDemandKWh: { min: 14000, max: 23000 },
    heatPumpKW: { min: 9, max: 14 },
    commonHeatingFuel: "Mains gas (combi or system boiler)",
    typicalEpcBand: "E",
    busQuirks: [
      "Solid-wall recommendation almost universally present on EPC — internal or external wall insulation needed before BUS sign-off, OR a documented exemption.",
      "Most Edwardian semis sit in mature streets where ASHP outdoor-unit placement is straightforward (side return, often hidden from highway).",
      "Floor area at the upper end of the range pushes the unit size near the 14 kW MCS-installer ceiling — confirm headroom in your heat-loss calc.",
    ],
    preInstallUpgrades: [
      "Solid-wall insulation OR formal exemption paperwork to clear the EPC recommendation.",
      "Loft insulation to 270 mm.",
      "Radiator upgrade in 2–4 rooms — Edwardian rooms have high ceilings + bay windows so per-room heat demand is significant.",
      "Hot water cylinder install (~£1,500–£2,500) if currently combi-only.",
    ],
    idealFor:
      "Owner-occupiers in solid-wall heritage stock willing to fund the fabric retrofit. Once done, the home performs at band C levels — strong resale uplift.",
  },
  {
    slug: "1960s-flat",
    name: "1960s flat",
    shortDescription:
      "Post-war system-built flat (council or private), single-aspect, typical 45–75 m² floorplate.",
    era: "1960-1979",
    builtForm: "Flat / maisonette",
    floorAreaM2: { min: 45, max: 75 },
    heatLossWPerM2: { min: 50, max: 85 },
    annualHeatDemandKWh: { min: 5000, max: 10000 },
    heatPumpKW: { min: 3, max: 6 },
    commonHeatingFuel:
      "Electric storage heaters OR communal gas boiler OR direct-electric",
    typicalEpcBand: "D",
    busQuirks: [
      "Leasehold + freeholder consent required — typically the BIGGEST blocker for flat heat pump installs.",
      "Communal heating systems are NOT BUS-grant eligible at the individual-flat level; whole-building scheme needed via the freeholder/landlord.",
      "Outdoor unit placement on balcony / external wall must clear MCS 020 noise rules + leasehold restrictions on external alterations.",
    ],
    preInstallUpgrades: [
      "Freeholder permission in writing (can take 4–12 weeks).",
      "Loft insulation to 270 mm (for top-floor flats only).",
      "Air-to-air monobloc heat pump may suit better than wet system in some flat layouts (no cylinder needed).",
      "If currently storage heaters: replumb to wet system is a major project — air-to-air units often more practical.",
    ],
    idealFor:
      "Top-floor flat owners with freeholder consent + south or east-facing balcony for outdoor unit. Hardest archetype to get to BUS-grant install but the install scope itself is small.",
  },
  {
    slug: "1970s-detached",
    name: "1970s detached",
    shortDescription:
      "Open-plan-era detached house with cavity walls, decent garden, typical 120–180 m² floorplate.",
    era: "1970-1979",
    builtForm: "Detached house",
    floorAreaM2: { min: 120, max: 180 },
    heatLossWPerM2: { min: 50, max: 75 },
    annualHeatDemandKWh: { min: 14000, max: 22000 },
    heatPumpKW: { min: 9, max: 14 },
    commonHeatingFuel: "Mains gas, OR oil/LPG if rural off-grid",
    typicalEpcBand: "D",
    busQuirks: [
      "Detached + larger garden often allows ASHP placement at the rear, well clear of neighbour boundaries — MCS 020 noise compliance is rarely a blocker.",
      "If currently on oil or LPG (~12% of 1970s detached homes), heat-pump running costs cut a homeowner's bill by ~£500–£900/year — much bigger gap than from gas.",
      "Cavity walls almost universal; cavity-fill insulation is easy + cheap to clear if not done.",
    ],
    preInstallUpgrades: [
      "Cavity wall insulation if not already done (often free via ECO4).",
      "Loft insulation top-up to 270 mm.",
      "Radiator upgrade in 2–3 rooms — open-plan ground floors have one large load that benefits most from a fan-assisted convector.",
      "Hot water cylinder install if currently on combi (rare for this archetype; system boilers more common).",
    ],
    idealFor:
      "Off-gas detached owners (oil/LPG). The single best-payback archetype in the UK in 2026: large heat demand + currently expensive fuel + easy outdoor placement.",
  },
  {
    slug: "ex-council-house",
    name: "Ex-council house (1950s–1970s)",
    shortDescription:
      "Right-to-Buy or now-owner-occupied council-built terrace or semi, traditional or system-built construction.",
    era: "1950-1979",
    builtForm: "Semi-detached or terrace",
    floorAreaM2: { min: 70, max: 100 },
    heatLossWPerM2: { min: 60, max: 95 },
    annualHeatDemandKWh: { min: 9000, max: 16000 },
    heatPumpKW: { min: 6, max: 10 },
    commonHeatingFuel: "Mains gas (combi or system boiler)",
    typicalEpcBand: "D",
    busQuirks: [
      "Some 1960s council houses were system-built (Bison wall frame, BRE-type Wimpey no-fines concrete) — confirm construction type with your installer; non-standard construction sometimes affects mortgage but rarely heat-pump install.",
      "Many ex-council properties are end-terraces with side passage access — perfect ASHP placement.",
      "Some streets retain shared garden boundaries; check covenant on external installations before scheduling work.",
    ],
    preInstallUpgrades: [
      "Cavity wall insulation if traditional cavity construction (most are).",
      "Loft insulation to 270 mm.",
      "Radiator upgrade in 1–2 rooms.",
      "Hot water cylinder install if combi-only.",
    ],
    idealFor:
      "Owner-occupied right-to-buy properties. Strong BUS pathway — fabric is reasonable, install is straightforward, and the post-install resale uplift is meaningful in this segment.",
  },
  {
    slug: "mid-terrace-modern",
    name: "Modern mid-terrace (1980–2010)",
    shortDescription:
      "Late-20th-century purpose-built terrace with cavity walls and double-glazing, typical 70–95 m² floorplate.",
    era: "1980-2010",
    builtForm: "Mid-terrace house",
    floorAreaM2: { min: 70, max: 95 },
    heatLossWPerM2: { min: 40, max: 65 },
    annualHeatDemandKWh: { min: 6500, max: 11000 },
    heatPumpKW: { min: 4, max: 7 },
    commonHeatingFuel: "Mains gas (combi)",
    typicalEpcBand: "C",
    busQuirks: [
      "Smallest pre-install scope of any pre-2010 archetype — fabric is usually already band C or close to it.",
      "Mid-terrace = no side-passage access; outdoor unit MUST go in the rear garden or on the rear wall, which restricts placement options.",
      "Typically gas-combi heated; the cylinder install is the biggest single line item in the BUS-grant scope.",
    ],
    preInstallUpgrades: [
      "Usually nothing on fabric — EPC band C is already common.",
      "Hot water cylinder install (~£1,500–£2,500) is the main scope item.",
      "Radiator upgrade in 1–2 rooms — modern terrace radiators are often already adequate for 50°C flow.",
      "Outdoor unit access through the house to rear garden — most installers handle this but adds half a day.",
    ],
    idealFor:
      "Owner-occupiers of post-1980 mid-terraces who want a clean, cheap-as-it-gets BUS install with minimal fabric work. Often the lowest net-cost archetype.",
  },
];

export function getArchetypeBySlug(slug: string): PropertyArchetype | null {
  return PILOT_ARCHETYPES.find((a) => a.slug === slug) ?? null;
}

export function allArchetypeSlugs(): string[] {
  return PILOT_ARCHETYPES.map((a) => a.slug);
}
