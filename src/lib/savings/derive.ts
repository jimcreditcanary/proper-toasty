// Pure derivations from the Octopus monthly-rows response.
//
// The API returns 12 × `years` rows. The UI never wants raw rows; it wants
// headline numbers, year-by-year aggregates for the bar chart, and the
// cumulative-savings curve for the line chart.
//
// All functions are deterministic and side-effect free so they trivially
// memoise in React.

import type { MonthlyRow } from "@/lib/schemas/savings";

export interface HeadlineStats {
  // First-year savings — sum of Monthly_Savings for the first 12 rows.
  // We use year 1 (not the average) so the headline reflects what the user
  // would notice in their actual bills next year.
  year1Savings: number;
  // First-year average per month.
  avgMonthlySavings: number;
  // Total savings over the whole horizon — last row's Cumulative_Monthly_Savings.
  totalSavings: number;
  // First month where Cumulative_Monthly_Savings >= 0. null if never crosses.
  paybackYears: number | null;
  // Final-month BAU baseline annual cost (for the bill-comparison chart).
  baselineAnnualBill: number;
  // Final-year selected-scenario annual cost.
  selectedAnnualBill: number;
}

export function deriveHeadline(rows: MonthlyRow[]): HeadlineStats | null {
  if (!rows.length) return null;

  const year1 = rows.slice(0, 12);
  const year1Savings = year1.reduce((acc, r) => acc + r.Monthly_Savings, 0);
  const avgMonthlySavings = year1Savings / Math.max(year1.length, 1);
  const lastRow = rows[rows.length - 1];
  if (!lastRow) return null;
  const totalSavings = lastRow.Cumulative_Monthly_Savings;

  // Payback: scan for first crossing into positive cumulative savings.
  // Express in years from start (rowIndex / 12).
  let paybackYears: number | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (r.Cumulative_Monthly_Savings >= 0) {
      paybackYears = (i + 1) / 12;
      break;
    }
  }

  // Last 12 months — aggregate baseline + selected for the bar chart.
  const lastYearRows = rows.slice(-12);
  const baselineAnnualBill = lastYearRows.reduce((acc, r) => acc + r.BAU_Total, 0);
  const selectedAnnualBill = lastYearRows.reduce((acc, r) => acc + r.Total_Monthly_Bill, 0);

  return {
    year1Savings,
    avgMonthlySavings,
    totalSavings,
    paybackYears,
    baselineAnnualBill,
    selectedAnnualBill,
  };
}

export interface AnnualBillRow {
  year: number;
  baseline: number;
  selected: number;
  savings: number;
}

// Group rows by Year and sum the BAU + selected totals.
export function deriveAnnualBills(rows: MonthlyRow[]): AnnualBillRow[] {
  const byYear = new Map<number, AnnualBillRow>();
  for (const r of rows) {
    const y = r.Year;
    const cur =
      byYear.get(y) ?? { year: y, baseline: 0, selected: 0, savings: 0 };
    cur.baseline += r.BAU_Total;
    cur.selected += r.Total_Monthly_Bill;
    cur.savings += r.Monthly_Savings;
    byYear.set(y, cur);
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

export interface CurvePoint {
  // Months since start, 1-indexed (so month 12 = end of year 1).
  monthIdx: number;
  yearLabel: string; // e.g. "2026" — used for axis ticks
  cumulative: number;
  // Optional overlays — useful if the user wants to see "what if" lines.
  cumulativeSolarOnly: number;
  cumulativeSolarBattery: number;
  cumulativeSolarHP: number;
  cumulativeSolarBatteryHP: number;
}

export function deriveCurve(rows: MonthlyRow[]): CurvePoint[] {
  return rows.map((r, i) => ({
    monthIdx: i + 1,
    yearLabel: String(r.Year),
    cumulative: r.Cumulative_Monthly_Savings,
    cumulativeSolarOnly: r.CumulativeSolarOnlySavings,
    cumulativeSolarBattery: r.CumulativeSolarBatterySavings,
    cumulativeSolarHP: r.CumulativeSolarHPSavings,
    cumulativeSolarBatteryHP: r.CumulativeSolarBatteryHPSavings,
  }));
}
