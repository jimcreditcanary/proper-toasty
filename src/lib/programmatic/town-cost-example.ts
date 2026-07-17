// Town-page cost example — for the "typical monthly heating cost in
// [town]" section of the /heat-pumps/[town-slug] template.
//
// Reuses the same engine helpers as the wizard's BoilerTab and the
// /check/octopus instant report:
//   - lookupBoilerCost      → installed boiler cost band + midpoint
//   - annualRunningCost     → gas + heat-pump electricity, from EPC
//                             floor area × sizing defaults × tariff
//   - financeQuote          → monthly finance payment on both sides
//
// The engine's inputs are EPC-shaped. Rather than duplicate the
// compute we synthesise a minimal EPC certificate from the town
// aggregate's median floor area + dominant built form, then call the
// engine unchanged. That guarantees the numbers on the town page and
// the wizard/report agree.
//
// Returns null when the aggregate lacks the two data points we need
// (median floor area + at least one built-form entry) — the page
// then skips this section rather than rendering fabricated figures.

import type { EpcByAddressResponse } from "@/lib/schemas/epc";
import {
  annualRunningCost,
  financeQuote,
  lookupBoilerCost,
  HEAT_PUMP_GROSS_COST_RANGE_GBP,
} from "@/lib/services/boiler-comparison";
import { DEFAULT_SIZING_INPUTS } from "@/lib/admin/sizing-inputs";
import type { TownAggregateData } from "./town-aggregates";

/** Typical UK gas-boiler service plan — matches the /octopus report. */
const AVG_BOILER_SERVICE_PLAN_ANNUAL_GBP = 240;
/** Non-partner boiler finance defaults — match the wizard BoilerTab. */
const BOILER_FINANCE_APR_PCT = 9.9;
const BOILER_FINANCE_TERM_MONTHS = 60;
/** Neutral (non-partner) heat-pump finance: 0% over 10 years — the
 *  common BUS-grant + green-loan pairing lenders quote today. */
const HP_FINANCE_APR_PCT = 0;
const HP_FINANCE_TERM_MONTHS = 120;
/** BUS grant amount — mirrors DEFAULT_SIZING_INPUTS.bus_ashp_grant_gbp
 *  but read directly so this helper doesn't need the sizing object. */
const BUS_ASHP_GRANT_GBP = 7_500;

export interface TownCostExample {
  /** Human label — "semi-detached house", "terraced house", etc. */
  archetype: string;
  /** Floor area used in the example (m²). */
  floorAreaM2: number;
  boiler: {
    /** Sum of finance + energy + service. */
    monthly: number;
    finance: number;
    energy: number;
    service: number;
    /** Installed cost midpoint used for the finance calc. */
    installedGBP: number;
  };
  heatPump: {
    /** Sum of finance + electricity. */
    monthly: number;
    finance: number;
    electricity: number;
    /** Net cost after the £7,500 BUS grant. */
    netGBP: number;
  };
  /** Boiler minus heat pump. Clamped at 0 — negative savings are
   *  reported as £0 with a note in the copy rather than "you'd pay
   *  more". */
  savingMonthly: number;
  /** savingMonthly × 12. */
  savingAnnual: number;
}

/** Pick the dominant built-form key from the distribution map. */
function pickDominantBuiltForm(dist: Record<string, number>): string | null {
  const entries = Object.entries(dist);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/** Turn an EPC built-form string into an article-safe archetype label. */
function labelForBuiltForm(builtForm: string): string {
  const b = builtForm.toLowerCase();
  if (/flat|maisonette/.test(b)) return "flat";
  if (/terrace/.test(b)) return "terraced house";
  if (/semi/.test(b)) return "semi-detached house";
  if (/detached/.test(b)) return "detached house";
  // Fall back to the raw label lower-cased.
  return builtForm.toLowerCase();
}

/** Synthesise the minimal EPC shape the engine functions read. */
function synthesiseEpc(
  builtForm: string,
  floorAreaM2: number,
): EpcByAddressResponse {
  return {
    found: true,
    certificate: {
      propertyType: null,
      builtForm,
      dwellingType: null,
      totalFloorAreaM2: floorAreaM2,
    },
    recommendations: [],
    // The rest of the EpcByAddressResponse shape isn't read by the
    // engine functions this helper calls, so casting through unknown
    // avoids having to populate ~30 nulls just to satisfy TypeScript.
  } as unknown as EpcByAddressResponse;
}

export function buildTownCostExample(
  data: TownAggregateData,
): TownCostExample | null {
  const floorAreaM2 = data.median_floor_area_m2;
  const dist = data.built_form_distribution;
  if (
    floorAreaM2 == null ||
    floorAreaM2 <= 0 ||
    !dist ||
    Object.keys(dist).length === 0
  ) {
    return null;
  }
  const builtForm = pickDominantBuiltForm(dist);
  if (!builtForm) return null;

  const epc = synthesiseEpc(builtForm, floorAreaM2);

  // Engine-derived running cost. Defaults everywhere — no partner
  // tariff assumption on the neutral town page.
  const rc = annualRunningCost({
    epc,
    sizing: DEFAULT_SIZING_INPUTS,
  });

  const boilerCost = lookupBoilerCost(epc);
  const boilerInstalledGBP = boilerCost.installedCostGBP;

  // Heat-pump net cost after the £7,500 grant.
  const hpGrossMidpoint = Math.round(
    (HEAT_PUMP_GROSS_COST_RANGE_GBP[0] +
      HEAT_PUMP_GROSS_COST_RANGE_GBP[1]) /
      2,
  );
  const hpNetGBP = Math.max(0, hpGrossMidpoint - BUS_ASHP_GRANT_GBP);

  // Finance both sides.
  const boilerFinance = financeQuote(
    boilerInstalledGBP,
    BOILER_FINANCE_APR_PCT,
    BOILER_FINANCE_TERM_MONTHS,
  );
  const hpFinance = financeQuote(
    hpNetGBP,
    HP_FINANCE_APR_PCT,
    HP_FINANCE_TERM_MONTHS,
  );

  const boilerFinanceMonthly = Math.round(boilerFinance.monthlyGBP);
  const boilerEnergyMonthly = Math.round(rc.boilerAnnualGBP / 12);
  const boilerServiceMonthly = Math.round(
    AVG_BOILER_SERVICE_PLAN_ANNUAL_GBP / 12,
  );
  const boilerMonthly =
    boilerFinanceMonthly + boilerEnergyMonthly + boilerServiceMonthly;

  const hpFinanceMonthly = Math.round(hpFinance.monthlyGBP);
  const hpElecMonthly = Math.round(rc.heatPumpAnnualGBP / 12);
  const hpMonthly = hpFinanceMonthly + hpElecMonthly;

  const savingMonthly = Math.max(0, boilerMonthly - hpMonthly);
  const savingAnnual = savingMonthly * 12;

  return {
    archetype: labelForBuiltForm(builtForm),
    floorAreaM2: Math.round(floorAreaM2),
    boiler: {
      monthly: boilerMonthly,
      finance: boilerFinanceMonthly,
      energy: boilerEnergyMonthly,
      service: boilerServiceMonthly,
      installedGBP: boilerInstalledGBP,
    },
    heatPump: {
      monthly: hpMonthly,
      finance: hpFinanceMonthly,
      electricity: hpElecMonthly,
      netGBP: hpNetGBP,
    },
    savingMonthly,
    savingAnnual,
  };
}
