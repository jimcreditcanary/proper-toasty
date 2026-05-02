// Shared types + zod schemas for the proposal builder + API routes.
// Single source of truth for the line_items shape so the builder UI,
// the create/update endpoint, and the homeowner view all agree.
//
// Money is pence integers throughout — never floats (matches the
// credits + Stripe convention used elsewhere in the codebase).

import { z } from "zod";

// VAT rate — basis points. 0 = 0% (UK green tech relief through
// 2027 for heat pumps + solar PV + battery), 2000 = 20% standard.
// Anything else is rejected at the API layer; the builder UI only
// exposes the two options.
export const VAT_RATE_OPTIONS = [
  { bps: 0, label: "0% (zero-rated — green tech relief)" },
  { bps: 2000, label: "20% (standard rate)" },
] as const;

// Single line on the quote. `id` is a stable client-side string for
// React keys; we round-trip it through the API but don't enforce a
// format (UUIDs, slugs, "row-3", whatever the client wants).
export const lineItemSchema = z.object({
  id: z.string().min(1).max(64),
  description: z.string().min(1).max(300),
  // Quantity can be fractional for hours/days/m². Capped at 4dp so
  // we never accumulate float weirdness across many rows.
  quantity: z.number().nonnegative().max(99999).multipleOf(0.0001),
  unit_price_pence: z.number().int().min(0).max(100_000_000), // £1M cap per row
});
export type LineItem = z.infer<typeof lineItemSchema>;

// What the builder posts to the API on save / send. Cover message
// is markdown-light (we render as plain text with newlines preserved
// — no HTML injection risk) and capped at a sane length.
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

// Compute the running totals from line items + VAT rate. Pure
// function — same input → same output, easy to unit-test, and the
// builder UI calls it directly for live preview.
//
// Rounding policy: each line's total uses banker's-style round-half-
// to-even at the pence boundary. That matches what HMRC + most
// invoicing software does for VAT-inclusive lines, and avoids
// systematic rounding bias when many rows are present.
export function computeTotals(
  lineItems: LineItem[],
  vatRateBps: number,
): { subtotalPence: number; vatPence: number; totalPence: number } {
  let subtotalPence = 0;
  for (const li of lineItems) {
    // qty * unit_price → pence. quantity may be fractional, so
    // multiply then round to nearest pence.
    const linePence = roundHalfToEven(li.quantity * li.unit_price_pence);
    subtotalPence += linePence;
  }
  const vatPence = roundHalfToEven((subtotalPence * vatRateBps) / 10000);
  const totalPence = subtotalPence + vatPence;
  return { subtotalPence, vatPence, totalPence };
}

// Banker's rounding — round half to even. Avoids bias when many
// .5 values stack up.
function roundHalfToEven(n: number): number {
  const r = Math.round(n);
  // If we landed exactly on .5 (within float tolerance), pick the
  // even neighbour.
  if (Math.abs(n - Math.trunc(n) - 0.5) < 1e-9) {
    const floor = Math.floor(n);
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return r;
}

// Format pence as a £x.xx string. Used in emails + the homeowner
// view so the formatting is stable across surfaces.
export function formatGbp(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}£${pounds.toLocaleString("en-GB")}.${remainder.toString().padStart(2, "0")}`;
}

// ─── Line item presets ────────────────────────────────────────────
//
// Sensible starting rows based on what the homeowner asked about
// in the original lead. Installer can edit / delete / add more.
// Prices are £0 by default — we never want to ship guesses for
// installer pricing; this is a structural starting point only.

export interface LineItemPreset {
  description: string;
  quantity: number;
  unit_price_pence: number;
}

const HEAT_PUMP_PRESETS: LineItemPreset[] = [
  { description: "Air-source heat pump (model + size to confirm on visit)", quantity: 1, unit_price_pence: 0 },
  { description: "Hot water cylinder (unvented, 200L)", quantity: 1, unit_price_pence: 0 },
  { description: "Pipework + manifold upgrades", quantity: 1, unit_price_pence: 0 },
  { description: "Radiator / emitter changes (per room as required)", quantity: 1, unit_price_pence: 0 },
  { description: "DNO application + commissioning", quantity: 1, unit_price_pence: 0 },
  { description: "MCS certification + BUS grant administration", quantity: 1, unit_price_pence: 0 },
  { description: "Installation labour", quantity: 1, unit_price_pence: 0 },
  { description: "BUS grant deduction", quantity: 1, unit_price_pence: -750000 }, // -£7,500
];

const SOLAR_PV_PRESETS: LineItemPreset[] = [
  { description: "Solar PV panels (kWp to confirm)", quantity: 1, unit_price_pence: 0 },
  { description: "Inverter", quantity: 1, unit_price_pence: 0 },
  { description: "Mounting + scaffolding", quantity: 1, unit_price_pence: 0 },
  { description: "DNO application + commissioning", quantity: 1, unit_price_pence: 0 },
  { description: "MCS certification", quantity: 1, unit_price_pence: 0 },
  { description: "Installation labour", quantity: 1, unit_price_pence: 0 },
];

const BATTERY_PRESETS: LineItemPreset[] = [
  { description: "Battery storage (kWh to confirm)", quantity: 1, unit_price_pence: 0 },
  { description: "Battery management system + monitoring", quantity: 1, unit_price_pence: 0 },
  { description: "Installation labour", quantity: 1, unit_price_pence: 0 },
];

export function presetsFor(opts: {
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}): LineItemPreset[] {
  const out: LineItemPreset[] = [];
  if (opts.wantsHeatPump) out.push(...HEAT_PUMP_PRESETS);
  if (opts.wantsSolar) out.push(...SOLAR_PV_PRESETS);
  if (opts.wantsBattery) out.push(...BATTERY_PRESETS);
  // Fallback when the lead has no flags — give them an empty row to
  // start so the UI isn't blank.
  if (out.length === 0) {
    out.push({ description: "", quantity: 1, unit_price_pence: 0 });
  }
  return out;
}
