/**
 * Propertoasty eligibility engine.
 *
 * All rules are PURE FUNCTIONS so they can be unit-tested exhaustively and
 * diffed cleanly against updated Ofgem guidance. Inputs come from the
 * orchestrator; no IO here.
 *
 * Cross-referenced against Ofgem BUS guidance as of April 2026. Summary of
 * the rules we implement:
 *
 *   - England & Wales only. Max capacity 45 kWth (homes + small/medium
 *     non-domestic). Shared ground-loop cap: 300 kWth (out of our scope —
 *     we're residential).
 *   - Valid EPC required. (Voucher paperwork needs it; we warn if missing
 *     or ≥10 years old since an EPC itself is only valid for 10 years.)
 *   - Must be fully replacing a fossil-fuel (gas/oil) or electric heating
 *     system. Replacement of existing low-carbon heating is excluded.
 *   - Biomass grant only for rural + off-gas homes. Heat pumps: no such
 *     restriction.
 *   - No double funding: can't apply if already had a government grant for
 *     a heat pump or biomass boiler. Separate funding for insulation,
 *     windows, or doors is fine.
 *   - New-build and social housing excluded. Self-build allowed.
 *
 * Not enforced here (post-install paperwork concerns):
 *   - 120-day commissioning-to-voucher window: the installer handles this
 *     after MCS commissioning; not our job at pre-survey.
 */

import type { BuildingInsightsResponse } from "@/lib/schemas/solar";
import type { EpcByAddressResponse } from "@/lib/schemas/epc";
import type { AnalyseRequest } from "@/lib/schemas/analyse";
import type { Eligibility, Finance } from "@/lib/schemas/eligibility";

// ─── helpers ─────────────────────────────────────────────────────────────────

function lodgementAgeYears(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function num(env: string, fallback: number): number {
  const v = Number(process.env[env]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// Fuel classification. Maps EPC main-fuel free-text to one of our enums.
function classifyFuel(
  raw: string | null | undefined
): "fossil" | "electric" | "heat_pump" | "biomass" | "other" {
  if (!raw) return "other";
  const s = raw.toLowerCase();
  if (s.includes("heat pump")) return "heat_pump";
  if (s.includes("biomass") || s.includes("wood") || s.includes("pellet")) return "biomass";
  if (s.includes("mains gas") || s.includes("natural gas") || s.includes("lpg") || s.includes("oil") || s.includes("coal") || s.includes("solid fuel")) return "fossil";
  if (s.includes("electric")) return "electric";
  return "other";
}

// ─── household demand ────────────────────────────────────────────────────────

/**
 * Baseline electricity demand (kWh/yr).
 * Ofgem TDCV ~2,900 kWh + a per-m² adjustment to scale with house size.
 */
export function householdBaselineKWh(floorAreaM2: number | null): number {
  if (!floorAreaM2) return 2_900;
  return Math.round(2_900 + floorAreaM2 * 15);
}

/**
 * Additional electricity demand if a heat pump is fitted (SCOP ~2.8).
 * Env: HEAT_PUMP_DEMAND_KWH_PER_M2 (default 60).
 */
export function heatPumpExtraKWh(floorAreaM2: number | null): number {
  if (!floorAreaM2) return 0;
  return Math.round(floorAreaM2 * num("HEAT_PUMP_DEMAND_KWH_PER_M2", 60));
}

// ─── heat pump (BUS) eligibility ─────────────────────────────────────────────

export interface HeatPumpInput {
  country: AnalyseRequest["country"];
  tenure: AnalyseRequest["questionnaire"]["tenure"];
  interest: AnalyseRequest["questionnaire"]["interest"];
  currentHeatingFuel: AnalyseRequest["questionnaire"]["currentHeatingFuel"];
  needNewRadiators: AnalyseRequest["questionnaire"]["needNewRadiators"];
  priorHeatPumpFunding: AnalyseRequest["questionnaire"]["priorHeatPumpFunding"];
  epc: EpcByAddressResponse;
  floorAreaM2: number | null;
}

export function heatPumpEligibility(input: HeatPumpInput): Eligibility["heatPump"] {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  // Rule: England & Wales only.
  if (input.country === "Scotland" || input.country === "Northern Ireland") {
    blockers.push("Boiler Upgrade Scheme is England & Wales only.");
  }

  // Rule: tenure. Tenants and social housing residents can't apply — only
  // property owners (owner-occupiers + landlords) can.
  if (input.tenure === "tenant" || input.tenure === "social") {
    blockers.push("Tenants and social housing residents aren't eligible — the property owner needs to apply.");
  }

  // Rule: no double funding. BUS won't pay out if the property already
  // received a government grant for a heat pump or biomass boiler.
  // Separate funding for insulation, windows, or doors is fine.
  if (input.priorHeatPumpFunding === "yes") {
    blockers.push(
      "This property has already received government funding for a heat pump or biomass boiler. BUS can't pay again on the same property."
    );
  } else if (input.priorHeatPumpFunding === "unsure") {
    warnings.push(
      "Not sure whether this property has had a heat pump / biomass grant before? Check with Ofgem before applying — BUS only pays once per property."
    );
  }

  // Radiator readiness — not a BUS rule, but a cost signal worth flagging.
  if (input.needNewRadiators === "yes") {
    notes.push(
      "You've flagged that some radiators may need upsizing. Your installer will size these room-by-room on survey; budget £150–£400 per radiator swap on top of the headline install cost."
    );
  }

  // Rule: valid EPC required. EPCs themselves are valid for 10 years, so an
  // EPC older than that won't be accepted when the voucher is submitted.
  if (!input.epc.found) {
    warnings.push("No EPC on record — a valid one is required to apply for the BUS grant. Typical cost £60–£120.");
  } else {
    const age = lodgementAgeYears(input.epc.registrationDate);
    if (age != null && age > 10) {
      warnings.push(`Your EPC is ${Math.floor(age)} years old — EPCs are valid for 10 years, so you'll need a fresh one before applying.`);
    }
  }

  // Soft note on insulation. The March 2024 relaxation dropped the outstanding
  // loft / cavity wall recs as a BUS blocker; the new GOV.UK EPC API doesn't
  // expose domestic recommendations in any case. Keep it as installer guidance.
  if (input.epc.found) {
    notes.push(
      "Insulation improvements listed on your EPC — if any — should be addressed before a heat pump install for best performance. Your installer will advise."
    );
  }

  // Rule: fully replacing a fossil-fuel or electric heating system.
  // Replacement of existing low-carbon heat (heat pump, biomass) is excluded.
  // User's Step 3 answer is the source of truth; fall back to EPC main fuel.
  let estimatedGrantGBP = num("BUS_ASHP_GRANT_GBP", 7500);
  const userFuel = input.currentHeatingFuel;
  const epcFuel = input.epc.found ? classifyFuel(input.epc.certificate.mainFuel) : "other";
  const combinedFuel =
    userFuel === "gas" || userFuel === "electric" ? userFuel : epcFuel;
  if (combinedFuel === "heat_pump" || combinedFuel === "biomass") {
    blockers.push(
      "Property already has low-carbon heating (per the EPC). BUS funds replacement of fossil-fuel or electric systems only."
    );
  }
  if (epcFuel === "biomass") estimatedGrantGBP = num("BUS_BIOMASS_GRANT_GBP", 5000);

  // Rule: new-build and social housing excluded; self-builds allowed.
  // We already block social-housing tenure above. For new-builds, we soft-note
  // only — the EPC transaction type is a hint, not proof, and we can't
  // distinguish a self-build from a developer-built new home without asking.
  if (input.epc.found && input.epc.certificate.transactionType) {
    const tx = input.epc.certificate.transactionType.toLowerCase();
    const age = lodgementAgeYears(input.epc.registrationDate);
    if (tx.includes("new dwelling") && age != null && age < 2 && input.tenure === "owner") {
      notes.push("This EPC was lodged as a new dwelling — a standard new build would be excluded from BUS, but self-builds are eligible. Flag it with your installer.");
    }
  }

  // Heat-loss planning estimate — 50 W/m² is a crude rule of thumb. Real heat
  // loss needs a room-by-room survey. Capped at the 45 kWth BUS upper limit.
  let recommendedSystemKW: number | null = null;
  let heatLossPlanningW: number | null = null;
  if (input.floorAreaM2) {
    heatLossPlanningW = Math.round(input.floorAreaM2 * num("HEAT_PUMP_W_PER_M2", 50));
    recommendedSystemKW = Math.min(45, Math.max(4, Math.round(heatLossPlanningW / 1000)));
    notes.push(
      `Planning-estimate system size: ${recommendedSystemKW} kW (from floor area × 50 W/m²). An MCS heat-loss survey will refine this.`
    );
  }

  const verdict: "eligible" | "conditional" | "blocked" =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "conditional" : "eligible";

  return {
    verdict,
    blockers,
    warnings,
    estimatedGrantGBP,
    recommendedSystemKW,
    heatLossPlanningEstimateW: heatLossPlanningW,
    notes,
  };
}

// ─── solar suitability ───────────────────────────────────────────────────────

export interface SolarInput {
  solar: BuildingInsightsResponse;
  pvgisAnnualKwh: number | null;
  pvgisPeakKwp: number | null;
}

function orientationScore(azimuthDegrees: number): number {
  // Google: 0=N, 90=E, 180=S, 270=W. Best = S (135–225), next = E/W.
  const az = ((azimuthDegrees % 360) + 360) % 360;
  if (az >= 135 && az <= 225) return 1.0;
  if ((az >= 45 && az < 135) || (az > 225 && az <= 315)) return 0.8;
  return 0.5;
}

export function solarSuitability(input: SolarInput): Eligibility["solar"] {
  if (!input.solar.coverage) {
    return {
      rating: "Not recommended",
      reason: input.solar.reason,
      recommendedPanels: null,
      recommendedKWp: null,
      estimatedAnnualKWh: null,
      scoreBreakdown: null,
    };
  }

  const sp = input.solar.data.solarPotential;
  const maxPanels = sp.maxArrayPanelsCount ?? 0;
  if (maxPanels < 6) {
    return {
      rating: "Not recommended",
      reason: `Only space for ${maxPanels} panels — too small to be worthwhile.`,
      recommendedPanels: maxPanels || null,
      recommendedKWp: null,
      estimatedAnnualKWh: null,
      scoreBreakdown: null,
    };
  }

  // Best roof segment (largest area wins; orientation + shading from it).
  const segments = sp.roofSegmentStats ?? [];
  const best = [...segments].sort((a, b) => (b.stats?.areaMeters2 ?? 0) - (a.stats?.areaMeters2 ?? 0))[0];
  const az = best?.azimuthDegrees ?? 180;
  const orientation = orientationScore(az);

  // Shading: median / max sunshine quantile. sunshineQuantiles is a 10-entry
  // array ordered low→high across the roof area.
  let shading = 0.8;
  const q = best?.stats?.sunshineQuantiles;
  if (q && q.length === 10 && q[9] > 0) {
    shading = Math.max(0, Math.min(1, q[5] / q[9]));
  }

  const combined = 0.5 * orientation + 0.5 * shading;
  let rating: Eligibility["solar"]["rating"];
  if (combined >= 0.85) rating = "Excellent";
  else if (combined >= 0.7) rating = "Good";
  else if (combined >= 0.5) rating = "Marginal";
  else rating = "Not recommended";

  const recommendedKWp =
    input.pvgisPeakKwp ?? Math.round(((maxPanels * 400) / 1000) * 10) / 10;
  const estimatedAnnualKWh =
    input.pvgisAnnualKwh != null
      ? Math.round(input.pvgisAnnualKwh)
      : null;

  return {
    rating,
    reason: null,
    recommendedPanels: maxPanels,
    recommendedKWp,
    estimatedAnnualKWh,
    scoreBreakdown: { orientation, shading, combined },
  };
}

// ─── finance ─────────────────────────────────────────────────────────────────

function ashpCostBand(floorAreaM2: number | null): [number, number] | null {
  if (!floorAreaM2) return null;
  if (floorAreaM2 < 70) return [3_000, 5_000];
  if (floorAreaM2 <= 120) return [4_000, 7_000];
  return [6_000, 9_000];
}

export interface FinanceInput {
  floorAreaM2: number | null;
  heatPumpGrantGBP: number;
  solar: Eligibility["solar"];
}

export function financeModel(input: FinanceInput): Finance {
  const importP = num("ENERGY_IMPORT_PRICE_P_PER_KWH", 27);
  const exportP = num("ENERGY_EXPORT_PRICE_P_PER_KWH", 15);
  const selfRate = num("SELF_CONSUMPTION_RATE_NO_BATTERY", 0.6);
  const solarPerKWp = num("SOLAR_INSTALL_PRICE_PER_KWP_GBP", 1_100);

  // Heat pump: cost band is gross. Grant subtracts.
  const band = ashpCostBand(input.floorAreaM2);
  const netRange: [number, number] | null = band
    ? [Math.max(0, band[0] - input.heatPumpGrantGBP), Math.max(0, band[1] - input.heatPumpGrantGBP)]
    : null;

  // Solar: install cost = kWp × £/kWp. Savings = self-consumed @import + exported @export.
  let installCostGBP: number | null = null;
  let annualSavingsRange: [number, number] | null = null;
  let paybackRange: [number, number] | null = null;
  if (input.solar.recommendedKWp && input.solar.estimatedAnnualKWh) {
    installCostGBP = Math.round(input.solar.recommendedKWp * solarPerKWp);
    const kwh = input.solar.estimatedAnnualKWh;
    const self = kwh * selfRate;
    const exp = kwh * (1 - selfRate);
    // Range: ±15% to reflect tariff variation + derating uncertainty.
    const pointGBP = (self * importP + exp * exportP) / 100;
    annualSavingsRange = [Math.round(pointGBP * 0.85), Math.round(pointGBP * 1.15)];
    if (installCostGBP > 0) {
      paybackRange = [
        Math.max(1, Math.floor(installCostGBP / annualSavingsRange[1])),
        Math.max(1, Math.ceil(installCostGBP / annualSavingsRange[0])),
      ];
    }
  }

  return {
    heatPump: {
      grantGBP: input.heatPumpGrantGBP,
      estimatedNetInstallCostRangeGBP: netRange,
    },
    solar: {
      installCostGBP,
      annualSavingsRangeGBP: annualSavingsRange,
      paybackYearsRange: paybackRange,
      assumptions: {
        importPricePPerKWh: importP,
        exportPricePPerKWh: exportP,
        selfConsumptionRate: selfRate,
        installPricePerKWpGBP: solarPerKWp,
      },
    },
  };
}

// ─── top-level ───────────────────────────────────────────────────────────────

export interface BuildEligibilityInput {
  request: AnalyseRequest;
  solar: BuildingInsightsResponse;
  epc: EpcByAddressResponse;
  pvgisAnnualKwh: number | null;
  pvgisPeakKwp: number | null;
}

export function buildEligibility(input: BuildEligibilityInput): {
  eligibility: Eligibility;
  finance: Finance;
} {
  const floorAreaM2 = input.epc.found ? input.epc.certificate.totalFloorAreaM2 : null;

  const heatPump = heatPumpEligibility({
    country: input.request.country,
    tenure: input.request.questionnaire.tenure,
    interest: input.request.questionnaire.interest,
    currentHeatingFuel: input.request.questionnaire.currentHeatingFuel,
    needNewRadiators: input.request.questionnaire.needNewRadiators,
    priorHeatPumpFunding: input.request.questionnaire.priorHeatPumpFunding,
    epc: input.epc,
    floorAreaM2,
  });

  const solar = solarSuitability({
    solar: input.solar,
    pvgisAnnualKwh: input.pvgisAnnualKwh,
    pvgisPeakKwp: input.pvgisPeakKwp,
  });

  const eligibility: Eligibility = {
    heatPump,
    solar,
    householdElectricityBaselineKWh: householdBaselineKWh(floorAreaM2),
  };

  const finance = financeModel({
    floorAreaM2,
    heatPumpGrantGBP: heatPump.estimatedGrantGBP,
    solar,
  });

  return { eligibility, finance };
}
