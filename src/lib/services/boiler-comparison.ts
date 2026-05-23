// Boiler-vs-heat-pump cost + finance comparison — pure functions.
//
// Powers the /check/boiler focused flow: a homeowner deciding between
// (a) replacing a gas boiler like-for-like, or (b) switching to an air
// source heat pump with the £7,500 Boiler Upgrade Scheme grant.
//
// Everything here is PURE (same inputs → same outputs) so it's unit-
// testable and auditable against the reference figures. The numbers
// trace to the cost reference Jim supplied (Energy Saving Trust Boiler
// Installation Cost Report 2026, MCS Register 2026, Checkatrade /
// MyJobQuote, Ofgem/DESNZ). These are INDICATIVE ranges for an
// estimate tool — never present as a quote.
//
// Reuses:
//   - heat-pump grant + BUS verdict from the existing eligibility
//     engine (src/lib/services/eligibility.ts → Eligibility.heatPump)
//   - the fully-amortising PMT in src/lib/savings/calc.ts
//     (monthlyLoanPayment) for the finance lines.

import type { EpcByAddressResponse } from "@/lib/schemas/epc";
import type { Eligibility } from "@/lib/schemas/eligibility";
import type { FuelTariff } from "@/lib/schemas/bill";
import {
  DEFAULT_SIZING_INPUTS,
  type SizingInputs,
} from "@/lib/admin/sizing-inputs";
import { monthlyLoanPayment } from "@/lib/savings/calc";

// ─── 1. Gas boiler cost lookup (installed, like-for-like) ────────────
//
// Bands are FULLY INSTALLED (unit + labour + standard ancillaries).
// Keyed by home type, which we infer from the EPC property
// classification + total floor area. Midpoint is the headline; the
// band is shown beneath it.

export type BoilerHomeType =
  | "flat"
  | "terraced"
  | "semi"
  | "detached"
  | "large_detached"
  | "unknown";

export interface BoilerCostRow {
  type: BoilerHomeType;
  label: string;
  /** Typical boiler + size, for the "what we assumed" line. */
  spec: string;
  /** Installed cost band [low, high] in £. */
  rangeGBP: [number, number];
  /** Headline midpoint in £. */
  midpointGBP: number;
}

export const BOILER_COST_TABLE: Record<
  Exclude<BoilerHomeType, "unknown">,
  BoilerCostRow
> = {
  flat: {
    type: "flat",
    label: "Flat / maisonette",
    spec: "24–27kW combi",
    rangeGBP: [1800, 2800],
    midpointGBP: 2300,
  },
  terraced: {
    type: "terraced",
    label: "Terraced house",
    spec: "28–30kW combi",
    rangeGBP: [2000, 3000],
    midpointGBP: 2500,
  },
  semi: {
    type: "semi",
    label: "Semi-detached house",
    spec: "30–35kW combi or system",
    rangeGBP: [2250, 3500],
    midpointGBP: 2900,
  },
  detached: {
    type: "detached",
    label: "Detached house",
    spec: "35–42kW combi or system",
    rangeGBP: [3000, 4500],
    midpointGBP: 3750,
  },
  large_detached: {
    type: "large_detached",
    label: "Large detached house",
    spec: "35–38kW+ system + cylinder",
    rangeGBP: [4500, 7000],
    midpointGBP: 5500,
  },
};

/** National all-in fallback when we can't classify the home — range
 *  £1,500–£4,500, midpoint ~£2,400 (Energy Saving Trust 2026). */
export const BOILER_NATIONAL_FALLBACK: BoilerCostRow = {
  type: "unknown",
  label: "Typical UK home",
  spec: "combi boiler",
  rangeGBP: [1500, 4500],
  midpointGBP: 2400,
};

/** "Average complexity" uplift baked into the default install figure —
 *  the base table assumes a clean like-for-like swap in the same spot,
 *  but most jobs carry a little extra (filter, minor pipework, flue).
 *  Reference §2: surface modifiers individually OR bake ~+£400 in. We
 *  bake it in and disclose it. */
export const BOILER_COMPLEXITY_UPLIFT_GBP = 400;

/** Floor-area thresholds (m²) used to disambiguate when the built form
 *  is missing/ambiguous, and to split detached → large detached. */
const AREA_BANDS: Array<{ maxM2: number; type: BoilerHomeType }> = [
  { maxM2: 60, type: "flat" },
  { maxM2: 90, type: "terraced" },
  { maxM2: 120, type: "semi" },
  { maxM2: 170, type: "detached" },
  { maxM2: Infinity, type: "large_detached" },
];

/** A detached home above this floor area counts as "large detached"
 *  (5+ bed territory → bigger system + cylinder). */
const LARGE_DETACHED_M2 = 170;

/**
 * Classify the home into a boiler cost band from the EPC certificate.
 * Built form drives the primary bucket; floor area splits detached vs
 * large detached and acts as the fallback when built form is absent.
 */
export function classifyBoilerHomeType(
  epc: EpcByAddressResponse,
): BoilerHomeType {
  if (!epc.found) return "unknown";
  const cert = epc.certificate;
  const area = cert.totalFloorAreaM2;
  const blob = `${cert.propertyType ?? ""} ${cert.builtForm ?? ""} ${
    cert.dwellingType ?? ""
  }`.toLowerCase();

  // Flats + maisonettes first — property type is the clean signal.
  if (/flat|maisonette/.test(blob)) return "flat";

  // Built-form buckets. Order matters: "semi" before "detached"
  // because "Semi-Detached" contains "detached".
  if (/terrace/.test(blob)) return "terraced";
  if (/semi/.test(blob)) return "semi";
  if (/detached/.test(blob)) {
    return area != null && area >= LARGE_DETACHED_M2
      ? "large_detached"
      : "detached";
  }

  // No usable built form → fall back to floor area alone.
  if (area != null && area > 0) {
    return AREA_BANDS.find((b) => area <= b.maxM2)?.type ?? "unknown";
  }
  return "unknown";
}

/** The installed boiler cost band + the financed principal (midpoint +
 *  baked-in complexity uplift). */
export interface BoilerCostResult {
  homeType: BoilerHomeType;
  label: string;
  spec: string;
  /** Clean like-for-like swap band, before complexity uplift. */
  cleanSwapRangeGBP: [number, number];
  complexityUpliftGBP: number;
  /** Headline installed cost = midpoint + uplift. This is the finance
   *  principal for the boiler side. */
  installedCostGBP: number;
}

export function lookupBoilerCost(epc: EpcByAddressResponse): BoilerCostResult {
  const homeType = classifyBoilerHomeType(epc);
  const row =
    homeType === "unknown"
      ? BOILER_NATIONAL_FALLBACK
      : BOILER_COST_TABLE[homeType];
  return {
    homeType,
    label: row.label,
    spec: row.spec,
    cleanSwapRangeGBP: row.rangeGBP,
    complexityUpliftGBP: BOILER_COMPLEXITY_UPLIFT_GBP,
    installedCostGBP: row.midpointGBP + BOILER_COMPLEXITY_UPLIFT_GBP,
  };
}

// ─── 2. Heat-pump counterfactual ─────────────────────────────────────
//
// Gross install band is the MCS Register 2026 average for an air source
// heat pump (Jim's reference §3). We use the flat MCS headline rather
// than the eligibility engine's narrower floor-area bands because this
// is the consumer-facing decision figure people actually compare a
// boiler against. The grant + BUS verdict come from the eligibility
// engine so the two stay consistent.

export const HEAT_PUMP_GROSS_COST_RANGE_GBP: [number, number] = [12000, 16000];

// ─── Brand partnership configs ───────────────────────────────────────
//
// A partner (e.g. Octopus Energy) co-brands the boiler-vs-heat-pump
// flow and supplies its own commercials: its own (lower) heat-pump
// price, its own finance terms, the tariff it puts the home on after
// install, and how it models energy-price inflation. The boiler flow
// reads these overrides when a partner is active; otherwise the
// neutral defaults above apply.

export type PartnerId = "octopus";

export interface PartnerConfig {
  id: PartnerId;
  name: string;
  /** Partner's own installed heat-pump price (gross, before grant). */
  heatPumpGrossRangeGBP: [number, number];
  /** Fixed finance offer — APR + term in months (no product/term
   *  picker on a partner page; the offer is the offer). */
  financeAprPct: number;
  financeTermMonths: number;
  /** Effective electricity rate the heat pump runs at on the partner's
   *  heat-pump tariff (p/kWh) — overrides the user's standard tariff. */
  heatPumpElecPencePerKwh: number;
  /** Annual energy-price inflation applied to the total-cost view. */
  gasInflationPctPerYear: number;
  elecInflationPctPerYear: number;
  /** Monthly boiler-care / cover cost added to the boiler side when the
   *  user says they pay for it — an ongoing gas-boiler cost a heat pump
   *  on the partner's plan avoids. */
  boilerCareMonthlyGBP: number;
}

export const OCTOPUS_PARTNER: PartnerConfig = {
  id: "octopus",
  name: "Octopus Energy",
  // ~£10.5k installed → £3,000 net after the £7,500 grant.
  heatPumpGrossRangeGBP: [10500, 10500],
  financeAprPct: 0,
  financeTermMonths: 120, // 0% over 10 years
  heatPumpElecPencePerKwh: 15, // Cosy effective rate
  gasInflationPctPerYear: 7,
  elecInflationPctPerYear: 2,
  boilerCareMonthlyGBP: 20,
};

export const PARTNERS: Record<PartnerId, PartnerConfig> = {
  octopus: OCTOPUS_PARTNER,
};

export function getPartner(id: string | null | undefined): PartnerConfig | null {
  if (!id) return null;
  return id in PARTNERS ? PARTNERS[id as PartnerId] : null;
}

export interface HeatPumpCostResult {
  verdict: Eligibility["heatPump"]["verdict"];
  grossRangeGBP: [number, number];
  grossMidpointGBP: number;
  grantGBP: number;
  /** True when BUS isn't blocked (eligible or conditional). */
  busEligible: boolean;
  /** True when an outstanding loft/cavity/wall insulation rec means
   *  insulation likely comes first — we show a caveat, not the net
   *  figure (reference §3). */
  insulationFirst: boolean;
  /** Net-of-grant band [low, high]. Null when BUS is blocked. */
  netRangeGBP: [number, number] | null;
  /** Net midpoint = finance principal for the heat-pump side. Null
   *  when BUS is blocked. */
  netMidpointGBP: number | null;
  blockers: string[];
  warnings: string[];
}

/** Does the EPC carry an outstanding insulation recommendation
 *  (loft / cavity / wall)? Those are the ones BUS expects addressed
 *  before a heat pump goes in. */
export function hasOutstandingInsulationRec(
  epc: EpcByAddressResponse,
): boolean {
  if (!epc.found) return false;
  const recs = epc.recommendations ?? [];
  return recs.some((r) => /insulat/i.test(r.improvementSummary));
}

export function buildHeatPumpCost(
  epc: EpcByAddressResponse,
  heatPump: Eligibility["heatPump"],
  grossRangeOverride?: [number, number],
): HeatPumpCostResult {
  const grossRangeGBP = grossRangeOverride ?? HEAT_PUMP_GROSS_COST_RANGE_GBP;
  const grossMidpointGBP = Math.round((grossRangeGBP[0] + grossRangeGBP[1]) / 2);
  const grantGBP = heatPump.estimatedGrantGBP;
  const busEligible = heatPump.verdict !== "blocked";
  const insulationFirst = hasOutstandingInsulationRec(epc);

  // Net is gross minus grant, floored at 0. Only meaningful when BUS
  // applies and insulation isn't blocking the grant path.
  const showNet = busEligible && !insulationFirst;
  const netRangeGBP: [number, number] | null = showNet
    ? [Math.max(0, grossRangeGBP[0] - grantGBP), Math.max(0, grossRangeGBP[1] - grantGBP)]
    : null;
  const netMidpointGBP = netRangeGBP
    ? Math.round((netRangeGBP[0] + netRangeGBP[1]) / 2)
    : null;

  return {
    verdict: heatPump.verdict,
    grossRangeGBP,
    grossMidpointGBP,
    grantGBP,
    busEligible,
    insulationFirst,
    netRangeGBP,
    netMidpointGBP,
    blockers: heatPump.blockers,
    warnings: heatPump.warnings,
  };
}

// ─── 3. Top-level comparison ─────────────────────────────────────────

export interface BoilerVsHeatPump {
  boiler: BoilerCostResult;
  heatPump: HeatPumpCostResult;
}

export function buildBoilerVsHeatPump(input: {
  epc: EpcByAddressResponse;
  eligibility: Eligibility;
  /** When a brand partner is active, use its heat-pump price instead
   *  of the neutral MCS-average band. */
  partner?: PartnerConfig | null;
}): BoilerVsHeatPump {
  return {
    boiler: lookupBoilerCost(input.epc),
    heatPump: buildHeatPumpCost(
      input.epc,
      input.eligibility.heatPump,
      input.partner?.heatPumpGrossRangeGBP,
    ),
  };
}

// ─── 4. Finance (boiler / heat-pump install loan market) ─────────────
//
// Distinct from the solar/battery loan config (those quote at 6.9% to
// our solar finance partners). Boiler-grade install finance is a mature
// FCA-regulated market: 0% APR over short terms, or a low-APR spread up
// to ~10 years. Reference §5.

export const HEATING_FINANCE = {
  /** 0% APR product — total repayable equals the cash price. Offered
   *  on short terms only. */
  zeroAprPct: 0,
  zeroAprTermsMonths: [12, 24] as const,
  /** Representative APR for the spread product (reference: 9.9–12.9%
   *  rep APR; we model the midpoint). */
  spreadAprPct: 11.9,
  spreadTermsMonths: [24, 60, 120] as const,
  /** All selectable terms across both products. */
  allTermsMonths: [12, 24, 60, 120] as const,
  defaultTermMonths: 60,
  /** FCA-typical minimum loan. Below this, finance isn't offered. */
  minLoanGBP: 1000,
} as const;

export interface FinanceQuote {
  principalGBP: number;
  aprPct: number;
  termMonths: number;
  monthlyGBP: number;
  totalRepayableGBP: number;
  totalInterestGBP: number;
  /** False when principal is below the market minimum loan. */
  financeable: boolean;
}

// ─── 5. Running costs (energy bills) ─────────────────────────────────
//
// An install-cost comparison alone is misleading — the whole point of a
// heat pump is the ongoing bill. We model the HEATING energy cost of
// each system (space heating + hot water); appliance/lighting
// electricity is identical either way, so it's excluded.
//
// IMPORTANT HONESTY NOTE: at standard tariffs (~27p/kWh electricity vs
// ~7p/kWh gas) a heat pump's running cost is roughly LEVEL with gas, not
// dramatically cheaper — the SCOP (~2.8) offsets most, but not all, of
// the electricity premium. The big savings come from a heat-pump tariff
// (Cosy / overnight rates). We model the standard-tariff case and flag
// the tariff lever in the UI. Never imply guaranteed savings.
//
// Model (mirrors the fuel-switch model sketched in savings/calc.ts):
//   heat-pump heating electricity = floor area × demand-per-m² (SCOP
//     ~2.8 already baked into that per-m² figure)
//   thermal heat demand           = HP electricity × SCOP
//   gas input                     = thermal ÷ boiler efficiency
//   boiler heating cost  = gas kWh × gas unit price + gas standing charge
//   heat-pump heating cost = HP electricity × electricity unit price
//     (gas is disconnected on full electrification, so the boiler side
//      carries the gas standing charge the heat-pump side avoids)

export const RUNNING_COST = {
  /** Seasonal coefficient of performance — units of heat per unit of
   *  electricity. Matches the SCOP baked into the eligibility engine's
   *  demand-per-m² figure. */
  scop: 2.8,
  /** Modern condensing gas boiler seasonal efficiency. */
  boilerEfficiency: 0.9,
  /** Tariff fallbacks (Ofgem price-cap ballpark, 2026) when the user
   *  hasn't given us a bill. Electricity also falls back to the admin
   *  sizing input before this. p/kWh + p/day. */
  defaultGasUnitPencePerKwh: 7,
  defaultGasStandingPencePerDay: 30,
  /** National-average floor area used only when the EPC carries none —
   *  the result is flagged `floorAreaEstimated`. */
  fallbackFloorAreaM2: 90,
} as const;

export interface RunningCost {
  floorAreaM2: number;
  /** True when we fell back to the national-average floor area. */
  floorAreaEstimated: boolean;
  /** Annual heating + hot water energy cost on a gas boiler (£/yr). */
  boilerAnnualGBP: number;
  /** Annual heating + hot water energy cost on a heat pump (£/yr). */
  heatPumpAnnualGBP: number;
  /** Assumptions used, surfaced for the "how we worked this out" line. */
  assumptions: {
    elecUnitPencePerKwh: number;
    gasUnitPencePerKwh: number;
    gasStandingPencePerDay: number;
    scop: number;
    boilerEfficiency: number;
  };
}

export function annualRunningCost(input: {
  epc: EpcByAddressResponse;
  electricityTariff?: FuelTariff | null;
  gasTariff?: FuelTariff | null;
  sizing?: SizingInputs;
  /** Override the heat-pump electricity rate (p/kWh) — set to a
   *  partner's heat-pump tariff (e.g. Octopus Cosy) so the heat pump
   *  isn't penalised by the standard import rate. */
  heatPumpElecPenceOverride?: number;
  /** Added to the boiler side only — an ongoing boiler-care / cover
   *  cost (£/yr) the user told us they pay, which a heat pump avoids. */
  boilerCareAnnualGBP?: number;
}): RunningCost {
  const sizing = input.sizing ?? DEFAULT_SIZING_INPUTS;

  const epcArea = input.epc.found ? input.epc.certificate.totalFloorAreaM2 : null;
  const floorAreaEstimated = epcArea == null || epcArea <= 0;
  const floorAreaM2 = floorAreaEstimated ? RUNNING_COST.fallbackFloorAreaM2 : epcArea;

  // Tariff resolution for the heat pump: partner heat-pump tariff →
  // user's bill → admin sizing default → hard fallback.
  const elecUnitPence =
    input.heatPumpElecPenceOverride ??
    input.electricityTariff?.unitRatePencePerKWh ??
    sizing.energy_import_price_p_per_kwh;
  const gasUnitPence =
    input.gasTariff?.unitRatePencePerKWh ??
    RUNNING_COST.defaultGasUnitPencePerKwh;
  const gasStandingPence =
    input.gasTariff?.standingChargePencePerDay ??
    RUNNING_COST.defaultGasStandingPencePerDay;

  // Heat-pump heating electricity (demand-per-m² already ≈ SCOP-adjusted).
  const heatPumpElecKwh = floorAreaM2 * sizing.heat_pump_demand_kwh_per_m2;
  const thermalKwh = heatPumpElecKwh * RUNNING_COST.scop;
  const gasKwh = thermalKwh / RUNNING_COST.boilerEfficiency;

  const boilerCareAnnualGBP = input.boilerCareAnnualGBP ?? 0;
  const boilerAnnualGBP = Math.round(
    (gasKwh * gasUnitPence) / 100 +
      (gasStandingPence * 365) / 100 +
      boilerCareAnnualGBP,
  );
  const heatPumpAnnualGBP = Math.round((heatPumpElecKwh * elecUnitPence) / 100);

  return {
    floorAreaM2,
    floorAreaEstimated,
    boilerAnnualGBP,
    heatPumpAnnualGBP,
    assumptions: {
      elecUnitPencePerKwh: elecUnitPence,
      gasUnitPencePerKwh: gasUnitPence,
      gasStandingPencePerDay: gasStandingPence,
      scop: RUNNING_COST.scop,
      boilerEfficiency: RUNNING_COST.boilerEfficiency,
    },
  };
}

/**
 * Annual energy-bill difference between the two systems.
 *   positive → the heat pump is CHEAPER to run by this much per year
 *   negative → the heat pump is DEARER to run by this much per year
 *
 * Honest by construction: at a standard electricity tariff this lands
 * near zero or negative; a heat-pump tariff pushes it positive. The UI
 * shows the sign rather than assuming a saving.
 */
export function annualEnergyBillDelta(rc: RunningCost): number {
  return rc.boilerAnnualGBP - rc.heatPumpAnnualGBP;
}

/**
 * Total cost of ownership over `years`: the day-one outlay (a cash
 * install price OR a financed total-repayable) plus the running energy
 * bill for each year.
 *
 * `energyInflationPctPerYear` compounds the annual energy cost year on
 * year (year 0 at today's price, year 1 at +infl, …). Defaults to 0 —
 * the neutral boiler page keeps flat real prices; a partner page can
 * model gas rising faster than electricity.
 */
export function totalCostOfOwnership(input: {
  upfrontGBP: number;
  annualEnergyGBP: number;
  years: number;
  energyInflationPctPerYear?: number;
}): number {
  const infl = (input.energyInflationPctPerYear ?? 0) / 100;
  let energyTotal = 0;
  for (let y = 0; y < input.years; y++) {
    energyTotal += input.annualEnergyGBP * Math.pow(1 + infl, y);
  }
  return Math.round(input.upfrontGBP + energyTotal);
}

/**
 * Monthly + total repayable for a fixed-rate, fully-amortising install
 * loan. Reuses the shared PMT (monthlyLoanPayment) — termMonths is
 * converted to years for that helper. 0% APR returns straight-line
 * principal / months with zero interest.
 */
export function financeQuote(
  principalGBP: number,
  aprPct: number,
  termMonths: number,
): FinanceQuote {
  const financeable = principalGBP >= HEATING_FINANCE.minLoanGBP;
  const monthlyGBP = monthlyLoanPayment(principalGBP, aprPct, termMonths / 12);
  const totalRepayableGBP = monthlyGBP * termMonths;
  const totalInterestGBP = Math.max(0, totalRepayableGBP - principalGBP);
  return {
    principalGBP,
    aprPct,
    termMonths,
    monthlyGBP,
    totalRepayableGBP,
    totalInterestGBP,
    financeable,
  };
}
