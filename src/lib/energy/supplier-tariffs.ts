/**
 * Supplier-aware tariff lookup table.
 *
 * Used as the manual-estimate fallback in Step 3 when the user picks a
 * supplier but doesn't upload a bill. Replaces the previous flat Ofgem
 * defaults so the savings calc reflects the user's actual supplier
 * (e.g. Octopus' Outgoing 15p/kWh export rate vs Shell's 1p).
 *
 * Maintenance: review every Ofgem price-cap window (Jan / Apr / Jul / Oct)
 * and bump `lastReviewed` on touched rows. The "Other" row mirrors the
 * current Ofgem cap and is the safe fallback for unknown suppliers.
 *
 * Units: all rates in PENCE — pence/kWh for unit + off-peak + export, and
 * pence/day for standing charge. (We work in pence throughout the wizard
 * and convert to £ at the savings.ts boundary, matching FuelTariff.)
 */

import type { UkEnergyProvider } from "./providers";

export interface SupplierTariff {
  /** Standard variable / standard credit electricity rates. */
  electricity: {
    /** Pence per kWh — single-rate standard variable. */
    unitRatePencePerKWh: number;
    /** Pence per day — direct-debit standing charge. */
    standingChargePencePerDay: number;
    /** Pence per kWh — only set if supplier offers a TOU/smart tariff. */
    offPeakRatePencePerKWh?: number;
    /** Pence per kWh — Smart Export Guarantee or supplier-specific export rate. */
    exportRatePencePerKWh: number;
    /** Free-text label for the TOU offering, surfaced in the UI. */
    touTariffName?: string;
  };
  /** Standard variable gas rates. */
  gas: {
    unitRatePencePerKWh: number;
    standingChargePencePerDay: number;
  };
  /** Free-text caveats — shown in the admin/devtools, not the user UI. */
  notes?: string;
  /** ISO date of last review against the supplier's published tariffs. */
  lastReviewed: string;
}

/**
 * SUPPLIER_TARIFFS — keyed by the brand strings in `UK_ENERGY_PROVIDERS`.
 * Single-region GB averages; most suppliers vary ±10% by DNO region.
 * Last-reviewed dates seeded at 2026-04-25 for the initial rollout.
 */
export const SUPPLIER_TARIFFS: Record<UkEnergyProvider, SupplierTariff> = {
  "Octopus Energy": {
    electricity: {
      unitRatePencePerKWh: 24.86,
      standingChargePencePerDay: 60.97,
      offPeakRatePencePerKWh: 7.5,
      exportRatePencePerKWh: 15.0,
      touTariffName: "Octopus Go (or Cosy / Agile)",
    },
    gas: { unitRatePencePerKWh: 6.24, standingChargePencePerDay: 31.43 },
    lastReviewed: "2026-04-25",
  },
  "British Gas": {
    electricity: {
      unitRatePencePerKWh: 25.42,
      standingChargePencePerDay: 64.3,
      exportRatePencePerKWh: 6.4,
    },
    gas: { unitRatePencePerKWh: 6.39, standingChargePencePerDay: 32.6 },
    lastReviewed: "2026-04-25",
  },
  EDF: {
    electricity: {
      unitRatePencePerKWh: 25.18,
      standingChargePencePerDay: 61.5,
      offPeakRatePencePerKWh: 9.0,
      exportRatePencePerKWh: 5.6,
      touTariffName: "GoElectric",
    },
    gas: { unitRatePencePerKWh: 6.31, standingChargePencePerDay: 31.8 },
    lastReviewed: "2026-04-25",
  },
  "E.ON Next": {
    electricity: {
      unitRatePencePerKWh: 25.05,
      standingChargePencePerDay: 60.18,
      offPeakRatePencePerKWh: 9.5,
      exportRatePencePerKWh: 5.5,
      touTariffName: "Next Drive",
    },
    gas: { unitRatePencePerKWh: 6.28, standingChargePencePerDay: 31.2 },
    lastReviewed: "2026-04-25",
  },
  "OVO Energy": {
    electricity: {
      unitRatePencePerKWh: 24.92,
      standingChargePencePerDay: 59.74,
      offPeakRatePencePerKWh: 10.0,
      exportRatePencePerKWh: 4.0,
      touTariffName: "Charge Anytime",
    },
    gas: { unitRatePencePerKWh: 6.29, standingChargePencePerDay: 31.65 },
    lastReviewed: "2026-04-25",
  },
  ScottishPower: {
    electricity: {
      unitRatePencePerKWh: 25.61,
      standingChargePencePerDay: 62.85,
      exportRatePencePerKWh: 12.0,
    },
    gas: { unitRatePencePerKWh: 6.42, standingChargePencePerDay: 32.1 },
    lastReviewed: "2026-04-25",
  },
  "Shell Energy": {
    electricity: {
      unitRatePencePerKWh: 25.3,
      standingChargePencePerDay: 61.2,
      exportRatePencePerKWh: 1.0,
    },
    gas: { unitRatePencePerKWh: 6.35, standingChargePencePerDay: 31.95 },
    notes: "Worth verifying — Shell domestic supply has been in transition.",
    lastReviewed: "2026-04-25",
  },
  "Co-op Energy": {
    electricity: {
      unitRatePencePerKWh: 24.95,
      standingChargePencePerDay: 60.5,
      exportRatePencePerKWh: 4.5,
    },
    gas: { unitRatePencePerKWh: 6.3, standingChargePencePerDay: 31.4 },
    lastReviewed: "2026-04-25",
  },
  "Good Energy": {
    electricity: {
      unitRatePencePerKWh: 26.1,
      standingChargePencePerDay: 62.0,
      exportRatePencePerKWh: 5.5,
    },
    gas: { unitRatePencePerKWh: 6.45, standingChargePencePerDay: 32.2 },
    lastReviewed: "2026-04-25",
  },
  Ecotricity: {
    electricity: {
      unitRatePencePerKWh: 26.5,
      standingChargePencePerDay: 63.0,
      exportRatePencePerKWh: 5.5,
    },
    gas: { unitRatePencePerKWh: 6.55, standingChargePencePerDay: 32.5 },
    lastReviewed: "2026-04-25",
  },
  Utilita: {
    electricity: {
      unitRatePencePerKWh: 25.8,
      standingChargePencePerDay: 67.8,
      exportRatePencePerKWh: 4.0,
    },
    gas: { unitRatePencePerKWh: 6.5, standingChargePencePerDay: 33.5 },
    notes: "PAYG-first supplier; rates above are the prepay default.",
    lastReviewed: "2026-04-25",
  },
  "Utility Warehouse": {
    electricity: {
      unitRatePencePerKWh: 25.2,
      standingChargePencePerDay: 60.8,
      exportRatePencePerKWh: 4.0,
    },
    gas: { unitRatePencePerKWh: 6.32, standingChargePencePerDay: 31.7 },
    lastReviewed: "2026-04-25",
  },
  "So Energy": {
    electricity: {
      unitRatePencePerKWh: 25.0,
      standingChargePencePerDay: 60.0,
      exportRatePencePerKWh: 4.0,
    },
    gas: { unitRatePencePerKWh: 6.3, standingChargePencePerDay: 31.4 },
    lastReviewed: "2026-04-25",
  },
  Boost: {
    electricity: {
      unitRatePencePerKWh: 25.9,
      standingChargePencePerDay: 67.5,
      exportRatePencePerKWh: 0,
    },
    gas: { unitRatePencePerKWh: 6.55, standingChargePencePerDay: 33.4 },
    notes:
      "PAYG-only via OVO. No SEG export tariff offered for prepay customers.",
    lastReviewed: "2026-04-25",
  },
  "Fuse Energy": {
    electricity: {
      unitRatePencePerKWh: 25.1,
      standingChargePencePerDay: 60.3,
      exportRatePencePerKWh: 4.0,
    },
    gas: { unitRatePencePerKWh: 6.31, standingChargePencePerDay: 31.5 },
    notes: "Smaller supplier — verify before next price-cap window.",
    lastReviewed: "2026-04-25",
  },
  "Outfox the Market": {
    electricity: {
      unitRatePencePerKWh: 24.8,
      standingChargePencePerDay: 59.5,
      exportRatePencePerKWh: 4.0,
    },
    gas: { unitRatePencePerKWh: 6.25, standingChargePencePerDay: 31.1 },
    lastReviewed: "2026-04-25",
  },
  "Rebel Energy": {
    electricity: {
      unitRatePencePerKWh: 25.4,
      standingChargePencePerDay: 61.8,
      exportRatePencePerKWh: 3.0,
    },
    gas: { unitRatePencePerKWh: 6.4, standingChargePencePerDay: 31.9 },
    notes: "Smaller supplier — verify before next price-cap window.",
    lastReviewed: "2026-04-25",
  },
  "Together Energy": {
    electricity: {
      unitRatePencePerKWh: 25.55,
      standingChargePencePerDay: 62.1,
      exportRatePencePerKWh: 3.0,
    },
    gas: { unitRatePencePerKWh: 6.42, standingChargePencePerDay: 32.0 },
    notes: "Smaller supplier — verify before next price-cap window.",
    lastReviewed: "2026-04-25",
  },
  "Tomato Energy": {
    electricity: {
      unitRatePencePerKWh: 25.2,
      standingChargePencePerDay: 60.7,
      exportRatePencePerKWh: 4.0,
    },
    gas: { unitRatePencePerKWh: 6.34, standingChargePencePerDay: 31.6 },
    notes: "Smaller supplier — verify before next price-cap window.",
    lastReviewed: "2026-04-25",
  },
  // Catch-all — mirrors the current Ofgem default cap. Used for unknown
  // suppliers + as the deep fallback in savings.ts when both tariffs are null.
  Other: {
    electricity: {
      unitRatePencePerKWh: 25.0,
      standingChargePencePerDay: 60.97,
      offPeakRatePencePerKWh: 10.0,
      exportRatePencePerKWh: 15.0,
    },
    gas: { unitRatePencePerKWh: 6.24, standingChargePencePerDay: 31.43 },
    notes: "Ofgem cap default — used when the supplier isn't on our list.",
    lastReviewed: "2026-04-25",
  },
};

/**
 * Lookup helper. Returns the "Other" (Ofgem cap) row when the supplier
 * is null/unknown so callers always get a usable record.
 */
export function getSupplierTariff(
  supplier: string | null | undefined,
): SupplierTariff {
  if (!supplier) return SUPPLIER_TARIFFS.Other;
  if (supplier in SUPPLIER_TARIFFS) {
    return SUPPLIER_TARIFFS[supplier as UkEnergyProvider];
  }
  return SUPPLIER_TARIFFS.Other;
}

/**
 * True when the supplier publishes a Time-of-Use / smart tariff. Drives
 * whether we even ask the "Are you on a TOU tariff?" question in Step 3 —
 * pointless to ask if the user's supplier doesn't offer one.
 */
export function supplierHasTouOption(
  supplier: string | null | undefined,
): boolean {
  return getSupplierTariff(supplier).electricity.offPeakRatePencePerKWh != null;
}
