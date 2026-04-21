/**
 * Propertoasty eligibility engine.
 *
 * All rules are PURE FUNCTIONS so they can be unit-tested exhaustively and
 * diffed cleanly against updated Ofgem guidance. Inputs come from the
 * orchestrator; no IO here.
 *
 * Rule citations refer to the Ofgem "Boiler Upgrade Scheme: installer and
 * applicant guidance" document (verify against the current published version
 * before launch — the version at time of writing was v5, April 2026). Dates
 * in comments are when the rule was last confirmed accurate.
 */

import type { BuildingInsightsResponse } from "@/lib/schemas/solar";
import type { EpcByAddressResponse } from "@/lib/schemas/epc";
import type { AnalyseRequest } from "@/lib/schemas/analyse";
import type { Eligibility, Finance } from "@/lib/schemas/eligibility";

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseFloorAreaM2(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lodgementAgeYears(iso: string | undefined): number | null {
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
  raw: string | undefined
): "fossil" | "electric" | "heat_pump" | "biomass" | "other" {
  if (!raw) return "other";
  const s = raw.toLowerCase();
  if (s.includes("heat pump")) return "heat_pump";
  if (s.includes("biomass") || s.includes("wood") || s.includes("pellet")) return "biomass";
  if (s.includes("mains gas") || s.includes("natural gas") || s.includes("lpg") || s.includes("oil") || s.includes("coal") || s.includes("solid fuel")) return "fossil";
  if (s.includes("electric")) return "electric";
  return "other";
}

function hasOutstandingInsulationRec(epc: EpcByAddressResponse): {
  flagged: boolean;
  labels: string[];
} {
  if (!epc.found) return { flagged: false, labels: [] };
  const labels: string[] = [];
  for (const r of epc.recommendations) {
    const s = (r["improvement-summary-text"] || r["improvement-descr-text"] || "").toLowerCase();
    if (s.includes("loft") && s.includes("insulation")) labels.push("loft insulation");
    else if (s.includes("cavity") && s.includes("wall")) labels.push("cavity wall insulation");
  }
  return { flagged: labels.length > 0, labels: Array.from(new Set(labels)) };
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
  hybridPreference: AnalyseRequest["questionnaire"]["hybridPreference"];
  epc: EpcByAddressResponse;
  floorAreaM2: number | null;
}

export function heatPumpEligibility(input: HeatPumpInput): Eligibility["heatPump"] {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  // Rule: region. BUS is England & Wales only. (BUS guidance §1.4.)
  if (input.country === "Scotland" || input.country === "Northern Ireland") {
    blockers.push("Boiler Upgrade Scheme is England & Wales only.");
  }

  // Rule: tenure. Tenants & social renters can't apply. (§4.2 — "eligible property owner".)
  if (input.tenure === "tenant" || input.tenure === "social") {
    blockers.push("Tenants and social housing residents aren't eligible — the property owner needs to apply.");
  }

  // Rule: hybrid intent. BUS funds full replacements only. (§3.3.)
  if (input.hybridPreference === "hybrid") {
    blockers.push("Keeping the existing fossil-fuel boiler (hybrid) isn't eligible for the Boiler Upgrade Scheme.");
  }

  // Rule: valid EPC in last 10 years. (§4.3.)
  if (!input.epc.found) {
    warnings.push("No EPC on record — one (lodged within the last 10 years) is required to apply for the BUS grant. Typical cost £60–£120.");
  } else {
    const age = lodgementAgeYears(input.epc.lodgementDate);
    if (age != null && age > 10) {
      warnings.push(`Your EPC is ${Math.floor(age)} years old — BUS requires one lodged in the last 10 years. You'll need a new one before applying.`);
    }
  }

  // Rule: outstanding insulation recs.
  // Was a hard block before March 2024; now typically a "confirm with installer"
  // warning. We keep it as a warning. (§4.4 — confirm against current version.)
  if (input.epc.found) {
    const ins = hasOutstandingInsulationRec(input.epc);
    if (ins.flagged) {
      warnings.push(
        `Your EPC has outstanding recommendation${ins.labels.length > 1 ? "s" : ""}: ${ins.labels.join(", ")}. Your installer will advise whether this needs addressing first.`
      );
    }
  }

  // Rule: fuel. BUS funds replacement of fossil-fuel or electric. (§3.2.)
  let estimatedGrantGBP = num("BUS_ASHP_GRANT_GBP", 7500);
  if (input.epc.found) {
    const fuel = classifyFuel(input.epc.certificate["main-fuel"]);
    if (fuel === "heat_pump" || fuel === "biomass") {
      blockers.push(
        "Property already has low-carbon heating (per the EPC). BUS funds replacement of fossil-fuel or electric systems only."
      );
    }
    if (fuel === "biomass") estimatedGrantGBP = num("BUS_BIOMASS_GRANT_GBP", 5000);
  }

  // Rule: new build. (§4.6.) Standard new builds excluded; self-builds eligible.
  if (input.epc.found) {
    const tx = input.epc.certificate["transaction-type"]?.toLowerCase() ?? "";
    const age = lodgementAgeYears(input.epc.lodgementDate);
    if (tx.includes("new dwelling") && age != null && age < 2 && input.tenure === "owner") {
      notes.push("If this is a standard new build (less than 2 years old) it may be excluded, but self-builds are eligible — check with your installer.");
    }
  }

  // Heat-loss planning estimate — 50 W/m² is a crude rule of thumb. Real heat
  // loss needs a room-by-room survey. Cap at 45 kW (BUS upper limit).
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
  const floorAreaM2 = input.epc.found
    ? parseFloorAreaM2(input.epc.certificate["total-floor-area"])
    : null;

  const heatPump = heatPumpEligibility({
    country: input.request.country,
    tenure: input.request.questionnaire.tenure,
    hybridPreference: input.request.questionnaire.hybridPreference,
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
