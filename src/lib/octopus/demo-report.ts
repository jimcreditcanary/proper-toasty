// Octopus instant-report compute layer.
//
// /check/octopus skips every wizard step and lands the visitor on the
// simplified report immediately. The analysis engine still runs —
// it'd be a regression on the actual data product to hard-code the
// numbers — but it runs *server-side, once*, against a fixed
// illustrative property (2 Curtels Close, Worsley, M28 2JR) instead
// of one entered by the visitor.
//
// To match what the wizard's BoilerTab produces for the same
// property, we reproduce its exact compute pipeline here:
//
//   1. EPC fetch                              — getEpc(...)
//   2. Admin sizing inputs                     — loadSizingInputs(...)
//                                                (so demand_kwh_per_m2,
//                                                grant amounts, etc.
//                                                match the wizard)
//   3. Heat-pump eligibility (BUS rules)      — heatPumpEligibility(...)
//   4. Boiler-vs-heat-pump cost ranges        — buildBoilerVsHeatPump(...)
//   5. Annual running cost on the Cosy tariff — annualRunningCost(...)
//   6. Finance amortization on BOTH sides     — financeQuote(...)
//
//   Boiler monthly  = boiler finance + gas-only running + boiler cover
//   Heat pump monthly = HP finance + HP electricity
//
//   Same breakdown the wizard's BoilerTab renders, no marketing
//   constants in the spine of the calc.
//
// EPC lookups are cached for 30 days inside getEpc, so /check/octopus
// is cheap to render after the first hit.

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSizingInputs } from "@/lib/admin/sizing-inputs";
import { getEpc } from "@/lib/services/epc";
import {
  annualRunningCost,
  buildBoilerVsHeatPump,
  financeQuote,
  OCTOPUS_PARTNER,
} from "@/lib/services/boiler-comparison";
import { heatPumpEligibility } from "@/lib/services/eligibility";
import type { Eligibility } from "@/lib/schemas/eligibility";

// Illustrative demo property — every /check/octopus visit reads
// against this address (no per-visitor address entry).
export const DEMO_PROPERTY = {
  formattedAddress: "2 Curtels Close, Worsley, Manchester, M28 2JR",
  addressLine1: "2 Curtels Close",
  postcode: "M28 2JR",
  latitude: 53.5083,
  longitude: -2.3877,
};

// New-boiler finance baseline — same defaults the wizard's BoilerTab
// uses (BOILER_FINANCE_DEFAULT_APR / BOILER_FINANCE_DEFAULT_TERM in
// boiler-tab.tsx). The wizard lets the user override via "I've got a
// quote"; here we use the baseline.
const BOILER_FINANCE_APR_PCT = 9.9;
const BOILER_FINANCE_TERM_MONTHS = 60;

export interface OctopusDemoReport {
  // EPC context
  /** EPC-derived floor area, or the engine's fallback when not found. */
  floorAreaM2: number;
  /** True when we had to fall back (EPC missing) — surfaced in copy. */
  floorAreaEstimated: boolean;
  /** Was the EPC certificate found for the demo property? */
  epcFound: boolean;

  // Headline totals
  /** Heat-pump all-in monthly = HP finance + HP electricity (Cosy). */
  hpMonthlyGBP: number;
  /** Gas-boiler all-in monthly = boiler finance + gas + boiler cover. */
  boilerMonthlyGBP: number;
  /** Boiler − heat-pump monthly. Always non-negative. */
  monthlySavingGBP: number;
  /** monthlySavingGBP × 12. */
  annualSavingGBP: number;

  // Breakdown — same rows the wizard's BoilerTab shows in its table.
  hpFinanceMonthlyGBP: number;
  hpElecMonthlyGBP: number;
  boilerFinanceMonthlyGBP: number;
  boilerGasMonthlyGBP: number;
  boilerCoverMonthlyGBP: number;

  // Engine context, surfaced as small-print in the report
  hpFinanceAprPct: number;
  hpFinanceTermYears: number;
  boilerFinanceAprPct: number;
  boilerFinanceTermYears: number;
}

export async function computeOctopusDemoReport(): Promise<OctopusDemoReport> {
  // Step 1+2 — EPC and admin sizing, in parallel. Admin sizing
  // overrides the in-code defaults (demand_kwh_per_m2 etc.) so the
  // engine output matches the wizard exactly.
  const admin = createAdminClient();
  const [epc, sizing] = await Promise.all([
    getEpc({
      postcode: DEMO_PROPERTY.postcode,
      addressLine1: DEMO_PROPERTY.addressLine1,
      addressFull: DEMO_PROPERTY.formattedAddress,
    }),
    loadSizingInputs(admin),
  ]);

  // Step 3 — heat-pump eligibility. Illustrative homeowner profile:
  // owner-occupier in England on mains gas, no prior heat-pump grant.
  // buildBoilerVsHeatPump only reads `eligibility.heatPump`, so the
  // other Eligibility branches are mocked below.
  const heatPump = heatPumpEligibility({
    country: "England",
    tenure: "owner",
    interests: ["heat_pump"],
    currentHeatingFuel: "gas",
    priorHeatPumpFunding: "no",
    epc,
    floorAreaM2: epc.found ? epc.certificate.totalFloorAreaM2 : null,
    sizing,
  });

  // Step 4 — boiler-vs-heat-pump cost ranges with Octopus's heat-pump
  // pricing. boilerCost comes from EPC-classified home type;
  // heatPumpCost uses the partner's gross range and the BUS grant.
  const eligibility = {
    heatPump,
    solar: { suitable: false, blockers: [], warnings: [] },
    householdElectricityBaselineKWh: 0,
  } as unknown as Eligibility;
  const cmp = buildBoilerVsHeatPump({
    epc,
    eligibility,
    partner: OCTOPUS_PARTNER,
  });

  // Step 5 — annual running cost. Boiler cover is layered on the
  // boiler side only (a heat pump doesn't need a gas-cover plan).
  const boilerCareAnnual = OCTOPUS_PARTNER.boilerCareMonthlyGBP * 12;
  const rc = annualRunningCost({
    epc,
    heatPumpElecPenceOverride: OCTOPUS_PARTNER.heatPumpElecPencePerKwh,
    boilerCareAnnualGBP: boilerCareAnnual,
    sizing,
  });

  // Step 6 — finance, both sides. Boiler at a typical 9.9% over 5y;
  // heat pump on the partner's offer (Octopus = 0% over 10y).
  const boilerFinance = financeQuote(
    cmp.boiler.installedCostGBP,
    BOILER_FINANCE_APR_PCT,
    BOILER_FINANCE_TERM_MONTHS,
  );
  const hpNet =
    cmp.heatPump.netMidpointGBP ?? cmp.heatPump.grossMidpointGBP;
  const hpFinance = financeQuote(
    hpNet,
    OCTOPUS_PARTNER.financeAprPct,
    OCTOPUS_PARTNER.financeTermMonths,
  );

  // Compose — match the wizard's BoilerTab breakdown row for row.
  const boilerGasOnlyAnnualGBP = rc.boilerAnnualGBP - boilerCareAnnual;
  const boilerFinanceMonthlyGBP = Math.round(boilerFinance.monthlyGBP);
  const boilerGasMonthlyGBP = Math.round(boilerGasOnlyAnnualGBP / 12);
  const boilerCoverMonthlyGBP = Math.round(boilerCareAnnual / 12);
  const boilerMonthlyGBP =
    boilerFinanceMonthlyGBP + boilerGasMonthlyGBP + boilerCoverMonthlyGBP;

  const hpFinanceMonthlyGBP = Math.round(hpFinance.monthlyGBP);
  const hpElecMonthlyGBP = Math.round(rc.heatPumpAnnualGBP / 12);
  const hpMonthlyGBP = hpFinanceMonthlyGBP + hpElecMonthlyGBP;

  const monthlySavingGBP = Math.max(0, boilerMonthlyGBP - hpMonthlyGBP);
  const annualSavingGBP = monthlySavingGBP * 12;

  return {
    floorAreaM2: rc.floorAreaM2,
    floorAreaEstimated: rc.floorAreaEstimated,
    epcFound: epc.found,
    hpMonthlyGBP,
    boilerMonthlyGBP,
    monthlySavingGBP,
    annualSavingGBP,
    hpFinanceMonthlyGBP,
    hpElecMonthlyGBP,
    boilerFinanceMonthlyGBP,
    boilerGasMonthlyGBP,
    boilerCoverMonthlyGBP,
    hpFinanceAprPct: OCTOPUS_PARTNER.financeAprPct,
    hpFinanceTermYears: Math.round(OCTOPUS_PARTNER.financeTermMonths / 12),
    boilerFinanceAprPct: BOILER_FINANCE_APR_PCT,
    boilerFinanceTermYears: Math.round(BOILER_FINANCE_TERM_MONTHS / 12),
  };
}
