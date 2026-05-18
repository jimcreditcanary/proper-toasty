// Sizing + savings inputs that drive the homeowner-facing report
// (heat-pump grant amount, heat-loss planning estimate, solar
// install cost, solar payback). Sister module to cost-rates.ts —
// same admin_settings pattern, different consumer.
//
// Why a config rather than constants in code: finance / domain
// reality drifts (tariff caps move, BUS grant amounts re-baseline,
// installer £/kWp benchmarks change). Editing them in the admin UI
// avoids a deploy when the new number lands at 5pm on a Friday.
//
// Fallback chain when a value is read:
//
//   1. admin_settings row (`sizing_input.<field>`) wins
//   2. else env var (e.g. ENERGY_IMPORT_PRICE_P_PER_KWH) — this is
//      the legacy mechanism, kept so a deploy-time override still
//      works as an emergency lever
//   3. else literal default below
//
// Steps 2+3 are baked into DEFAULT_SIZING_INPUTS at module load —
// env vars are read once. Admin_settings is the runtime override.

/** Mixed-unit values — see UNITS below for the per-field unit. */
export interface SizingInputs {
  // ─── Energy tariffs (pence per kWh) ────────────────────────────
  // Used by financeModel to value self-consumed vs exported solar.
  // Import: what the homeowner pays per kWh from the grid (Ofgem
  // price cap is the sensible benchmark). Export: SEG tariff —
  // varies wildly by supplier; 15p is a middle-of-the-road figure.
  energy_import_price_p_per_kwh: number;
  energy_export_price_p_per_kwh: number;

  // ─── Self-consumption (0–1) ────────────────────────────────────
  // Share of solar generation the household uses directly rather
  // than exporting. 0.60 = 60% self-consumed. Higher = better
  // economics. With-battery scenarios will land here when the
  // engine grows the battery branch — not yet wired.
  self_consumption_rate_no_battery: number;

  // ─── Solar install £ per kWp ───────────────────────────────────
  // UK domestic install benchmark, fully installed incl. scaffold.
  // Used by financeModel to estimate install cost = recommendedKWp
  // × this. £1,100 is a 2026 mid-market figure for a 4kWp install
  // (~£4,400 total). Update when MCS pricing data drifts.
  solar_install_price_per_kwp_gbp: number;

  // ─── Heat pump sizing rules of thumb ───────────────────────────
  // demand_kwh_per_m2: annual electricity draw added by a heat pump,
  //   per m² of floor area (assumes SCOP ~2.8). Feeds the
  //   household-vs-with-HP electricity comparison.
  // w_per_m2: peak heat-loss density for the planning system-size
  //   estimate (50 W/m² is the standard pre-survey rule of thumb;
  //   an MCS heat-loss survey refines).
  heat_pump_demand_kwh_per_m2: number;
  heat_pump_w_per_m2: number;

  // ─── BUS grant amounts (£) ─────────────────────────────────────
  // Ofgem-published BUS grant amounts. Bumped in 2024 to £7.5K
  // for ASHP/GSHP and £5K for biomass; subject to periodic review.
  // Only ASHP + biomass are wired today (heatPumpEligibility);
  // A2A and GSHP land when the engine learns to differentiate.
  bus_ashp_grant_gbp: number;
  bus_biomass_grant_gbp: number;
}

function envNum(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// Hard-coded baseline + env-var override for emergency tuning
// without a code change. Admin_settings overrides this at runtime.
export const DEFAULT_SIZING_INPUTS: SizingInputs = {
  energy_import_price_p_per_kwh: envNum("ENERGY_IMPORT_PRICE_P_PER_KWH", 27),
  energy_export_price_p_per_kwh: envNum("ENERGY_EXPORT_PRICE_P_PER_KWH", 15),
  self_consumption_rate_no_battery: envNum(
    "SELF_CONSUMPTION_RATE_NO_BATTERY",
    0.6,
  ),
  solar_install_price_per_kwp_gbp: envNum("SOLAR_INSTALL_PRICE_PER_KWP_GBP", 1_100),
  heat_pump_demand_kwh_per_m2: envNum("HEAT_PUMP_DEMAND_KWH_PER_M2", 60),
  heat_pump_w_per_m2: envNum("HEAT_PUMP_W_PER_M2", 50),
  bus_ashp_grant_gbp: envNum("BUS_ASHP_GRANT_GBP", 7_500),
  bus_biomass_grant_gbp: envNum("BUS_BIOMASS_GRANT_GBP", 5_000),
};

export const SIZING_INPUT_KEY_PREFIX = "sizing_input.";

/** Per-field validation rules. Both loadSizingInputs (read-path
 *  hygiene) and the POST route (write-path) call into this so the
 *  shape of "valid" is one place. Returns true when value is
 *  acceptable for the named field. */
export function isValidSizingValue(
  field: keyof SizingInputs,
  value: number,
): boolean {
  if (!Number.isFinite(value)) return false;
  switch (field) {
    case "self_consumption_rate_no_battery":
      // 0–1 inclusive. 0 = export everything; 1 = consume everything.
      return value >= 0 && value <= 1;
    case "energy_import_price_p_per_kwh":
    case "energy_export_price_p_per_kwh":
    case "bus_ashp_grant_gbp":
    case "bus_biomass_grant_gbp":
      // Non-negative currency. Zero grant is plausible if a scheme
      // is paused — let it through rather than block.
      return value >= 0;
    case "solar_install_price_per_kwp_gbp":
    case "heat_pump_demand_kwh_per_m2":
    case "heat_pump_w_per_m2":
      // Strictly positive — zero would zero out the report's
      // headline numbers and is almost certainly a typo.
      return value > 0;
  }
}

/**
 * Read overrides from public.admin_settings, falling back to
 * DEFAULT_SIZING_INPUTS per-key when no row exists. Mirrors
 * loadCostRates — DB failure is non-fatal; we log + use defaults
 * so the report flow keeps working when admin_settings is
 * unreachable.
 */
export async function loadSizingInputs(
  admin: import("@supabase/supabase-js").SupabaseClient<
    import("@/types/database").Database
  >,
): Promise<SizingInputs> {
  const { data, error } = await admin
    .from("admin_settings")
    .select("key, value")
    .like("key", `${SIZING_INPUT_KEY_PREFIX}%`);
  if (error) {
    console.warn("[sizing-inputs] load failed, using defaults", error);
    return { ...DEFAULT_SIZING_INPUTS };
  }

  const overrides: Partial<SizingInputs> = {};
  for (const row of data ?? []) {
    if (!row.key || !row.key.startsWith(SIZING_INPUT_KEY_PREFIX)) continue;
    const field = row.key.slice(
      SIZING_INPUT_KEY_PREFIX.length,
    ) as keyof SizingInputs;
    if (!(field in DEFAULT_SIZING_INPUTS)) continue;
    const v = typeof row.value === "number" ? row.value : Number(row.value);
    if (isValidSizingValue(field, v)) {
      overrides[field] = v;
    }
  }

  return { ...DEFAULT_SIZING_INPUTS, ...overrides };
}

/** Form labels (column 1 in the UI). */
export const SIZING_INPUT_LABELS: Record<keyof SizingInputs, string> = {
  energy_import_price_p_per_kwh: "Electricity import price",
  energy_export_price_p_per_kwh: "Electricity export (SEG) price",
  self_consumption_rate_no_battery: "Solar self-consumption (no battery)",
  solar_install_price_per_kwp_gbp: "Solar install price",
  heat_pump_demand_kwh_per_m2: "Heat pump electricity demand",
  heat_pump_w_per_m2: "Heat pump peak heat-loss density",
  bus_ashp_grant_gbp: "BUS grant — air-source heat pump",
  bus_biomass_grant_gbp: "BUS grant — biomass",
};

/** Hints describing what each value drives. */
export const SIZING_INPUT_HINTS: Record<keyof SizingInputs, string> = {
  energy_import_price_p_per_kwh:
    "Pence per kWh paid for grid electricity. Used to value self-consumed solar in the savings estimate.",
  energy_export_price_p_per_kwh:
    "Pence per kWh received for exported solar (SEG tariff). Varies by supplier; 15p is a mid-market figure.",
  self_consumption_rate_no_battery:
    "Share of solar generation used directly (0–1). 0.60 = 60% consumed, 40% exported.",
  solar_install_price_per_kwp_gbp:
    "Pounds per kWp for a fully installed system (panels + inverter + scaffold). Drives the install-cost estimate on the report.",
  heat_pump_demand_kwh_per_m2:
    "kWh per m² of floor area added to annual electricity demand when a heat pump is fitted (assumes SCOP ~2.8).",
  heat_pump_w_per_m2:
    "Watts per m² used for the planning-stage heat-loss estimate. 50 W/m² is the standard pre-survey rule of thumb.",
  bus_ashp_grant_gbp:
    "Pounds. Ofgem BUS grant for an air-source heat pump replacement.",
  bus_biomass_grant_gbp:
    "Pounds. Ofgem BUS grant for a biomass boiler replacement (rural + off-gas only).",
};

/** Unit suffix shown next to each input. */
export const SIZING_INPUT_UNITS: Record<keyof SizingInputs, string> = {
  energy_import_price_p_per_kwh: "p/kWh",
  energy_export_price_p_per_kwh: "p/kWh",
  self_consumption_rate_no_battery: "rate (0–1)",
  solar_install_price_per_kwp_gbp: "£/kWp",
  heat_pump_demand_kwh_per_m2: "kWh/m²/yr",
  heat_pump_w_per_m2: "W/m²",
  bus_ashp_grant_gbp: "£",
  bus_biomass_grant_gbp: "£",
};

/** Render order in the form. Currency together, sizing together. */
export const SIZING_INPUT_ORDER: (keyof SizingInputs)[] = [
  "energy_import_price_p_per_kwh",
  "energy_export_price_p_per_kwh",
  "self_consumption_rate_no_battery",
  "solar_install_price_per_kwp_gbp",
  "heat_pump_demand_kwh_per_m2",
  "heat_pump_w_per_m2",
  "bus_ashp_grant_gbp",
  "bus_biomass_grant_gbp",
];
