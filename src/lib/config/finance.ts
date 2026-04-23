// Admin-controlled finance assumptions for the savings calculator.
//
// These are the dials we (Propertoasty) set centrally. They surface to the
// user as fixed values in the UI ("APR 5.9%, term editable") — the user can
// change loan terms but not the rates we negotiated. When market rates move,
// edit this file, ship a release.
//
// Time horizon (`years`) and battery size (`battery_kwh`) are USER-controlled
// on the report page and are NOT defined here.

export const FINANCE_DEFAULTS = {
  // Loan APRs — fixed, admin-controlled (tweak via PR, no env vars).
  solarLoanAprPct: 5.9,
  batteryLoanAprPct: 4.5,

  // Loan terms — defaults; the user can change these on the report.
  defaultSolarLoanTermYears: 10,
  defaultBatteryLoanTermYears: 10,
  loanTermOptionsYears: [5, 10, 15] as const,

  // Battery — default size in kWh, user-overridable via slider.
  defaultBatteryKwh: 5,
  batteryKwhMin: 2,
  batteryKwhMax: 20,
  batteryKwhStep: 1,

  // Off-peak electricity tariff — default until we ask the user about TOU
  // tariffs (Octopus Go / Cosy / Agile etc.). £/kWh, NOT pence.
  defaultOffPeakElecPrice: 0.10,

  // SEG export rate — default benchmark, editable on the report. £/kWh.
  defaultExportPrice: 0.15,

  // Time-horizon options for the savings curve.
  defaultYears: 10,
  yearsMin: 1,
  yearsMax: 25,
  // Snapshots we plot on the cumulative-savings chart.
  curveYears: [1, 5, 10, 15, 20, 25] as const,
} as const;
