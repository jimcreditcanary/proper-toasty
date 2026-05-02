// Shared types + zod schemas for the quote builder + API routes.
// Single source of truth for the line_items shape so the builder UI,
// the create/update endpoint, and the homeowner view all agree.
//
// Money is pence integers throughout — never floats (matches the
// credits + Stripe convention used elsewhere in the codebase).

import { z } from "zod";

// VAT rate — basis points. 0 = 0% (UK green tech relief through
// 2027 for heat pumps + solar PV + battery), 2000 = 20% standard.
export const VAT_RATE_OPTIONS = [
  { bps: 0, label: "0% (zero-rated — green tech relief)" },
  { bps: 2000, label: "20% (standard rate)" },
] as const;

// Line items group under one of these categories. The UI shows a
// subheading per category and a top-level checkbox toggling whether
// the whole category appears at all.
export const LINE_ITEM_CATEGORIES = [
  "heat_pump",
  "solar",
  "battery",
  "other",
] as const;
export type LineItemCategory = (typeof LINE_ITEM_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<LineItemCategory, string> = {
  heat_pump: "Heat pump",
  solar: "Solar PV",
  battery: "Battery storage",
  other: "Other",
};

// BUS grant — fixed cap, 2024+ rules. £7,500 for air-source +
// ground-source heat pumps. The grant is paid to the installer who
// deducts it from the homeowner's bill, and is capped at the cost
// of the install (so a £6k install gets a £6k grant — homeowner pays
// £0 — never a negative).
export const BUS_GRANT_CAP_PENCE = 750_000;

// Single line on the quote.
export const lineItemSchema = z.object({
  id: z.string().min(1).max(64),
  description: z.string().min(1).max(300),
  // Quantity can be fractional for hours/days/m². Capped at 4dp so
  // we never accumulate float weirdness across many rows.
  quantity: z.number().nonnegative().max(99999).multipleOf(0.0001),
  // Pence — can be negative for grants/discounts.
  unit_price_pence: z.number().int().min(-100_000_000).max(100_000_000),
  category: z.enum(LINE_ITEM_CATEGORIES).default("other"),
  // Special-case flag for the BUS grant line — its effective value
  // gets capped against the heat-pump subtotal at compute time.
  is_bus_grant: z.boolean().default(false),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const proposalDraftSchema = z.object({
  installer_lead_id: z.string().uuid(),
  line_items: z.array(lineItemSchema).max(50),
  cover_message: z.string().max(2000).nullable().optional(),
  vat_rate_bps: z.number().int().refine(
    (v) => VAT_RATE_OPTIONS.some((o) => o.bps === v),
    "Unsupported VAT rate",
  ),
});
export type ProposalDraftInput = z.infer<typeof proposalDraftSchema>;

// Compute totals. Pure — same input, same output.
//
// BUS grant handling: any line where `is_bus_grant === true` has its
// magnitude capped at the heat-pump subtotal (sum of non-grant
// heat_pump lines). So if heat-pump items total £6,000 and the
// grant line is -£7,500, the effective deduction becomes -£6,000.
// We return the cap applied per-line in `appliedLineTotals` so the
// UI can show what the homeowner will actually see.
export function computeTotals(
  lineItems: LineItem[],
  vatRateBps: number,
): {
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  appliedLineTotals: number[]; // index-aligned with lineItems
  busGrantWasCapped: boolean;
} {
  // Heat-pump subtotal excluding any grant lines — the cap reference.
  const heatPumpInstallPence = lineItems
    .filter((li) => li.category === "heat_pump" && !li.is_bus_grant)
    .reduce((sum, li) => sum + roundHalfToEven(li.quantity * li.unit_price_pence), 0);

  let busGrantWasCapped = false;
  const appliedLineTotals: number[] = [];

  for (const li of lineItems) {
    const raw = roundHalfToEven(li.quantity * li.unit_price_pence);
    if (li.is_bus_grant) {
      // Cap |raw| at heatPumpInstallPence. Grant lines are negative;
      // never take more off than the install cost. The `+ 0` at the
      // end normalises -0 (which JS leaks when capping to zero) to
      // +0 so the public appliedLineTotals never serialises a "-0".
      const capped = -Math.min(Math.abs(raw), Math.max(0, heatPumpInstallPence)) + 0;
      if (capped !== raw) busGrantWasCapped = true;
      appliedLineTotals.push(capped);
    } else {
      appliedLineTotals.push(raw);
    }
  }

  const subtotalPence = appliedLineTotals.reduce((s, n) => s + n, 0);
  const vatPence = roundHalfToEven((Math.max(0, subtotalPence) * vatRateBps) / 10000);
  const totalPence = Math.max(0, subtotalPence + vatPence);

  return {
    subtotalPence: Math.max(0, subtotalPence),
    vatPence,
    totalPence,
    appliedLineTotals,
    busGrantWasCapped,
  };
}

// Banker's rounding — round half to even.
function roundHalfToEven(n: number): number {
  const r = Math.round(n);
  if (Math.abs(n - Math.trunc(n) - 0.5) < 1e-9) {
    const floor = Math.floor(n);
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return r;
}

export function formatGbp(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}£${pounds.toLocaleString("en-GB")}.${remainder.toString().padStart(2, "0")}`;
}

// Group lines by category for the grouped renderer. Preserves the
// installer's row order within each group.
export function groupByCategory(lineItems: LineItem[]): Record<LineItemCategory, LineItem[]> {
  const out: Record<LineItemCategory, LineItem[]> = {
    heat_pump: [],
    solar: [],
    battery: [],
    other: [],
  };
  for (const li of lineItems) {
    out[li.category].push(li);
  }
  return out;
}

// ─── Line item presets ────────────────────────────────────────────

export interface LineItemPreset {
  description: string;
  quantity: number;
  unit_price_pence: number;
  category: LineItemCategory;
  is_bus_grant?: boolean;
}

export const HEAT_PUMP_PRESETS: LineItemPreset[] = [
  { category: "heat_pump", description: "Air-source heat pump (model + size to confirm on visit)", quantity: 1, unit_price_pence: 0 },
  { category: "heat_pump", description: "Hot water cylinder (unvented, 200L)", quantity: 1, unit_price_pence: 0 },
  { category: "heat_pump", description: "Pipework + manifold upgrades", quantity: 1, unit_price_pence: 0 },
  { category: "heat_pump", description: "Radiator / emitter changes (per room as required)", quantity: 1, unit_price_pence: 0 },
  { category: "heat_pump", description: "DNO application + commissioning", quantity: 1, unit_price_pence: 0 },
  { category: "heat_pump", description: "MCS certification + BUS grant administration", quantity: 1, unit_price_pence: 0 },
  { category: "heat_pump", description: "Installation labour", quantity: 1, unit_price_pence: 0 },
];

export const BUS_GRANT_PRESET: LineItemPreset = {
  category: "heat_pump",
  description: "BUS grant — eligible (paid by Ofgem direct to installer)",
  quantity: 1,
  unit_price_pence: -BUS_GRANT_CAP_PENCE,
  is_bus_grant: true,
};

export const SOLAR_PV_PRESETS: LineItemPreset[] = [
  { category: "solar", description: "Solar PV panels (kWp to confirm)", quantity: 1, unit_price_pence: 0 },
  { category: "solar", description: "Inverter", quantity: 1, unit_price_pence: 0 },
  { category: "solar", description: "Mounting + scaffolding", quantity: 1, unit_price_pence: 0 },
  { category: "solar", description: "DNO application + commissioning", quantity: 1, unit_price_pence: 0 },
  { category: "solar", description: "MCS certification", quantity: 1, unit_price_pence: 0 },
  { category: "solar", description: "Installation labour", quantity: 1, unit_price_pence: 0 },
];

export const BATTERY_PRESETS: LineItemPreset[] = [
  { category: "battery", description: "Battery storage (kWh to confirm)", quantity: 1, unit_price_pence: 0 },
  { category: "battery", description: "Battery management system + monitoring", quantity: 1, unit_price_pence: 0 },
  { category: "battery", description: "Installation labour", quantity: 1, unit_price_pence: 0 },
];

// Build the initial seed for a new draft. The toggles default to
// what the homeowner asked about. BUS grant defaults to ON when
// the heat-pump section is on (most common case).
export function presetsFor(opts: {
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}): LineItemPreset[] {
  const out: LineItemPreset[] = [];
  if (opts.wantsHeatPump) {
    out.push(...HEAT_PUMP_PRESETS);
    out.push(BUS_GRANT_PRESET);
  }
  if (opts.wantsSolar) out.push(...SOLAR_PV_PRESETS);
  if (opts.wantsBattery) out.push(...BATTERY_PRESETS);
  return out;
}
