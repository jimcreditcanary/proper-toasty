import { describe, expect, it } from "vitest";
import { isValidUkMobile, normaliseUkMobile } from "../booking";

describe("isValidUkMobile", () => {
  it.each([
    ["07700 900123"],
    ["07700900123"],
    ["07700-900-123"],
    ["+44 7700 900123"],
    ["+447700900123"],
    ["447700900123"],
  ])("accepts %s", (v) => {
    expect(isValidUkMobile(v)).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["1234", "too short"],
    ["08700900123", "08x — landline-style, not mobile"],
    ["+1 555 123 4567", "US"],
    ["07700 9001234567", "too long"],
    ["abc", "not numeric"],
  ])("rejects %s (%s)", (v) => {
    expect(isValidUkMobile(v)).toBe(false);
  });
});

describe("normaliseUkMobile", () => {
  it("converts national 07… to +44 7…", () => {
    expect(normaliseUkMobile("07700 900123")).toBe("+447700900123");
  });

  it("converts +44 7… to canonical +44 7…", () => {
    expect(normaliseUkMobile("+44 7700 900 123")).toBe("+447700900123");
  });

  it("converts 44 7… (no plus) to +44 7…", () => {
    expect(normaliseUkMobile("447700900123")).toBe("+447700900123");
  });

  it("returns null for non-mobile inputs", () => {
    expect(normaliseUkMobile("0207 123 4567")).toBeNull(); // London landline
    expect(normaliseUkMobile("+1 555 123 4567")).toBeNull();
    expect(normaliseUkMobile("nonsense")).toBeNull();
  });
});
