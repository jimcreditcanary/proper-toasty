/**
 * UK domestic energy suppliers — used as a dropdown when the user enters
 * tariff details manually. Order: Big Six first, then notable challengers
 * alphabetically. "Other" at the end as a free-text fallback.
 */
export const UK_ENERGY_PROVIDERS = [
  // Big Six (and post-consolidation equivalents)
  "British Gas",
  "EDF",
  "E.ON Next",
  "Octopus Energy",
  "OVO Energy",
  "ScottishPower",

  // Notable challengers / regionals
  "Boost",
  "Co-op Energy",
  "Ecotricity",
  "Fuse Energy",
  "Good Energy",
  "Outfox the Market",
  "Rebel Energy",
  "Shell Energy",
  "So Energy",
  "Together Energy",
  "Tomato Energy",
  "Utilita",
  "Utility Warehouse",

  // Last resort
  "Other",
] as const;

export type UkEnergyProvider = (typeof UK_ENERGY_PROVIDERS)[number];
