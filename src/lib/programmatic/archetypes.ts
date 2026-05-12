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
];

export function getArchetypeBySlug(slug: string): PropertyArchetype | null {
  return PILOT_ARCHETYPES.find((a) => a.slug === slug) ?? null;
}

export function allArchetypeSlugs(): string[] {
  return PILOT_ARCHETYPES.map((a) => a.slug);
}
