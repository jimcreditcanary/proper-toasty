// Octopus instant-report compute layer.
//
// /check/octopus skips every wizard step and lands the visitor on the
// simplified report immediately. The analysis engine still runs —
// it'd be a regression on the actual data product to hard-code the
// numbers — but it runs *server-side, once*, against a fixed
// illustrative property (2 Curtels Close, Worsley, M28 2JR) instead
// of one entered by the visitor.
//
// What we keep from the engine:
//   - EPC fetch by postcode + address  → real floor area + heating fuel
//   - annualRunningCost(...)           → real gas-boiler £/yr for this home
//                                        (energy + standing charge), and
//                                        the heat-pump electricity cost
//                                        on the Octopus Cosy tariff
//
// What we frame in marketing terms:
//   - The £49.99/mo headline is the Octopus subscription offer (kit +
//     service + callouts) — that's a contractual price, not an engine
//     output. The honest comparison is offer vs. engine-derived gas
//     boiler cost, plus a typical boiler service plan layered in.
//
// EPC lookups are cached for 30 days inside getEpc, so /check/octopus
// is cheap to render after the first hit.

import "server-only";
import { getEpc } from "@/lib/services/epc";
import {
  annualRunningCost,
  OCTOPUS_PARTNER,
} from "@/lib/services/boiler-comparison";

// Illustrative demo property — every /check/octopus visit reads
// against this address (no per-visitor address entry).
export const DEMO_PROPERTY = {
  formattedAddress: "2 Curtels Close, Worsley, Manchester, M28 2JR",
  addressLine1: "2 Curtels Close",
  postcode: "M28 2JR",
  latitude: 53.5083,
  longitude: -2.3877,
};

// Octopus's marketed all-in subscription (per their bullet sheet):
// equipment + servicing + callouts. Does NOT cover the electricity
// to run the heat pump — that sits on the Cosy tariff.
const OCTOPUS_OFFER_MONTHLY_GBP = 49.99;

// Typical UK gas-boiler service plan (£20/mo, including annual
// service + breakdown cover). Added to the boiler side so the
// comparison is offer-vs-offer rather than offer-vs-naked-fuel.
const AVG_BOILER_SERVICE_PLAN_ANNUAL_GBP = 240;

export interface OctopusDemoReport {
  /** EPC-derived floor area, or the engine's fallback when not found. */
  floorAreaM2: number;
  /** True when we had to fall back (EPC missing) — surfaced in copy. */
  floorAreaEstimated: boolean;
  /** Was the EPC certificate found for the demo property? */
  epcFound: boolean;

  /** Octopus all-in monthly headline. Fixed offer price (not engine). */
  hpMonthlyGBP: number;
  /** Gas-boiler all-in monthly: engine-derived energy + standing
   *  charge + a typical service plan. Differs per property. */
  boilerMonthlyGBP: number;

  /** Boiler minus heat-pump monthly. Always non-negative. */
  monthlySavingGBP: number;
  /** monthlySavingGBP × 12. */
  annualSavingGBP: number;

  // Honest intermediates — used by the UI for a small transparency
  // line so it's visible that the boiler number is data-derived,
  // not marketing.
  hpAnnualElecGBP: number;
  boilerAnnualEnergyGBP: number;
  boilerServicePlanAnnualGBP: number;
}

export async function computeOctopusDemoReport(): Promise<OctopusDemoReport> {
  // 30-day cached, so after the first hit this is a memory read.
  const epc = await getEpc({
    postcode: DEMO_PROPERTY.postcode,
    addressLine1: DEMO_PROPERTY.addressLine1,
    addressFull: DEMO_PROPERTY.formattedAddress,
  });

  // Engine running cost. Heat-pump electricity is forced onto the
  // Octopus Cosy heat-pump tariff (cheap shoulder window pricing) so
  // the heat pump isn't penalised by the standard import rate. Gas
  // numbers fall through to the engine defaults.
  const rc = annualRunningCost({
    epc,
    heatPumpElecPenceOverride: OCTOPUS_PARTNER.heatPumpElecPencePerKwh,
  });

  const boilerMonthlyGBP = Math.round(
    rc.boilerAnnualGBP / 12 + AVG_BOILER_SERVICE_PLAN_ANNUAL_GBP / 12,
  );
  const hpMonthlyGBP = Math.round(OCTOPUS_OFFER_MONTHLY_GBP);
  const monthlySavingGBP = Math.max(0, boilerMonthlyGBP - hpMonthlyGBP);

  return {
    floorAreaM2: rc.floorAreaM2,
    floorAreaEstimated: rc.floorAreaEstimated,
    epcFound: epc.found,
    hpMonthlyGBP: OCTOPUS_OFFER_MONTHLY_GBP, // keep the decimal in the headline
    boilerMonthlyGBP,
    monthlySavingGBP,
    annualSavingGBP: monthlySavingGBP * 12,
    hpAnnualElecGBP: rc.heatPumpAnnualGBP,
    boilerAnnualEnergyGBP: rc.boilerAnnualGBP,
    boilerServicePlanAnnualGBP: AVG_BOILER_SERVICE_PLAN_ANNUAL_GBP,
  };
}
