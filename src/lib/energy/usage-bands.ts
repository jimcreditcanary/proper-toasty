/**
 * Placeholder usage-band defaults for the "I don't have my bill" fallback.
 * Numbers are seeded from Ofgem's Typical Domestic Consumption Values (TDCV)
 * + the current price-cap unit rates as of early 2026.
 *
 * These will be refined later (probably driven by EPC floor area + property
 * type) — for now they're a reasonable starting estimate so the user gets
 * something rather than nothing in the cost-savings calc.
 */

export type UsageBand = "low" | "medium" | "high";

export interface BandDefaults {
  estimatedAnnualUsageKWh: number;
  unitRatePencePerKWh: number;
  standingChargePencePerDay: number;
}

// Electricity — Ofgem TDCV: 1,800 / 2,700 / 4,100 kWh/yr (low/med/high).
// Unit rate / standing charge: roughly Ofgem cap, single-rate, direct debit.
export const ELECTRICITY_BANDS: Record<UsageBand, BandDefaults> = {
  low: {
    estimatedAnnualUsageKWh: 1800,
    unitRatePencePerKWh: 25.0,
    standingChargePencePerDay: 50.0,
  },
  medium: {
    estimatedAnnualUsageKWh: 2700,
    unitRatePencePerKWh: 25.0,
    standingChargePencePerDay: 50.0,
  },
  high: {
    estimatedAnnualUsageKWh: 4100,
    unitRatePencePerKWh: 25.0,
    standingChargePencePerDay: 50.0,
  },
};

// Gas — Ofgem TDCV: 7,500 / 11,500 / 17,000 kWh/yr (low/med/high).
export const GAS_BANDS: Record<UsageBand, BandDefaults> = {
  low: {
    estimatedAnnualUsageKWh: 7500,
    unitRatePencePerKWh: 6.5,
    standingChargePencePerDay: 32.0,
  },
  medium: {
    estimatedAnnualUsageKWh: 11500,
    unitRatePencePerKWh: 6.5,
    standingChargePencePerDay: 32.0,
  },
  high: {
    estimatedAnnualUsageKWh: 17000,
    unitRatePencePerKWh: 6.5,
    standingChargePencePerDay: 32.0,
  },
};

export const USAGE_BAND_LABELS: Record<UsageBand, { title: string; body: string }> = {
  low: { title: "Low", body: "Small home, 1–2 people." },
  medium: { title: "Medium", body: "Typical UK family, 3–4 people." },
  high: { title: "High", body: "Larger home, electric heating, or EVs." },
};
