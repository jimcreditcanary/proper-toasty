import { describe, expect, it } from "vitest";
import { maskEmail } from "../email-mask";

describe("maskEmail", () => {
  it("masks a typical company email keeping the TLD", () => {
    const out = maskEmail("info@acmeheating.co.uk");
    expect(out).toBe("in***@a***.co.uk");
  });

  it("masks a personal address", () => {
    expect(maskEmail("bob@example.com")).toBe("bo***@e***.com");
  });

  it("handles a single-char local part", () => {
    expect(maskEmail("a@b.com")).toBe("a***@b***.com");
  });

  it("returns null for null/undefined", () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail(undefined)).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(maskEmail("noatsign")).toBeNull();
    expect(maskEmail("@nolocal.com")).toBeNull();
    expect(maskEmail("nodomain@")).toBeNull();
  });

  it("preserves multi-segment TLDs", () => {
    expect(maskEmail("hello@some.subdomain.com")).toContain(".subdomain.com");
  });
});
