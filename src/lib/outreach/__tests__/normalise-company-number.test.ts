import { describe, expect, it } from "vitest";
import { normaliseCompanyNumber } from "../normalise-company-number";

describe("normaliseCompanyNumber", () => {
  it("zero-pads a 7-digit E&W number to 8 chars", () => {
    expect(normaliseCompanyNumber("1489529")).toBe("01489529");
  });

  it("leaves an already-8-digit E&W number alone", () => {
    expect(normaliseCompanyNumber("01489529")).toBe("01489529");
  });

  it("trims whitespace + uppercases", () => {
    expect(normaliseCompanyNumber(" sc12345 ")).toBe("SC012345");
  });

  it("pads after a 2-letter prefix to fill 8 characters total", () => {
    expect(normaliseCompanyNumber("SC12345")).toBe("SC012345");
    expect(normaliseCompanyNumber("NI98765")).toBe("NI098765");
  });

  it("leaves an already-correct prefixed number alone", () => {
    expect(normaliseCompanyNumber("SC012345")).toBe("SC012345");
    expect(normaliseCompanyNumber("OC123456")).toBe("OC123456");
  });

  it("handles LLP and other 2-letter prefixes uniformly", () => {
    expect(normaliseCompanyNumber("OC12345")).toBe("OC012345");
    expect(normaliseCompanyNumber("SO12345")).toBe("SO012345");
    expect(normaliseCompanyNumber("NC12345")).toBe("NC012345");
  });

  it("strips internal whitespace from messy inputs", () => {
    expect(normaliseCompanyNumber("01 489 529")).toBe("01489529");
  });

  it("returns empty string for blank input", () => {
    expect(normaliseCompanyNumber("")).toBe("");
    expect(normaliseCompanyNumber("   ")).toBe("");
  });

  it("passes through mixed-format garbage so CH can 404 + skip", () => {
    expect(normaliseCompanyNumber("12-34-56")).toBe("12-34-56");
  });

  it("does not double-pad numbers already at or beyond 8 digits", () => {
    expect(normaliseCompanyNumber("12345678")).toBe("12345678");
    expect(normaliseCompanyNumber("123456789")).toBe("123456789");
  });
});
