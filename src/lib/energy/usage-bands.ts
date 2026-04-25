/**
 * Usage-band defaults for the "I don't have my bill" fallback.
 *
 * Annual-usage figures come from Ofgem's Typical Domestic Consumption Values
 * (TDCV) — these are uniform across suppliers (it's how much energy a "low"
 * vs "high" UK household uses, not what they pay).
 *
 * Unit rates + standing charges are pulled per-supplier via
 * `getBandDefaults()` from `supplier-tariffs.ts`. The flat ELECTRICITY_BANDS
 * / GAS_BANDS maps below remain as the supplier-agnostic fallback (used
 * when supplier is null or "Other") and mirror the current Ofgem cap.
 *
 * The annual-usage figures will be refined later — probably driven by
 * EPC floor area + property type — but for now they're a reasonable
 * starting estimate so the user gets something rather than nothing.
 */

import {
  getSupplierTariff,
  type SupplierTariff,
} from "./supplier-tariffs";

export type UsageBand = "low" | "medium" | "high";

export interface BandDefaults {
  estimatedAnnualUsageKWh: number;
  unitRatePencePerKWh: number;
  standingChargePencePerDay: number;
}

// Annual-usage figures from Ofgem TDCV — uniform across suppliers.
const ELECTRICITY_KWH_BY_BAND: Record<UsageBand, number> = {
  low: 1800,
  medium: 2700,
  high: 4100,
};

const GAS_KWH_BY_BAND: Record<UsageBand, number> = {
  low: 7500,
  medium: 11500,
  high: 17000,
};

// Supplier-agnostic legacy maps — kept exported for callers (and tests)
// that don't have a supplier to hand. Mirrors the "Other" row of the
// supplier table so behaviour is consistent.
const FALLBACK_ELEC: SupplierTariff["electricity"] =
  getSupplierTariff(null).electricity;
const FALLBACK_GAS: SupplierTariff["gas"] = getSupplierTariff(null).gas;

export const ELECTRICITY_BANDS: Record<UsageBand, BandDefaults> = {
  low: {
    estimatedAnnualUsageKWh: ELECTRICITY_KWH_BY_BAND.low,
    unitRatePencePerKWh: FALLBACK_ELEC.unitRatePencePerKWh,
    standingChargePencePerDay: FALLBACK_ELEC.standingChargePencePerDay,
  },
  medium: {
    estimatedAnnualUsageKWh: ELECTRICITY_KWH_BY_BAND.medium,
    unitRatePencePerKWh: FALLBACK_ELEC.unitRatePencePerKWh,
    standingChargePencePerDay: FALLBACK_ELEC.standingChargePencePerDay,
  },
  high: {
    estimatedAnnualUsageKWh: ELECTRICITY_KWH_BY_BAND.high,
    unitRatePencePerKWh: FALLBACK_ELEC.unitRatePencePerKWh,
    standingChargePencePerDay: FALLBACK_ELEC.standingChargePencePerDay,
  },
};

export const GAS_BANDS: Record<UsageBand, BandDefaults> = {
  low: {
    estimatedAnnualUsageKWh: GAS_KWH_BY_BAND.low,
    unitRatePencePerKWh: FALLBACK_GAS.unitRatePencePerKWh,
    standingChargePencePerDay: FALLBACK_GAS.standingChargePencePerDay,
  },
  medium: {
    estimatedAnnualUsageKWh: GAS_KWH_BY_BAND.medium,
    unitRatePencePerKWh: FALLBACK_GAS.unitRatePencePerKWh,
    standingChargePencePerDay: FALLBACK_GAS.standingChargePencePerDay,
  },
  high: {
    estimatedAnnualUsageKWh: GAS_KWH_BY_BAND.high,
    unitRatePencePerKWh: FALLBACK_GAS.unitRatePencePerKWh,
    standingChargePencePerDay: FALLBACK_GAS.standingChargePencePerDay,
  },
};

/**
 * Supplier-aware band defaults. When `supplier` is set, returns the
 * supplier's published rates from `SUPPLIER_TARIFFS`; falls back to the
 * Ofgem cap (the "Other" row) when supplier is null/unknown. Annual-usage
 * always comes from Ofgem TDCV — that's a household-behaviour figure,
 * not a supplier figure.
 */
export function getBandDefaults(
  supplier: string | null | undefined,
  fuel: "electricity" | "gas",
  band: UsageBand,
): BandDefaults {
  const tariff = getSupplierTariff(supplier);
  if (fuel === "electricity") {
    return {
      estimatedAnnualUsageKWh: ELECTRICITY_KWH_BY_BAND[band],
      unitRatePencePerKWh: tariff.electricity.unitRatePencePerKWh,
      standingChargePencePerDay: tariff.electricity.standingChargePencePerDay,
    };
  }
  return {
    estimatedAnnualUsageKWh: GAS_KWH_BY_BAND[band],
    unitRatePencePerKWh: tariff.gas.unitRatePencePerKWh,
    standingChargePencePerDay: tariff.gas.standingChargePencePerDay,
  };
}

export const USAGE_BAND_LABELS: Record<UsageBand, { title: string; body: string }> = {
  low: { title: "Low", body: "Small home, 1–2 people." },
  medium: { title: "Medium", body: "Typical UK family, 3–4 people." },
  high: { title: "High", body: "Larger home, electric heating, or EVs." },
};
