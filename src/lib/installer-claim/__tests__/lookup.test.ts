// Tests for the installer claim search ranker.
//
// We're not testing the DB-side ILIKE — that's covered by the route
// integration. We're testing the pure ranking + Companies House
// number detection.

import { describe, expect, it } from "vitest";
import {
  isCompanyNumber,
  normaliseCompanyNumber,
  rankByName,
} from "../lookup";

describe("isCompanyNumber", () => {
  it("recognises 8-digit numbers", () => {
    expect(isCompanyNumber("12345678")).toBe(true);
  });

  it("recognises Scottish prefixed numbers", () => {
    expect(isCompanyNumber("SC123456")).toBe(true);
    expect(isCompanyNumber("sc123456")).toBe(true); // case-insensitive
  });

  it("recognises NI prefixed numbers", () => {
    expect(isCompanyNumber("NI123456")).toBe(true);
  });

  it("ignores whitespace", () => {
    expect(isCompanyNumber("  12345678  ")).toBe(true);
    expect(isCompanyNumber("123 456 78")).toBe(true);
  });

  it("rejects company names that look numeric", () => {
    expect(isCompanyNumber("12 Garage Ltd")).toBe(false);
  });

  it("rejects too-short numbers", () => {
    expect(isCompanyNumber("12345")).toBe(false);
  });

  it("rejects too-long numbers", () => {
    expect(isCompanyNumber("123456789")).toBe(false);
  });

  it("rejects free text", () => {
    expect(isCompanyNumber("Acme")).toBe(false);
    expect(isCompanyNumber("Acme Heating Ltd")).toBe(false);
  });
});

describe("normaliseCompanyNumber", () => {
  it("uppercases + strips whitespace", () => {
    expect(normaliseCompanyNumber("sc123456")).toBe("SC123456");
    expect(normaliseCompanyNumber("  12345678  ")).toBe("12345678");
    expect(normaliseCompanyNumber("123 456 78")).toBe("12345678");
  });
});

describe("rankByName", () => {
  // Compact fixture — only the field the ranker reads.
  const make = (id: number, companyName: string) => ({ id, companyName });

  const corpus = [
    make(1, "Acme Heating Solutions Ltd"),
    make(2, "Best Acme Plumbing"),
    make(3, "Acme Ltd"),
    make(4, "Heatable Solutions Acme Branch"),
    make(5, "Acme Energy"),
    make(6, "Greenacre Heat Pumps"),
  ];

  it("ranks starts-with above contains", () => {
    const result = rankByName("acme", corpus);
    // First three should be the starts-with matches; "Acme Ltd"
    // shortest first.
    expect(result.slice(0, 3).map((r) => r.installer.companyName)).toEqual([
      "Acme Ltd",
      "Acme Energy",
      "Acme Heating Solutions Ltd",
    ]);
    expect(result.slice(0, 3).every((r) => r.matchKind === "starts-with")).toBe(
      true,
    );
  });

  it("includes contains matches after starts-with bucket", () => {
    const result = rankByName("acme", corpus);
    const containsMatches = result.filter((r) => r.matchKind === "contains");
    expect(containsMatches.length).toBeGreaterThan(0);
    expect(containsMatches.map((r) => r.installer.companyName)).toContain(
      "Best Acme Plumbing",
    );
  });

  it("strips trailing 'Ltd' for matching", () => {
    // Query "acme heating solutions" should match "Acme Heating
    // Solutions Ltd" as starts-with even though the raw row has
    // "Ltd" at the end.
    const result = rankByName("acme heating solutions", corpus);
    expect(result[0]?.installer.companyName).toBe("Acme Heating Solutions Ltd");
    expect(result[0]?.matchKind).toBe("starts-with");
  });

  it("limits to 5 by default", () => {
    const big = Array.from({ length: 20 }, (_, i) =>
      make(i, `Acme #${i.toString().padStart(2, "0")}`),
    );
    expect(rankByName("acme", big).length).toBe(5);
  });

  it("respects custom limit", () => {
    expect(rankByName("acme", corpus, 2).length).toBe(2);
  });

  it("returns empty for empty query", () => {
    expect(rankByName("", corpus)).toEqual([]);
    expect(rankByName("   ", corpus)).toEqual([]);
  });

  it("is case-insensitive", () => {
    const result = rankByName("ACME", corpus);
    expect(result.length).toBeGreaterThan(0);
  });

  it("orders shorter starts-with matches first", () => {
    const ours = [
      make(1, "Greenheat Heating"),
      make(2, "Greenheat"),
      make(3, "Greenheat Solar Battery Heat Pumps Ltd"),
    ];
    const result = rankByName("greenheat", ours);
    expect(result.map((r) => r.installer.companyName)).toEqual([
      "Greenheat",
      "Greenheat Heating",
      "Greenheat Solar Battery Heat Pumps Ltd",
    ]);
  });
});
