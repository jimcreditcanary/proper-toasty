// Tests for the quote-builder pure functions. Money in pence
// throughout. The BUS grant cap behaviour is the most subtle thing
// in here — covered exhaustively because getting the cap wrong
// means quoting customers a negative bill.

import { describe, expect, it } from "vitest";
import {
  computeTotals,
  formatGbp,
  groupByCategory,
  presetsFor,
  proposalDraftSchema,
  lineItemSchema,
  BUS_GRANT_CAP_PENCE,
  HEAT_PUMP_PRESETS,
  BUS_GRANT_PRESET,
  type LineItem,
} from "../schema";

// ─── Test helpers ──────────────────────────────────────────────────

function line(
  partial: Partial<LineItem> & {
    quantity: number;
    unit_price_pence: number;
  },
): LineItem {
  return {
    id: partial.id ?? `row-${Math.random()}`,
    description: partial.description ?? "Test line",
    quantity: partial.quantity,
    unit_price_pence: partial.unit_price_pence,
    category: partial.category ?? "other",
    is_bus_grant: partial.is_bus_grant ?? false,
  };
}

// ─── computeTotals ──────────────────────────────────────────────────

describe("computeTotals", () => {
  it("returns zeros for an empty line list", () => {
    const t = computeTotals([], 0);
    expect(t.subtotalPence).toBe(0);
    expect(t.vatPence).toBe(0);
    expect(t.totalPence).toBe(0);
    expect(t.appliedLineTotals).toEqual([]);
    expect(t.busGrantWasCapped).toBe(false);
  });

  it("sums simple positive lines at 0% VAT", () => {
    const lines = [
      line({ quantity: 1, unit_price_pence: 500_000 }),
      line({ quantity: 2, unit_price_pence: 100_000 }),
    ];
    const t = computeTotals(lines, 0);
    expect(t.subtotalPence).toBe(700_000);
    expect(t.vatPence).toBe(0);
    expect(t.totalPence).toBe(700_000);
  });

  it("applies 20% VAT to the subtotal", () => {
    const lines = [line({ quantity: 1, unit_price_pence: 100_000 })];
    const t = computeTotals(lines, 2000);
    expect(t.subtotalPence).toBe(100_000);
    expect(t.vatPence).toBe(20_000);
    expect(t.totalPence).toBe(120_000);
  });

  it("multiplies fractional quantities", () => {
    // 0.5 hours @ £100/hr = £50
    const lines = [line({ quantity: 0.5, unit_price_pence: 10_000 })];
    const t = computeTotals(lines, 0);
    expect(t.subtotalPence).toBe(5_000);
  });

  it("returns appliedLineTotals aligned to input order", () => {
    const lines = [
      line({ id: "a", quantity: 1, unit_price_pence: 100_000 }),
      line({ id: "b", quantity: 2, unit_price_pence: 50_000 }),
      line({ id: "c", quantity: 1, unit_price_pence: 25_000 }),
    ];
    const t = computeTotals(lines, 0);
    expect(t.appliedLineTotals).toEqual([100_000, 100_000, 25_000]);
  });
});

// ─── BUS grant capping ─────────────────────────────────────────────
//
// The grant pays UP TO £7,500 OR the heat-pump install cost,
// whichever is lower. So the homeowner never owes a negative amount.

describe("computeTotals — BUS grant capping", () => {
  it("applies the full -£7,500 grant when install exceeds the cap", () => {
    const lines = [
      line({
        category: "heat_pump",
        quantity: 1,
        unit_price_pence: 1_500_000, // £15,000 install
      }),
      line({
        category: "heat_pump",
        is_bus_grant: true,
        quantity: 1,
        unit_price_pence: -BUS_GRANT_CAP_PENCE, // -£7,500
      }),
    ];
    const t = computeTotals(lines, 0);
    expect(t.subtotalPence).toBe(750_000); // 15k - 7.5k = 7.5k
    expect(t.totalPence).toBe(750_000);
    expect(t.busGrantWasCapped).toBe(false);
    expect(t.appliedLineTotals[1]).toBe(-BUS_GRANT_CAP_PENCE);
  });

  it("caps the grant at install cost when install is below £7,500", () => {
    // £6k install — grant should clamp to -£6k, not -£7.5k
    const lines = [
      line({
        category: "heat_pump",
        quantity: 1,
        unit_price_pence: 600_000,
      }),
      line({
        category: "heat_pump",
        is_bus_grant: true,
        quantity: 1,
        unit_price_pence: -BUS_GRANT_CAP_PENCE,
      }),
    ];
    const t = computeTotals(lines, 0);
    expect(t.subtotalPence).toBe(0); // Customer pays nothing
    expect(t.totalPence).toBe(0);
    expect(t.busGrantWasCapped).toBe(true);
    expect(t.appliedLineTotals[1]).toBe(-600_000); // capped from -750k
  });

  it("only caps against non-grant heat-pump lines (ignores grant in the basis)", () => {
    // The cap reference must exclude the grant line itself, otherwise
    // we'd be circular — install cost is £8k, grant is full £7.5k.
    const lines = [
      line({ category: "heat_pump", quantity: 1, unit_price_pence: 800_000 }),
      line({
        category: "heat_pump",
        is_bus_grant: true,
        quantity: 1,
        unit_price_pence: -BUS_GRANT_CAP_PENCE,
      }),
    ];
    const t = computeTotals(lines, 0);
    expect(t.busGrantWasCapped).toBe(false);
    expect(t.totalPence).toBe(50_000); // £8k - £7.5k
  });

  it("does NOT count solar/battery line items toward the BUS cap basis", () => {
    // Customer adds £10k solar to a £4k heat-pump install. Grant
    // should still cap at £4k, not pull from the solar £.
    const lines = [
      line({ category: "heat_pump", quantity: 1, unit_price_pence: 400_000 }),
      line({ category: "solar", quantity: 1, unit_price_pence: 1_000_000 }),
      line({
        category: "heat_pump",
        is_bus_grant: true,
        quantity: 1,
        unit_price_pence: -BUS_GRANT_CAP_PENCE,
      }),
    ];
    const t = computeTotals(lines, 0);
    expect(t.busGrantWasCapped).toBe(true);
    expect(t.appliedLineTotals[2]).toBe(-400_000);
    // Heat pump items net to 0, solar £10k = £10k total
    expect(t.subtotalPence).toBe(1_000_000);
  });

  it("never produces a negative subtotal even with extreme grant", () => {
    const lines = [
      line({
        category: "heat_pump",
        is_bus_grant: true,
        quantity: 1,
        unit_price_pence: -BUS_GRANT_CAP_PENCE,
      }),
    ];
    const t = computeTotals(lines, 0);
    // No install items at all → grant must clamp to 0
    expect(t.subtotalPence).toBe(0);
    expect(t.totalPence).toBe(0);
    expect(t.appliedLineTotals[0]).toBe(0);
    expect(t.busGrantWasCapped).toBe(true);
  });

  it("applies VAT only after the grant is netted", () => {
    // £15k install, -£7.5k grant, +20% VAT on the £7.5k subtotal
    const lines = [
      line({
        category: "heat_pump",
        quantity: 1,
        unit_price_pence: 1_500_000,
      }),
      line({
        category: "heat_pump",
        is_bus_grant: true,
        quantity: 1,
        unit_price_pence: -BUS_GRANT_CAP_PENCE,
      }),
    ];
    const t = computeTotals(lines, 2000);
    expect(t.subtotalPence).toBe(750_000);
    expect(t.vatPence).toBe(150_000);
    expect(t.totalPence).toBe(900_000);
  });
});

// ─── formatGbp ──────────────────────────────────────────────────────

describe("formatGbp", () => {
  it("formats whole pounds", () => {
    expect(formatGbp(0)).toBe("£0.00");
    expect(formatGbp(100)).toBe("£1.00");
    expect(formatGbp(123_456)).toBe("£1,234.56");
  });

  it("formats negatives with leading minus", () => {
    expect(formatGbp(-100)).toBe("-£1.00");
    expect(formatGbp(-750_000)).toBe("-£7,500.00");
  });

  it("zero-pads pence remainder", () => {
    expect(formatGbp(105)).toBe("£1.05");
    expect(formatGbp(110)).toBe("£1.10");
  });

  it("groups thousands with commas (en-GB locale)", () => {
    expect(formatGbp(100_000_00)).toBe("£100,000.00");
  });
});

// ─── groupByCategory ────────────────────────────────────────────────

describe("groupByCategory", () => {
  it("returns all four buckets even when some are empty", () => {
    const g = groupByCategory([]);
    expect(g.heat_pump).toEqual([]);
    expect(g.solar).toEqual([]);
    expect(g.battery).toEqual([]);
    expect(g.other).toEqual([]);
  });

  it("preserves insertion order within each bucket", () => {
    const a = line({ id: "a", category: "heat_pump", quantity: 1, unit_price_pence: 0 });
    const b = line({ id: "b", category: "heat_pump", quantity: 1, unit_price_pence: 0 });
    const c = line({ id: "c", category: "solar", quantity: 1, unit_price_pence: 0 });
    const g = groupByCategory([a, c, b]);
    expect(g.heat_pump.map((x) => x.id)).toEqual(["a", "b"]);
    expect(g.solar.map((x) => x.id)).toEqual(["c"]);
  });
});

// ─── presetsFor ────────────────────────────────────────────────────

describe("presetsFor", () => {
  it("returns no rows when nothing is wanted", () => {
    const p = presetsFor({
      wantsHeatPump: false,
      wantsSolar: false,
      wantsBattery: false,
    });
    expect(p).toEqual([]);
  });

  it("includes the BUS grant preset when heat_pump is on", () => {
    const p = presetsFor({
      wantsHeatPump: true,
      wantsSolar: false,
      wantsBattery: false,
    });
    expect(p.length).toBe(HEAT_PUMP_PRESETS.length + 1);
    expect(p.some((row) => row.is_bus_grant === true)).toBe(true);
  });

  it("does NOT include BUS grant for solar-only", () => {
    const p = presetsFor({
      wantsHeatPump: false,
      wantsSolar: true,
      wantsBattery: false,
    });
    expect(p.some((row) => row.is_bus_grant === true)).toBe(false);
  });

  it("seeds all three system types when all are wanted", () => {
    const p = presetsFor({
      wantsHeatPump: true,
      wantsSolar: true,
      wantsBattery: true,
    });
    const cats = new Set(p.map((row) => row.category));
    expect(cats.has("heat_pump")).toBe(true);
    expect(cats.has("solar")).toBe(true);
    expect(cats.has("battery")).toBe(true);
  });

  it("BUS_GRANT_PRESET is exactly the cap value, negative", () => {
    expect(BUS_GRANT_PRESET.unit_price_pence).toBe(-BUS_GRANT_CAP_PENCE);
    expect(BUS_GRANT_PRESET.is_bus_grant).toBe(true);
    expect(BUS_GRANT_PRESET.category).toBe("heat_pump");
  });
});

// ─── Zod schemas ──────────────────────────────────────────────────

describe("lineItemSchema", () => {
  it("accepts a minimal valid row", () => {
    const r = lineItemSchema.parse({
      id: "abc",
      description: "Air-source heat pump",
      quantity: 1,
      unit_price_pence: 800_000,
      category: "heat_pump",
      is_bus_grant: false,
    });
    expect(r.id).toBe("abc");
  });

  it("defaults category to 'other'", () => {
    const r = lineItemSchema.parse({
      id: "abc",
      description: "Misc",
      quantity: 1,
      unit_price_pence: 100,
    });
    expect(r.category).toBe("other");
    expect(r.is_bus_grant).toBe(false);
  });

  it("rejects empty descriptions", () => {
    expect(() =>
      lineItemSchema.parse({
        id: "x",
        description: "",
        quantity: 1,
        unit_price_pence: 100,
      }),
    ).toThrow();
  });

  it("rejects non-integer pence", () => {
    expect(() =>
      lineItemSchema.parse({
        id: "x",
        description: "fractional",
        quantity: 1,
        unit_price_pence: 100.5,
      }),
    ).toThrow();
  });
});

describe("proposalDraftSchema", () => {
  it("rejects unsupported VAT rates", () => {
    const base = {
      installer_lead_id: "00000000-0000-0000-0000-000000000000",
      line_items: [],
      cover_message: null,
    };
    expect(() => proposalDraftSchema.parse({ ...base, vat_rate_bps: 1500 })).toThrow();
    // 0 + 2000 are the only supported rates
    expect(() => proposalDraftSchema.parse({ ...base, vat_rate_bps: 0 })).not.toThrow();
    expect(() => proposalDraftSchema.parse({ ...base, vat_rate_bps: 2000 })).not.toThrow();
  });

  it("caps line items at 50 rows", () => {
    const tooMany = Array.from({ length: 51 }, (_, i) =>
      line({ id: `r-${i}`, quantity: 1, unit_price_pence: 100 }),
    );
    expect(() =>
      proposalDraftSchema.parse({
        installer_lead_id: "00000000-0000-0000-0000-000000000000",
        line_items: tooMany,
        vat_rate_bps: 0,
      }),
    ).toThrow();
  });
});
