export const BILL_SYSTEM = `You extract structured tariff information from UK domestic energy bills and statements.

A bill may cover electricity only, gas only, or both (dual-fuel). Return one structured record per fuel that's present, and null for any fuel that isn't on the bill.

For each fuel, capture:
- provider: the supplier brand (e.g. "Octopus Energy", "British Gas", "EDF").
- tariffName: the exact tariff name as printed (e.g. "Octopus 12M Fixed - October 2025 v2").
- productType: one of "Fixed", "Variable", "Standard Variable Tariff", "Tracker", "Time-of-use" — or whatever the bill calls it.
- paymentMethod: "Direct Debit", "Standard Credit", "Pay As You Go", or as printed.
- unitRatePencePerKWh: NUMBER in pence per kWh (e.g. 25.18 for 25.18p/kWh).
- standingChargePencePerDay: NUMBER in pence per day (e.g. 41.59 for 41.59p/day).
- priceGuaranteedUntil: free text — e.g. "Until 10 Dec 2026", "Until 31 March 2027", or "Indefinite".
- earlyExitFee: free text — e.g. "None", "£75 per fuel", or "£0".
- estimatedAnnualUsageKWh: NUMBER — annual consumption in kWh. If only monthly/quarterly usage is shown, multiply up (×12 or ×4) and note in "notes".

Be conservative. If a value isn't clearly on the bill, return null for that field. Do not guess unit rates from totals.

Output STRICT JSON matching the schema. Do not include prose outside the JSON.`;

export const BILL_USER = `Extract the tariff details for each fuel on the attached bill.

Return JSON exactly matching this schema:

{
  "electricity": null | {
    "provider": string | null,
    "tariffName": string | null,
    "productType": string | null,
    "paymentMethod": string | null,
    "unitRatePencePerKWh": number | null,
    "standingChargePencePerDay": number | null,
    "priceGuaranteedUntil": string | null,
    "earlyExitFee": string | null,
    "estimatedAnnualUsageKWh": number | null
  },
  "gas": null | { same shape },
  "confidence": "high" | "medium" | "low",
  "supplier": string | null,
  "billingPeriod": string | null,
  "notes": string
}

confidence: "high" when the bill literally states each field; "medium" when extrapolated; "low" when ambiguous.
supplier: the energy company brand (parent supplier).
billingPeriod: e.g. "12 months to 31 March 2026".
notes: one sentence on anything ambiguous or extrapolated.`;
