import { describe, expect, it } from "vitest";
import {
  ALLOWED_THRESHOLDS,
  AUTO_RECHARGE_DEFAULT_THRESHOLD,
  isAllowedThreshold,
} from "../auto-recharge-config";

describe("auto-recharge-config", () => {
  it("default threshold is included in allowed thresholds", () => {
    // Sanity: the system default must be a picker-allowed value so
    // users who haven't customised it stay in a settable state if
    // they ever open the dropdown.
    expect(
      (ALLOWED_THRESHOLDS as readonly number[]).includes(
        AUTO_RECHARGE_DEFAULT_THRESHOLD,
      ),
    ).toBe(true);
  });

  it("isAllowedThreshold accepts every value in ALLOWED_THRESHOLDS", () => {
    for (const v of ALLOWED_THRESHOLDS) {
      expect(isAllowedThreshold(v)).toBe(true);
    }
  });

  it("isAllowedThreshold rejects unsupported numbers", () => {
    expect(isAllowedThreshold(0)).toBe(false);
    expect(isAllowedThreshold(1)).toBe(false);
    expect(isAllowedThreshold(15)).toBe(false);
    expect(isAllowedThreshold(100)).toBe(false);
    expect(isAllowedThreshold(-10)).toBe(false);
  });

  it("isAllowedThreshold rejects non-numbers", () => {
    expect(isAllowedThreshold("10")).toBe(false);
    expect(isAllowedThreshold(null)).toBe(false);
    expect(isAllowedThreshold(undefined)).toBe(false);
    expect(isAllowedThreshold(10.5)).toBe(false);
    expect(isAllowedThreshold(NaN)).toBe(false);
    expect(isAllowedThreshold({})).toBe(false);
  });
});
