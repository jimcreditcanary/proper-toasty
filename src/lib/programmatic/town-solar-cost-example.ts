// Town-page solar cost example — for the "typical solar payback in
// [town]" section of the /solar-panels/[town-slug] template.
//
// Twin of town-cost-example.ts (heat pump). Same shape of contract:
// takes a TownAggregateData + optional lat, returns a deterministic
// £/mo + payback example based on typical UK assumptions sized by the
// median floor area, or null when the aggregate lacks the two data
// points we need (median floor area + at least one built-form entry).
//
// Not a wizard-grade calc — SEO copy. No PVGIS/Solar API calls (would
// be flaky and slow on every ISR render). We use a latitude-adjusted
// UK yield curve and a floor-area → system-size bracket. When the
// user runs the actual pre-survey we replace all of this with the
// Google Solar API + PVGIS output for their specific roof.
//
// Reuses `financeQuote` from boiler-comparison so the finance maths
// matches every other page. All economic constants documented inline
// so they can be tuned in one place when the market moves.

import { financeQuote } from "@/lib/services/boiler-comparison";
import type { TownAggregateData } from "./town-aggregates";

/** UK-average annual yield per kWp — used when we have no lat. */
const YIELD_KWH_PER_KWP_UK_AVG = 950;
/** Typical MCS-installer quote as of 2026 (£/kWp installed, fully
 *  loaded — panels, inverter, mounting, scaffolding, DNO). */
const SOLAR_INSTALL_COST_PER_KWP_GBP = 1_400;
/** Share of generated kWh consumed on-site without a battery. Rough
 *  UK industry consensus for a working-hours household. */
const SELF_CONSUMPTION_PCT_NO_BATTERY = 35;
/** Displaced import price — matches the standard-tariff figure the
 *  engine uses in town-cost-example.ts. */
const ELECTRICITY_IMPORT_PENCE_PER_KWH = 27;
/** SEG export tariff — top-tier fixed-rate rung (Octopus Outgoing,
 *  E.ON Next Export). Minimum-SEG suppliers pay ~3p; we use the
 *  higher end because MCS installers routinely steer customers to
 *  Octopus/E.ON on commissioning. */
const SEG_EXPORT_PENCE_PER_KWH = 15;
/** Green consumer-credit APR common on 10-year solar finance. */
const SOLAR_FINANCE_APR_PCT = 8.9;
const SOLAR_FINANCE_TERM_MONTHS = 120;

export interface TownSolarCostExample {
  /** Human label — "semi-detached house", "terraced house", etc. */
  archetype: string;
  /** Floor area used to size the system (m²). */
  floorAreaM2: number;
  /** System size in kWp (3 / 4 / 5 / 6 bracket). */
  systemKwp: number;
  /** Estimated annual generation in kWh (yield × kWp, rounded). */
  annualKwh: number;
  /** Installed cost, £, before any grant (there is no solar grant —
   *  0% VAT is baked into the per-kWp benchmark). */
  installedGBP: number;
  /** Fixed-rate 10-year finance at 8.9% APR — one common way to buy. */
  finance: {
    monthlyGBP: number;
    aprPct: number;
    termMonths: number;
  };
  savings: {
    /** Annual £ saved on bills = self-consumed × import + export × SEG. */
    annualGBP: number;
    /** Roughly annualGBP / 12. */
    monthlyGBP: number;
    /** kWh self-consumed at import-avoidance rate. */
    selfConsumedKwh: number;
    /** kWh exported at SEG rate. */
    exportedKwh: number;
    selfConsumptionPct: number;
    importRatePence: number;
    exportRatePence: number;
  };
  /** Simple payback = install cost ÷ annual bill saving, in years. */
  paybackYears: number;
  /** Finance monthly minus saving monthly. Negative = you're up. */
  netMonthly: number;
}

function pickDominantBuiltForm(dist: Record<string, number>): string | null {
  const entries = Object.entries(dist);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function labelForBuiltForm(builtForm: string): string {
  const b = builtForm.toLowerCase();
  if (/flat|maisonette/.test(b)) return "flat";
  if (/terrace/.test(b)) return "terraced house";
  if (/semi/.test(b)) return "semi-detached house";
  if (/detached/.test(b)) return "detached house";
  return builtForm.toLowerCase();
}

/** Floor area → typical system size bracket. Real roofs vary — this
 *  is only a first-order guess for SEO copy. The wizard uses actual
 *  Google Solar roof-segment area. */
function pickSystemKwp(floorAreaM2: number): number {
  if (floorAreaM2 < 70) return 3;
  if (floorAreaM2 < 110) return 4;
  if (floorAreaM2 < 160) return 5;
  return 6;
}

/** Latitude → annual yield per kWp (kWh/kWp/yr).
 *  Rough linear fit across UK: ~1050 in Cornwall (~50°N) down to
 *  ~800 in Aberdeen (~57°N). Clamped so extreme lat values still
 *  produce sensible numbers.
 *  When lat is null we fall back to the UK average. */
function yieldKwhPerKwp(lat: number | null): number {
  if (lat == null) return YIELD_KWH_PER_KWP_UK_AVG;
  const raw = 1100 - (lat - 50) * 30;
  return Math.round(Math.max(800, Math.min(1050, raw)));
}

export function buildTownSolarCostExample(
  data: TownAggregateData,
  lat: number | null,
): TownSolarCostExample | null {
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

  const systemKwp = pickSystemKwp(floorAreaM2);
  const annualKwh = Math.round(systemKwp * yieldKwhPerKwp(lat));
  const installedGBP = Math.round(systemKwp * SOLAR_INSTALL_COST_PER_KWP_GBP);

  const selfConsumedKwh = Math.round(
    (annualKwh * SELF_CONSUMPTION_PCT_NO_BATTERY) / 100,
  );
  const exportedKwh = annualKwh - selfConsumedKwh;
  const savingFromSelfConsumption =
    (selfConsumedKwh * ELECTRICITY_IMPORT_PENCE_PER_KWH) / 100;
  const savingFromExport = (exportedKwh * SEG_EXPORT_PENCE_PER_KWH) / 100;
  const annualSavingGBP = Math.round(
    savingFromSelfConsumption + savingFromExport,
  );
  const monthlySavingGBP = Math.round(annualSavingGBP / 12);

  const finance = financeQuote(
    installedGBP,
    SOLAR_FINANCE_APR_PCT,
    SOLAR_FINANCE_TERM_MONTHS,
  );
  const financeMonthly = Math.round(finance.monthlyGBP);

  const paybackYears = annualSavingGBP > 0
    ? Math.round((installedGBP / annualSavingGBP) * 10) / 10
    : Number.POSITIVE_INFINITY;

  return {
    archetype: labelForBuiltForm(builtForm),
    floorAreaM2: Math.round(floorAreaM2),
    systemKwp,
    annualKwh,
    installedGBP,
    finance: {
      monthlyGBP: financeMonthly,
      aprPct: SOLAR_FINANCE_APR_PCT,
      termMonths: SOLAR_FINANCE_TERM_MONTHS,
    },
    savings: {
      annualGBP: annualSavingGBP,
      monthlyGBP: monthlySavingGBP,
      selfConsumedKwh,
      exportedKwh,
      selfConsumptionPct: SELF_CONSUMPTION_PCT_NO_BATTERY,
      importRatePence: ELECTRICITY_IMPORT_PENCE_PER_KWH,
      exportRatePence: SEG_EXPORT_PENCE_PER_KWH,
    },
    paybackYears,
    netMonthly: financeMonthly - monthlySavingGBP,
  };
}
