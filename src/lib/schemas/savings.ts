import { z } from "zod";

// Request shape for the Octopus calculator API
// (POST /api/energy/calculate/, X-Tenant-Schema: octopus, Bearer auth).
//
// Field semantics — these come from the curl reference James shared.
// All prices are in £/kWh (NOT pence), all energies in kWh/yr.
//
// The proxy route validates this strictly so a typo here fails fast in
// dev rather than silently sending a malformed body.
export const SavingsCalculatorRequestSchema = z.object({
  num_panels: z.number().int().nonnegative(),
  panel_size_watts: z.number().nonnegative(),
  years: z.number().int().min(1).max(50),

  has_solar: z.boolean(),
  has_battery: z.boolean(),
  has_heat_pump: z.boolean(),

  battery_kwh: z.number().nonnegative(),

  elec_price_now: z.number().nonnegative(),
  gas_price_now: z.number().nonnegative(),

  annual_gas_kwh: z.number().nonnegative(),
  annual_elec_kwh: z.number().nonnegative(),

  solar_loan_apr_pct: z.number().nonnegative(),
  solar_loan_term_years: z.number().int().min(1),
  battery_loan_apr_pct: z.number().nonnegative(),
  battery_loan_term_years: z.number().int().min(1),

  off_peak_elec_price: z.number().nonnegative(),
  export_price: z.number().nonnegative(),

  gas_standing_charge_daily: z.number().nonnegative(),
  elec_standing_charge_daily: z.number().nonnegative(),
});

export type SavingsCalculatorRequest = z.infer<typeof SavingsCalculatorRequestSchema>;

// Octopus returns a flat array of monthly rows (12 × `years`). Every numeric
// field comes back as a STRING, so we use z.coerce.number() to convert on
// parse. We `.passthrough()` on each row so any new field Octopus adds is
// preserved without breaking the schema.
//
// Each row carries:
//   - The BAU (business-as-usual) baseline cost for that month
//   - The "selected" scenario cost (what the user ticked) — Total_Monthly_Bill,
//     Monthly_Savings, Cumulative_Monthly_Savings
//   - All four hypothetical scenarios so the UI can show "what if you'd only
//     done solar" side-by-side without re-calling the API
//   - Energy-flow data (SolarGeneration, ExportToGrid, BatteryShift)
export const MonthlyRowSchema = z
  .object({
    Month: z.string(),       // YYYY-MM-DD (always 1st of month)
    MonthName: z.string(),   // "January"
    Year: z.coerce.number(),

    // Tariff prices that month (escalates yearly)
    GasPrice: z.coerce.number(),
    ElectricityPrice: z.coerce.number(),

    // Baseline ("do nothing") demand + cost
    CurrentGasKwh: z.coerce.number(),
    CurrentElectricityKwh: z.coerce.number(),
    BAU_GasCost: z.coerce.number(),
    BAU_ElecCost: z.coerce.number(),
    BAU_Total: z.coerce.number(),

    // Energy flows
    SolarGeneration_kWh: z.coerce.number(),
    SolarOffset_kWh: z.coerce.number(),
    ExportToGrid_kWh: z.coerce.number(),
    BatteryShift_kWh: z.coerce.number(),

    // Selected scenario costs (the line items the user is paying)
    Selected_GasCost: z.coerce.number(),
    Selected_ElecCost: z.coerce.number(),
    Selected_GasStandingCharge: z.coerce.number(),
    Selected_ElecStandingCharge: z.coerce.number(),
    Selected_SolarFinancePayment: z.coerce.number(),
    Selected_BatteryFinancePayment: z.coerce.number(),
    Selected_HeatPumpFinancePayment: z.coerce.number(),
    Selected_TotalFinanceCost: z.coerce.number(),
    Selected_ExportRevenue: z.coerce.number(),

    // Hypothetical "what if" totals — useful for chart overlays
    SolarOnlyCost: z.coerce.number(),
    SolarBatteryCost: z.coerce.number(),
    SolarHPCost: z.coerce.number(),
    SolarBatteryHPCost: z.coerce.number(),
    SolarOnlySavings: z.coerce.number(),
    SolarBatterySavings: z.coerce.number(),
    SolarHPSavings: z.coerce.number(),
    SolarBatteryHPSavings: z.coerce.number(),
    CumulativeSolarOnlySavings: z.coerce.number(),
    CumulativeSolarBatterySavings: z.coerce.number(),
    CumulativeSolarHPSavings: z.coerce.number(),
    CumulativeSolarBatteryHPSavings: z.coerce.number(),

    // Selected (user-toggled) totals — these drive the headline stats
    Total_Monthly_Bill: z.coerce.number(),
    Monthly_Savings: z.coerce.number(),
    Cumulative_Monthly_Savings: z.coerce.number(),
  })
  .passthrough();

export type MonthlyRow = z.infer<typeof MonthlyRowSchema>;

// Top-level response is just a JSON array.
export const SavingsCalculatorResponseSchema = z.array(MonthlyRowSchema);

export type SavingsCalculatorResponse = z.infer<typeof SavingsCalculatorResponseSchema>;

// What the UI actually receives back from our /api/savings/calculate proxy:
// the parsed response, plus the request we sent (for transparency in the
// "Assumptions" panel) and any degradation info if the Octopus API fails.
export const SavingsCalculateResultSchema = z.object({
  ok: z.boolean(),
  request: SavingsCalculatorRequestSchema,
  response: SavingsCalculatorResponseSchema.nullable(),
  error: z.string().nullable(),
});

export type SavingsCalculateResult = z.infer<typeof SavingsCalculateResultSchema>;
