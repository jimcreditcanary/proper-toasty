// Tests for the sizing-inputs admin-settings loader. Mirrors the
// shape of how cost-rates is consumed (loader produces a merged
// SizingInputs; admin_settings overrides per-key; defaults fill the
// rest); also covers the per-field validation rules used on both
// the read and write paths.

import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SIZING_INPUTS,
  SIZING_INPUT_KEY_PREFIX,
  isValidSizingValue,
  loadSizingInputs,
  type SizingInputs,
} from "../sizing-inputs";

// Tiny mock of the Supabase admin client's `.from("admin_settings")
// .select(...).like(...)` chain. Returns a fixed { data, error }
// shape so the loader can be unit-tested without a DB.
type Row = { key: string; value: string | number };
function makeAdmin(rows: Row[] | null, errored = false) {
  const result = errored
    ? { data: null, error: { message: "boom" } }
    : { data: rows ?? [], error: null };
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        like: vi.fn(async () => result),
      })),
    })),
    // Cast — the real type is the generated Supabase client; we
    // only ever exercise the from->select->like path here.
  } as unknown as Parameters<typeof loadSizingInputs>[0];
}

describe("isValidSizingValue", () => {
  it("rejects NaN/Infinity for every field", () => {
    for (const k of Object.keys(DEFAULT_SIZING_INPUTS) as (keyof SizingInputs)[]) {
      expect(isValidSizingValue(k, Number.NaN)).toBe(false);
      expect(isValidSizingValue(k, Number.POSITIVE_INFINITY)).toBe(false);
    }
  });

  it("clamps self-consumption rate to 0..1 inclusive", () => {
    expect(isValidSizingValue("self_consumption_rate_no_battery", 0)).toBe(true);
    expect(isValidSizingValue("self_consumption_rate_no_battery", 0.6)).toBe(true);
    expect(isValidSizingValue("self_consumption_rate_no_battery", 1)).toBe(true);
    expect(isValidSizingValue("self_consumption_rate_no_battery", 1.01)).toBe(false);
    expect(isValidSizingValue("self_consumption_rate_no_battery", -0.01)).toBe(false);
  });

  it("allows zero for tariffs + grants (scheme paused / zero export)", () => {
    expect(isValidSizingValue("energy_import_price_p_per_kwh", 0)).toBe(true);
    expect(isValidSizingValue("energy_export_price_p_per_kwh", 0)).toBe(true);
    expect(isValidSizingValue("bus_ashp_grant_gbp", 0)).toBe(true);
    expect(isValidSizingValue("bus_biomass_grant_gbp", 0)).toBe(true);
  });

  it("rejects negative tariffs + grants", () => {
    expect(isValidSizingValue("energy_import_price_p_per_kwh", -1)).toBe(false);
    expect(isValidSizingValue("bus_ashp_grant_gbp", -100)).toBe(false);
  });

  it("requires strictly positive sizing rules of thumb + install price", () => {
    expect(isValidSizingValue("solar_install_price_per_kwp_gbp", 0)).toBe(false);
    expect(isValidSizingValue("solar_install_price_per_kwp_gbp", 100)).toBe(true);
    expect(isValidSizingValue("heat_pump_demand_kwh_per_m2", 0)).toBe(false);
    expect(isValidSizingValue("heat_pump_demand_kwh_per_m2", 60)).toBe(true);
    expect(isValidSizingValue("heat_pump_w_per_m2", 0)).toBe(false);
    expect(isValidSizingValue("heat_pump_w_per_m2", 50)).toBe(true);
  });
});

describe("loadSizingInputs", () => {
  it("returns DEFAULT_SIZING_INPUTS when admin_settings has no matching rows", async () => {
    const admin = makeAdmin([]);
    await expect(loadSizingInputs(admin)).resolves.toEqual(DEFAULT_SIZING_INPUTS);
  });

  it("returns DEFAULT_SIZING_INPUTS when the DB read errors", async () => {
    const admin = makeAdmin(null, true);
    await expect(loadSizingInputs(admin)).resolves.toEqual(DEFAULT_SIZING_INPUTS);
  });

  it("merges a partial override on top of defaults", async () => {
    const admin = makeAdmin([
      { key: `${SIZING_INPUT_KEY_PREFIX}bus_ashp_grant_gbp`, value: "8000" },
      { key: `${SIZING_INPUT_KEY_PREFIX}energy_import_price_p_per_kwh`, value: 32 },
    ]);
    const result = await loadSizingInputs(admin);
    expect(result.bus_ashp_grant_gbp).toBe(8000);
    expect(result.energy_import_price_p_per_kwh).toBe(32);
    // Untouched fields stay at default.
    expect(result.energy_export_price_p_per_kwh).toBe(
      DEFAULT_SIZING_INPUTS.energy_export_price_p_per_kwh,
    );
    expect(result.heat_pump_w_per_m2).toBe(
      DEFAULT_SIZING_INPUTS.heat_pump_w_per_m2,
    );
  });

  it("ignores rows with the wrong prefix or unknown fields", async () => {
    const admin = makeAdmin([
      // wrong prefix (cost-rates) — must be skipped
      { key: "cost_rate.claude_per_completed_check", value: "999" },
      // unknown field under our prefix — must be skipped
      { key: `${SIZING_INPUT_KEY_PREFIX}made_up_field`, value: "999" },
    ]);
    const result = await loadSizingInputs(admin);
    expect(result).toEqual(DEFAULT_SIZING_INPUTS);
  });

  it("drops invalid values (out-of-range percentages, negative grants, NaN)", async () => {
    const admin = makeAdmin([
      // out of 0..1
      { key: `${SIZING_INPUT_KEY_PREFIX}self_consumption_rate_no_battery`, value: "1.5" },
      // negative
      { key: `${SIZING_INPUT_KEY_PREFIX}bus_biomass_grant_gbp`, value: "-100" },
      // not a number
      { key: `${SIZING_INPUT_KEY_PREFIX}solar_install_price_per_kwp_gbp`, value: "not-a-number" },
      // valid alongside the bad ones — must survive
      { key: `${SIZING_INPUT_KEY_PREFIX}heat_pump_w_per_m2`, value: 65 },
    ]);
    const result = await loadSizingInputs(admin);
    expect(result.self_consumption_rate_no_battery).toBe(
      DEFAULT_SIZING_INPUTS.self_consumption_rate_no_battery,
    );
    expect(result.bus_biomass_grant_gbp).toBe(
      DEFAULT_SIZING_INPUTS.bus_biomass_grant_gbp,
    );
    expect(result.solar_install_price_per_kwp_gbp).toBe(
      DEFAULT_SIZING_INPUTS.solar_install_price_per_kwp_gbp,
    );
    expect(result.heat_pump_w_per_m2).toBe(65);
  });

  it("coerces numeric-string values (Supabase returns numerics as strings)", async () => {
    const admin = makeAdmin([
      { key: `${SIZING_INPUT_KEY_PREFIX}heat_pump_demand_kwh_per_m2`, value: "55" },
    ]);
    const result = await loadSizingInputs(admin);
    expect(result.heat_pump_demand_kwh_per_m2).toBe(55);
  });
});
